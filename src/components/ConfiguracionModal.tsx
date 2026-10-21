import React, { useState, useEffect } from 'react';
import { Store, Building2, Phone, User, FileText, Check, Sparkles, RefreshCw, X, Lock, Unlock, Key, ShieldCheck, MapPin, Percent } from 'lucide-react';
import { ConfiguracionApp, Producto } from '../types/schema';

interface ConfiguracionModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ConfiguracionApp;
  onSaveConfig: (updated: Partial<ConfiguracionApp>) => void;
  onPurgeTestData?: () => void;
  isSuperAdmin?: boolean;
  onRequestSuperAdmin?: () => void;
}

export const RUBROS_DISPONIBLES = [
  { id: 'Ropa Deportiva', label: 'Ropa Deportiva', icon: '=U', desc: 'Franelas dry-fit, leggings, uniformes, calzado deportivo y accesorios' },
  { id: 'Bodega', label: 'Bodega & Minimarket', icon: '🏪', desc: 'Víveres, bebidas, snacks, productos empacados' },
  { id: 'Comida Rápida', label: 'Comida Rápida & Street Food', icon: '🍔', desc: 'Hamburguesas, perros, pepitos, pizzas, combos, tequeños y bebidas' },
  { id: 'Carnicería', label: 'Carnicería & Cortes Selectos', icon: '🥩', desc: 'Res, pollo, cerdo, vísceras, embutidos y cortes por Kg' },
  { id: 'Frutería', label: 'Frutería & Verdulería', icon: '🥑', desc: 'Verduras, hortalizas, frutas y tubérculos por Kg/Unidad' },
  { id: 'Charcutería', label: 'Charcutería & Delicatessen', icon: '🧀', desc: 'Embutidos, quesos, productos por Kg/Gramos' },
  { id: 'Papelería', label: 'Papelería & Librería', icon: '✏️', desc: 'Útiles, cuadernos, copias, artículos por unidad/paquete' },
  { id: 'Panadería', label: 'Panadería & Pastelería', icon: '🥖', desc: 'Panes, dulces, repostería' },
  { id: 'Farmacia', label: 'Farmacia & Salud', icon: '💊', desc: 'Medicamentos, higiene, cuidado personal' },
  { id: 'Ferretería', label: 'Ferretería & Construcción', icon: '🔧', desc: 'Herramientas, tornillos, pinturas' },
];

