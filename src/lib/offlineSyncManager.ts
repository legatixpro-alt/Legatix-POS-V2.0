import { 
  createVenta, 
  anularVenta, 
  createAbono, 
  upsertCliente, 
  deleteCliente, 
  upsertProducto, 
  deleteProducto, 
  createGasto,
  procesarVentaAtomica,
  procesarAbonoAtomico
} from './api';
import { isCloudAvailable } from './supabase';
import { VentaMaestro, Abono, Cliente, Producto, Gasto } from '../types/schema';

export type SyncActionType =
  | 'PROCESAR_VENTA'
  | 'PROCESAR_ABONO'
  | 'CREATE_VENTA'
  | 'ANULAR_VENTA'
  | 'CREATE_ABONO'
  | 'UPSERT_CLIENTE'
  | 'DELETE_CLIENTE'
  | 'UPSERT_PRODUCTO'
  | 'DELETE_PRODUCTO'
  | 'CREATE_GASTO';

export interface SyncQueueItem {
  id: string;
  type: SyncActionType;
  payload: any;
  description: string;
  montoUSD?: number;
  createdAt: string;
  retries: number;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
  lastError?: string;
}

const STORAGE_KEY = 'bodeguero_sync_outbox_v2';
const EVENT_NAME = 'bodeguero_sync_queue_changed';

// Get all items in the queue
export function getSyncQueue(): SyncQueueItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error al leer cola de sincronización:', e);
    return [];
  }
}

// Save queue to local storage and notify listeners
export function saveSyncQueue(queue: SyncQueueItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { count: queue.length } }));
    }
  } catch (e) {
    console.error('Error al guardar cola de sincronización:', e);
  }
}

// Enqueue an action to be synced
export function enqueueSyncAction(
  type: SyncActionType,
  payload: any,
  description: string,
  montoUSD?: number
): SyncQueueItem {
  const queue = getSyncQueue();
  const newItem: SyncQueueItem = {
    id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    type,
    payload,
    description,
    montoUSD,
    createdAt: new Date().toISOString(),
    retries: 0,
    status: 'pending'
  };

  queue.push(newItem);
  saveSyncQueue(queue);
  return newItem;
}

// Remove an item by ID
export function removeSyncItem(id: string): void {
  const queue = getSyncQueue().filter(item => item.id !== id);
  saveSyncQueue(queue);
}

// Clear all synced or failed items
export function clearSyncQueue(): void {
  saveSyncQueue([]);
}

// Count pending operations
export function getPendingSyncCount(): number {
  return getSyncQueue().length;
}

// Test real internet connectivity (especially useful in Venezuela during blackouts/slow networks)
export async function checkRealInternet(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }
  try {
    // Fast ping with cache buster against real backend health endpoint (with static asset fallback)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`/api/health?_t=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return res.ok || res.status === 304;
  } catch {
    return false;
  }
}

let isSyncingInProgress = false;

// Process the queue sequentially in background
export async function processSyncQueue(
  onProgress?: (current: number, total: number, item: SyncQueueItem) => void
): Promise<{ success: boolean; synced: number; failed: number }> {
  if (isSyncingInProgress) {
    return { success: false, synced: 0, failed: 0 };
  }

  const queue = getSyncQueue();
  if (queue.length === 0) {
    return { success: true, synced: 0, failed: 0 };
  }

  if (!isCloudAvailable()) {
    // Cloud is not configured or temporarily unreachable; keep queue safely preserved in localStorage
    return { success: false, synced: 0, failed: queue.length };
  }

  isSyncingInProgress = true;
  let syncedCount = 0;
  let failedCount = 0;
  const remainingQueue: SyncQueueItem[] = [];

  try {
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (onProgress) {
        onProgress(i + 1, queue.length, item);
      }

      try {
        let ok = false;

        switch (item.type) {
          case 'PROCESAR_VENTA': {
            const { venta, items, clienteId, deudaDelta } = item.payload;
            ok = await procesarVentaAtomica(venta, items, clienteId, deudaDelta);
            break;
          }
          case 'PROCESAR_ABONO': {
            const { abono, clienteId, montoUSD } = item.payload;
            ok = await procesarAbonoAtomico(abono, clienteId, montoUSD);
            break;
          }
          case 'CREATE_VENTA': {
            const res = await createVenta(item.payload as VentaMaestro);
            ok = !!res;
            break;
          }
          case 'ANULAR_VENTA': {
            const res = await anularVenta(item.payload.idTransaccion);
            ok = !!res;
            break;
          }
          case 'CREATE_ABONO': {
            const res = await createAbono(item.payload.abono as Abono);
            if (item.payload.cliente) {
              await upsertCliente(item.payload.cliente as Cliente);
            }
            ok = !!res;
            break;
          }
          case 'UPSERT_CLIENTE': {
            const res = await upsertCliente(item.payload as Cliente);
            ok = !!res;
            break;
          }
          case 'DELETE_CLIENTE': {
            const res = await deleteCliente(item.payload.idCliente);
            ok = !!res;
            break;
          }
          case 'UPSERT_PRODUCTO': {
            const res = await upsertProducto(item.payload as Producto);
            ok = !!res;
            break;
          }
          case 'DELETE_PRODUCTO': {
            const res = await deleteProducto(item.payload.idProducto);
            ok = !!res;
            break;
          }
          case 'CREATE_GASTO': {
            const res = await createGasto(item.payload as Gasto);
            ok = !!res;
            break;
          }
          default:
            ok = true;
        }

        if (ok) {
          syncedCount++;
        } else {
          failedCount++;
          remainingQueue.push({
            ...item,
            retries: item.retries + 1,
            lastError: 'Respuesta no confirmada por el servidor'
          });
        }
      } catch (err: any) {
        failedCount++;
        console.warn(`Error al sincronizar operación ${item.id}:`, err);
        remainingQueue.push({
          ...item,
          retries: item.retries + 1,
          lastError: err?.message || 'Error de red'
        });
      }
    }

    // Save only remaining failed items
    saveSyncQueue(remainingQueue);
    return { success: failedCount === 0, synced: syncedCount, failed: failedCount };
  } finally {
    isSyncingInProgress = false;
  }
}
