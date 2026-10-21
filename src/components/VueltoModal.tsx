import React, { useState, useEffect } from 'react';
import { Banknote, Smartphone, X, DollarSign } from 'lucide-react';

interface VueltoModalProps {
  isOpen: boolean;
  onClose: () => void;
  cambioTotalUSD: number;
  tasaCambio: number;
}

export const VueltoModal: React.FC<VueltoModalProps> = ({
  isOpen,
  onClose,
  cambioTotalUSD,
  tasaCambio,
}) => {
  const [usdToGive, setUsdToGive] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setUsdToGive('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalUsd = Math.max(0, cambioTotalUSD);
  const totalBs = totalUsd * tasaCambio;

  const usdValue = parseFloat(usdToGive) || 0;
  const remainingUsd = Math.max(0, totalUsd - usdValue);
  const remainingBs = remainingUsd * tasaCambio;

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-black/80 border border-[#D4B848]/50 rounded-[20px] w-full max-w-sm overflow-hidden shadow-[0_0_30px_rgba(212,175,55,0.15)] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#D4B848]/20 rounded-full text-[#D4B848]">
              <Banknote size={20} />
            </div>
            <h3 className="text-white font-bold uppercase tracking-widest font-display text-sm">Asistente de Vuelto</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-6">
          {/* Total Vuelto */}
          <div className="flex justify-between items-center bg-[#00E676]/10 border border-[#00E676]/30 rounded-xl p-4">
            <div className="text-sm font-bold text-[#00E676] uppercase tracking-wide">Vuelto Total</div>
            <div className="text-right">
              <div className="text-xl font-bold font-mono text-white tracking-tight">${totalUsd.toFixed(2)}</div>
              <div className="text-xs font-mono text-gray-400">Bs {totalBs.toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
            </div>
          </div>

          {/* USD Input */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-400 font-bold uppercase tracking-wide">¿Cuánto vuelto darás en Divisa ($)?</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 text-[#D4B848]" size={20} />
              <input
                type="number"
                step="1"
                min="0"
                max={totalUsd}
                value={usdToGive}
                onChange={(e) => setUsdToGive(e.target.value)}
                placeholder="Ej. 10"
                className="w-full bg-black/40 border border-[#D4B848]/50 focus:border-[#D4B848] rounded-xl pl-10 pr-4 py-3 text-white text-lg font-mono font-bold outline-none transition-all shadow-inner"
              />
            </div>
          </div>

          {/* Breakdown */}
          {usdValue > 0 && usdValue <= totalUsd + 0.001 && (
            <div className="flex flex-col gap-3 pt-4 border-t border-white/10">
              <div className="text-xs text-gray-400 font-bold uppercase tracking-wide text-center">Debes entregar:</div>
              <div className="flex justify-between items-center bg-white/5 rounded-lg p-3">
                <div className="flex items-center gap-2 text-white font-medium">
                  <Banknote size={16} className="text-[#00E676]" />
                  Efectivo ($)
                </div>
                <div className="font-mono font-bold text-lg text-[#00E676]">${usdValue.toFixed(2)}</div>
              </div>
              <div className="flex justify-between items-center bg-white/5 rounded-lg p-3">
                <div className="flex items-center gap-2 text-white font-medium">
                  <Smartphone size={16} className="text-blue-400" />
                  Pago Móvil (Bs)
                </div>
                <div className="font-mono font-bold text-lg text-blue-400">Bs {remainingBs.toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
              </div>
            </div>
          )}

          {usdValue > totalUsd + 0.001 && (
            <div className="text-red-400 text-xs font-bold text-center p-2 bg-red-400/10 rounded-lg">
              El monto ingresado es mayor al vuelto total.
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
