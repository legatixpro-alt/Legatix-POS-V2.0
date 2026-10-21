import React, { useState } from 'react';
import { usePWAInstall } from './usePWAInstall';
import { Download } from 'lucide-react';
import { useNativeBackHandler } from '../utils/nativeNavigation';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Native Mobile Back Button Support
  useNativeBackHandler(showIOSGuide, () => setShowIOSGuide(false), 'pwa_ios_guide');

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center justify-center gap-2 rounded-lg bg-[#D4B848] px-4 py-2 text-sm font-bold text-black shadow-[0_0_15px_rgba(212,175,55,0.4)] hover:bg-[#F2D660] transition-all font-display tracking-widest uppercase mt-4 mb-2 w-full"
      >
        <Download size={16} />
        Instalar App Offline
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#D4B848] px-4 py-2 text-sm font-bold text-black shadow-[0_0_15px_rgba(212,175,55,0.4)] hover:bg-[#F2D660] transition-all font-display tracking-widest uppercase mt-4 mb-2 w-full"
        >
          <Download size={16} />
          Instalar App Offline
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-xl tech-panel p-6 shadow-[0_0_30px_rgba(0,0,0,1)] border border-[#D4B848]/30">
              <h3 className="text-xl font-bold text-[#D4B848] font-display uppercase tracking-widest mb-4">Instalar en iPhone / iPad</h3>
              <p className="text-sm text-gray-300 leading-relaxed mb-6">
                Para poder usar la aplicación <strong>sin conexión a internet</strong>: <br/><br/>
                1. Toca el botón de <strong>Compartir</strong> en la barra de Safari (el ícono cuadrado con una flecha hacia arriba).<br /><br />
                2. Baja un poco y toca <strong>"Agregar a Inicio"</strong>.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-lg bg-white/10 py-3 text-sm font-bold text-white hover:bg-white/20 transition-colors uppercase tracking-widest"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