export const ConfiguracionModal: React.FC<ConfiguracionModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onPurgeTestData,
  isSuperAdmin = false,
  onRequestSuperAdmin,
}) => {
  const [nombre, setNombre] = useState(config?.nombreBodega || '');
  const [rubro, setRubro] = useState(config?.rubro || 'Bodega');
  const [propietario, setPropietario] = useState(config?.propietario || '');
  const [telefono, setTelefono] = useState(config?.telefonoAdmin || '');
  const [rif, setRif] = useState(config?.rif || '');
  const [direccion, setDireccion] = useState(config?.direccion || '');
  const [porcentajeIva, setPorcentajeIva] = useState(config?.porcentajeIva?.toString() || '16');
  const [rubroBloqueado, setRubroBloqueado] = useState(config?.rubroBloqueado ?? true);

  useEffect(() => {
    if (isOpen) {
      setNombre(config?.nombreBodega || '');
      setRubro(config?.rubro || 'Bodega');
      setPropietario(config?.propietario || '');
      setTelefono(config?.telefonoAdmin || '');
      setRif(config?.rif || '');
      setDireccion(config?.direccion || '');
      setPorcentajeIva(config?.porcentajeIva?.toString() || '16');
      setRubroBloqueado(config?.rubroBloqueado ?? true);
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const currentRubroObj = RUBROS_DISPONIBLES.find((r) => r.id === rubro) || RUBROS_DISPONIBLES[1];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      nombreBodega: nombre.trim() || 'Comercio',
      rubro: isSuperAdmin ? rubro : config.rubro, // Only Super Admin can change rubro
      propietario: propietario.trim(),
      telefonoAdmin: telefono.trim(),
      rif: rif.trim(),
      direccion: direccion.trim(),
      porcentajeIva: parseFloat(porcentajeIva) || 16,
      rubroBloqueado: isSuperAdmin ? rubroBloqueado : config.rubroBloqueado,
    });
    onClose();
  };

  const isRubroLockedForUser = !isSuperAdmin;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#111216] border border-[#D4AF37]/40 rounded-2xl w-full max-w-lg p-6 shadow-[0_20px_60px_rgba(0,0,0,0.85)] flex flex-col gap-5 text-white max-h-[92vh] overflow-y-auto custom-scrollbar animate-fadeIn">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#232530] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.2)]">
              <Store size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white font-display uppercase tracking-wider">
                  Ajustes del Negocio
                </h3>
                {isSuperAdmin ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#F5DA76] font-bold border border-[#D4AF37]/40">
                    👑 Super Admin
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 font-bold border border-blue-500/30">
                    🏢 Dueño de Tienda
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">
                Personaliza la marca, datos del propietario y fiscales
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg bg-[#232530] hover:bg-[#2F3242] transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Rubro Selector Section */}
          <div className="p-4 rounded-xl border border-[#232530] bg-[#0D0E12]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#F5DA76] uppercase tracking-wider flex items-center gap-1.5">
                {isRubroLockedForUser ? <Lock size={14} className="text-[#D4AF37]" /> : <ShieldCheck size={14} className="text-[#00E676]" />}
                Rubro Comercial Asignado
              </label>

              {/* If not super admin, show button to unlock */}
              {isRubroLockedForUser && onRequestSuperAdmin && (
                <button
                  type="button"
                  onClick={onRequestSuperAdmin}
                  className="text-[11px] text-[#F5DA76] hover:underline flex items-center gap-1 font-bold cursor-pointer"
                  title="Ingresar como Administrador General con PIN Maestro"
                >
                  <Key size={12} />
                  <span>Soy Administrador General</span>
                </button>
              )}
            </div>

            {isRubroLockedForUser ? (
              // LOCKED VIEW FOR STORE OWNER
              <div className="bg-[#161820] border border-[#232530] rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{currentRubroObj.icon}</span>
                  <div>
                    <div className="text-sm font-bold text-white font-display uppercase tracking-wide">
                      {currentRubroObj.label}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      Configurado exclusivamente por Legatix Master para este comercio.
                    </div>
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#F5DA76] text-[10px] font-bold uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <Lock size={11} />
                  <span>Perfil Sellado</span>
                </div>
              </div>
            ) : (
              // EDITABLE VIEW FOR SUPER ADMIN
              <div className="space-y-3">
                <p className="text-[11px] text-gray-300">
                  Como <strong>Administrador General</strong>, selecciona el rubro comercial correspondiente a este cliente:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {RUBROS_DISPONIBLES.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setRubro(item.id)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        rubro === item.id
                          ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-white shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                          : 'bg-[#161820] border-[#232530] text-gray-400 hover:bg-[#1D202A] hover:text-white'
                      }`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white leading-tight">{item.label}</div>
                        <div className="text-[10px] text-gray-400 truncate mt-0.5">{item.desc}</div>
                      </div>
                      {rubro === item.id && (
                        <div className="w-4 h-4 rounded-full bg-[#D4AF37] text-black flex items-center justify-center shrink-0">
                          <Check size={10} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Lock for Handover Toggle */}
                <div className="pt-2 border-t border-[#232530] flex items-center justify-between">
                  <div className="pr-3">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Lock size={12} className="text-[#D4AF37]" />
                      <span>Bloquear Rubro para Entrega al Cliente</span>
                    </div>
                    <div className="text-[10px] text-gray-400">
                      Impide que el dueño de tienda o cajeros cambien de rubro accidentalmente.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRubroBloqueado(!rubroBloqueado)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      rubroBloqueado
                        ? 'bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40 shadow-[0_0_10px_rgba(0,230,118,0.2)]'
                        : 'bg-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    {rubroBloqueado ? 'BLOQUEADO' : 'LIBRE'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Nombre Comercial del Negocio */}
          <div>
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
              Nombre Comercial del Negocio:
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-3 text-[#D4AF37]" size={16} />
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Papelería y Librería San José"
                className="w-full bg-[#0D0E12] border border-[#232530] focus:border-[#D4AF37] rounded-xl pl-10 pr-3 py-2.5 text-white text-sm outline-none font-bold"
              />
            </div>
          </div>

          {/* RIF o Documento Fiscal */}
          <div>
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
              RIF / Documento Fiscal:
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-gray-400" size={16} />
              <input
                type="text"
                value={rif}
                onChange={(e) => setRif(e.target.value)}
                placeholder="Ej. J-12345678-9 o V-12345678"
                className="w-full bg-[#0D0E12] border border-[#232530] focus:border-[#D4AF37] rounded-xl pl-10 pr-3 py-2.5 text-white text-sm outline-none font-mono uppercase"
              />
            </div>
          </div>

          {/* Dirección o Domicilio Fiscal (Para Notas de Entrega / Facturas SENIAT) */}
          <div>
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
              Dirección o Domicilio Fiscal (Normativa SENIAT):
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 text-[#D4AF37]" size={16} />
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Ej. Av. Libertador, Edif. Centro, Local PB-04, Caracas"
                className="w-full bg-[#0D0E12] border border-[#232530] focus:border-[#D4AF37] rounded-xl pl-10 pr-3 py-2.5 text-white text-sm outline-none"
              />
            </div>
          </div>

          {/* Porcentaje IVA SENIAT */}
          <div>
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
              Alícuota General de IVA (SENIAT %):
            </label>
            <div className="relative">
              <Percent className="absolute left-3 top-3 text-gray-400" size={16} />
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                value={porcentajeIva}
                onChange={(e) => setPorcentajeIva(e.target.value)}
                placeholder="16"
                className="w-full bg-[#0D0E12] border border-[#232530] focus:border-[#D4AF37] rounded-xl pl-10 pr-3 py-2.5 text-white text-sm outline-none font-mono"
              />
            </div>
          </div>

          {/* Propietario / Encargado */}
          <div>
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
              Nombre del Dueño o Encargado:
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-gray-400" size={16} />
              <input
                type="text"
                value={propietario}
                onChange={(e) => setPropietario(e.target.value)}
                placeholder="Ej. Lic. Carlos Gómez"
                className="w-full bg-[#0D0E12] border border-[#232530] focus:border-[#D4AF37] rounded-xl pl-10 pr-3 py-2.5 text-white text-sm outline-none"
              />
            </div>
          </div>

          {/* Teléfono WhatsApp */}
          <div>
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">
              Teléfono WhatsApp del Negocio:
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 text-gray-400" size={16} />
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+58 412 1234567"
                className="w-full bg-[#0D0E12] border border-[#232530] focus:border-[#D4AF37] rounded-xl pl-10 pr-3 py-2.5 text-white text-sm outline-none font-mono"
              />
            </div>
          </div>

          {/* Opción Limpiar Datos de Prueba para Producción */}
          {onPurgeTestData && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                  <ShieldCheck size={14} />
                  <span>Modo Producción: Limpiar Información Ficticia</span>
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  Vacía transacciones y productos de prueba para comenzar a operar en vivo.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm('¿Seguro que deseas purgar la información ficticia o de prueba y dejar el sistema limpio para producción?')) {
                    onPurgeTestData();
                    onClose();
                  }
                }}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-[11px] font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-all shrink-0 cursor-pointer"
              >
                Limpiar Prueba
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-3 border-t border-[#232530] mt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[#232530] hover:bg-[#2C2E3C] active:scale-95 text-gray-300 py-3 rounded-xl font-bold transition-all text-xs uppercase tracking-wider cursor-pointer border border-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 gold-gradient-btn hover:brightness-110 active:scale-95 text-black py-3 rounded-xl font-extrabold transition-all text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(212,175,55,0.35)] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check size={16} />
              <span>Guardar Cambios</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
