import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Key, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  Phone, 
  Mail, 
  Sparkles, 
  X,
  AlertTriangle,
  ArrowRight,
  Shield,
  UserCheck,
  ShieldAlert
} from 'lucide-react';
import { ConfiguracionApp, UsuarioNegocio, RolUsuario } from '../types/schema';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { 
  isUserBlocked, 
  getBlockedUsersList, 
  unblockUser, 
  syncBlockedUsersFromCloud,
  SUPER_ADMIN_EMAIL, 
  SECURITY_EVENT, 
  BlockedUserInfo 
} from '../utils/securityManager';

interface UsuariosModuleProps {
  config: ConfiguracionApp;
  onUpdateConfig: (updatedConfig: ConfiguracionApp) => void;
  isSuperAdmin?: boolean;
  currentUserEmail?: string;
}

export const UsuariosModule: React.FC<UsuariosModuleProps> = ({
  config,
  onUpdateConfig,
  isSuperAdmin = false,
  currentUserEmail = '',
}) => {
  // Check if current user has permission: only Dueño or Administrador or SuperAdmin
  const currentRole: RolUsuario = config.rolUsuarioActual || 'Dueño';
  const hasAccess = isSuperAdmin || currentRole === 'Dueño' || currentRole === 'Administrador';

  // Identificar si el usuario actual es el Administrador General (Javiercol28@gmail.com)
  const isGeneralAdmin = isSuperAdmin || 
    (currentUserEmail && currentUserEmail.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) ||
    (config.emailAdmin && config.emailAdmin.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase());

  // Lista de usuarios bloqueados por intentos fallidos
  const [blockedUsers, setBlockedUsers] = React.useState<BlockedUserInfo[]>(() => getBlockedUsersList());

  React.useEffect(() => {
    syncBlockedUsersFromCloud();
    const handleSecurityChange = () => {
      setBlockedUsers(getBlockedUsersList());
    };
    window.addEventListener(SECURITY_EVENT, handleSecurityChange);
    return () => window.removeEventListener(SECURITY_EVENT, handleSecurityChange);
  }, []);

  const handleUnblockUser = (targetEmail: string) => {
    if (!isGeneralAdmin) {
      toast.error('Acceso denegado: Solo el Administrador General (Javiercol28@gmail.com) puede desbloquear.');
      return;
    }
    const ok = unblockUser(targetEmail, currentUserEmail || SUPER_ADMIN_EMAIL, isSuperAdmin);
    if (ok) {
      setBlockedUsers(getBlockedUsersList());
      toast.success(`Usuario ${targetEmail} desbloqueado exitosamente. Ya puede iniciar sesión.`, {
        icon: '🔓',
        duration: 4000
      });
    } else {
      toast.error('No se pudo desbloquear al usuario.');
    }
  };

  // State of users
  const [usuarios, setUsuarios] = useState<UsuarioNegocio[]>(() => {
    // 1. If config has real users, filter out any mock/test users
    if (config.usuariosNegocio && config.usuariosNegocio.length > 0) {
      const cleanList = config.usuariosNegocio.filter(
        u => u.nombre !== 'Don José Pérez' && u.email !== 'caja1@negocio.com' && !u.nombre.includes('Cajero Principal')
      );
      if (cleanList.length > 0) return cleanList;
    }
    // 2. If localStorage has saved users, filter out mock/test users
    const saved = localStorage.getItem('bodeguero_usuarios_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleanList = parsed.filter(
            (u: any) => u.nombre !== 'Don José Pérez' && u.email !== 'caja1@negocio.com' && !u.nombre?.includes('Cajero Principal')
          );
          if (cleanList.length > 0) {
            return cleanList;
          }
        }
      } catch {}
    }
    // 3. If there is a real registered user from business onboarding
    const regUser = localStorage.getItem('bodeguero_registered_user');
    if (regUser) {
      try {
        const parsed = JSON.parse(regUser);
        if (parsed.propietario && parsed.propietario !== 'Don José Pérez') {
          return [
            {
              id: 'USR-001',
              nombre: parsed.propietario,
              email: parsed.email || '',
              telefono: parsed.telefono || '',
              rol: (config.rolUsuarioActual || 'Dueño') as RolUsuario,
              pinAcceso: '1234',
              activo: true,
              creadoEn: new Date().toLocaleDateString('es-VE'),
            }
          ];
        }
      } catch {}
    }
    // 4. If real proprietor is configured in business settings
    if (config.propietario && config.propietario !== 'Don José Pérez') {
      return [
        {
          id: 'USR-001',
          nombre: config.propietario,
          email: config.emailAdmin || '',
          telefono: config.telefono || config.telefonoAdmin || '',
          rol: (config.rolUsuarioActual || 'Dueño') as RolUsuario,
          pinAcceso: '1234',
          activo: true,
          creadoEn: new Date().toLocaleDateString('es-VE'),
        }
      ];
    }
    // Ready for production: clean slate!
    return [];
  });

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UsuarioNegocio | null>(null);

  // Form states
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [rol, setRol] = useState<RolUsuario>('Cajero');
  const [pinAcceso, setPinAcceso] = useState('');
  const [activo, setActivo] = useState(true);

  // Mask PIN toggle
  const [showPins, setShowPins] = useState<Record<string, boolean>>({});

  const togglePinVisibility = (id: string) => {
    setShowPins(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Save changes to config and localStorage
  const saveUsuariosList = (newList: UsuarioNegocio[]) => {
    setUsuarios(newList);
    localStorage.setItem('bodeguero_usuarios_v1', JSON.stringify(newList));
    const updatedConfig: ConfiguracionApp = {
      ...config,
      usuariosNegocio: newList,
    };
    onUpdateConfig(updatedConfig);
  };

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setNombre('');
    setEmail('');
    setTelefono('');
    setRol('Cajero');
    setPinAcceso(Math.floor(100000 + Math.random() * 900000).toString());
    setActivo(true);
    setShowModal(true);
  };

  const handleOpenEditModal = (u: UsuarioNegocio) => {
    setEditingUser(u);
    setNombre(u.nombre);
    setEmail(u.email);
    setTelefono(u.telefono || '');
    setRol(u.rol);
    setPinAcceso(u.pinAcceso || '1234');
    setActivo(u.activo);
    setShowModal(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error('El nombre del usuario es obligatorio');
      return;
    }
    if (!pinAcceso || pinAcceso.trim().length < 4) {
      toast.error('El PIN/clave de acceso debe tener mínimo 4 caracteres');
      return;
    }
    if (!editingUser && email.trim() && pinAcceso.trim().length < 6) {
      toast.error('Para crear una cuenta con correo en Supabase Auth, el PIN/contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (editingUser) {
      // Update existing
      const updatedList = usuarios.map(u => 
        u.id === editingUser.id 
          ? { 
              ...u, 
              nombre: nombre.trim(), 
              email: email.trim(), 
              telefono: telefono.trim(), 
              rol, 
              pinAcceso: pinAcceso.trim(),
              activo 
            } 
          : u
      );
      saveUsuariosList(updatedList);
      toast.success(`Usuario ${nombre.trim()} actualizado`);
    } else {
      // Create new
      const newUser: UsuarioNegocio = {
        id: `USR-${Date.now().toString().slice(-4)}`,
        nombre: nombre.trim(),
        email: email.trim() || `usuario${usuarios.length + 1}@negocio.com`,
        telefono: telefono.trim(),
        rol,
        pinAcceso: pinAcceso.trim(),
        activo,
        creadoEn: new Date().toLocaleDateString('es-VE'),
      };
      saveUsuariosList([...usuarios, newUser]);

      // Sincronizar usuario también con Supabase Auth si tiene email y clave >= 6 caracteres
      if (email.trim() && pinAcceso.trim().length >= 6) {
        supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password: pinAcceso.trim(),
          options: {
            data: {
              name: nombre.trim(),
              role: rol,
              phone: telefono.trim(),
            }
          }
        }).catch((err) => {
          console.warn('Registro de usuario en Supabase Auth:', err?.message);
        });
      }

      toast.success(`Usuario ${nombre.trim()} creado con rol de ${rol}`);
    }

    setShowModal(false);
  };

  const handleDeleteUser = (id: string, nombreUser: string) => {
    if (usuarios.length <= 1) {
      toast.error('Debe existir al menos un usuario registrado en el sistema.');
      return;
    }
    if (confirm(`¿Estás seguro de eliminar el usuario "${nombreUser}"? Esta acción no se puede deshacer.`)) {
      const filtered = usuarios.filter(u => u.id !== id);
      saveUsuariosList(filtered);
      toast.success(`Usuario eliminado correctamente.`);
    }
  };

  const handleToggleActivo = (id: string) => {
    const updated = usuarios.map(u => u.id === id ? { ...u, activo: !u.activo } : u);
    saveUsuariosList(updated);
    toast.success('Estado de acceso actualizado');
  };

  // Switch current active user
  const handleSwitchActiveUser = (u: UsuarioNegocio) => {
    const updatedConfig: ConfiguracionApp = {
      ...config,
      rolUsuarioActual: u.rol,
    };
    onUpdateConfig(updatedConfig);
    toast.success(`Sesión cambiada a: ${u.nombre} (${u.rol})`, { icon: '👤' });
  };

  // Access denied screen if user is not Dueño or Administrador
  if (!hasAccess) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center bg-[#090A0D] select-none">
        <div className="w-20 h-20 rounded-3xl bg-red-500/10 border-2 border-red-500/40 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
          <Lock size={36} className="text-red-400" />
        </div>
        <h2 className="text-xl font-black text-white uppercase font-display tracking-wider mb-2">
          Módulo de Usuarios Restringido
        </h2>
        <p className="text-xs text-gray-400 max-w-sm font-mono leading-relaxed mb-4">
          Solo el usuario con rol de <strong>Dueño</strong> o <strong>Administrador</strong> tiene autorización para ver y gestionar usuarios dentro de {config.nombreBodega}.
        </p>
        <div className="px-3 py-1.5 rounded-lg bg-[#111216] border border-[#232530] text-gray-300 text-xs font-mono">
          Tu rol actual: <strong className="text-[#F5DA76]">{currentRole}</strong>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#090A0D] text-white p-3 sm:p-5 overflow-y-auto custom-scrollbar select-none">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-[#232530] pb-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.2)]">
              <Users size={18} />
            </div>
            <h1 className="text-lg sm:text-xl font-black text-white font-display tracking-wider uppercase">
              Módulo de Usuarios & Personal
            </h1>
          </div>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Control de accesos, cajeros y roles autorizados para <strong className="text-[#D4AF37]">{config.nombreBodega}</strong>
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="gold-gradient-btn hover:brightness-110 active:scale-95 text-black px-4 py-2.5 rounded-xl font-black text-xs uppercase font-mono tracking-wider shadow-[0_0_15px_rgba(212,175,55,0.3)] flex items-center justify-center gap-2 cursor-pointer transition-all self-start sm:self-auto"
        >
          <UserPlus size={16} />
          <span>+ Nuevo Usuario</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-5 shrink-0 font-mono">
        <div className="bg-[#111216] border border-[#232530] rounded-xl p-3 flex flex-col justify-between hover:border-[#D4AF37]/30 transition-all">
          <span className="text-[10px] text-gray-400 uppercase tracking-wider">Total Personal</span>
          <span className="text-xl font-bold text-white mt-1">{usuarios.length}</span>
        </div>
        <div className="bg-[#111216] border border-[#D4AF37]/40 rounded-xl p-3 flex flex-col justify-between hover:border-[#D4AF37] transition-all">
          <span className="text-[10px] text-[#D4AF37] uppercase tracking-wider">Dueño / Admins</span>
          <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#F5DA76] to-[#D4AF37] mt-1">
            {usuarios.filter(u => u.rol === 'Dueño' || u.rol === 'Administrador').length}
          </span>
        </div>
        <div className="bg-[#111216] border border-[#232530] rounded-xl p-3 flex flex-col justify-between hover:border-[#D4AF37]/30 transition-all">
          <span className="text-[10px] text-[#00E676] uppercase tracking-wider">Cajeros Activos</span>
          <span className="text-xl font-bold text-[#00E676] mt-1">
            {usuarios.filter(u => u.rol === 'Cajero' && u.activo).length}
          </span>
        </div>
        <div className="bg-[#111216] border border-[#232530] rounded-xl p-3 flex flex-col justify-between hover:border-[#D4AF37]/30 transition-all">
          <span className="text-[10px] text-gray-400 uppercase tracking-wider">Tu Rol Activo</span>
          <span className="text-sm font-bold text-[#F5DA76] mt-1 truncate">
            {config.rolUsuarioActual || 'Dueño'}
          </span>
        </div>
      </div>

      {/* SECCIÓN EXCLUSIVA DE CONTROL DE SEGURIDAD (ADMINISTRADOR GENERAL) */}
      {blockedUsers.length > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-red-950/20 border-2 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.25)] shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 border-b border-red-500/20 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                <ShieldAlert size={18} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-red-300 font-mono">
                  Usuarios Bloqueados por Seguridad ({blockedUsers.length})
                </h3>
                <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                  Superaron el límite de 3 contraseñas incorrectas y requieren asistencia del Administrador General.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 font-bold">
                🔒 Bloqueo Activo
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {blockedUsers.map((bu) => (
              <div 
                key={bu.email} 
                className="bg-[#111216] border border-red-500/30 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white font-mono">{bu.email}</span>
                    <span className="text-[9px] bg-red-500/25 text-red-300 border border-red-500/50 px-1.5 py-0.2 rounded font-bold uppercase">
                      3 Fallos
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                    Bloqueado: {new Date(bu.blockedAt).toLocaleString('es-VE')} • {bu.reason}
                  </div>
                </div>

                {isGeneralAdmin ? (
                  <button
                    type="button"
                    onClick={() => handleUnblockUser(bu.email)}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95 shrink-0"
                    title="Desbloquear acceso para este usuario"
                  >
                    <Unlock size={14} />
                    <span>Desbloquear Usuario</span>
                  </button>
                ) : (
                  <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded shrink-0">
                    Solo Javiercol28@gmail.com puede desbloquear
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users List Cards or Empty State */}
      {usuarios.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#111216] border border-[#232530] rounded-2xl min-h-[260px]">
          <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] mb-4 shadow-[0_0_25px_rgba(212,175,55,0.25)]">
            <Users size={30} />
          </div>
          <h3 className="text-base font-bold text-white font-display uppercase tracking-wider mb-2">
            Sistema Listo para la Productividad
          </h3>
          <p className="text-xs text-gray-400 font-mono max-w-md mb-6 leading-relaxed">
            Sin datos de prueba cargados. Registra a tus cajeros o personal autorizado para comenzar a operar en tu comercio.
          </p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="gold-gradient-btn hover:brightness-110 active:scale-95 text-black px-5 py-3 rounded-xl font-black text-xs uppercase font-mono tracking-wider shadow-[0_0_15px_rgba(212,175,55,0.3)] flex items-center gap-2 cursor-pointer transition-all"
          >
            <UserPlus size={16} />
            <span>+ Registrar Primer Usuario</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 pb-6 flex-1">
          {usuarios.map((u) => {
          const isOwnerOrAdmin = u.rol === 'Dueño' || u.rol === 'Administrador';
          const isCurrentActive = config.rolUsuarioActual === u.rol;

          return (
            <div
              key={u.id}
              className={`bg-[#111216] border rounded-2xl p-4 transition-all relative flex flex-col justify-between shadow-lg ${
                u.activo 
                  ? isOwnerOrAdmin 
                    ? 'border-[#D4AF37]/40 hover:border-[#D4AF37] shadow-[0_4px_20px_rgba(0,0,0,0.5)]' 
                    : 'border-[#232530] hover:border-[#D4AF37]/40'
                  : 'border-red-500/30 opacity-60'
              }`}
            >
              <div>
                {/* User Card Top Row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 ${
                      u.rol === 'Dueño'
                        ? 'bg-gradient-to-br from-[#F5DA76] via-[#D4AF37] to-[#A88120] text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]'
                        : u.rol === 'Administrador'
                        ? 'bg-[#D4AF37]/20 text-[#F5DA76] border border-[#D4AF37]/40'
                        : u.rol === 'Supervisor'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                        : 'bg-[#232530] text-[#E0E2EC] border border-[#353945]'
                    }`}>
                      {u.rol === 'Dueño' ? '👑' : u.rol === 'Administrador' ? '🛡️' : u.rol === 'Supervisor' ? '💼' : '🧑‍💼'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-sm truncate font-display tracking-wide">
                          {u.nombre}
                        </h3>
                        {isCurrentActive && (
                          <span className="text-[9px] bg-[#D4AF37]/20 text-[#F5DA76] border border-[#D4AF37]/40 px-1.5 py-0.2 rounded font-mono font-bold uppercase">
                            Tú
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                          u.rol === 'Dueño'
                            ? 'bg-[#D4AF37]/20 text-[#F5DA76] border border-[#D4AF37]/50'
                            : u.rol === 'Administrador'
                            ? 'bg-[#D4AF37]/15 text-[#F5DA76] border border-[#D4AF37]/35'
                            : u.rol === 'Supervisor'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            : 'bg-white/5 text-gray-300 border border-white/10'
                        }`}>
                          {u.rol}
                        </span>
                        
                        {isUserBlocked(u.email) ? (
                          <span className="text-[9px] font-mono text-red-400 bg-red-500/20 border border-red-500/40 px-1.5 py-0.2 rounded font-bold animate-pulse">
                            🔒 Bloqueado (3 fallos)
                          </span>
                        ) : (
                          <span className={`text-[9px] font-mono ${u.activo ? 'text-[#00E676]' : 'text-red-400'}`}>
                            ● {u.activo ? 'Activo' : 'Suspendido'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(u)}
                      title="Editar usuario"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <Edit3 size={15} />
                    </button>
                    {u.rol !== 'Dueño' && (
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u.id, u.nombre)}
                        title="Eliminar usuario"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Details list */}
                <div className="bg-[#0D0E12] border border-[#232530] rounded-xl p-2.5 space-y-1.5 text-xs font-mono text-gray-300 mb-3">
                  {u.email && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-1 text-[11px]">
                        <Mail size={12} /> Correo:
                      </span>
                      <span className="truncate max-w-[200px] text-white">{u.email}</span>
                    </div>
                  )}

                  {u.telefono && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center gap-1 text-[11px]">
                        <Phone size={12} /> WhatsApp:
                      </span>
                      <span>{u.telefono}</span>
                    </div>
                  )}

                  {/* Quick Access PIN */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#232530]">
                    <span className="text-gray-500 flex items-center gap-1 text-[11px]">
                      <Key size={12} className="text-[#D4AF37]" /> PIN Rápido:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[#D4AF37] font-mono tracking-widest">
                        {showPins[u.id] ? u.pinAcceso : '••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() => togglePinVisibility(u.id)}
                        className="text-gray-400 hover:text-white p-0.5 cursor-pointer"
                      >
                        {showPins[u.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom quick actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-[#232530] font-mono text-xs">
                <button
                  type="button"
                  onClick={() => handleSwitchActiveUser(u)}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isCurrentActive
                      ? 'bg-white/10 text-gray-400 cursor-default'
                      : 'bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#F5DA76] border border-[#D4AF37]/40 active:scale-95'
                  }`}
                  disabled={isCurrentActive}
                >
                  <UserCheck size={13} />
                  <span>{isCurrentActive ? 'Sesión Actual' : 'Cambiar a este Cajero/Rol'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleActivo(u.id)}
                  title={u.activo ? 'Desactivar acceso' : 'Habilitar acceso'}
                  className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
                    u.activo 
                      ? 'border-[#232530] text-gray-400 hover:text-red-400 hover:bg-red-500/10'
                      : 'border-[#00E676]/40 text-[#00E676] bg-[#00E676]/10 hover:bg-[#00E676]/20'
                  }`}
                >
                  {u.activo ? <Unlock size={14} /> : <Lock size={14} />}
                </button>
              </div>

              {/* Botón de desbloqueo exclusivo del Administrador General */}
              {isUserBlocked(u.email) && isGeneralAdmin && (
                <button
                  type="button"
                  onClick={() => handleUnblockUser(u.email)}
                  className="w-full mt-2 py-1.5 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                >
                  <Unlock size={13} />
                  <span>Desbloquear Acceso (Javiercol28)</span>
                </button>
              )}

            </div>
          );
        })}
      </div>
      )}

      {/* CREATE / EDIT USER MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#111216] border border-[#D4AF37]/40 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-[#232530] bg-gradient-to-r from-[#161820] to-[#121318] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-[#D4AF37]" />
                <h3 className="font-bold text-white text-sm uppercase font-display tracking-wider">
                  {editingUser ? 'Editar Usuario de la Organización' : 'Nuevo Usuario / Cajero'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveUser} className="p-4 sm:p-5 overflow-y-auto space-y-3.5 custom-scrollbar font-mono text-xs">
              
              {/* Nombre */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Nombre Completo del Usuario:
                </label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Carlos Mendoza"
                  className="w-full bg-[#0D0E12] border border-[#232530] focus:border-[#D4AF37] rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              {/* Rol en la Organización */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                  ¿Qué Rol Tiene Dentro de la Organización?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Dueño', 'Administrador', 'Supervisor', 'Cajero'] as RolUsuario[]).map((r) => {
                    const isSelected = rol === r;
                    return (
                      <button
                        type="button"
                        key={r}
                        onClick={() => setRol(r)}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#F5DA76] shadow-[0_0_12px_rgba(212,175,55,0.25)]'
                            : 'border-[#232530] bg-[#0D0E12] text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span className="text-base">
                          {r === 'Dueño' ? '👑' : r === 'Administrador' ? '🛡️' : r === 'Supervisor' ? '💼' : '🧑‍💼'}
                        </span>
                        <div>
                          <div className="font-bold text-[11px] leading-tight">{r}</div>
                          <div className="text-[9px] text-gray-500">
                            {r === 'Dueño' || r === 'Administrador' ? 'Acceso Total + Usuarios' : 'POS & Operativo'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Correo Electrónico (Para Inicio de Sesión):
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@negocio.com"
                  className="w-full bg-[#0D0E12] border border-[#232530] focus:border-[#D4AF37] rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              {/* Teléfono */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Teléfono / WhatsApp:
                </label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="+584120000000"
                  className="w-full bg-[#0D0E12] border border-[#232530] focus:border-[#D4AF37] rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              {/* PIN Acceso Rápido */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  PIN Rápido (4 dígitos para cambio de turno en POS):
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={pinAcceso}
                  onChange={(e) => setPinAcceso(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="1234"
                  className="w-full bg-[#0D0E12] border border-[#D4AF37]/50 focus:border-[#D4AF37] rounded-xl px-3 py-2 text-white font-mono tracking-widest text-center text-sm outline-none"
                />
              </div>

              {/* Activo / Inactivo */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0D0E12] border border-[#232530]">
                <span className="text-[11px] text-gray-300 font-bold">Estado de Acceso:</span>
                <button
                  type="button"
                  onClick={() => setActivo(!activo)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activo 
                      ? 'bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40 shadow-[0_0_10px_rgba(0,230,118,0.2)]' 
                      : 'bg-red-500/20 text-red-400 border border-red-500/40'
                  }`}
                >
                  {activo ? '🟢 Activo' : '🔴 Suspendido'}
                </button>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 gold-gradient-btn hover:brightness-110 active:scale-95 text-black py-2.5 rounded-xl font-extrabold uppercase tracking-wider shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all cursor-pointer"
                >
                  {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#232530] bg-[#161820] text-gray-400 hover:text-white hover:bg-[#232530] cursor-pointer"
                >
                  Cancelar
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
