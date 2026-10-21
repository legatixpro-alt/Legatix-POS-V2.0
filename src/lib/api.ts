import { 
  supabase, 
  isSupabaseConfigured, 
  isCloudAvailable, 
  markCloudFailed, 
  markCloudSuccess 
} from './supabase';
import { Producto, Cliente, VentaMaestro, Abono, Gasto, CartItem } from '../types/schema';

// Helper to get date 30 days ago
const getThirtyDaysAgoString = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString();
};

// ===== PRODUCTOS =====
export async function fetchProductos(): Promise<Producto[]> {
  try {
    if (!isCloudAvailable()) return [];
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('Nombre', { ascending: true });
    
    if (error) {
      markCloudFailed();
      console.warn('[Sync] No se pudieron cargar productos del servidor:', error.message);
      return [];
    }
    markCloudSuccess();
    return (data as Producto[]) || [];
  } catch (err: any) {
    markCloudFailed();
    console.warn('[Sync] Servidor de productos inaccesible o fuera de línea:', err?.message || 'Error de red');
    return [];
  }
}

export async function upsertProducto(producto: Producto): Promise<Producto | null> {
  if (!isCloudAvailable()) return null;
  try {
    const { data, error } = await supabase
      .from('productos')
      .upsert([producto], { onConflict: 'ID_Producto' })
      .select();
      
    if (error) {
      markCloudFailed();
      console.warn('[Sync] Error al guardar producto en la nube:', error.message);
      return null;
    }
    markCloudSuccess();
    return (data?.[0] as Producto) || null;
  } catch (err: any) {
    markCloudFailed();
    console.warn('[Sync] Fallo de conexión al guardar producto (se guardará localmente):', err?.message || 'Error de red');
    return null;
  }
}

export async function deleteProducto(idProducto: string): Promise<boolean> {
  if (!isCloudAvailable()) return false;
  try {
    const { error } = await supabase
      .from('productos')
      .delete()
      .eq('ID_Producto', idProducto);
    if (error) {
      markCloudFailed();
      console.warn('[Sync] Error al eliminar producto en la nube:', error.message);
      return false;
    }
    markCloudSuccess();
    return true;
  } catch (err: any) {
    markCloudFailed();
    console.warn('[Sync] Fallo de conexión al eliminar producto (se procesará localmente):', err?.message || 'Error de red');
    return false;
  }
}

// ===== CLIENTES =====
export async function fetchClientes(): Promise<Cliente[]> {
  try {
    if (!isCloudAvailable()) return [];
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('Nombre_Completo', { ascending: true });
      
    if (error) {
      markCloudFailed();
      console.warn('[Sync] No se pudieron cargar clientes del servidor:', error.message);
      return [];
    }
    markCloudSuccess();
    return (data as Cliente[]) || [];
  } catch (err: any) {
    markCloudFailed();
    console.warn('[Sync] Servidor de clientes inaccesible o fuera de línea:', err?.message || 'Error de red');
    return [];
  }
}

export async function upsertCliente(cliente: Cliente): Promise<Cliente | null> {
  if (!isCloudAvailable()) return null;
  try {
    const { data, error } = await supabase
      .from('clientes')
      .upsert([cliente], { onConflict: 'ID_Cliente' })
      .select();
      
    if (error) {
      markCloudFailed();
      console.warn('[Sync] Error al guardar cliente en la nube:', error.message);
      return null;
    }
    markCloudSuccess();
    return (data?.[0] as Cliente) || null;
  } catch (err: any) {
    markCloudFailed();
    console.warn('[Sync] Fallo de conexión al guardar cliente (se guardará localmente):', err?.message || 'Error de red');
    return null;
  }
}

export async function deleteCliente(idCliente: string): Promise<boolean> {
  if (!isCloudAvailable()) return false;
  try {
    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('ID_Cliente', idCliente);
    if (error) {
      markCloudFailed();
      console.warn('[Sync] Error al eliminar cliente en la nube:', error.message);
      return false;
    }
    markCloudSuccess();
    return true;
  } catch (err: any) {
    markCloudFailed();
    console.warn('[Sync] Fallo de conexión al eliminar cliente (se procesará localmente):', err?.message || 'Error de red');
    return false;
  }
}

