export interface Usuario {
  ID_Usuario: string;
  Nombre_Completo: string;
  Rol: 'Administrador' | 'Cajero' | 'Bodeguero';
  Nombre_Bodega: string;
  Telefono: string;
  Activo: boolean;
  Fecha_Creacion: string;
}

export interface Producto {
  ID_Producto: string;
  user_id?: string;
  Codigo_Barras: string;
  Nombre: string;
  Categoria: string;
  Costo: number; // en USD base
  Precio_Venta: number; // en USD base
  Stock_Actual: number;
  Stock_Minimo: number;
  Unidad_Medida: string;
  Referencia?: string; // Referencia / modelo de la prenda
  Imagen?: string; // Foto de la prenda (data URL comprimido)
  Colores?: ColorProducto[]; // Colores disponibles
}

export interface ColorProducto {
  nombre: string;
  hex: string;
}

export interface Cliente {
  ID_Cliente: string;
  user_id?: string;
  Nombre_Completo: string;
  RIF_Cedula?: string; // V-12345678, J-12345678-9 para notas de entrega SENIAT
  Telefono_WhatsApp: string; // Para contacto y campañas de remarketing
  Direccion?: string; // Domicilio fiscal del cliente para SENIAT
  Email?: string;
  Limite_Credito: number; // en USD base
  Deuda_Total: number; // en USD base
  Estado_Credito: 'Al Día' | 'Crédito Activo' | 'Cerca del Límite' | 'Bloqueado';
  Categoria_Remarketing?: 'Frecuente' | 'Mayorista' | 'Ocasional' | 'VIP'; // Segmentación de ofertas
  Notas?: string;
  Ultimo_Movimiento?: string;
  Total_Comprado?: number; // Total histórico comprado en USD
  Fecha_Registro?: string;
  Dias_Credito?: number; // Plazo de crédito acordado en días (ej: 7, 15, 30 días)
  Fecha_Vencimiento?: string; // Fecha límite de pago de la deuda
}

export interface Proveedor {
  ID_Proveedor: string;
  user_id?: string;
  Nombre_Empresa: string;
  Contacto_Nombre?: string;
  Telefono_WhatsApp: string;
  RIF?: string;
  Categoria_Rubro?: string;
  Direccion?: string;
  Dias_Visita?: string;
  Saldo_Pendiente: number; // en USD base
  Notas?: string;
  Fecha_Registro: string;
}

export type MetodoPago = 'Efectivo' | 'Pago Móvil' | 'Divisa' | 'Fiado' | 'Mixto';

export interface DesglosePagoItem {
  id?: string;
  metodo: string;
  label?: string;
  isUSD: boolean;
  monto: number;
  montoUSD: number;
  referencia?: string;
}

export interface VentaMaestro {
  ID_Transaccion: string;
  user_id?: string;
  Fecha_Hora: string;
  ID_Cliente?: string;
  Nombre_Cliente?: string;
  Total_Venta: number; // en USD base
  Metodo_Pago: MetodoPago;
  Estado_Transaccion: 'Completada' | 'Pendiente' | 'Anulada';
  Tasa_Cambio_Aplicada: number;
  Total_Moneda_Local: number;
  ID_Usuario: string;
  Items_Count: number;
  Items?: CartItem[];
  Desglose_Pagos?: DesglosePagoItem[];
  Monto_Abonado?: number; // Total cobrado en métodos de pago de contado (USD)
  Monto_Credito?: number; // Saldo que quedó fiado / a crédito (USD)
}

export interface DetalleVenta {
  ID_Detalle: string;
  ID_Transaccion: string;
  ID_Producto: string;
  Nombre_Producto: string;
  Cantidad: number;
  Precio_Unitario_Historico: number;
  Subtotal: number;
}

export interface Abono {
  ID_Abono: string;
  user_id?: string;
  ID_Cliente: string;
  Nombre_Cliente: string;
  Fecha_Hora: string;
  Monto_Abonado: number; // en USD base
  Monto_Moneda_Local: number;
  Tasa_Cambio: number;
  Saldo_Anterior: number;
  Saldo_Restante: number;
  Metodo_Abono: 'Efectivo' | 'Pago Móvil' | 'Divisa';
  Comprobante_Ref?: string;
  ID_Usuario: string;
}

export interface CartItem {
  producto: Producto;
  cantidad: number;
}

export type RolUsuario = 'Dueño' | 'Administrador' | 'Cajero' | 'Supervisor';

export interface UsuarioNegocio {
  id: string;
  user_id?: string;
  nombre: string;
  email: string;
  telefono?: string;
  rol: RolUsuario;
  pinAcceso?: string;
  activo: boolean;
  creadoEn: string;
}

export interface ConfiguracionApp {
  user_id?: string;
  tasaCambioUSD: number; // Ej: 36.50 Bs/USD o moneda local
  simboloMonedaLocal: string; // Ej: 'Bs.' o '$'
  nombreBodega: string;
  rubro?: string; // Ej: 'Charcutería', 'Papelería', 'Bodega', 'Panadería'
  rif?: string; // Documento o RIF del negocio
  direccion?: string; // Dirección o Domicilio Fiscal del negocio
  porcentajeIva?: number; // Porcentaje general de IVA (ej. 16%)
  aplicaRetencionIva?: boolean; // Si aplica retención de IVA
  porcentajeRetencionIva?: number; // Porcentaje de retención de IVA (ej. 75%)
  propietario: string;
  emailAdmin: string;
  telefonoAdmin: string;
  alertaStockBajo: boolean;
  tasaBCVOficial?: number;
  tasaBCVFechaValor?: string;
  tasaBCVActualizadaEn?: string;
  tasaAutoActualizarBCV?: boolean;
  tasaEsManual?: boolean;
  categoriasPersonalizadas?: string[];
  unidadesPersonalizadas?: string[];
  rubroBloqueado?: boolean;
  pinSuperAdmin?: string;
  fechaRegistroUsuario?: string;
  licenciaActiva?: boolean;
  diasPruebaLimite?: number;
  rolUsuarioActual?: RolUsuario;
  usuariosNegocio?: UsuarioNegocio[];
}

export interface CierreCajaResumen {
  fecha: string;
  totalVentasUSD: number;
  totalVentasLocal: number;
  ventasPorMetodo: {
    Efectivo: number;
    'Pago Móvil': number;
    Divisa: number;
    Fiado: number;
  };
  totalAbonosUSD: number;
  abonosPorMetodo: {
    Efectivo: number;
    'Pago Móvil': number;
    Divisa: number;
  };
  efectivoNetoCajaUSD: number;
  efectivoNetoCajaLocal: number;
  cantidadTransacciones: number;
  cantidadAbonos: number;
  cuentasPorCobrarAcumuladas: number;
  productosBajoStock: number;
}
export type ActiveTab = 'pos' | 'inventario' | 'clientes' | 'fiado' | 'dashboard' | 'usuarios' | 'legabox';


export interface Gasto {
  ID_Gasto: string;
  user_id?: string;
  Fecha_Hora: string;
  Descripcion: string;
  Entidad?: string;
  Categoria: 'Inventario' | 'Servicios' | 'Personal' | 'Mantenimiento' | 'Otros';
  Monto_USD: number;
  Monto_Moneda_Local: number;
  Metodo_Pago: 'Efectivo' | 'Pago Móvil' | 'Divisa';
  ID_Usuario: string;
  Recibo_Base64?: string;
}
