/**
 * Motor de Almacenamiento Local de Alta Capacidad (IndexedDB)
 * Reemplaza el límite de 5MB de localStorage permitiendo catálogos masivos y operaciones 100% offline.
 * Incluye migración transparente de datos existentes desde localStorage.
 */

const DB_NAME = 'BodegueroDB_v1';
const DB_VERSION = 1;

export interface StorageStoreNames {
  productos: 'productos';
  clientes: 'clientes';
  ventas: 'ventas';
  abonos: 'abonos';
  gastos: 'gastos';
  proveedores: 'proveedores';
  app_kv: 'app_kv';
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB solo disponible en navegador'));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store para productos (clave primaria: ID_Producto)
        if (!db.objectStoreNames.contains('productos')) {
          const prodStore = db.createObjectStore('productos', { keyPath: 'ID_Producto' });
          prodStore.createIndex('Codigo_Barras', 'Codigo_Barras', { unique: false });
          prodStore.createIndex('Nombre', 'Nombre', { unique: false });
          prodStore.createIndex('Categoria', 'Categoria', { unique: false });
        }

        // Store para clientes (clave primaria: ID_Cliente)
        if (!db.objectStoreNames.contains('clientes')) {
          const cliStore = db.createObjectStore('clientes', { keyPath: 'ID_Cliente' });
          cliStore.createIndex('Nombre_Completo', 'Nombre_Completo', { unique: false });
          cliStore.createIndex('Telefono_WhatsApp', 'Telefono_WhatsApp', { unique: false });
        }

        // Store para ventas (clave primaria: ID_Transaccion)
        if (!db.objectStoreNames.contains('ventas')) {
          const vtaStore = db.createObjectStore('ventas', { keyPath: 'ID_Transaccion' });
          vtaStore.createIndex('Fecha_Hora', 'Fecha_Hora', { unique: false });
          vtaStore.createIndex('ID_Cliente', 'ID_Cliente', { unique: false });
        }

        // Store para abonos (clave primaria: ID_Abono)
        if (!db.objectStoreNames.contains('abonos')) {
          const abnStore = db.createObjectStore('abonos', { keyPath: 'ID_Abono' });
          abnStore.createIndex('ID_Cliente', 'ID_Cliente', { unique: false });
          abnStore.createIndex('Fecha_Hora', 'Fecha_Hora', { unique: false });
        }

        // Store para gastos (clave primaria: ID_Gasto)
        if (!db.objectStoreNames.contains('gastos')) {
          const gstStore = db.createObjectStore('gastos', { keyPath: 'ID_Gasto' });
          gstStore.createIndex('Fecha_Hora', 'Fecha_Hora', { unique: false });
        }

        // Store para proveedores (clave primaria: ID_Proveedor)
        if (!db.objectStoreNames.contains('proveedores')) {
          db.createObjectStore('proveedores', { keyPath: 'ID_Proveedor' });
        }

        // Store genérico clave-valor para configuraciones, colas, flags
        if (!db.objectStoreNames.contains('app_kv')) {
          db.createObjectStore('app_kv', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  return dbPromise;
}

// ==============================================================================
// OPERACIONES GENÉRICAS
// ==============================================================================

export async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn(`[Storage] Error al leer de ${storeName}:`, err);
    return [];
  }
}

export async function setAllInStore<T>(storeName: string, items: T[]): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      store.clear();

      items.forEach((item) => store.put(item));

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (err) {
    console.error(`[Storage] Error al guardar en ${storeName}:`, err);
  }
}

export async function putInStore<T>(storeName: string, item: T): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error(`[Storage] Error al insertar en ${storeName}:`, err);
  }
}

export async function deleteFromStore(storeName: string, key: IDBValidKey): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error(`[Storage] Error al borrar de ${storeName}:`, err);
  }
}

// Key-Value Store para datos singulares (Config, Estado de Sesión, Outbox)
export async function getKV<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction('app_kv', 'readonly');
      const store = transaction.objectStore('app_kv');
      const request = store.get(key);

      request.onsuccess = () => {
        if (request.result && request.result.value !== undefined) {
          resolve(request.result.value);
        } else {
          // Intentar fallback a localStorage si no está en IndexedDB
          const fallback = localStorage.getItem(key);
          if (fallback) {
            try {
              const parsed = JSON.parse(fallback);
              resolve(parsed);
              return;
            } catch {}
          }
          resolve(defaultValue);
        }
      };
      request.onerror = () => resolve(defaultValue);
    });
  } catch {
    return defaultValue;
  }
}

export async function setKV<T>(key: string, value: T): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('app_kv', 'readwrite');
      const store = transaction.objectStore('app_kv');
      const request = store.put({ key, value });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error(`[Storage] Error al guardar KV ${key}:`, err);
  }
}

// ==============================================================================
// MIGRACIÓN AUTOMÁTICA DESDE LOCALSTORAGE A INDEXEDDB
// Se ejecuta una sola vez para transferir datos antiguos sin perder nada
// ==============================================================================
export async function migrateFromLocalStorageIfNeeded(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const migratedFlag = localStorage.getItem('bodeguero_idb_migrated_v1');
  if (migratedFlag === 'true') return false;

  try {
    console.log('[Storage] Iniciando migración de datos a IndexedDB...');

    // 1. Productos
    const rawProds = localStorage.getItem('bodeguero_productos_v3');
    if (rawProds) {
      try {
        const prods = JSON.parse(rawProds);
        if (Array.isArray(prods) && prods.length > 0) {
          await setAllInStore('productos', prods);
        }
      } catch {}
    }

    // 2. Clientes
    const rawClientes = localStorage.getItem('bodeguero_clientes_v3');
    if (rawClientes) {
      try {
        const clientes = JSON.parse(rawClientes);
        if (Array.isArray(clientes) && clientes.length > 0) {
          await setAllInStore('clientes', clientes);
        }
      } catch {}
    }

    // 3. Ventas
    const rawVentas = localStorage.getItem('bodeguero_ventas_v3');
    if (rawVentas) {
      try {
        const ventas = JSON.parse(rawVentas);
        if (Array.isArray(ventas) && ventas.length > 0) {
          await setAllInStore('ventas', ventas);
        }
      } catch {}
    }

    // 4. Abonos
    const rawAbonos = localStorage.getItem('bodeguero_abonos_v3');
    if (rawAbonos) {
      try {
        const abonos = JSON.parse(rawAbonos);
        if (Array.isArray(abonos) && abonos.length > 0) {
          await setAllInStore('abonos', abonos);
        }
      } catch {}
    }

    // 5. Gastos
    const rawGastos = localStorage.getItem('bodeguero_gastos_v3');
    if (rawGastos) {
      try {
        const gastos = JSON.parse(rawGastos);
        if (Array.isArray(gastos) && gastos.length > 0) {
          await setAllInStore('gastos', gastos);
        }
      } catch {}
    }

    // 6. Proveedores
    const rawProv = localStorage.getItem('bodeguero_proveedores_v1');
    if (rawProv) {
      try {
        const provs = JSON.parse(rawProv);
        if (Array.isArray(provs) && provs.length > 0) {
          await setAllInStore('proveedores', provs);
        }
      } catch {}
    }

    localStorage.setItem('bodeguero_idb_migrated_v1', 'true');
    console.log('[Storage] Migración completada exitosamente.');
    return true;
  } catch (err) {
    console.error('[Storage] Error en la migración a IndexedDB:', err);
    return false;
  }
}