// ===== VENTAS =====
export async function fetchVentas(): Promise<VentaMaestro[]> {
  try {
    if (!isCloudAvailable()) return [];
    const { data, error } = await supabase
      .from('ventas')
      .select('*')
      .gte('Fecha_Hora', getThirtyDaysAgoString())
      .order('Fecha_Hora', { ascending: false });
      
    if (error) {
      markCloudFailed();
      console.warn('[Sync] No se pudieron cargar ventas del servidor:', error.message);
      return [];
    }
    markCloudSuccess();
    return (data as VentaMaestro[]) || [];
  } catch (err: any) {
    markCloudFailed();
    console.warn('[Sync] Servidor de ventas inaccesible o fuera de línea:', err?.message || 'Error de red');
    return [];
  }
}

export async function createVenta(venta: VentaMaestro): Promise<VentaMaestro | null> {
  if (!isCloudAvailable()) return null;
  try {
    const { data, error } = await supabase
      .from('ventas')
      .insert([venta])
      .select();
      
    if (error) {
      markCloudFailed();
      console.warn('[Sync] Error al insertar venta en la nube:', error.message);
      return null;
    }
    markCloudSuccess();
    return (data?.[0] as VentaMaestro) || null;
  } catch (err: any) {
    markCloudFailed();
    console.warn('[Sync] Fallo de conexión al insertar venta (se guardará localmente):', err?.message || 'Error de red');
    return null;
  }
}

export async function anularVenta(idTransaccion: string): Promise<boolean> {
  if (!isCloudAvailable()) return false;
  try {
    const { error } = await supabase
      .from('ventas')
      .update({ Estado_Transaccion: 'Anulada' })
      .eq('ID_Transaccion', idTransaccion);
    if (error) {
      markCloudFailed();
      console.warn('[Sync] Error al anular venta en la nube:', error.message);
      return false;
    }
    markCloudSuccess();
    return true;
  } catch (err: any) {
    markCloudFailed();
    console.warn('[Sync] Fallo de conexión al anular venta (se procesará localmente):', err?.message || 'Error de red');
    return false;
  }
}

// ===== ABONOS =====
export async function fetchAbonos(): Promise<Abono[]> {
  try {
    if (!isCloudAvailable()) return [];
    const { data, error } = await supabase
      .from('abonos')
      .select('*')
      .gte('Fecha_Hora', getThirtyDaysAgoString())
      .order('Fecha_Hora', { ascending: false });
      
    if (error) {
      markCloudFailed();
      console.warn('[Sync] No se pudieron cargar abonos del servidor:', error.message);
      return [];
    }
    markCloudSuccess();
    return (data as Abono[]) || [];
  } catch (err: any) {
    markCloudFailed();
    console.warn('[Sync] Servidor de abonos inaccesible o fuera de línea:', err?.message || 'Error de red');
    return [];
  }
}

export async function createAbono(abono: Abono): Promise<Abono | null> {
  if (!isCloudAvailable()) return null;
  try {
    const { data, error } = await supabase
      .from('abonos')
      .insert([abono])
      .select();
      
    if (error) {
      markCloudFailed();
      console.warn('[Sync] Error al registrar abono en la nube:', error.message);
      return null;
    }
    markCloudSuccess();
    return (data?.[0] as Abono) || null;
  } catch (err: any) {
    markCloudFailed();
    console.warn('[Sync] Fallo de conexión al registrar abono (se guardará localmente):', err?.message || 'Error de red');
    return null;
  }
}

// ===== GASTOS =====
export async function fetchGastos(): Promise<Gasto[]> {
  try {
    if (!isCloudAvailable()) return [];
    const { data, error } = await supabase
      .from('gastos')
      .select('*')
      .gte('Fecha_Hora', getThirtyDaysAgoString())
      .order('Fecha_Hora', { ascending: false });
      
    if (error) {
      markCloudFailed();
      console.warn('[Sync] No se pudieron cargar gastos del servidor:', error.message);
      return [];
    }
    markCloudSuccess();
    return (data as Gasto[]) || [];
  } catch (err: any) {
    markCloudFailed();
    console.warn('[Sync] Servidor de gastos inaccesible o fuera de línea:', err?.message || 'Error de red');
    return [];
  }
}

export async function createGasto(gasto: Gasto): Promise<Gasto | null> {
  if (!isCloudAvailable()) return null;
  try {
    const { data, error } = await supabase
      .from('gastos')
      .insert([gasto])
      .select();
      
    if (error) {
      markCloudFailed();
      console.warn('[Sync] Error al registrar gasto en la nube:', error.message);
      return null;
    }
    markCloudSuccess();
    return (data?.[0] as Gasto) || null;
  } catch (err: any) {
    markCloudFailed();
    console.warn('[Sync] Fallo de conexión al registrar gasto (se guardará localmente):', err?.message || 'Error de red');
    return null;
  }
}

