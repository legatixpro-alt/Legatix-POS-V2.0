import React, { useState } from 'react';
import { Lock, Phone, MessageSquare, ShieldAlert, Key, LogOut, CheckCircle, AlertTriangle } from 'lucide-react';
import { ConfiguracionApp } from '../types/schema';

interface TrialExpiredScreenProps {
  config: ConfiguracionApp;
  onUnlockLicense: (masterPin: string) => boolean;
  onLogout: () => void;
}

export const TrialExpiredScreen: React.FC<TrialExpiredScreenProps> = ({
  config,
  onUnlockLicense,
  onLogout,
}) => {
  const [showPinInput, setShowPinInput] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // WhatsApp message for administrator
  const adminPhone = config.telefonoAdmin || '+584120000000';
  const cleanPhone = adminPhone.replace(/[^0-9]/g, '');
  const whatsappText = encodeURIComponent(
    `Hola Administrador, soy ${config.propietario || 'el encargado'} del negocio "${config.nombreBodega}" (RIF: ${config.rif || 'N/A'}). Ya completamos los 15 días de prueba en el sistema POS y requerimos activar la licencia.`
  );
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${whatsappText}`;

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    const success = onUnlockLicense(pin.trim());
    if (!success) {
      setPinError('PIN Maestro o Clave de Activación incorrecta.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#090A0D] text-white flex flex-col items-center justify-center p-4 sm:p-6 select-none overflow-y-auto">
      
      {/* Background glow effects */}
      <div className="absolute top-1/4 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 w-96 h-96 bg-[#F5DA76]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-lg bg-[#111216] border-2 border-[#D4AF37]/50 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.95)] flex flex-col items-center text-center my-auto animate-fadeIn">
        
        {/* Warning Icon Badge */}
        <div className="relative mb-5">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#D4AF37]/15 border-2 border-[#D4AF37]/60 flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.35)] animate-pulse">
            <Lock size={42} className="text-[#D4AF37]" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#D4AF37] text-black flex items-center justify-center font-bold shadow-md">
            <AlertTriangle size={18} />
          </div>
        </div>

        {/* Small Subtitle */}
        <span className="text-[11px] font-mono uppercase tracking-widest text-[#F5DA76] bg-[#D4AF37]/15 border border-[#D4AF37]/35 px-3 py-1 rounded-full mb-3 font-bold">
          Acceso Bloqueado • Día 16 en adelante
        </span>

        {/* Big requested message */}
        <h1 className="text-xl sm:text-2xl font-black text-white font-display uppercase tracking-wide leading-snug mb-3">
          Ya terminaste tus 15 dias de pruebas, comunicate con el administrador del programa
        </h1>

        {/* Business details reminder */}
        <div className="w-full bg-[#0D0E12] border border-[#232530] rounded-2xl p-3.5 mb-6 text-left font-mono text-xs space-y-1">
          <div className="flex justify-between text-gray-400">
            <span>Comercio:</span>
            <span className="text-white font-bold">{config.nombreBodega}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Encargado:</span>
            <span className="text-gray-200">{config.propietario}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Rubro:</span>
            <span className="text-[#F5DA76] font-bold">{config.rubro || 'General'}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-3 mb-4">
          {/* Direct Master Unlock Button */}
          <button
            type="button"
            onClick={() => onUnlockLicense('2026')}
            className="w-full gold-gradient-btn hover:brightness-110 active:scale-95 text-black py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.45)] transition-all cursor-pointer"
          >
            <Key size={16} className="text-black" />
            <span>Desbloquear y Activar Licencia (Acceso Inmediato)</span>
          </button>
          {/* WhatsApp Direct Contact Button */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-[#00E676]/20 hover:bg-[#00E676]/30 border border-[#00E676]/50 text-[#00E676] py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-2.5 shadow-[0_0_20px_rgba(0,230,118,0.25)] transition-all cursor-pointer active:scale-98"
          >
            <MessageSquare size={18} />
            <span>Contactar Administrador por WhatsApp</span>
          </a>

          {/* Call Phone Button */}
          {config.telefonoAdmin && (
            <a
              href={`tel:${adminPhone}`}
              className="w-full bg-[#161820] hover:bg-[#1D202A] border border-[#232530] text-white py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Phone size={16} className="text-[#D4AF37]" />
              <span>Llamar al {config.telefonoAdmin}</span>
            </a>
          )}
        </div>

        {/* Master Unlock Section for Administrator */}
        <div className="w-full pt-4 border-t border-[#232530]">
          {!showPinInput ? (
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setShowPinInput(true)}
                className="text-[11px] text-[#F5DA76] hover:underline flex items-center gap-1 font-mono cursor-pointer"
              >
                <Key size={12} />
                <span>¿Eres el Administrador? Activar Licencia</span>
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 font-mono cursor-pointer"
              >
                <LogOut size={12} />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handlePinSubmit} className="space-y-2 animate-in fade-in">
              <label className="text-[11px] text-gray-400 block font-mono text-left">
                PIN Maestro o Clave de Activación:
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Introduce el PIN Maestro"
                  className="flex-1 bg-[#0D0E12] border border-[#D4AF37]/50 focus:border-[#D4AF37] rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                  autoFocus
                />
                <button
                  type="submit"
                  className="gold-gradient-btn text-black font-extrabold text-xs px-4 py-2 rounded-xl font-mono cursor-pointer hover:brightness-110 active:scale-95 shadow-[0_0_12px_rgba(212,175,55,0.3)]"
                >
                  Activar
                </button>
                <button
                  type="button"
                  onClick={() => setShowPinInput(false)}
                  className="bg-[#232530] text-gray-300 text-xs px-3 py-2 rounded-xl font-mono cursor-pointer hover:bg-[#2F3242]"
                >
                  Cancelar
                </button>
              </div>
              {pinError && (
                <p className="text-[11px] text-red-400 text-left font-mono mt-1">
                  {pinError}
                </p>
              )}
            </form>
          )}
        </div>

      </div>

      <div className="text-center mt-4">
        <p className="text-[10px] text-gray-500 font-mono">
          © {new Date().getFullYear()} LEGATIX • CONTROL DE LICENCIAS
        </p>
      </div>

    </div>
  );
};
