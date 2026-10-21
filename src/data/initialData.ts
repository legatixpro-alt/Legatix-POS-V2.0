import { Producto, Cliente, VentaMaestro, DetalleVenta, Abono, ConfiguracionApp, Proveedor } from '../types/schema';

export const initialConfig: ConfiguracionApp = {
  tasaCambioUSD: 871.37, // Tasa de cambio oficial referencial (Moneda Local / USD)
  simboloMonedaLocal: 'Bs.',
  nombreBodega: 'OH Store',
  rubro: 'Ropa Deportiva',
  rif: '',
  direccion: '',
  propietario: '',
  emailAdmin: '',
  telefonoAdmin: '',
  alertaStockBajo: true,
  tasaAutoActualizarBCV: true,
  tasaEsManual: false,
  rubroBloqueado: false,
  pinSuperAdmin: '2026',
  licenciaActiva: true,
  porcentajeIva: 16,
  aplicaRetencionIva: false,
  porcentajeRetencionIva: 75,
};

export const initialProductos: Producto[] = [];

export const initialClientes: Cliente[] = [];

export const initialAbonos: Abono[] = [];

export const initialVentas: VentaMaestro[] = [];

export const initialProveedores: Proveedor[] = [];