// ===== OPERACIONES TRANSACCIONALES ATÓMICAS (RPC) =====
export async function procesarVentaAtomica(
  venta: VentaMaestro,
  items: CartItem[],
  clienteId?: string,
  deudaDelta: number = 0
): Promise<boolean> {
  if (!isCloudAvailable()) return false;
  try {
    // 1. Intentar ejecutar función RPC atómica en Supabase
    const { data, error } = await supabase.rpc('procesar_venta_atomica', {
      p_venta: venta,
      p_items: items,
      p_cliente_id: clienteId || null,
      p_deuda_delta: deudaDelta,
    });

    if (!error && data?.success) {
      markCloudSuccess();
      return true;
    }

    // 2. Si la función RPC no existe en la BD o falló, ejecutar fallback secuencial
    console.warn('[Sync] RPC procesar_venta_atomica no disponible, usando fallback directo:', error?.message);
    const resVenta = await createVenta(venta);
    if (!resVenta) {
      markCloudFailed();
      return false;
    }

    // Actualizar stock en paralelo
    for (const item of items) {
      const prodId = item.producto?.ID_Producto || (item as any).ID_Producto;
      if (prodId) {
        const { data: currentProd } = await supabase
          .from('productos')
          .select('Stock_Actual')
          .eq('ID_Producto', prodId)
          .single();
        if (currentProd) {
          const nuevoStock = Math.max(0, (currentProd.Stock_Actual || 0) - item.cantidad);
          await supabase
            .from('productos')
            .update({ Stock_Actual: nuevoStock })
            .eq('ID_Producto', prodId);
        }
      }
    }

    // Actualizar deuda de cliente si aplica
    if (clienteId && deudaDelta > 0) {
      const { data: currentCli } = await supabase
        .from('clientes')
        .select('Deuda_Total, Limite_Credito')
        .eq('ID_Cliente', clienteId)
        .single();
      if (currentCli) {
        const nuevaDeuda = (currentCli.Deuda_Total || 0) + deudaDelta;
        const lim = currentCli.Limite_Credito || 20;
        const nuevoEstado = nuevaDeuda >= lim ? 'Bloqueado' : nuevaDeuda >= lim * 0.8 ? 'Cerca del Límite' : 'Crédito Activo';
        await supabase
          .from('clientes')
          .update({ Deuda_Total: nuevaDeuda, Estado_Credito: nuevoEstado })
          .eq('ID_Cliente', clienteId);
      }
    }

    markCloudSuccess();
    return true;
  } catch (err: any) {
    markCloudFailed();
    console.warn('[Sync] Error al procesar venta atómica:', err?.message);
    return false;
  }
}

export async function procesarAbonoAtomico(
  abono: Abono,
  clienteId: string,
  montoAbono: number
): Promise<boolean> {
  if (!isCloudAvailable()) return false;
  try {
    const { data, error } = await supabase.rpc('procesar_abono_atomico', {
      p_abono: abono,
      p_cliente_id: clienteId,
      p_monto_abono: montoAbono,
    });

    if (!error && data?.success) {
      markCloudSuccess();
      return true;
    }

    // Fallback secuencial
    const resAbono = await createAbono(abono);
    if (!resAbono) {
      markCloudFailed();
      return false;
    }

    const { data: currentCli } = await supabase
      .from('clientes')
      .select('Deuda_Total, Limite_Credito')
      .eq('ID_Cliente', clienteId)
      .single();
    if (currentCli) {
      const nuevaDeuda = Math.max(0, (currentCli.Deuda_Total || 0) - montoAbono);
      const lim = currentCli.Limite_Credito || 20;
      const nuevoEstado = nuevaDeuda <= 0 ? 'Al Día' : nuevaDeuda >= lim * 0.8 ? 'Cerca del Límite' : 'Crédito Activo';
      await supabase
        .from('clientes')
        .update({ Deuda_Total: nuevaDeuda, Estado_Credito: nuevoEstado })
        .eq('ID_Cliente', clienteId);
    }

    markCloudSuccess();
    return true;
  } catch (err: any) {
    markCloudFailed();
    console.warn('[Sync] Error al procesar abono atómico:', err?.message);
    return false;
  }
}

