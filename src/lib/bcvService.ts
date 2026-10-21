export interface BcvRateResponse {
  success: boolean;
  tasa: number;
  tasaExacta: number;
  fechaValor: string;
  fuente: string;
  timestamp: string;
  cached?: boolean;
  warning?: string;
  error?: string;
}

const STORAGE_KEY = 'bodeguero_bcv_rate_cache_v1';

export async function getBcvRate(): Promise<BcvRateResponse> {
  // 1. Try our backend proxy route first
  try {
    const res = await fetch('/api/bcv-tasa', {
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      const data: BcvRateResponse = await res.json();
      if (data.success && data.tasa > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return data;
      }
    }
  } catch (err) {
    console.warn('Backend proxy /api/bcv-tasa falló, intentando respaldo directo:', err);
  }

  // 2. Direct client fallback to public official BCV mirror
  try {
    const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.promedio === 'number' && data.promedio > 0) {
        const result: BcvRateResponse = {
          success: true,
          tasa: Math.round(data.promedio * 100) / 100,
          tasaExacta: data.promedio,
          fechaValor: data.fechaActualizacion
            ? new Date(data.fechaActualizacion).toLocaleDateString('es-VE', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            : 'Al día',
          fuente: 'Banco Central de Venezuela (Respaldo Directo)',
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
        return result;
      }
    }
  } catch (err) {
    console.warn('Fallback público directo también falló:', err);
  }

  // 3. Fallback to localStorage cache if offline
  const local = localStorage.getItem(STORAGE_KEY);
  if (local) {
    try {
      const parsed: BcvRateResponse = JSON.parse(local);
      return {
        ...parsed,
        cached: true,
        warning: 'Sin conexión a internet. Mostrando última tasa guardada en el dispositivo.',
      };
    } catch {
      // ignore
    }
  }

  // 4. Fallback safe standard
  return {
    success: false,
    tasa: 871.37,
    tasaExacta: 871.3689,
    fechaValor: 'Al día',
    fuente: 'Banco Central de Venezuela',
    timestamp: new Date().toISOString(),
    error: 'No se pudo conectar con el BCV. Se mantiene la tasa referencial.',
  };
}
