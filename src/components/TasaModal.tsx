import React, { useState, useEffect } from 'react';
import { RefreshCw, Check, AlertCircle, DollarSign, Calendar, Landmark, Edit3 } from 'lucide-react';
import { ConfiguracionApp } from '../types/schema';
import { getBcvRate, BcvRateResponse } from '../lib/bcvService';

interface TasaModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ConfiguracionApp;
  onSaveTasa: (newTasa: number, options?: { autoSync?: boolean; isManual?: boolean }) => void;
  bcvData?: BcvRateResponse | null;
  onRefreshBcv?: () => Promise<void>;
}

export const TasaModal: React.FC<TasaModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveTasa,
  bcvData,
  onRefreshBcv,
}) => {
  const [inputVal, setInputVal] = useState<string>(config.tasaCambioUSD.toString());
  const [autoSync, setAutoSync] = useState<boolean>(config.tasaAutoActualizarBCV ?? true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [localBcv, setLocalBcv] = useState<BcvRateResponse | null>(bcvData || null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setInputVal(config.tasaCambioUSD.toString());
      setAutoSync(config.tasaAutoActualizarBCV ?? true);
      setErrorMsg(null);
      if (!localBcv) {
        handleFetch();
      }
    }
  }, [isOpen, config]);

  useEffect(() => {
    if (bcvData) {
      setLocalBcv(bcvData);
    }
  }, [bcvData]);

  const handleFetch = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      if (onRefreshBcv) {
        await onRefreshBcv();
      } else {
        const data = await getBcvRate();
        setLocalBcv(data);
        if (!data.success && data.error) {
          setErrorMsg(data.error);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al conectar con BCV');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyBcv = () => {
    if (localBcv && localBcv.tasa > 0) {
      setInputVal(localBcv.tasa.toString());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(inputVal.replace(',', '.'));
    if (isNaN(val) || val <= 0) {
      setErrorMsg('Por favor introduce un número válido mayor a 0');
      return;
    }

    const isOfficialMatch = localBcv && Math.abs(val - localBcv.tasa) < 0.05;
    onSaveTasa(val, {
      autoSync,
      isManual: !isOfficialMatch,
    });
    onClose();
  };

  if (!isOpen) return null;

  const currentRateNum = parseFloat(inputVal.replace(',', '.')) || config.tasaCambioUSD;
  const isOfficial = localBcv && Math.abs(currentRateNum - localBcv.tasa) < 0.05;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#111216] border border-[#D4AF37]/40 rounded-2xl w-full max-w-md p-6 shadow-[0_20px_60px_rgba(0,0,0,0.85)] flex flex-col gap-5 text-white animate-fadeIn">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#232530] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.2)]">
              <Landmark size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-display uppercase tracking-wider">
                Tasa de Cambio USD / Bs.
              </h3>
              <p className="text-xs text-gray-400">
                Sincronización oficial BCV y ajuste manual
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg bg-[#232530] hover:bg-[#2F3242] transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* BCV Official Info Card */}
        <div className="bg-gradient-to-br from-[#090A0D] to-[#161820] border border-[#D4AF37]/35 rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden shadow-inner">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30">
                Oficial BCV
              </span>
              {localBcv?.fechaValor && (
                <span className="flex items-center gap-1 text-[11px] text-gray-400 font-mono">
                  <Calendar size={12} className="text-[#D4AF37]" />
                  {localBcv.fechaValor}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleFetch}
              disabled={isLoading}
              className="flex items-center gap-1.5 text-xs text-[#F5DA76] hover:text-white bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 border border-[#D4AF37]/35 px-2.5 py-1 rounded-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Consultar portal oficial BCV"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              <span>{isLoading ? 'Consultando...' : 'Actualizar'}</span>
            </button>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div>
              <div className="text-2xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-[#F5DA76] via-[#D4AF37] to-[#A88120] tracking-tight drop-shadow-[0_0_12px_rgba(212,175,55,0.4)]">
                Bs. {localBcv?.tasa ? localBcv.tasa.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '---'}
              </div>
              <div className="text-[11px] text-gray-400">
                {localBcv?.fuente || 'Banco Central de Venezuela (bcv.org.ve)'}
              </div>
            </div>

            {localBcv && (
              <button
                type="button"
                onClick={handleApplyBcv}
                className="bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 text-[#F5DA76] hover:text-white border border-[#D4AF37]/40 text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer"
              >
                Usar Oficial
              </button>
            )}
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/30 p-2 rounded-lg">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Input Form for Editing */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Edit3 size={13} className="text-[#D4AF37]" />
                Tasa Aplicada en el Sistema (Editable)
              </label>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isOfficial ? 'text-[#00E676] bg-[#00E676]/10 border border-[#00E676]/30' : 'text-[#F5DA76] bg-[#D4AF37]/15 border border-[#D4AF37]/35'}`}>
                {isOfficial ? 'Tasa Oficial BCV' : 'Tasa Personalizada'}
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-3 top-3 text-[#D4AF37] font-bold font-mono text-lg">
                Bs.
              </span>
              <input
                type="number"
                step="0.0001"
                min="0.01"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Ej. 871.37"
                className="w-full bg-[#0D0E12] border border-[#D4AF37]/50 focus:border-[#D4AF37] rounded-xl pl-12 pr-4 py-3 text-white text-xl font-mono font-bold outline-none shadow-inner transition-colors"
                autoFocus
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Todos los cálculos de precios, inventario y cuentas por cobrar se actualizarán con este valor.
            </p>
          </div>

          {/* Toggle for Auto-Sync */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#0D0E12] border border-[#232530] hover:border-[#D4AF37]/30 transition-colors">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-200">
                Actualizar tasa automáticamente al día
              </span>
              <span className="text-[11px] text-gray-400">
                Sincroniza la tasa oficial del BCV al iniciar la app
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#232530] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D4AF37]"></div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-[#232530] hover:bg-[#2C2E3C] text-gray-300 py-3 rounded-xl font-bold transition-all text-sm uppercase tracking-wider cursor-pointer border border-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 gold-gradient-btn hover:brightness-110 active:scale-95 text-black py-3 rounded-xl font-extrabold transition-all text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(212,175,55,0.35)] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check size={16} />
              <span>Guardar Tasa</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
