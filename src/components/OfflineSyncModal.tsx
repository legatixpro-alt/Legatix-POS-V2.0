import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Zap, 
  RotateCw, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ShieldCheck, 
  X, 
  ShoppingCart, 
  DollarSign, 
  User, 
  Package, 
  TrendingDown, 
  Trash2 
} from 'lucide-react';
import { 
  getSyncQueue, 
  processSyncQueue, 
  removeSyncItem, 
  clearSyncQueue, 
  SyncQueueItem, 
  checkRealInternet 
} from '../lib/offlineSyncManager';
import { formatUSD } from '../utils/formatters';
import { soundEffects } from '../utils/audio';

interface OfflineSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  onSyncComplete?: () => void;
}

export const OfflineSyncModal: React.FC<OfflineSyncModalProps> = ({
  isOpen,
  onClose,
  isOnline,
  onSyncComplete
}) => {
  const [queue, setQueue] = useState<SyncQueueItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [lastCheckResult, setLastCheckResult] = useState<boolean | null>(null);
  const [isCheckingNet, setIsCheckingNet] = useState(false);

  const loadQueue = () => {
    setQueue(getSyncQueue());
  };

  useEffect(() => {
    if (isOpen) {
      loadQueue();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleQueueChange = () => {
      loadQueue();
    };
    window.addEventListener('bodeguero_sync_queue_changed', handleQueueChange);
    return () => window.removeEventListener('bodeguero_sync_queue_changed', handleQueueChange);
  }, []);

  const handleTestConnection = async () => {
    setIsCheckingNet(true);
    const hasNet = await checkRealInternet();
    setLastCheckResult(hasNet);
    setIsCheckingNet(false);
  };

  const handleManualSync = async () => {
    if (queue.length === 0) {
      setSyncMessage('No hay operaciones pendientes por sincronizar.');
      return;
    }

    setIsSyncing(true);
    setSyncMessage('Comprobando conexión y subiendo en segundo plano...');

    const result = await processSyncQueue((current, total) => {
      setSyncProgress({ current, total });
    });

    setIsSyncing(false);
    setSyncProgress(null);
    loadQueue();

    if (result.synced > 0) {
      soundEffects.playCashRegisterChime();
      setSyncMessage(`✅ ¡Éxito! Se sincronizaron ${result.synced} operaciones en segundo plano.`);
      if (onSyncComplete) onSyncComplete();
    } else if (result.failed > 0) {
      setSyncMessage('⚠️ No se pudo conectar al servidor. Los datos siguen 100% seguros de forma local.');
    }
  };

  if (!isOpen) return null;

  const getItemIcon = (type: SyncQueueItem['type']) => {
    switch (type) {
      case 'CREATE_VENTA':
        return <ShoppingCart size={15} className="text-[#D4AF37]" />;
      case 'CREATE_ABONO':
        return <DollarSign size={15} className="text-[#00E676]" />;
      case 'UPSERT_CLIENTE':
      case 'DELETE_CLIENTE':
        return <User size={15} className="text-blue-400" />;
      case 'UPSERT_PRODUCTO':
      case 'DELETE_PRODUCTO':
        return <Package size={15} className="text-amber-400" />;
      case 'CREATE_GASTO':
        return <TrendingDown size={15} className="text-red-400" />;
      default:
        return <Clock size={15} className="text-gray-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-sans animate-in fade-in duration-150">
      <div className="bg-[#111216] border border-[#D4AF37]/40 rounded-2xl w-full max-w-lg shadow-[0_20px_60px_rgba(0,0,0,0.85)] max-h-[92vh] flex flex-col overflow-hidden animate-fadeIn">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#232530] flex items-center justify-between bg-gradient-to-r from-[#161820] to-[#121318]">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              isOnline 
                ? 'bg-[#00E676]/15 border-[#00E676]/40 text-[#00E676]' 
                : 'bg-[#D4AF37]/15 border-[#D4AF37]/40 text-[#F5DA76]'
            }`}>
              {isOnline ? <Wifi size={20} /> : <Zap size={20} className="animate-pulse" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white font-display uppercase tracking-wider">
                  Sincronización & Modo Offline
                </h3>
              </div>
              <p className="text-[11px] text-gray-400 font-mono">
                Resiliencia ante fallas eléctricas y cortes de internet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-lg bg-[#232530] hover:bg-[#2F3242] transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#090A0D] custom-scrollbar">
          
          {/* Status Banner */}
          <div className={`p-4 rounded-xl border flex flex-col gap-2 ${
            isOnline
              ? 'bg-[#00E676]/10 border-[#00E676]/30 text-gray-200'
              : 'bg-gradient-to-r from-[#1E1B13] to-[#121318] border-[#D4AF37]/40 text-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-[#00E676] animate-pulse' : 'bg-[#D4AF37]'}`}></span>
                <span className="text-xs font-bold uppercase tracking-wider font-display text-[#F5DA76]">
                  {isOnline ? 'Conexión a Internet Activa' : 'Modo Offline Activo (Sin Luz / Sin Internet)'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isCheckingNet}
                className="text-[10px] font-mono text-gray-400 hover:text-[#F5DA76] flex items-center gap-1 underline cursor-pointer"
              >
                <RotateCw size={10} className={isCheckingNet ? 'animate-spin' : ''} />
                <span>{isCheckingNet ? 'Probando...' : 'Comprobar'}</span>
              </button>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              {isOnline
                ? 'El sistema está conectado. Cuando registras una venta, se sube a la nube y además se respalda en este dispositivo.'
                : 'No hay internet o se fue la luz. Puedes seguir facturando, cobrando fiados y consultando precios con normalidad. Nada se detiene.'}
            </p>

            {lastCheckResult !== null && (
              <div className={`text-[10px] font-mono mt-1 ${lastCheckResult ? 'text-[#00E676]' : 'text-[#FF5252]'}`}>
                {lastCheckResult ? '✓ Paquetes de red verificados exitosamente.' : '✕ Sin respuesta de red externa.'}
              </div>
            )}
          </div>

          {/* Guarantee Box */}
          <div className="p-3.5 rounded-xl bg-[#0D0E12] border border-[#D4AF37]/35 flex items-start gap-3 shadow-inner">
            <ShieldCheck size={20} className="text-[#D4AF37] shrink-0 mt-0.5" />
            <div className="text-xs text-gray-300 leading-relaxed">
              <strong className="text-[#F5DA76] block font-semibold mb-0.5">Seguridad Local 100% Garantizada</strong>
              Todas las operaciones se guardan de inmediato en la memoria local de este teléfono o computadora. Al volver la luz o recuperar cobertura móvil, el sistema las sincroniza automáticamente y en segundo plano sin interrumpirte.
            </div>
          </div>

          {/* Queue Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider font-display flex items-center gap-1.5">
                <Clock size={13} className="text-[#D4AF37]" />
                Cola de Operaciones Pendientes ({queue.length})
              </span>
              {queue.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('¿Vaciar la cola de sincronización? Solo hazlo si ya confirmaste que los datos están en la nube.')) {
                      clearSyncQueue();
                      loadQueue();
                    }
                  }}
                  className="text-[10px] text-gray-500 hover:text-red-400 font-mono transition-colors cursor-pointer"
                >
                  Limpiar cola
                </button>
              )}
            </div>

            {queue.length === 0 ? (
              <div className="p-6 rounded-xl border border-[#232530] bg-[#0D0E12] text-center flex flex-col items-center justify-center gap-2">
                <CheckCircle2 size={32} className="text-[#00E676] opacity-80" />
                <span className="text-xs text-gray-300 font-medium">
                  Todo está al día y sincronizado con la nube.
                </span>
                <span className="text-[11px] text-gray-500">
                  No hay operaciones pendientes de subir.
                </span>
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg bg-[#0D0E12] border border-[#232530] hover:border-[#D4AF37]/40 flex items-center justify-between gap-3 text-xs transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-md bg-[#161820] border border-[#232530] flex items-center justify-center shrink-0">
                        {getItemIcon(item.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-white font-bold truncate">
                          {item.description}
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono">
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.montoUSD !== undefined && (
                        <span className="font-mono font-bold text-[#D4AF37]">
                          {formatUSD(item.montoUSD)}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          removeSyncItem(item.id);
                          loadQueue();
                        }}
                        className="text-gray-500 hover:text-red-400 p-1 rounded transition-colors cursor-pointer"
                        title="Descartar esta operación"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sync Progress / Message */}
          {syncMessage && (
            <div className="p-3 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-xs text-[#F5DA76] font-medium animate-in fade-in">
              {syncMessage}
            </div>
          )}

          {syncProgress && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-gray-400 font-mono">
                <span>Subiendo transacciones...</span>
                <span>{syncProgress.current} de {syncProgress.total}</span>
              </div>
              <div className="w-full h-1.5 bg-[#0D0E12] rounded-full overflow-hidden border border-[#232530]">
                <div 
                  className="h-full bg-gradient-to-r from-[#F5DA76] to-[#D4AF37] transition-all duration-200"
                  style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#232530] bg-[#161820] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white bg-[#232530] hover:bg-[#2F3242] transition-all cursor-pointer"
          >
            Cerrar
          </button>

          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing || queue.length === 0}
            className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed gold-gradient-btn text-black shadow-[0_0_15px_rgba(212,175,55,0.3)] active:scale-95"
          >
            <RotateCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Sincronizando...' : '⚡ Sincronizar Ahora'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
