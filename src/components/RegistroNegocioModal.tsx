import React, { useState } from 'react';
import { 
  Building2, 
  FileText, 
  User, 
  Phone, 
  Mail, 
  Lock, 
  X, 
  Sparkles, 
  CheckCircle, 
  AlertCircle,
  Store,
  ArrowRight,
  ShieldAlert,
  Check
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { RUBROS_CATALOG } from '../data/rubrosConfig';
import { ConfiguracionApp, RolUsuario } from '../types/schema';

interface RegistroNegocioModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: ConfiguracionApp;
  onSuccessRegister: (updatedConfig: ConfiguracionApp, email: string) => void;
}

export const RegistroNegocioModal: React.FC<RegistroNegocioModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  onSuccessRegister,
}) => {
  const [nombreComercial, setNombreComercial] = useState(
    currentConfig.nombreBodega && currentConfig.nombreBodega !== 'Minimarket La Bendición'
      ? currentConfig.nombreBodega
      : ''
  );
  const [rif, setRif] = useState(currentConfig.rif || '');
  const [nombreEncargado, setNombreEncargado] = useState(currentConfig.propietario || '');
  const [telefonoWhatsApp, setTelefonoWhatsApp] = useState(currentConfig.telefono || '');
  const [selectedRubro, setSelectedRubro] = useState(currentConfig.rubro || 'Ropa Deportiva');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Rol in organization
  const [rolUsuario, setRolUsuario] = useState<RolUsuario>('Dueño');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Validate form and prompt confirmation before locking
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanNombre = nombreComercial.trim();
    const cleanEncargado = nombreEncargado.trim();
    const cleanTelefono = telefonoWhatsApp.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanNombre) {
      setError('Por favor, ingresa el nombre comercial de tu negocio.');
      return;
    }

    if (!cleanEncargado) {
      setError('Por favor, ingresa el nombre del dueño o encargado.');
      return;
    }

    if (!cleanTelefono) {
      setError('Por favor, ingresa el teléfono o WhatsApp de contacto.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Por favor, ingresa un correo electrónico válido para tu usuario.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener un mínimo de 6 caracteres.');
      return;
    }

    // Show the confirmation prompt: "¿Estás seguro que este es tu rubro?"
    setShowConfirmModal(true);
  };

  // Execute registration and permanently lock rubro on user creation
  const handleExecuteRegistration = async () => {
    setError(null);
    setLoading(true);

    const cleanNombre = nombreComercial.trim();
    const cleanEncargado = nombreEncargado.trim();
    const cleanTelefono = telefonoWhatsApp.trim();
    const cleanEmail = email.trim().toLowerCase();

    try {
      // 1. Try to register user in Supabase Auth
      try {
        await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: {
              business_name: cleanNombre,
              owner_name: cleanEncargado,
              phone: cleanTelefono,
              rif: rif.trim().toUpperCase(),
              rubro: selectedRubro,
            }
          }
        });
      } catch (authErr) {
        console.warn('Auth notice:', authErr);
      }

      const fechaRegistro = new Date().toISOString();

      // 2. Prepare Updated Business Configuration with 15-day trial start and locked rubro
      const initialUsers = [
        {
          id: 'USR-001',
          nombre: cleanEncargado,
          email: cleanEmail,
          telefono: cleanTelefono,
          rol: rolUsuario,
          pinAcceso: '1234',
          activo: true,
          creadoEn: new Date().toLocaleDateString('es-VE'),
        }
      ];

      const updatedConfig: ConfiguracionApp = {
        ...currentConfig,
        nombreBodega: cleanNombre,
        rif: rif.trim().toUpperCase() || 'V-00000000',
        propietario: cleanEncargado,
        telefono: cleanTelefono,
        rubro: selectedRubro,
        rubroBloqueado: true, // Bloqueado de por vida solo al crear el usuario
        fechaRegistroUsuario: fechaRegistro, // Inicio del período de prueba de 15 días
        licenciaActiva: false,
        diasPruebaLimite: 15,
        rolUsuarioActual: rolUsuario,
        usuariosNegocio: initialUsers,
      };

      // 3. Save trial start date into local storage
      localStorage.setItem('bodeguero_trial_start', fechaRegistro);
      localStorage.setItem('bodeguero_usuarios_v1', JSON.stringify(initialUsers));

      // Save local credentials for offline resilience
      localStorage.setItem('bodeguero_registered_user', JSON.stringify({
        email: cleanEmail,
        nombreComercial: cleanNombre,
        propietario: cleanEncargado,
        rubro: selectedRubro,
        registeredAt: fechaRegistro,
      }));


      setShowConfirmModal(false);
      setSuccessMessage('¡Negocio y usuario creados exitosamente! Tu período de prueba de 15 días ha comenzado.');
      
      setTimeout(() => {
        onSuccessRegister(updatedConfig, cleanEmail);
      }, 700);

    } catch (err: any) {
      setError(err?.message || 'Ocurrió un error al registrar el negocio.');
      setShowConfirmModal(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#111216] border border-[#D4AF37]/40 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[92vh] animate-fadeIn">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#232530] bg-gradient-to-r from-[#161820] to-[#121318] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F5DA76] via-[#D4AF37] to-[#A88120] p-0.5 shadow-[0_0_15px_rgba(212,175,55,0.4)] flex items-center justify-center text-black">
              <Store size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#F5DA76] bg-[#D4AF37]/15 px-2 py-0.5 rounded-full border border-[#D4AF37]/35 uppercase tracking-widest font-bold">
                  Registro Oficial
                </span>
                <span className="text-xs text-gray-300 font-mono">15 Días de Prueba</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white font-display uppercase tracking-wide mt-0.5">
                Registra Tu Negocio y Crea Tu Usuario
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg bg-[#232530] hover:bg-[#2F3242] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar flex-1 bg-[#090A0D]">
          
          {error && (
            <div className="bg-red-500/15 border border-red-500/50 text-red-400 text-xs p-3 rounded-xl flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle size={16} className="shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-[#00E676]/15 border border-[#00E676]/50 text-[#00E676] text-xs p-3 rounded-xl flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle size={16} className="shrink-0 text-[#00E676]" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 1. NOMBRE COMERCIAL DEL NEGOCIO */}
          <div>
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5 font-mono">
              NOMBRE COMERCIAL DEL NEGOCIO:
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-3 text-[#D4AF37]">
                <Building2 size={17} />
              </div>
              <input
                type="text"
                required
                value={nombreComercial}
                onChange={(e) => setNombreComercial(e.target.value)}
                placeholder="Ej. Inversiones San Antonio C.A."
                className="w-full bg-[#0D0E12] border border-[#232530] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-all font-semibold"
              />
            </div>
          </div>

          {/* 2. RIF / DOCUMENTO FISCAL */}
          <div>
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5 font-mono">
              RIF / DOCUMENTO FISCAL:
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-3 text-gray-400">
                <FileText size={17} />
              </div>
              <input
                type="text"
                value={rif}
                onChange={(e) => setRif(e.target.value)}
                placeholder="EJ. J-12345678-9 O V-12345678"
                className="w-full bg-[#0D0E12] border border-[#232530] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-all font-mono uppercase"
              />
            </div>
          </div>

          {/* 3. NOMBRE DEL DUEÑO O ENCARGADO */}
          <div>
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5 font-mono">
              NOMBRE DEL DUEÑO O ENCARGADO:
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-3 text-gray-400">
                <User size={17} />
              </div>
              <input
                type="text"
                required
                value={nombreEncargado}
                onChange={(e) => setNombreEncargado(e.target.value)}
                placeholder="Ej. Carlos Mendoza"
                className="w-full bg-[#0D0E12] border border-[#232530] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* 4. TELÉFONO WHATSAPP DEL NEGOCIO */}
          <div>
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5 font-mono">
              TELÉFONO WHATSAPP DEL NEGOCIO:
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-3 text-gray-400">
                <Phone size={17} />
              </div>
              <input
                type="tel"
                required
                value={telefonoWhatsApp}
                onChange={(e) => setTelefonoWhatsApp(e.target.value)}
                placeholder="+584120000000"
                className="w-full bg-[#0D0E12] border border-[#232530] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-all font-mono"
              />
            </div>
          </div>

          {/* 5. RUBRO COMERCIAL (Selección libre hasta pulsar Crear Usuario) */}
          <div className="p-3.5 rounded-xl border border-[#232530] bg-[#0D0E12] space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block font-mono">
                RUBRO PRINCIPAL DEL NEGOCIO:
              </label>
              <span className="text-[10px] text-[#F5DA76] bg-[#D4AF37]/15 border border-[#D4AF37]/35 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono flex items-center gap-1.5">
                <span>{RUBROS_CATALOG[selectedRubro]?.icon || '🏪'}</span>
                <span>{RUBROS_CATALOG[selectedRubro]?.label || selectedRubro}</span>
              </span>
            </div>

            <p className="text-[11px] text-gray-400 leading-snug font-mono">
              💡 <strong className="text-white">Puedes cambiar de rubro libremente ahora</strong>. Solo se bloqueará de forma permanente cuando presiones el botón de <strong className="text-[#F5DA76]">"Crear Usuario y Activar Negocio"</strong>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {Object.values(RUBROS_CATALOG).map((r) => {
                const isSelected = selectedRubro === r.id;
                return (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => {
                      setSelectedRubro(r.id);
                      setError(null);
                    }}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#D4AF37] bg-[#D4AF37]/20 shadow-[0_0_15px_rgba(212,175,55,0.25)] text-white ring-1 ring-[#D4AF37]'
                        : 'border-[#232530] bg-[#161820] text-gray-300 hover:border-[#D4AF37]/40 hover:text-white hover:bg-[#1D202A]'
                    }`}
                  >
                    <span className="text-2xl shrink-0">{r.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white leading-tight whitespace-normal break-words">
                        {r.label}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-[#D4AF37] text-black flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(212,175,55,0.4)]">
                        <Check size={11} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider: Credenciales de Usuario */}
          <div className="pt-2 border-t border-[#232530]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-[#D4AF37]" />
                <span className="text-xs font-bold text-[#F5DA76] uppercase tracking-wider font-mono">
                  Crea Tu Usuario de Acceso
                </span>
              </div>
              <span className="text-[10px] text-gray-400 font-mono">
                Prueba de 15 días
              </span>
            </div>

            <div className="space-y-3">
              {/* Question: Rol dentro de la organización */}
              <div>
                <label className="text-[11px] font-bold text-gray-300 uppercase tracking-wider block mb-1.5 font-mono">
                  ¿QUÉ ROL TIENES DENTRO DE LA ORGANIZACIÓN?
                </label>
                <div className="grid grid-cols-2 gap-2 mb-1.5">
                  {(
                    [
                      { id: 'Dueño', label: 'Dueño / Propietario', icon: '👑', desc: 'Acceso Total + Usuarios' },
                      { id: 'Administrador', label: 'Administrador', icon: '🛡️', desc: 'Acceso Total + Usuarios' },
                      { id: 'Supervisor', label: 'Supervisor / Encargado', icon: '💼', desc: 'Inventario y Arqueo' },
                      { id: 'Cajero', label: 'Cajero / Operador POS', icon: '🧑‍💼', desc: 'Solo Facturación POS' },
                    ] as const
                  ).map((item) => {
                    const isSelected = rolUsuario === item.id;
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setRolUsuario(item.id)}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#D4AF37] bg-[#D4AF37]/20 text-white shadow-[0_0_12px_rgba(212,175,55,0.25)] ring-1 ring-[#D4AF37]'
                            : 'border-[#232530] bg-[#161820] text-gray-400 hover:text-white hover:bg-[#1D202A]'
                        }`}
                      >
                        <span className="text-lg shrink-0">{item.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-[11px] leading-tight text-white truncate">
                            {item.label}
                          </div>
                          <div className="text-[9px] text-gray-500 font-mono mt-0.5 truncate">
                            {item.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-gray-400 font-mono italic">
                  * Solo quienes tengan el rol de <strong>Dueño</strong> o <strong>Administrador</strong> podrán ver y gestionar el Módulo de Usuarios.
                </p>
              </div>

              {/* Email */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1 font-mono">
                  CORREO ELECTRÓNICO (USUARIO):
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-3 text-[#D4AF37]/70">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@minegocio.com"
                    className="w-full bg-[#0D0E12] border border-[#232530] focus:border-[#D4AF37] rounded-xl pl-11 pr-4 py-2.5 text-xs text-white placeholder-gray-500 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1 font-mono">
                  CONTRASEÑA DE ACCESO:
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-3 text-[#D4AF37]/70">
                    <Lock size={16} />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-[#0D0E12] border border-[#232530] focus:border-[#D4AF37] rounded-xl pl-11 pr-4 py-2.5 text-xs text-white placeholder-gray-500 outline-none font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex flex-col sm:flex-row gap-2.5 border-t border-[#232530]">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 gold-gradient-btn hover:brightness-110 active:scale-[0.98] text-black py-3 rounded-xl text-xs font-extrabold tracking-wider uppercase shadow-[0_0_20px_rgba(212,175,55,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer font-mono disabled:opacity-50"
            >
              <Sparkles size={16} />
              <span>{loading ? 'Registrando Negocio...' : 'Crear Usuario y Activar Negocio'}</span>
              <ArrowRight size={14} />
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-3 rounded-xl border border-[#232530] bg-[#161820] text-gray-400 hover:text-white hover:bg-[#232530] text-xs font-mono transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          </div>

        </form>

      </div>

      {/* CONFIRMATION MODAL: "¿Estás seguro que este es tu rubro?" (Aparece solo al pulsar Crear Usuario) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-[#111216] border-2 border-[#D4AF37] rounded-2xl p-5 shadow-[0_0_50px_rgba(212,175,55,0.4)] text-center space-y-4">
            
            <div className="w-16 h-16 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center mx-auto text-3xl shadow-[0_0_20px_rgba(212,175,55,0.3)]">
              {RUBROS_CATALOG[selectedRubro]?.icon || '🏪'}
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#D4AF37] font-bold block mb-1">
                Confirmación Definitiva de Rubro
              </span>
              <h3 className="text-lg font-black text-white font-display uppercase tracking-wide">
                ¿Estás seguro que este es tu rubro?
              </h3>
            </div>

            <div className="bg-[#0D0E12] border border-[#232530] rounded-xl p-3.5 text-xs text-gray-300 font-mono text-left space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <span>{RUBROS_CATALOG[selectedRubro]?.icon}</span>
                <span>{RUBROS_CATALOG[selectedRubro]?.label || selectedRubro}</span>
              </div>
              <p className="text-[11px] text-[#F5DA76] font-sans leading-relaxed">
                ⚠️ <strong>Aviso Importante:</strong> Al momento de crear tu usuario y activar la cuenta, el rubro <strong className="text-white">"{selectedRubro}"</strong> quedará sellado de por vida y <strong className="text-white">no podrás cambiar de rubro</strong>.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-1 font-mono">
              <button
                type="button"
                disabled={loading}
                onClick={handleExecuteRegistration}
                className="w-full gold-gradient-btn text-black font-extrabold text-xs py-3 rounded-xl uppercase tracking-wider shadow-[0_0_15px_rgba(212,175,55,0.4)] hover:brightness-110 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Creando Usuario y Bloqueando Rubro...' : '🔒 Sí, Crear Usuario y Bloquear Rubro'}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowConfirmModal(false)}
                className="w-full py-2.5 rounded-xl border border-[#232530] bg-[#161820] text-gray-300 hover:text-white hover:bg-[#232530] text-xs cursor-pointer"
              >
                ↩️ Cambiar de Rubro
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
