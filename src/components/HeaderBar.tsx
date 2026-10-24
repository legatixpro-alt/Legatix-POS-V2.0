import React, { useState, useEffect } from 'react';
import { ConfiguracionApp, ActiveTab } from '../types/schema';
import { X, LayoutDashboard, ShoppingCart, Package, Users, Calculator, LogOut, Landmark, Store, Lock, ShieldCheck, Sparkles, Menu, Maximize2, Minimize2, Bot } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderBarProps {
  config: ConfiguracionApp;
  onUpdateTasa: (newTasa: number) => void;
  isOffline: boolean;
  onToggleOffline: () => void;
  pendingSyncCount: number;
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  onLogout: () => void;
  onOpenCalculator: () => void;
  onOpenTasaModal?: () => void;
  onOpenConfigModal?: () => void;
  onOpenSyncModal?: () => void;
  role: 'Administrador' | 'Cajero';
  isSuperAdmin?: boolean;
  onOpenRegistroNegocio?: () => void;
  onSwitchRole: () => void;
  onToggleSuperAdmin?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  config,
  isOffline,
  onToggleOffline,
  pendingSyncCount,
  activeTab,
  onChangeTab,
  onLogout,
  onOpenCalculator,
  onOpenTasaModal,
  onOpenConfigModal,
  onOpenSyncModal,
  role,
  isSuperAdmin = false,
  onOpenRegistroNegocio,
  onSwitchRole,
  onToggleSuperAdmin
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const isUserAdminOrOwner = isSuperAdmin || config?.rolUsuarioActual === 'Dueño' || config?.rolUsuarioActual === 'Administrador' || role === 'Administrador';

  const handleTabChange = (tab: ActiveTab) => {
    onChangeTab(tab);
    setIsMenuOpen(false);
  };

  return (
    <>
      <header className="bg-[#101114]/95 backdrop-blur-md border-b border-[#D4AF37]/30 px-2.5 sm:px-6 py-2 sm:py-3 text-white select-none z-40 relative shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between gap-2 sm:gap-6 w-full">
          
          {/* Brand & Store Name (Spacious, Responsive & Legible) */}
          <div className="flex items-center shrink-0 mr-2 sm:mr-4">
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="flex items-center gap-2.5 sm:gap-3 group active:scale-95 transition-transform text-left cursor-pointer shrink-0"
              title="Abrir menú principal de navegación"
            >
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#D4AF37] to-[#8C6D1F] p-0.5 shrink-0 shadow-[0_0_14px_rgba(212,175,55,0.4)]">
                <img 
                  src="/oh-store-logo.jpg" 
                  alt="OH Store" 
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <div className="flex flex-col shrink-0 min-w-max">
                <span className="text-sm xs:text-base sm:text-lg md:text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#FFF0BA] via-[#D4AF37] to-[#ECC855] font-display uppercase leading-tight whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  {config?.nombreBodega || 'OH STORE'}
                </span>
                <div className="flex items-center gap-1.5 text-[9px] xs:text-[10px] sm:text-[11px] text-gray-400 font-mono whitespace-nowrap mt-0.5">
                  {config?.propietario && (
                    <>
                      <span className="text-emerald-400 font-semibold truncate max-w-[85px] xs:max-w-[120px] sm:max-w-none flex items-center gap-0.5" title={`Usuario/Dueño: ${config.propietario}`}>
                        <span className="text-[8px] xs:text-[9px]">👤</span>
                        <span className="truncate">{config.propietario}</span>
                      </span>
                      <span className="text-gray-600">•</span>
                    </>
                  )}
                  <span className="text-gray-300 font-medium">{config?.rubro || 'Ropa Deportiva'}</span>
                  <span className="text-gray-600">•</span>
                  <span className={`px-1.5 py-0.2 rounded font-sans font-bold text-[8px] xs:text-[9px] uppercase tracking-wider shrink-0 ${
                      isSuperAdmin
                        ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/50 shadow-[0_0_8px_rgba(212,175,55,0.2)]'
                        : (config?.rolUsuarioActual === 'Dueño' 
                            ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50' 
                            : (role === 'Administrador' || config?.rolUsuarioActual === 'Administrador'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' 
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'))
                    }`}>
                      {isSuperAdmin 
                        ? '👑 Super Admin' 
                        : (config?.rolUsuarioActual === 'Dueño' 
                            ? '👑 Dueño' 
                            : (role === 'Administrador' || config?.rolUsuarioActual === 'Administrador' 
                                ? '🛡️ Admin' 
                                : (config?.rolUsuarioActual === 'Supervisor' ? '💼 Supervisor' : '🧑‍💼 Cajero')))}
                    </span>
                </div>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Tabs (Direct visible desktop workstation navigation) */}
          <nav className="hidden xl:flex items-center gap-1.5 bg-[#090A0D]/90 border border-[#D4AF37]/30 p-1 rounded-xl shrink-0 mx-2 shadow-[0_0_15px_rgba(0,0,0,0.6)]">
            <button
              type="button"
              onClick={() => handleTabChange('pos')}
              className={`flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'pos'
                  ? 'bg-gradient-to-r from-[#F5DA76] via-[#D4AF37] to-[#A88120] text-black shadow-[0_0_14px_rgba(212,175,55,0.45)] font-black'
                  : 'text-gray-300 hover:text-[#FFF0BA] hover:bg-[#D4AF37]/10'
              }`}
            >
              <ShoppingCart size={15} />
              <span>POS</span>
              <span className={`text-[10px] font-mono px-1 py-0.2 rounded ${activeTab === 'pos' ? 'bg-black/25 text-black font-bold' : 'bg-white/10 text-gray-400'}`}>F1</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('inventario')}
              className={`flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'inventario'
                  ? 'bg-gradient-to-r from-[#F5DA76] via-[#D4AF37] to-[#A88120] text-black shadow-[0_0_14px_rgba(212,175,55,0.45)] font-black'
                  : 'text-gray-300 hover:text-[#FFF0BA] hover:bg-[#D4AF37]/10'
              }`}
            >
              <Package size={15} />
              <span>Inventario</span>
              <span className={`text-[10px] font-mono px-1 py-0.2 rounded ${activeTab === 'inventario' ? 'bg-black/25 text-black font-bold' : 'bg-white/10 text-gray-400'}`}>F2</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('clientes')}
              className={`flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'clientes'
                  ? 'bg-gradient-to-r from-[#F5DA76] via-[#D4AF37] to-[#A88120] text-black shadow-[0_0_14px_rgba(212,175,55,0.45)] font-black'
                  : 'text-gray-300 hover:text-[#FFF0BA] hover:bg-[#D4AF37]/10'
              }`}
            >
              <Users size={15} />
              <span>Clientes</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('fiado')}
              className={`flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'fiado'
                  ? 'bg-gradient-to-r from-[#F5DA76] via-[#D4AF37] to-[#A88120] text-black shadow-[0_0_14px_rgba(212,175,55,0.45)] font-black'
                  : 'text-gray-300 hover:text-[#FFF0BA] hover:bg-[#D4AF37]/10'
              }`}
            >
              <Landmark size={15} />
              <span className="hidden xl:inline">Deudores & </span><span>Proveedores</span>
              <span className={`text-[10px] font-mono px-1 py-0.2 rounded ${activeTab === 'fiado' ? 'bg-black/25 text-black font-bold' : 'bg-white/10 text-gray-400'}`}>F3</span>
            </button>

            {isUserAdminOrOwner && (
              <button
                type="button"
                onClick={() => handleTabChange('dashboard')}
                className={`flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-gradient-to-r from-[#F5DA76] via-[#D4AF37] to-[#A88120] text-black shadow-[0_0_14px_rgba(212,175,55,0.45)] font-black'
                    : 'text-gray-300 hover:text-[#FFF0BA] hover:bg-[#D4AF37]/10'
                }`}
              >
                <LayoutDashboard size={15} />
                <span>Cierre</span>
                <span className={`text-[10px] font-mono px-1 py-0.2 rounded ${activeTab === 'dashboard' ? 'bg-black/25 text-black font-bold' : 'bg-white/10 text-gray-400'}`}>F4</span>
              </button>
            )}

            {isUserAdminOrOwner && (
              <button
                type="button"
                onClick={() => handleTabChange('usuarios')}
                className={`flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'usuarios'
                    ? 'bg-gradient-to-r from-[#F5DA76] via-[#D4AF37] to-[#A88120] text-black shadow-[0_0_14px_rgba(212,175,55,0.45)] font-black'
                    : 'text-gray-300 hover:text-[#FFF0BA] hover:bg-[#D4AF37]/10'
                }`}
              >
                <ShieldCheck size={15} />
                <span>Personal</span>
                <span className={`text-[10px] font-mono px-1 py-0.2 rounded ${activeTab === 'usuarios' ? 'bg-black/25 text-black font-bold' : 'bg-white/10 text-gray-400'}`}>F5</span>
              </button>
            )}

            {/* LegaBox IA */}
            <button
              type="button"
              onClick={() => handleTabChange('legabox')}
              className={`flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'legabox'
                  ? 'bg-gradient-to-r from-[#F5DA76] via-[#D4AF37] to-[#A88120] text-black shadow-[0_0_14px_rgba(212,175,55,0.45)] font-black'
                  : 'text-amber-300 hover:text-[#FFF0BA] hover:bg-[#D4AF37]/15 border border-[#D4AF37]/40 shadow-[0_0_10px_rgba(212,175,55,0.15)]'
              }`}
            >
              <div className="w-4 h-4 rounded-full overflow-hidden border border-[#D4AF37] shrink-0">
                <img src="/legabox.jpg" alt="LegaBox" className="w-full h-full object-cover" />
              </div>
              <span className="font-display">LegaBox</span>
              <span className={`text-[9px] font-mono px-1 py-0.2 rounded font-bold ${activeTab === 'legabox' ? 'bg-black/25 text-black' : 'bg-[#D4AF37]/25 text-[#D4AF37]'}`}>IA</span>
              <span className={`text-[10px] font-mono px-1 py-0.2 rounded ${activeTab === 'legabox' ? 'bg-black/25 text-black font-bold' : 'bg-white/10 text-gray-400'}`}>F6</span>
            </button>
          </nav>

          {/* Quick Actions Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Direct Button: Pantalla Completa */}
            <button
              type="button"
              onClick={handleToggleFullscreen}
              title={isFullscreen ? "Salir de pantalla completa (F11 o Esc)" : "Pantalla Completa para Punto de Venta (F11)"}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0 border ${
                isFullscreen
                  ? 'border-[#00E676]/60 bg-[#00E676]/15 text-[#00E676] shadow-[0_0_12px_rgba(0,230,118,0.25)]'
                  : 'border-[#D4AF37]/40 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#FFF0BA] hover:border-[#D4AF37]/70 shadow-[0_0_10px_rgba(212,175,55,0.1)]'
              }`}
            >
              {isFullscreen ? <Minimize2 size={14} className="text-[#00E676]" /> : <Maximize2 size={14} className="text-[#D4AF37]" />}
              <span className="font-display text-xs tracking-wide hidden sm:inline">
                {isFullscreen ? 'VENTANA' : 'PANTALLA COMPLETA'}
              </span>
            </button>

            {/* Direct Button: Calculadora (Desktop) */}
            <button
              type="button"
              onClick={onOpenCalculator}
              title="Calculadora de Mostrador (F12)"
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-gray-200 transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Calculator size={14} className="text-[#D4AF37]" />
              <span className="font-display">CALC</span>
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/10 text-gray-400">F12</span>
            </button>

            {/* Direct Button: Tasa BCV */}
            {onOpenTasaModal && (
              <button
                onClick={onOpenTasaModal}
                title="Tasa de Cambio Oficial y Manual (F9)"
                className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold border border-[#D4AF37]/50 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] transition-all active:scale-95 shadow-[0_0_10px_rgba(212,175,55,0.1)] shrink-0 cursor-pointer"
              >
                <Landmark size={13} className="text-[#D4AF37]" />
                <span className="text-white/70 hidden md:inline text-[10px]">TASA:</span>
                <span>{(Number(config?.tasaCambioUSD) || 1).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-black/60 text-[#D4AF37] font-mono font-bold hidden md:inline">
                  F9
                </span>
              </button>
            )}

            {/* Online / Offline status button */}
            <button
              type="button"
              onClick={onOpenSyncModal || onToggleOffline}
              title={
                isOffline
                  ? `⚡ Modo Offline Activo (${pendingSyncCount} pendientes). Clic para ver detalles.`
                  : pendingSyncCount > 0
                  ? `⚡ En Línea • ${pendingSyncCount} pendientes por subir.`
                  : '🟢 En Línea • Todo sincronizado en la nube.'
              }
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold shrink-0 transition-all cursor-pointer active:scale-95 ${
                isOffline
                  ? 'bg-[#FF8C00]/20 text-[#FF8C00] border border-[#FF8C00]/50 shadow-[0_0_10px_rgba(255,140,0,0.2)]'
                  : pendingSyncCount > 0
                  ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/50 animate-pulse'
                  : 'bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/40'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isOffline
                    ? 'bg-[#FF8C00]'
                    : pendingSyncCount > 0
                    ? 'bg-[#D4AF37]'
                    : 'bg-[#00E676] animate-pulse'
                }`}
              ></span>
              <span className="font-display uppercase tracking-wider text-[9px] sm:text-[10px]">
                {isOffline
                  ? `OFFLINE ${pendingSyncCount > 0 ? `(${pendingSyncCount})` : ''}`
                  : pendingSyncCount > 0
                  ? `SUBIENDO (${pendingSyncCount})`
                  : 'ONLINE'}
              </span>
            </button>

            {/* Desktop Direct Logout */}
            <button
              type="button"
              onClick={onLogout}
              title="Cerrar sesión"
              className="hidden xl:flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-mono text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-white/5 hover:border-red-500/30 transition-all cursor-pointer shrink-0"
            >
              <LogOut size={13} />
            </button>

            {/* Mobile / Tablet Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              className="xl:hidden flex items-center justify-center p-1.5 rounded-lg text-gray-300 hover:text-white bg-white/5 border border-white/10 cursor-pointer"
              title="Abrir menú"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Full Screen Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-[#0E0F12]/95 backdrop-blur-lg flex flex-col animate-in fade-in duration-200">
          <div className="flex justify-between items-center p-5 border-b border-white/10 max-w-xl w-full mx-auto">
            <div className="flex items-center gap-2.5">
              <Store size={18} className="text-[#D4AF37]" />
              <span className="text-sm font-bold text-white uppercase tracking-wider font-display">
                Menú Principal Legatix
              </span>
            </div>
            <button 
              onClick={() => setIsMenuOpen(false)}
              className="text-gray-400 hover:text-white p-2 active:scale-90 transition-transform cursor-pointer"
            >
              <X size={26} />
            </button>
          </div>

          <div className="flex-1 flex flex-col px-6 py-5 overflow-y-auto max-w-xl w-full mx-auto">
            {/* Business Status Card */}
            <div className="mb-6 p-4 rounded-xl border border-[#D4AF37]/50 bg-gradient-to-r from-[#D4AF37]/15 to-black flex items-center justify-between shadow-[0_0_20px_rgba(212,175,55,0.15)]">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#D4AF37]/60 shadow-[0_0_12px_rgba(212,175,55,0.25)] flex items-center justify-center shrink-0 bg-black">
                  <img 
                    src="/oh-store-logo.jpg" 
                    alt="Logo OH Store" 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">Negocio Activo</span>
                  <h4 className="text-base font-bold text-white font-display uppercase tracking-wide">
                    {config?.nombreBodega || 'OH Store'}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-[#D4AF37] font-semibold">
                      Rubro: {config?.rubro || 'Comercio'}
                    </span>
                    {config?.rubroBloqueado && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                        <Lock size={10} /> Sellado
                      </span>
                    )}
                  </div>
                </div>
              </div>
                          </div>

            {/* Navigation links */}
            <div className="space-y-2">

              {/* Cierre de Caja & Dashboard (Solo Dueño o Administrador) */}
              {isUserAdminOrOwner && (
                <button 
                  onClick={() => handleTabChange('dashboard')}
                  className={`w-full flex items-center justify-between px-5 py-3.5 rounded-xl border border-white/10 transition-all cursor-pointer ${
                    activeTab === 'dashboard' 
                      ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8942E] text-black shadow-[0_0_20px_rgba(212,175,55,0.4)]' 
                      : 'text-white hover:bg-white/5 active:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <LayoutDashboard size={20} className={activeTab === 'dashboard' ? 'text-black' : 'text-[#D4AF37]'} />
                    <span className="font-semibold text-sm font-display tracking-wider uppercase">Cierre de Caja & Métricas</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                    activeTab === 'dashboard' ? 'bg-black text-[#D4AF37]' : 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40'
                  }`}>
                    Admin
                  </span>
                </button>
              )}

              {/* Punto de Venta (POS) - Todos los roles */}
              <button 
                onClick={() => handleTabChange('pos')}
                className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl border border-white/10 transition-all cursor-pointer ${
                  activeTab === 'pos' 
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8942E] text-black shadow-[0_0_20px_rgba(212,175,55,0.4)]' 
                    : 'text-white hover:bg-white/5 active:bg-white/10'
                }`}
              >
                <ShoppingCart size={20} className={activeTab === 'pos' ? 'text-black' : 'text-[#00E676]'} />
                <span className="font-semibold text-sm font-display tracking-wider uppercase">Punto de Venta (POS)</span>
              </button>

              {/* Inventario de Productos */}
              <button 
                onClick={() => handleTabChange('inventario')}
                className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl border border-white/10 transition-all cursor-pointer ${
                  activeTab === 'inventario' 
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8942E] text-black shadow-[0_0_20px_rgba(212,175,55,0.4)]' 
                    : 'text-white hover:bg-white/5 active:bg-white/10'
                }`}
              >
                <Package size={20} className={activeTab === 'inventario' ? 'text-black' : 'text-[#D4AF37]'} />
                <span className="font-semibold text-sm font-display tracking-wider uppercase">Inventario de Productos</span>
              </button>

              {/* Clientes & Remarketing */}
              <button 
                onClick={() => handleTabChange('clientes')}
                className={`w-full flex items-center justify-between px-5 py-3.5 rounded-xl border border-white/10 transition-all cursor-pointer ${
                  activeTab === 'clientes' 
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8942E] text-black shadow-[0_0_20px_rgba(212,175,55,0.4)]' 
                    : 'text-white hover:bg-white/5 active:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-4">
                  <Users size={20} className={activeTab === 'clientes' ? 'text-black' : 'text-[#38BDF8]'} />
                  <div className="text-left">
                    <span className="font-semibold text-sm font-display tracking-wider uppercase block">
                      Clientes & Remarketing
                    </span>
                    <span className={`text-[10px] font-mono ${activeTab === 'clientes' ? 'text-black/80' : 'text-gray-400'}`}>
                      Datos SENIAT y campañas de WhatsApp
                    </span>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                  activeTab === 'clientes' ? 'bg-black text-[#D4AF37]' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}>
                  SENIAT
                </span>
              </button>

              {/* Deudores y Proveedores (Fiado) */}
              <button 
                onClick={() => handleTabChange('fiado')}
                className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl border border-white/10 transition-all cursor-pointer ${
                  activeTab === 'fiado' 
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8942E] text-black shadow-[0_0_20px_rgba(212,175,55,0.4)]' 
                    : 'text-white hover:bg-white/5 active:bg-white/10'
                }`}
              >
                <Users size={20} className={activeTab === 'fiado' ? 'text-black' : 'text-[#69F0AE]'} />
                <span className="font-semibold text-sm font-display tracking-wider uppercase">Deudores y Proveedores</span>
              </button>

              {/* Módulo de Usuarios & Personal (SOLO Dueño o Administrador) */}
              {isUserAdminOrOwner && (
                <button 
                  onClick={() => handleTabChange('usuarios')}
                  className={`w-full flex items-center justify-between px-5 py-3.5 rounded-xl border border-white/10 transition-all cursor-pointer ${
                    activeTab === 'usuarios' 
                      ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8942E] text-black shadow-[0_0_20px_rgba(212,175,55,0.4)]' 
                      : 'text-white hover:bg-white/5 active:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <ShieldCheck size={20} className={activeTab === 'usuarios' ? 'text-black' : 'text-[#D4AF37]'} />
                    <div className="text-left">
                      <span className="font-semibold text-sm font-display tracking-wider uppercase block">
                        Módulo de Usuarios
                      </span>
                      <span className={`text-[10px] font-mono ${activeTab === 'usuarios' ? 'text-black/80' : 'text-gray-400'}`}>
                        Gestión de cajeros y roles autorizados
                      </span>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                    activeTab === 'usuarios' ? 'bg-black text-[#D4AF37]' : 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40'
                  }`}>
                    Exclusivo
                  </span>
                </button>
              )}

              {/* LegaBox IA - Copiloto de Negocios */}
              <button 
                onClick={() => handleTabChange('legabox')}
                className={`w-full flex items-center justify-between px-5 py-3.5 rounded-xl border border-[#D4AF37]/40 transition-all cursor-pointer ${
                  activeTab === 'legabox' 
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8942E] text-black shadow-[0_0_20px_rgba(212,175,55,0.4)]' 
                    : 'bg-gradient-to-r from-[#D4AF37]/15 via-black to-[#D4AF37]/10 text-white hover:bg-white/5 active:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl overflow-hidden border border-[#D4AF37] shrink-0 p-0.5 bg-[#16171D] shadow-[0_0_10px_rgba(212,175,55,0.3)]">
                    <img src="/legabox.jpg" alt="LegaBox" className="w-full h-full object-cover rounded-lg" />
                  </div>
                  <div className="text-left">
                    <span className="font-semibold text-sm font-display tracking-wider uppercase block">
                      LegaBox IA
                    </span>
                    <span className={`text-[10px] font-mono ${activeTab === 'legabox' ? 'text-black/80 font-bold' : 'text-[#D4AF37]'}`}>
                      Asesor de Negocios & Sugerencias
                    </span>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                  activeTab === 'legabox' ? 'bg-black text-[#D4AF37]' : 'bg-[#D4AF37] text-black'
                }`}>
                  IA
                </span>
              </button>
            </div>

            {/* Quick Tools & Logout */}
            <div className="mt-6 border-t border-white/10 pt-5 space-y-3">
              {/* Quick Calculator */}
              <button 
                onClick={() => {
                  onOpenCalculator();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-white/10 bg-black/30 hover:bg-white/5 text-gray-300 transition-colors cursor-pointer text-left"
              >
                <Calculator size={18} className="text-[#D4AF37]" />
                <span className="text-xs font-bold font-display uppercase tracking-wider">Calculadora Rápida</span>
              </button>

              {/* Instalar como app nativa (PWA) */}
              <PWAInstallButton />
            </div>
            
            <div className="mt-auto pt-6 pb-6">
              <button 
                onClick={onLogout}
                className="w-full py-3 border border-[#FF5252]/40 text-[#FF5252] rounded-xl font-display uppercase tracking-widest text-xs font-bold hover:bg-[#FF5252]/10 active:scale-95 transition-all flex justify-center items-center gap-2 cursor-pointer"
              >
                <LogOut size={14} /> Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
