import React, { useEffect, useState } from 'react';
import { WifiOff, Zap, RotateCw, CheckCircle2 } from 'lucide-react';
import { getPendingSyncCount } from '../lib/offlineSyncManager';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

interface OfflineIndicatorProps {
  onOpenSyncModal?: () => void;
  isSyncing?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ 
  onOpenSyncModal,
  isSyncing = false
}) => {
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      setPendingCount(getPendingSyncCount());
    };
    updateCount();

    window.addEventListener('bodeguero_sync_queue_changed', updateCount);
    return () => window.removeEventListener('bodeguero_sync_queue_changed', updateCount);
  }, []);

  // When syncing in background
  if (isSyncing && pendingCount > 0) {
    return (
      <div 
        onClick={onOpenSyncModal}
        className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 rounded-full bg-[#D4AF37] text-black px-4 py-1.5 text-xs font-bold shadow-[0_0_20px_rgba(212,175,55,0.7)] animate-in slide-in-from-top-4 font-display uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
        title="Sincronización en curso"
      >
        <RotateCw size={13} className="animate-spin text-black" />
        <span>Sincronizando {pendingCount} en segundo plano...</span>
      </div>
    );
  }

  // When Offline
  if (!isOnline) {
    return (
      <div 
        onClick={onOpenSyncModal}
        className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 rounded-full bg-gradient-to-r from-[#B8860B] to-[#FF8C00] text-black px-4 py-1.5 text-xs font-bold shadow-[0_0_25px_rgba(255,140,0,0.65)] animate-in slide-in-from-top-4 font-display uppercase tracking-wider cursor-pointer active:scale-95 transition-all border border-amber-300/40"
        title="Pulsa para ver el estado de la cola offline"
      >
        <Zap size={14} className="animate-pulse text-black" />
        <span className="truncate max-w-[200px] xs:max-w-none">
          Modo Offline (Sin Luz / Sin Internet) {pendingCount > 0 && `• ${pendingCount} pendiente(s)`}
        </span>
        <span className="text-[10px] bg-black/30 text-white px-2 py-0.5 rounded-full font-sans font-bold">
          Local Seguro
        </span>
      </div>
    );
  }

  // When Online but has pending items to sync
  if (pendingCount > 0) {
    return (
      <div 
        onClick={onOpenSyncModal}
        className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 rounded-full bg-[#121214] border border-[#D4AF37] text-[#D4AF37] px-3.5 py-1 text-xs font-bold shadow-[0_0_15px_rgba(212,175,55,0.4)] animate-in slide-in-from-top-4 font-display uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
        title="Pulsa para sincronizar"
      >
        <RotateCw size={12} className="animate-pulse" />
        <span>{pendingCount} pendiente(s) por subir</span>
      </div>
    );
  }

  return null;
};
