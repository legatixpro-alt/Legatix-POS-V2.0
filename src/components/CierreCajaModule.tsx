import React, { useState, useMemo } from 'react';
import {
  Calendar,
  ChevronDown,
  DollarSign,
  Smartphone,
  BookOpen,
  ArrowDownRight,
  TrendingUp,
  CheckCircle2,
  Mail,
  FileSpreadsheet,
  AlertTriangle,
  Play,
  ShieldCheck,
  History,
  Package,
  Search,
  MessageCircle,
  Share2,
  Download,
  Award,
  ArrowUpRight,
  X,
  Filter,
  Printer,
  Copy,
  Check,
  FileText,
  Layers,
  Tag,
  BarChart3,
  Percent,
  Sparkles,
  Store,
} from 'lucide-react';
import { ActiveTab, VentaMaestro, Abono, Producto, Cliente, ConfiguracionApp, Gasto } from '../types/schema';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'react-hot-toast';
import { formatUSD, formatLocal } from '../utils/formatters';
import { soundEffects } from '../utils/audio';
import { useNativeBackHandler } from '../utils/nativeNavigation';

const formatUnit = (unidad?: string) => {
  switch (unidad) {
    case 'Kilogramo': return 'kg';
    case 'Gramos': return 'g';
    case 'Unidad': return 'un';
    case 'Paquete': return 'pqt';
    case 'Botella': return 'bot';
    case 'Lata': return 'lata';
    default: return unidad || 'un';
  }
};

interface CierreCajaModuleProps {
  ventas: VentaMaestro[];
  abonos: Abono[];
  gastos?: Gasto[];
  productos: Producto[];
  clientes: Cliente[];
  config: ConfiguracionApp;
  onEjecutarCierreDiario: () => void;
  onNavigate?: (tab: ActiveTab, subTab?: string) => void;
  onOpenConfigModal?: () => void;
}

export interface ProductoVendidoResumen {
  id: string;
  nombre: string;
  categoria: string;
  unidad: string;
  cantidadTotal: number;
  totalUSD: number;
  totalLocal: number;
  precioUnitarioPromedio: number;
  costoUnitarioPromedio: number;
  costoTotalUSD: number;
  gananciaTotalUSD: number;
  margenPorcentaje: number;
  transaccionesCount: number;
  porcentajeVentas: number;
}

export interface CategoriaVentaResumen {
  categoria: string;
  tiposProductos: number;
  unidadesVendidas: number;
  totalUSD: number;
  totalLocal: number;
  porcentajeVentas: number;
}

export const CierreCajaModule: React.FC<CierreCajaModuleProps> = ({
  ventas,
  abonos,
  gastos = [],
  productos,
  clientes,
  config,
  onEjecutarCierreDiario,
  onNavigate,
  onOpenConfigModal,
}) => {
  const [showEmailPreviewModal, setShowEmailPreviewModal] = useState(false);
  const [showPrintTicketModal, setShowPrintTicketModal] = useState(false);
  const [modalTab, setModalTab] = useState<'productos' | 'financiero' | 'ticket'>('productos');
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Native Mobile Back Button Support
  useNativeBackHandler(showEmailPreviewModal || showPrintTicketModal, () => {
    setShowEmailPreviewModal(false);
    setShowPrintTicketModal(false);
  }, 'cierre_email_preview');

  const [isProcessingCierre, setIsProcessingCierre] = useState(false);
  const [cierreGeneradoExito, setCierreGeneradoExito] = useState(false);
  const [isDesgloseVentasOpen, setIsDesgloseVentasOpen] = useState(true);
  const [isDesgloseProductosOpen, setIsDesgloseProductosOpen] = useState(true);
  const [viewModeProdVendidos, setViewModeProdVendidos] = useState<'productos' | 'categorias'>('productos');
  const [searchQueryProdVendidos, setSearchQueryProdVendidos] = useState('');
  const [sortByProdVendidos, setSortByProdVendidos] = useState<'monto' | 'cantidad' | 'nombre' | 'margen'>('monto');
  const [selectedMetodos, setSelectedMetodos] = useState<string[]>(['Efectivo', 'Pago Móvil', 'Divisa', 'Fiado']);
  
  // Date filtering - default to 'hoy' for daily closing
  const [dateFilter, setDateFilter] = useState<'hoy' | '7dias' | '30dias'>('hoy');

  const filterByDate = (dateStr: string | Date | undefined) => {
    if (!dateStr) return true;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return true;
    const now = new Date();
    
    if (dateFilter === 'hoy') {
      return date.toDateString() === now.toDateString();
    } else if (dateFilter === '7dias') {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      return date >= sevenDaysAgo;
    }
    // 30 dias
    return true;
  };

  const filteredVentas = ventas.filter(v => filterByDate(v.Fecha_Hora || (v as any).created_at));
  const filteredAbonos = abonos.filter(a => filterByDate(a.Fecha_Hora || (a as any).Fecha_Abono || (a as any).created_at));
  const filteredGastos = gastos.filter(g => filterByDate(g.Fecha_Hora || (g as any).created_at));

  const toggleMetodo = (metodo: string) => {
    setSelectedMetodos(prev => 
      prev.includes(metodo) ? prev.filter(m => m !== metodo) : [...prev, metodo]
    );
  };

  // Detailed Sold Products Aggregation
  const productosVendidosDetalle = useMemo(() => {
    const map = new Map<string, {
      id: string;
      nombre: string;
      categoria: string;
      unidad: string;
      cantidadTotal: number;
      totalUSD: number;
      totalLocal: number;
      precioUnitarioPromedio: number;
      costoUnitarioPromedio: number;
      costoTotalUSD: number;
      gananciaTotalUSD: number;
      transaccionesCount: number;
    }>();

    filteredVentas.forEach((venta) => {
      if (venta.Items && Array.isArray(venta.Items) && venta.Items.length > 0) {
        venta.Items.forEach((item: any) => {
          const prod = item.producto || item;
          const nombre = prod.Nombre || prod.Nombre_Producto || prod.name || item.Nombre || 'Producto Vario';
          const id = prod.ID_Producto || prod.id || nombre;
          
          // Match with live inventory to get accurate category, unit and cost if available
          const matchingInv = productos.find(p => p.ID_Producto === id || p.Nombre.toLowerCase().trim() === nombre.toLowerCase().trim());
          const categoria = prod.Categoria || matchingInv?.Categoria || prod.categoria || 'General';
          const unidad = prod.Unidad_Medida || matchingInv?.Unidad_Medida || prod.unidad || 'Unidad';
          const cantidad = Number(item.cantidad || prod.cantidad || 1);
          const precioUnitario = Number(prod.Precio_Venta ?? matchingInv?.Precio_Venta ?? prod.precio ?? (item.Subtotal ? item.Subtotal / cantidad : 0));
          const subtotal = Number(item.Subtotal ?? (precioUnitario * cantidad) ?? 0);
          const costoUnitario = Number(prod.Costo ?? matchingInv?.Costo ?? 0);
          const costoTotal = costoUnitario * cantidad;
          const ganancia = Math.max(0, subtotal - costoTotal);

          if (!map.has(id)) {
            map.set(id, {
              id,
              nombre,
              categoria,
              unidad,
              cantidadTotal: cantidad,
              totalUSD: subtotal,
              totalLocal: subtotal * config.tasaCambioUSD,
              precioUnitarioPromedio: precioUnitario,
              costoUnitarioPromedio: costoUnitario,
              costoTotalUSD: costoTotal,
              gananciaTotalUSD: ganancia,
              transaccionesCount: 1,
            });
          } else {
            const existing = map.get(id)!;
            existing.cantidadTotal += cantidad;
            existing.totalUSD += subtotal;
            existing.totalLocal += subtotal * config.tasaCambioUSD;
            existing.costoTotalUSD += costoTotal;
            existing.gananciaTotalUSD += ganancia;
            existing.transaccionesCount += 1;
          }
        });
      } else if (venta.Total_Venta > 0) {
        const id = 'VENTA-GENERAL';
        const nombre = venta.Nombre_Cliente ? `Venta a ${venta.Nombre_Cliente}` : 'Venta Rápida de Mostrador';
        const cantidad = venta.Items_Count || 1;
        const subtotal = venta.Total_Venta;

        if (!map.has(id)) {
          map.set(id, {
            id,
            nombre,
            categoria: 'Venta General',
            unidad: 'Transacción',
            cantidadTotal: cantidad,
            totalUSD: subtotal,
            totalLocal: subtotal * config.tasaCambioUSD,
            precioUnitarioPromedio: subtotal / cantidad,
            costoUnitarioPromedio: 0,
            costoTotalUSD: 0,
            gananciaTotalUSD: subtotal,
            transaccionesCount: 1,
          });
        } else {
          const existing = map.get(id)!;
          existing.cantidadTotal += cantidad;
          existing.totalUSD += subtotal;
          existing.totalLocal += subtotal * config.tasaCambioUSD;
          existing.gananciaTotalUSD += subtotal;
          existing.transaccionesCount += 1;
        }
      }
    });

    const grandTotal = Array.from(map.values()).reduce((sum, item) => sum + item.totalUSD, 0) || 1;

    const result: ProductoVendidoResumen[] = Array.from(map.values()).map(item => {
      const precioProm = item.cantidadTotal > 0 ? item.totalUSD / item.cantidadTotal : 0;
      const costoProm = item.cantidadTotal > 0 ? item.costoTotalUSD / item.cantidadTotal : 0;
      const margen = item.totalUSD > 0 ? (item.gananciaTotalUSD / item.totalUSD) * 100 : 0;
      return {
        ...item,
        precioUnitarioPromedio: precioProm,
        costoUnitarioPromedio: costoProm,
        margenPorcentaje: margen,
        porcentajeVentas: (item.totalUSD / grandTotal) * 100,
      };
    });

    return result.sort((a, b) => b.totalUSD - a.totalUSD);
  }, [filteredVentas, productos, config.tasaCambioUSD]);

  const totalCantidadArticulosVendidos = useMemo(() => {
    return productosVendidosDetalle.reduce((sum, p) => sum + p.cantidadTotal, 0);
  }, [productosVendidosDetalle]);

  const totalUSDProductos = useMemo(() => {
    return productosVendidosDetalle.reduce((sum, p) => sum + p.totalUSD, 0);
  }, [productosVendidosDetalle]);

  const totalGananciaEstimadaUSD = useMemo(() => {
    return productosVendidosDetalle.reduce((sum, p) => sum + p.gananciaTotalUSD, 0);
  }, [productosVendidosDetalle]);

  const productoMasVendido = useMemo(() => {
    return productosVendidosDetalle.length > 0 ? productosVendidosDetalle[0] : null;
  }, [productosVendidosDetalle]);

  // Breakdown by Category
  const categoriasVentasResumen = useMemo(() => {
    const map = new Map<string, {
      categoria: string;
      tiposProductos: number;
      unidadesVendidas: number;
      totalUSD: number;
      totalLocal: number;
    }>();

    productosVendidosDetalle.forEach(p => {
      const cat = p.categoria || 'General';
      if (!map.has(cat)) {
        map.set(cat, {
          categoria: cat,
          tiposProductos: 1,
          unidadesVendidas: p.cantidadTotal,
          totalUSD: p.totalUSD,
          totalLocal: p.totalLocal,
        });
      } else {
        const item = map.get(cat)!;
        item.tiposProductos += 1;
        item.unidadesVendidas += p.cantidadTotal;
        item.totalUSD += p.totalUSD;
        item.totalLocal += p.totalLocal;
      }
    });

    const grand = totalUSDProductos || 1;
    return Array.from(map.values())
      .map(c => ({
        ...c,
        porcentajeVentas: (c.totalUSD / grand) * 100,
      }))
      .sort((a, b) => b.totalUSD - a.totalUSD);
  }, [productosVendidosDetalle, totalUSDProductos]);

  const filteredProductosVendidos = useMemo(() => {
    let list = productosVendidosDetalle;
    if (searchQueryProdVendidos.trim()) {
      const q = searchQueryProdVendidos.toLowerCase();
      list = list.filter(p => p.nombre.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q));
    }
    if (sortByProdVendidos === 'cantidad') {
      return [...list].sort((a, b) => b.cantidadTotal - a.cantidadTotal);
    } else if (sortByProdVendidos === 'nombre') {
      return [...list].sort((a, b) => a.nombre.localeCompare(b.nombre));
    } else if (sortByProdVendidos === 'margen') {
      return [...list].sort((a, b) => b.gananciaTotalUSD - a.gananciaTotalUSD);
    }
    return [...list].sort((a, b) => b.totalUSD - a.totalUSD);
  }, [productosVendidosDetalle, searchQueryProdVendidos, sortByProdVendidos]);

  // Copy products table to clipboard (Excel / Sheets format TSV)
  const handleCopyProductsTable = () => {
    let tsv = "N°\tProducto\tCategoría\tCantidad\tUnidad\tPrecio Unit USD\tTotal USD\tTotal Bs.\t% Ventas\n";
    productosVendidosDetalle.forEach((p, idx) => {
      tsv += `${idx + 1}\t${p.nombre}\t${p.categoria}\t${p.cantidadTotal}\t${p.unidad}\t${p.precioUnitarioPromedio.toFixed(2)}\t${p.totalUSD.toFixed(2)}\t${p.totalLocal.toFixed(2)}\t${p.porcentajeVentas.toFixed(1)}%\n`;
    });
    navigator.clipboard.writeText(tsv);
    setCopiedSuccess(true);
    toast.success('Lista de productos copiada al portapapeles (compatible con Excel/Sheets)');
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  // Copy complete formatted closing text to clipboard
  const handleCopyReportText = () => {
    let text = `===========================================\n`;
    text += `REPORTE DE CIERRE - ${config.nombreBodega || 'COMERCIO'}\n`;
    text += `Fecha: ${new Date().toLocaleDateString('es-ES')} (${dateFilter === 'hoy' ? 'Hoy' : dateFilter === '7dias' ? '7 días' : '30 días'})\n`;
    text += `Tasa Oficial: Bs. ${config.tasaCambioUSD.toLocaleString('es-VE', { minimumFractionDigits: 2 })} / USD\n`;
    text += `===========================================\n`;
    text += `TOTAL FACTURADO: ${formatUSD(totalVentasUSD)} (${formatLocal(totalVentasUSD, config.tasaCambioUSD, config.simboloMonedaLocal)})\n\n`;
    text += `--- DETALLE DE PRODUCTOS VENDIDOS (${productosVendidosDetalle.length} tipos - ${totalCantidadArticulosVendidos} un) ---\n`;
    productosVendidosDetalle.forEach((p, idx) => {
      const cantForm = p.cantidadTotal % 1 === 0 ? p.cantidadTotal : p.cantidadTotal.toFixed(2);
      text += `${idx + 1}. ${p.nombre} [${p.categoria}]\n`;
      text += `   Cant: ${cantForm} ${formatUnit(p.unidad)} | P. Unit: ${formatUSD(p.precioUnitarioPromedio)}\n`;
      text += `   Subtotal: ${formatUSD(p.totalUSD)} (${formatLocal(p.totalUSD, config.tasaCambioUSD, config.simboloMonedaLocal)}) [${p.porcentajeVentas.toFixed(1)}%]\n`;
    });
    text += `\n--- DESGLOSE POR FORMAS DE PAGO ---\n`;
    text += `• Efectivo: ${formatUSD(ventasEfectivo)}\n`;
    text += `• Pago Móvil: ${formatUSD(ventasPagoMovil)}\n`;
    text += `• Divisas USD: ${formatUSD(ventasDivisa)}\n`;
    text += `• Fiado: ${formatUSD(ventasFiado)}\n`;
    text += `\n• Abonos Cobrados: +${formatUSD(totalAbonosUSD)}\n`;
    text += `• Gastos Operativos: -${formatUSD(totalGastosUSD)}\n`;
    text += `===========================================\n`;
    text += `GAVETA FÍSICA (EFECTIVO NETO): ${formatUSD(totalEfectivoGavetaUSD)}\n`;
    text += `===========================================\n`;

    navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    toast.success('Reporte completo copiado al portapapeles');
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  const handleShareWhatsAppReport = () => {
    let text = `*📊 REPORTE DE CIERRE DIARIO - ${config.nombreBodega || 'MI COMERCIO'}*\n`;
    text += `📅 Fecha: ${new Date().toLocaleDateString('es-ES')} (${dateFilter === 'hoy' ? 'Hoy' : dateFilter === '7dias' ? 'Últimos 7 días' : 'Últimos 30 días'})\n`;
    text += `💵 Tasa Oficial: ${config.tasaCambioUSD.toLocaleString('es-VE', { minimumFractionDigits: 2 })} ${config.simboloMonedaLocal}/USD\n`;
    text += `===========================================\n`;
    text += `💰 *TOTAL VENTAS: ${formatUSD(totalVentasUSD)}*\n`;
    text += `   ≈ ${formatLocal(totalVentasUSD, config.tasaCambioUSD, config.simboloMonedaLocal)}\n\n`;
    
    text += `📦 *DETALLE DE PRODUCTOS VENDIDOS (${productosVendidosDetalle.length} variedades | ${totalCantidadArticulosVendidos % 1 === 0 ? totalCantidadArticulosVendidos : totalCantidadArticulosVendidos.toFixed(2)} unidades)*:\n`;
    text += `-------------------------------------------\n`;
    if (productosVendidosDetalle.length === 0) {
      text += `_Sin ventas de productos registradas en este período._\n`;
    } else {
      productosVendidosDetalle.forEach((p, idx) => {
        const cantForm = p.cantidadTotal % 1 === 0 ? p.cantidadTotal : p.cantidadTotal.toFixed(2);
        text += `${idx + 1}. *${p.nombre}* (${p.categoria})\n`;
        text += `   Cant: ${cantForm} ${formatUnit(p.unidad)} | P. Unit: ${formatUSD(p.precioUnitarioPromedio)}\n`;
        text += `   Subtotal: *${formatUSD(p.totalUSD)}* (${formatLocal(p.totalUSD, config.tasaCambioUSD, config.simboloMonedaLocal)}) [${p.porcentajeVentas.toFixed(1)}%]\n`;
      });
    }

    if (categoriasVentasResumen.length > 0) {
      text += `\n📂 *RESUMEN POR CATEGORÍAS:*\n`;
      categoriasVentasResumen.forEach((c) => {
        text += `• *${c.categoria}*: ${formatUSD(c.totalUSD)} (${c.porcentajeVentas.toFixed(1)}%) - ${c.unidadesVendidas % 1 === 0 ? c.unidadesVendidas : c.unidadesVendidas.toFixed(2)} un\n`;
      });
    }

    text += `\n💳 *DESGLOSE POR FORMAS DE PAGO:*\n`;
    text += `• 💵 Efectivo: ${formatUSD(ventasEfectivo)}\n`;
    text += `• 📱 Pago Móvil: ${formatUSD(ventasPagoMovil)}\n`;
    text += `• 💲 Divisas USD: ${formatUSD(ventasDivisa)}\n`;
    text += `• 📝 Fiado Otorgado: ${formatUSD(ventasFiado)}\n\n`;

    text += `📥 *Abonos Cobrados:* +${formatUSD(totalAbonosUSD)}\n`;
    text += `💸 *Gastos y Proveedores:* -${formatUSD(totalGastosUSD)}\n`;
    text += `===========================================\n`;
    text += `🏦 *GAVETA FÍSICA (EFECTIVO NETO): ${formatUSD(totalEfectivoGavetaUSD)}*\n`;
    text += `   ≈ ${formatLocal(totalEfectivoGavetaUSD, config.tasaCambioUSD, config.simboloMonedaLocal)}\n`;
    text += `===========================================\n`;
    text += `_Generado automáticamente desde el Sistema POS_`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  // Financial summary metrics
  const totalVentasUSD = filteredVentas.reduce((sum, v) => sum + v.Total_Venta, 0);
  const filteredTotalVentasUSD = filteredVentas
    .filter((v) => selectedMetodos.includes(v.Metodo_Pago))
    .reduce((sum, v) => sum + v.Total_Venta, 0);
  const ventasEfectivo = filteredVentas.reduce((sum, v) => {
    if (v.Metodo_Pago === 'Efectivo') return sum + v.Total_Venta;
    if (v.Metodo_Pago === 'Mixto' && v.Desglose_Pagos) {
      const parts = v.Desglose_Pagos.filter(p => p.metodo === 'Efectivo' && !p.isUSD);
      return sum + parts.reduce((s, p) => s + (p.montoUSD || (p.monto / (v.Tasa_Cambio_Aplicada || config.tasaCambioUSD))), 0);
    }
    return sum;
  }, 0);

  const ventasPagoMovil = filteredVentas.reduce((sum, v) => {
    if (v.Metodo_Pago === 'Pago Móvil') return sum + v.Total_Venta;
    if (v.Metodo_Pago === 'Mixto' && v.Desglose_Pagos) {
      const parts = v.Desglose_Pagos.filter(p => p.metodo === 'Pago Móvil' || (p.label && p.label.includes('Móvil')));
      return sum + parts.reduce((s, p) => s + (p.montoUSD || (p.monto / (v.Tasa_Cambio_Aplicada || config.tasaCambioUSD))), 0);
    }
    return sum;
  }, 0);

  const ventasDivisa = filteredVentas.reduce((sum, v) => {
    if (v.Metodo_Pago === 'Divisa') return sum + v.Total_Venta;
    if (v.Metodo_Pago === 'Mixto' && v.Desglose_Pagos) {
      const parts = v.Desglose_Pagos.filter(p => p.isUSD || p.metodo === 'Divisa' || (p.label && (p.label.includes('$') || p.label.includes('Punto'))));
      return sum + parts.reduce((s, p) => s + (p.montoUSD || (p.isUSD ? p.monto : p.monto / (v.Tasa_Cambio_Aplicada || config.tasaCambioUSD))), 0);
    }
    return sum;
  }, 0);

  const ventasFiado = filteredVentas.reduce((sum, v) => {
    if (v.Metodo_Pago === 'Fiado') return sum + v.Total_Venta;
    if (v.Monto_Credito && v.Monto_Credito > 0) return sum + v.Monto_Credito;
    return sum;
  }, 0);

  // Abonos & Gastos
  const totalAbonosUSD = filteredAbonos.reduce((sum, a) => sum + a.Monto_Abonado, 0);
  const totalGastosUSD = filteredGastos.reduce((sum, g) => sum + g.Monto_USD, 0);

  const abonosEfectivo = filteredAbonos
    .filter((a) => a.Metodo_Abono === 'Efectivo')
    .reduce((sum, a) => sum + a.Monto_Abonado, 0);
  const abonosPagoMovil = filteredAbonos
    .filter((a) => a.Metodo_Abono === 'Pago Móvil')
    .reduce((sum, a) => sum + a.Monto_Abonado, 0);
  const abonosDivisa = filteredAbonos
    .filter((a) => a.Metodo_Abono === 'Divisa')
    .reduce((sum, a) => sum + a.Monto_Abonado, 0);

  // Dinero Físico en Gaveta
  const totalEfectivoGavetaUSD = ventasEfectivo + ventasDivisa + abonosEfectivo + abonosDivisa - (filteredGastos.filter(g => g.Metodo_Pago === 'Efectivo' || g.Metodo_Pago === 'Divisa').reduce((sum, g) => sum + g.Monto_USD, 0));
  const totalDineroDigitalUSD = ventasPagoMovil + abonosPagoMovil;

  // Alerts
  const productosBajoStock = productos.filter((p) => p.Stock_Actual <= p.Stock_Minimo);
  const totalDeudaPendiente = clientes.reduce((sum, c) => sum + c.Deuda_Total, 0);

  // Generate Exhaustive PDF Report
  const generatePDFReport = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header Institucional
    doc.setFontSize(16);
    doc.setTextColor(20, 20, 20);
    doc.text(`REPORTE DE CIERRE DIARIO Y PRODUCTOS VENDIDOS`, pageWidth / 2, 14, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(50, 50, 50);
    doc.text(`${config.nombreBodega || 'Comercio'} ${config.rif ? `(RIF: ${config.rif})` : ''}`, pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    const fechaHoraStr = `${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}`;
    doc.text(`Fecha y Hora de Emisión: ${fechaHoraStr} | Operador: ${config.emailAdmin || 'Administrador'}`, 14, 28);
    doc.text(`Tasa Oficial de Cambio: Bs. ${config.tasaCambioUSD.toLocaleString('es-VE', { minimumFractionDigits: 2 })} / USD | Período: ${dateFilter === 'hoy' ? 'Hoy' : dateFilter === '7dias' ? 'Últimos 7 días' : 'Últimos 30 días'}`, 14, 33);
    
    let yPos = 38;
    
    // 1. Resumen Financiero y Métodos
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text('1. RESUMEN FINANCIERO Y FORMAS DE PAGO', 14, yPos);
    yPos += 4;
    
    autoTable(doc, {
      startY: yPos,
      head: [['Forma de Pago / Concepto', 'Monto USD', `Monto (${config.simboloMonedaLocal})`, '% Participación']],
      body: [
        ['Efectivo ($ / Bs.)', formatUSD(ventasEfectivo), formatLocal(ventasEfectivo, config.tasaCambioUSD, config.simboloMonedaLocal), `${totalVentasUSD > 0 ? ((ventasEfectivo / totalVentasUSD) * 100).toFixed(1) : 0}%`],
        ['Pago Móvil', formatUSD(ventasPagoMovil), formatLocal(ventasPagoMovil, config.tasaCambioUSD, config.simboloMonedaLocal), `${totalVentasUSD > 0 ? ((ventasPagoMovil / totalVentasUSD) * 100).toFixed(1) : 0}%`],
        ['Divisa Física (USD)', formatUSD(ventasDivisa), formatLocal(ventasDivisa, config.tasaCambioUSD, config.simboloMonedaLocal), `${totalVentasUSD > 0 ? ((ventasDivisa / totalVentasUSD) * 100).toFixed(1) : 0}%`],
        ['Fiado Otorgado', formatUSD(ventasFiado), formatLocal(ventasFiado, config.tasaCambioUSD, config.simboloMonedaLocal), `${totalVentasUSD > 0 ? ((ventasFiado / totalVentasUSD) * 100).toFixed(1) : 0}%`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [41, 121, 255], textColor: [255, 255, 255], fontStyle: 'bold' },
      foot: [
        ['TOTAL VENTAS GENERAL', formatUSD(totalVentasUSD), formatLocal(totalVentasUSD, config.tasaCambioUSD, config.simboloMonedaLocal), '100%']
      ],
      footStyles: { fillColor: [230, 240, 255], textColor: [0, 50, 150], fontStyle: 'bold' }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;

    // 2. DETALLE COMPLETO DE PRODUCTOS VENDIDOS EN EL DÍA
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text(`2. DETALLE DE PRODUCTOS VENDIDOS (${productosVendidosDetalle.length} variedades | ${totalCantidadArticulosVendidos % 1 === 0 ? totalCantidadArticulosVendidos : totalCantidadArticulosVendidos.toFixed(2)} unidades)`, 14, yPos);
    yPos += 4;

    const productosVendidosBody = productosVendidosDetalle.map((p, idx) => [
      (idx + 1).toString(),
      p.nombre,
      p.categoria,
      `${p.cantidadTotal % 1 === 0 ? p.cantidadTotal : p.cantidadTotal.toFixed(2)} ${formatUnit(p.unidad)}`,
      formatUSD(p.precioUnitarioPromedio),
      formatUSD(p.totalUSD),
      formatLocal(p.totalUSD, config.tasaCambioUSD, config.simboloMonedaLocal),
      `${p.porcentajeVentas.toFixed(1)}%`
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Producto', 'Categoría', 'Cant. Vendida', 'P. Unitario', 'Total USD', `Total (${config.simboloMonedaLocal})`, '% Día']],
      body: productosVendidosBody.length > 0 ? productosVendidosBody : [['-', 'Sin productos vendidos en este período', '', '', '', '', '', '']],
      theme: 'grid',
      headStyles: { fillColor: [0, 150, 70], textColor: [255, 255, 255], fontStyle: 'bold' },
      foot: productosVendidosBody.length > 0 ? [
        ['TOTAL', `${productosVendidosDetalle.length} prods`, '', `${totalCantidadArticulosVendidos % 1 === 0 ? totalCantidadArticulosVendidos : totalCantidadArticulosVendidos.toFixed(2)} ítems`, '', formatUSD(totalUSDProductos), formatLocal(totalUSDProductos, config.tasaCambioUSD, config.simboloMonedaLocal), '100%']
      ] : undefined,
      footStyles: { fillColor: [230, 255, 240], textColor: [0, 80, 40], fontStyle: 'bold' },
      styles: { fontSize: 8 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
    
    // 3. Resumen por Categorías
    if (categoriasVentasResumen.length > 0) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 15;
      }

      doc.setFontSize(11);
      doc.setTextColor(20, 20, 20);
      doc.text('3. VENTAS CONSOLIDADAS POR CATEGORÍA', 14, yPos);
      yPos += 4;

      const catBody = categoriasVentasResumen.map(c => [
        c.categoria,
        `${c.tiposProductos} tipos`,
        `${c.unidadesVendidas % 1 === 0 ? c.unidadesVendidas : c.unidadesVendidas.toFixed(2)} un`,
        formatUSD(c.totalUSD),
        formatLocal(c.totalUSD, config.tasaCambioUSD, config.simboloMonedaLocal),
        `${c.porcentajeVentas.toFixed(1)}%`
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Categoría / Rubro', 'Variedad', 'Volumen', 'Total USD', `Total (${config.simboloMonedaLocal})`, '% Total']],
        body: catBody,
        theme: 'grid',
        headStyles: { fillColor: [100, 50, 180], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8 }
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // 4. Arqueo de Gaveta Física y Gastos
    if (yPos > 240) {
      doc.addPage();
      yPos = 15;
    }

    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text('4. ARQUEO DE GAVETA FÍSICA Y FLUJO DE EFECTIVO', 14, yPos);
    yPos += 4;

    autoTable(doc, {
      startY: yPos,
      head: [['Concepto de Caja', 'Monto USD', `Monto (${config.simboloMonedaLocal})`]],
      body: [
        ['Cobranza de Deudas (Abonos Recibidos)', `+${formatUSD(totalAbonosUSD)}`, `+${formatLocal(totalAbonosUSD, config.tasaCambioUSD, config.simboloMonedaLocal)}`],
        ['Gastos Operativos y Proveedores', `-${formatUSD(totalGastosUSD)}`, `-${formatLocal(totalGastosUSD, config.tasaCambioUSD, config.simboloMonedaLocal)}`],
        ['Dinero Físico Neto Esperado en Gaveta', formatUSD(totalEfectivoGavetaUSD), formatLocal(totalEfectivoGavetaUSD, config.tasaCambioUSD, config.simboloMonedaLocal)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 20;

    // Firmas de Responsabilidad
    if (yPos > 255) {
      doc.addPage();
      yPos = 30;
    }

    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text('__________________________________', 25, yPos);
    doc.text('__________________________________', 120, yPos);
    doc.text('Firma del Cajero / Operador', 35, yPos + 5);
    doc.text('Firma del Administrador / Dueño', 130, yPos + 5);
    
    doc.save(`Cierre_Diario_Productos_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Reporte PDF descargado con éxito');
  };

  const handleTriggerScriptCierre = () => {
    setIsProcessingCierre(true);
    soundEffects.playCashRegisterChime();

    setTimeout(() => {
      // First generate PDF
      generatePDFReport();

      setIsProcessingCierre(false);
      setCierreGeneradoExito(true);
      setShowEmailPreviewModal(true);
      onEjecutarCierreDiario();
    }, 1200);
  };

  const totalFiaoUSD = clientes.reduce((acc, c) => acc + c.Deuda_Total, 0);
  const stockCriticoCount = productos.filter((p) => p.Stock_Actual <= p.Stock_Minimo).length;

  // Process data for daily sales chart
  const salesByDate = filteredVentas.reduce((acc, v) => {
    let dateStr = 'Hoy';
    if (v.Fecha_Hora) {
      dateStr = v.Fecha_Hora.split(' ')[0].split('T')[0];
    }
    if (!acc[dateStr]) {
      acc[dateStr] = 0;
    }
    if (selectedMetodos.includes(v.Metodo_Pago)) {
      acc[dateStr] += v.Total_Venta;
    }
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.keys(salesByDate)
    .sort()
    .slice(-7)
    .map(date => {
      const parts = date.split('-');
      const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : date;
      return {
        name: label,
        total: salesByDate[date],
        fullDate: date
      };
    });

  return (
    <div className="flex flex-col h-full bg-[#090A0D] text-white font-sans">
      {/* Top Banner */}
      <div className="p-3 bg-[#0D0E12] border-b border-[#232530] flex items-center justify-between flex-wrap gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center">
            <Calendar size={16} className="text-[#D4AF37]" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-white">Centro de Mando & Cierre</h2>
            <p className="text-[10px] text-gray-400 font-medium">Consolidado con Detalle de Productos • {new Date().toLocaleDateString('es-ES')}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <select 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="bg-[#111216] border border-[#232530] focus:border-[#D4AF37] text-xs py-1.5 px-3 rounded-xl font-bold text-[#F5DA76] outline-none transition-colors"
          >
            <option value="hoy">Hoy</option>
            <option value="7dias">Últimos 7 días</option>
            <option value="30dias">Últimos 30 días</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setModalTab('productos');
              setShowEmailPreviewModal(true);
            }}
            title="Ver reporte detallado de productos vendidos y arqueo"
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#181A22] hover:bg-[#222530] border border-[#232530] hover:border-[#D4AF37]/40 px-3 py-1.5 rounded-xl transition-all active:scale-95 cursor-pointer"
          >
            <FileText size={14} className="text-[#D4AF37]" />
            <span>Ver Reporte</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPrintTicketModal(true)}
            title="Ver e imprimir ticket térmico de cierre"
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#181A22] hover:bg-[#222530] border border-[#232530] hover:border-[#D4AF37]/40 px-3 py-1.5 rounded-xl transition-all active:scale-95 cursor-pointer"
          >
            <Printer size={14} className="text-[#D4AF37]" />
            <span className="hidden sm:inline">Ticket</span>
          </button>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5 pb-10 font-mono custom-scrollbar">
        {/* Futuristic Dashboard Indicators for Desktop & Mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* ORO - VENTAS TOTALES */}
          <div className="relative group rounded-2xl bg-[#111216] border border-[#D4AF37]/40 p-4 overflow-hidden shadow-lg hover:border-[#D4AF37] transition-all duration-300 flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-80"></div>
            <div className="absolute -inset-0 bg-gradient-to-b from-[#D4AF37]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="flex justify-between items-center text-[10px] text-[#D4AF37] font-black uppercase tracking-widest font-sans mb-1 relative z-10">
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,1)] animate-pulse"></div> 
                Ventas Totales
              </span>
              <span className="text-[#F5DA76] bg-[#D4AF37]/15 border border-[#D4AF37]/30 px-2 py-0.5 rounded-full text-[9px] font-bold">
                {dateFilter.toUpperCase()}
              </span>
            </div>
            
            <div className="relative z-10 my-1">
              <div className="text-2xl sm:text-3xl lg:text-3xl font-extrabold text-white tabular-nums tracking-wider">
                {formatUSD(filteredTotalVentasUSD)}
              </div>
              <div className="text-xs font-semibold text-[#D4AF37]/80 font-mono mt-0.5">
                ≈ {formatLocal(filteredTotalVentasUSD, config.tasaCambioUSD, config.simboloMonedaLocal)}
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-gray-400 pt-2 border-t border-white/5 relative z-10">
              <span>{filteredVentas.length} tickets</span>
              <span>•</span>
              <span>{totalCantidadArticulosVendidos % 1 === 0 ? totalCantidadArticulosVendidos : totalCantidadArticulosVendidos.toFixed(2)} arts</span>
            </div>
          </div>

          {/* ROJO - CUENTAS POR COBRAR */}
          <div 
            onClick={() => onNavigate && onNavigate('fiado', 'deudores')}
            className="cursor-pointer relative group rounded-2xl bg-[#111216] border border-[#232530] hover:border-[#FF6B6B]/60 p-4 overflow-hidden shadow-lg transition-all duration-300 flex flex-col justify-between"
          >
            <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-transparent via-[#FF6B6B]/70 to-transparent opacity-70"></div>
            <div className="flex items-center gap-1.5 text-[10px] text-[#FF6B6B] font-black uppercase tracking-widest mb-1 relative z-10 font-sans">
              <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B6B] shadow-[0_0_8px_rgba(255,107,107,1)]"></div>
              <span>Por Cobrar (Fiado)</span>
            </div>
            <div className="relative z-10 my-1">
              <div className="text-2xl sm:text-3xl font-extrabold text-white tabular-nums tracking-wider">
                {formatUSD(totalFiaoUSD)}
              </div>
              <div className="text-xs font-medium text-gray-400 font-mono mt-0.5">
                ≈ {formatLocal(totalFiaoUSD, config.tasaCambioUSD, config.simboloMonedaLocal)}
              </div>
            </div>
            <div className="text-[10px] text-gray-400 pt-2 border-t border-white/5 relative z-10 flex items-center justify-between">
              <span>Capital en calle</span>
              <span className="text-[#FF8A80] font-bold">Ver Deudores →</span>
            </div>
          </div>

          {/* DORADO / AMBAR - STOCK CRÍTICO */}
          <div 
            onClick={() => onNavigate && onNavigate('inventario')}
            className="cursor-pointer relative group rounded-2xl bg-[#111216] border border-[#232530] hover:border-[#D4AF37]/60 p-4 overflow-hidden shadow-lg transition-all duration-300 flex flex-col justify-between"
          >
            <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-transparent via-[#F5DA76]/70 to-transparent opacity-70"></div>
            <div className="flex items-center gap-1.5 text-[10px] text-[#F5DA76] font-black uppercase tracking-widest mb-1 relative z-10 font-sans">
              <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,1)]"></div>
              <span>Stock Crítico</span>
            </div>
            <div className="relative z-10 my-1">
              <div className="text-2xl sm:text-3xl font-extrabold text-white tabular-nums tracking-wider">
                {stockCriticoCount} <span className="text-sm font-normal text-gray-400 font-sans">ítems</span>
              </div>
              <div className="text-xs font-semibold text-[#D4AF37]/80 font-mono mt-0.5">
                Reposición requerida
              </div>
            </div>
            <div className="text-[10px] text-gray-400 pt-2 border-t border-white/5 relative z-10 flex items-center justify-between">
              <span>Bajo stock mínimo</span>
              <span className="text-[#F5DA76] font-bold">Ver Inventario →</span>
            </div>
          </div>

          {/* GASTOS & SALIDAS */}
          <div 
            onClick={() => onNavigate && onNavigate('fiado', 'gastos')}
            className="cursor-pointer relative group rounded-2xl bg-[#111216] border border-[#232530] hover:border-[#D4AF37]/60 p-4 overflow-hidden shadow-lg transition-all duration-300 flex flex-col justify-between"
          >
            <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-transparent via-[#D4AF37]/70 to-transparent opacity-70"></div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-300 font-black uppercase tracking-widest mb-1 relative z-10 font-sans">
              <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,1)] shrink-0"></div>
              <span>Gastos & Salidas</span>
            </div>
            <div className="relative z-10 my-1">
              <div className="text-2xl sm:text-3xl font-extrabold text-[#FF6B6B] tabular-nums tracking-wider">
                {formatUSD(totalGastosUSD)}
              </div>
              <div className="text-xs font-medium text-gray-400 font-mono mt-0.5">
                ≈ {formatLocal(totalGastosUSD, config.tasaCambioUSD, config.simboloMonedaLocal)}
              </div>
            </div>
            <div className="text-[10px] text-gray-400 pt-2 border-t border-white/5 relative z-10 flex items-center justify-between">
              <span>Egresos del período</span>
              <span className="text-[#F5DA76] font-bold">Ver Gastos →</span>
            </div>
          </div>
        </div>

        {/* Desglose de Métodos de Pago */}
        <div className="bg-[#111216] border border-[#232530] rounded-2xl p-4 space-y-2.5 shadow-lg">
          <div className="flex items-center justify-between">
            <button 
              type="button"
              onClick={() => setIsDesgloseVentasOpen(!isDesgloseVentasOpen)}
              className="flex items-center gap-2 text-xs font-black text-[#D4AF37] uppercase tracking-wider hover:text-[#F5DA76] transition-colors cursor-pointer"
            >
              <DollarSign size={15} className="text-[#D4AF37]" />
              <span>Desglose por Formas de Pago</span>
              <ChevronDown size={14} className={`transition-transform duration-300 ${isDesgloseVentasOpen ? 'rotate-180' : ''}`} />
            </button>
            <span className="text-[10px] text-gray-400">Toca para filtrar gráfico</span>
          </div>

          {isDesgloseVentasOpen && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono">
              {/* Efectivo */}
              <div 
                onClick={() => toggleMetodo('Efectivo')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedMetodos.includes('Efectivo') 
                    ? 'bg-[#0D1812] border-[#00E676]/50 text-white shadow-sm' 
                    : 'bg-[#090A0D] border-[#232530] opacity-40 grayscale'
                }`}
              >
                <div className="text-[10px] text-gray-400 font-sans">💵 Efectivo ($/Bs)</div>
                <div className="text-base font-extrabold text-[#00E676] mt-0.5">{formatUSD(ventasEfectivo)}</div>
                <div className="text-[9px] text-gray-400">{formatLocal(ventasEfectivo, config.tasaCambioUSD, config.simboloMonedaLocal)}</div>
              </div>

              {/* Pago Móvil */}
              <div 
                onClick={() => toggleMetodo('Pago Móvil')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedMetodos.includes('Pago Móvil') 
                    ? 'bg-[#0C1524] border-[#38BDF8]/50 text-white shadow-sm' 
                    : 'bg-[#090A0D] border-[#232530] opacity-40 grayscale'
                }`}
              >
                <div className="text-[10px] text-gray-400 font-sans">📱 Pago Móvil</div>
                <div className="text-base font-extrabold text-[#38BDF8] mt-0.5">{formatUSD(ventasPagoMovil)}</div>
                <div className="text-[9px] text-gray-400">{formatLocal(ventasPagoMovil, config.tasaCambioUSD, config.simboloMonedaLocal)}</div>
              </div>

              {/* Divisa USD */}
              <div 
                onClick={() => toggleMetodo('Divisa')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedMetodos.includes('Divisa') 
                    ? 'bg-[#18160B] border-[#D4AF37]/60 text-white shadow-[0_0_15px_rgba(212,175,55,0.15)]' 
                    : 'bg-[#090A0D] border-[#232530] opacity-40 grayscale'
                }`}
              >
                <div className="text-[10px] text-[#D4AF37] font-sans font-bold">💲 Divisas Físicas</div>
                <div className="text-base font-extrabold text-[#F5DA76] mt-0.5">{formatUSD(ventasDivisa)}</div>
                <div className="text-[9px] text-gray-400">Billetes en mano</div>
              </div>

              {/* Fiado */}
              <div 
                onClick={() => toggleMetodo('Fiado')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedMetodos.includes('Fiado') 
                    ? 'bg-[#1A0E10] border-[#FF6B6B]/50 text-white shadow-sm' 
                    : 'bg-[#090A0D] border-[#232530] opacity-40 grayscale'
                }`}
              >
                <div className="text-[10px] text-gray-400 font-sans">📝 Fiado Otorgado</div>
                <div className="text-base font-extrabold text-[#FF6B6B] mt-0.5">{formatUSD(ventasFiado)}</div>
                <div className="text-[9px] text-gray-400">Crédito del período</div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION: DETALLE COMPLETO DE PRODUCTOS VENDIDOS EN EL DÍA */}
        <div className="bg-[#111216] border border-[#232530] rounded-2xl p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <button 
              type="button"
              onClick={() => setIsDesgloseProductosOpen(!isDesgloseProductosOpen)}
              className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-wider hover:text-[#F5DA76] transition-colors cursor-pointer"
            >
              <Package size={16} className="text-[#D4AF37]" />
              <span>Detalle de Productos Vendidos ({productosVendidosDetalle.length})</span>
              <ChevronDown size={14} className={`transition-transform duration-300 ${isDesgloseProductosOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Quick Action Tools */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={handleCopyProductsTable}
                title="Copiar tabla en formato Excel"
                className="flex items-center gap-1 text-[11px] font-bold text-gray-300 bg-[#181A22] hover:bg-[#222530] border border-[#232530] hover:border-[#D4AF37]/40 px-2.5 py-1.5 rounded-xl transition-all active:scale-95 cursor-pointer font-mono"
              >
                {copiedSuccess ? <Check size={12} className="text-[#00E676]" /> : <Copy size={12} />}
                <span className="hidden sm:inline">Excel</span>
              </button>

              <button
                type="button"
                onClick={handleShareWhatsAppReport}
                title="Compartir reporte por WhatsApp"
                className="flex items-center gap-1 text-[11px] font-bold text-[#00E676] bg-[#00E676]/10 hover:bg-[#00E676]/20 border border-[#00E676]/30 px-2.5 py-1.5 rounded-xl transition-all active:scale-95 cursor-pointer font-mono"
              >
                <MessageCircle size={12} />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={generatePDFReport}
                title="Descargar reporte en PDF con detalle"
                className="flex items-center gap-1 text-[11px] font-bold text-[#F5DA76] bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 px-2.5 py-1.5 rounded-xl transition-all active:scale-95 cursor-pointer font-mono"
              >
                <Download size={12} />
                <span className="hidden sm:inline">PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPrintTicketModal(true)}
                title="Imprimir ticket térmico"
                className="flex items-center gap-1 text-[11px] font-bold text-[#D4AF37] bg-[#181A22] hover:bg-[#222530] border border-[#232530] hover:border-[#D4AF37]/40 px-2.5 py-1.5 rounded-xl transition-all active:scale-95 cursor-pointer font-mono"
              >
                <Printer size={12} />
                <span className="hidden sm:inline">Imprimir</span>
              </button>
            </div>
          </div>

          {isDesgloseProductosOpen && (
            <div className="space-y-3 pt-1">
              {/* Summary KPIs Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-[#090A0D] border border-[#232530] rounded-xl p-3">
                  <div className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Unidades Vendidas</div>
                  <div className="text-lg font-extrabold text-white font-mono mt-0.5">
                    {totalCantidadArticulosVendidos % 1 === 0 ? totalCantidadArticulosVendidos : totalCantidadArticulosVendidos.toFixed(2)}
                  </div>
                  <div className="text-[9px] text-gray-500 font-mono">volumen total del período</div>
                </div>

                <div className="bg-[#090A0D] border border-[#232530] rounded-xl p-3">
                  <div className="text-[9px] uppercase tracking-wider text-[#D4AF37] font-bold">Variedad Vendida</div>
                  <div className="text-lg font-extrabold text-[#F5DA76] font-mono mt-0.5">
                    {productosVendidosDetalle.length} tipos
                  </div>
                  <div className="text-[9px] text-gray-500 font-mono">en {filteredVentas.length} tickets</div>
                </div>

                <div className="bg-[#090A0D] border border-[#232530] rounded-xl p-3">
                  <div className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Facturado Productos</div>
                  <div className="text-lg font-extrabold text-white font-mono mt-0.5">
                    {formatUSD(totalUSDProductos)}
                  </div>
                  <div className="text-[9px] text-[#D4AF37]/80 font-mono">{formatLocal(totalUSDProductos, config.tasaCambioUSD, config.simboloMonedaLocal)}</div>
                </div>

                {productoMasVendido ? (
                  <div className="bg-[#090A0D] border border-[#D4AF37]/40 rounded-xl p-3 shadow-[0_0_15px_rgba(212,175,55,0.08)]">
                    <div className="text-[9px] uppercase tracking-wider text-[#D4AF37] font-bold flex items-center gap-1">
                      <Award size={12} /> Top Producto
                    </div>
                    <div className="text-xs font-bold text-white truncate font-sans mt-0.5" title={productoMasVendido.nombre}>
                      {productoMasVendido.nombre}
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono">
                      {productoMasVendido.cantidadTotal % 1 === 0 ? productoMasVendido.cantidadTotal : productoMasVendido.cantidadTotal.toFixed(2)} {formatUnit(productoMasVendido.unidad)} • {formatUSD(productoMasVendido.totalUSD)}
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#090A0D] border border-[#232530] rounded-xl p-3">
                    <div className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Top Producto</div>
                    <div className="text-xs text-gray-500 mt-1 font-mono">Sin ventas registradas</div>
                  </div>
                )}
              </div>

              {/* View Mode Toggle: Por Producto vs Por Categoría */}
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-white/5 pb-2">
                <div className="flex items-center gap-1 bg-[#090A0D] p-1 rounded-xl border border-[#232530] text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setViewModeProdVendidos('productos')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      viewModeProdVendidos === 'productos' 
                        ? 'gold-gradient-btn text-black font-extrabold shadow-sm' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Package size={13} />
                    <span>Por Producto ({productosVendidosDetalle.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewModeProdVendidos('categorias')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      viewModeProdVendidos === 'categorias' 
                        ? 'gold-gradient-btn text-black font-extrabold shadow-sm' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Layers size={13} />
                    <span>Por Categoría ({categoriasVentasResumen.length})</span>
                  </button>
                </div>

                {viewModeProdVendidos === 'productos' && (
                  <div className="flex items-center gap-1 bg-[#090A0D] p-1 rounded-xl border border-[#232530] text-[10px] font-mono">
                    <span className="text-gray-500 px-1">Ordenar:</span>
                    <button
                      type="button"
                      onClick={() => setSortByProdVendidos('monto')}
                      className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${sortByProdVendidos === 'monto' ? 'gold-gradient-btn text-black font-extrabold' : 'text-gray-400 hover:text-white'}`}
                    >
                      $ Monto
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortByProdVendidos('cantidad')}
                      className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${sortByProdVendidos === 'cantidad' ? 'gold-gradient-btn text-black font-extrabold' : 'text-gray-400 hover:text-white'}`}
                    >
                      Cant.
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortByProdVendidos('nombre')}
                      className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${sortByProdVendidos === 'nombre' ? 'gold-gradient-btn text-black font-extrabold' : 'text-gray-400 hover:text-white'}`}
                    >
                      A-Z
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortByProdVendidos('margen')}
                      className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${sortByProdVendidos === 'margen' ? 'gold-gradient-btn text-black font-extrabold' : 'text-gray-400 hover:text-white'}`}
                    >
                      Ganancia
                    </button>
                  </div>
                )}
              </div>

              {/* Search Bar when in Product view */}
              {viewModeProdVendidos === 'productos' && (
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-gray-500" />
                  <input
                    type="text"
                    value={searchQueryProdVendidos}
                    onChange={(e) => setSearchQueryProdVendidos(e.target.value)}
                    placeholder="Buscar producto vendido por nombre o categoría..."
                    className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-gray-500 outline-none font-mono transition-colors"
                  />
                  {searchQueryProdVendidos && (
                    <button
                      type="button"
                      onClick={() => setSearchQueryProdVendidos('')}
                      className="absolute right-2.5 top-2.5 text-gray-400 hover:text-white cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              )}

              {/* VIEW 1: ITEMIZED SOLD PRODUCTS LIST */}
              {viewModeProdVendidos === 'productos' && (
                <>
                  {filteredProductosVendidos.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-xs bg-[#090A0D] rounded-xl border border-[#232530] font-sans">
                      <Package size={26} className="mx-auto mb-2 opacity-40 text-[#D4AF37]" />
                      {searchQueryProdVendidos
                        ? `No se encontraron productos que coincidan con "${searchQueryProdVendidos}"`
                        : 'No se registraron ventas en este período de tiempo.'}
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-[460px] overflow-y-auto custom-scrollbar pr-0.5 font-mono">
                      {filteredProductosVendidos.map((prod, index) => {
                        const cantFormateada = prod.cantidadTotal % 1 === 0 ? prod.cantidadTotal : prod.cantidadTotal.toFixed(2);
                        return (
                          <div 
                            key={prod.id} 
                            className="bg-[#090A0D] hover:bg-[#14151B] border border-[#232530] hover:border-[#D4AF37]/30 rounded-xl p-3 transition-all"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="w-5 h-5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                                    {index + 1}
                                  </span>
                                  <h4 className="font-bold text-xs text-white truncate font-sans">{prod.nombre}</h4>
                                  <span className="text-[9px] text-[#F5DA76] bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-2 py-0.5 rounded-full shrink-0 font-bold">
                                    {prod.categoria}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-1.5 pl-7 flex-wrap">
                                  <div>
                                    Cant: <strong className="text-white">{cantFormateada} {formatUnit(prod.unidad)}</strong>
                                  </div>
                                  <span>•</span>
                                  <div>
                                    P. Unit: <strong className="text-gray-300">{formatUSD(prod.precioUnitarioPromedio)}</strong>
                                    <span className="text-[10px] text-gray-500 ml-1">({formatLocal(prod.precioUnitarioPromedio, config.tasaCambioUSD, config.simboloMonedaLocal)})</span>
                                  </div>
                                  {prod.transaccionesCount > 1 && (
                                    <>
                                      <span>•</span>
                                      <div className="text-[10px] text-gray-500">
                                        {prod.transaccionesCount} tickets
                                      </div>
                                    </>
                                  )}
                                  {prod.gananciaTotalUSD > 0 && (
                                    <>
                                      <span>•</span>
                                      <div className="text-[10px] text-[#00E676] bg-[#00E676]/10 px-1.5 py-0.2 rounded border border-[#00E676]/20">
                                        Ganancia: +{formatUSD(prod.gananciaTotalUSD)} ({prod.margenPorcentaje.toFixed(0)}%)
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div className="text-sm font-extrabold text-[#F5DA76] leading-tight">
                                  {formatUSD(prod.totalUSD)}
                                </div>
                                <div className="text-[10px] text-gray-400">
                                  {formatLocal(prod.totalUSD, config.tasaCambioUSD, config.simboloMonedaLocal)}
                                </div>
                              </div>
                            </div>

                            {/* Progress bar showing % of total sales */}
                            <div className="mt-2 pl-7 flex items-center gap-2">
                              <div className="flex-1 bg-black/60 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-gradient-to-r from-[#D4AF37] to-[#F5DA76] h-full rounded-full transition-all duration-500" 
                                  style={{ width: `${Math.min(100, Math.max(2, prod.porcentajeVentas))}%` }}
                                />
                              </div>
                              <span className="text-[9px] text-[#D4AF37]/80 shrink-0 font-bold">
                                {prod.porcentajeVentas.toFixed(1)}% del día
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* VIEW 2: CATEGORY SUMMARY BREAKDOWN */}
              {viewModeProdVendidos === 'categorias' && (
                <div className="space-y-2">
                  {categoriasVentasResumen.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-xs bg-[#090A0D] rounded-xl border border-[#232530] font-sans">
                      <Layers size={26} className="mx-auto mb-2 opacity-40 text-[#D4AF37]" />
                      No se registraron ventas por categorías en este período.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {categoriasVentasResumen.map((cat, idx) => (
                        <div key={cat.categoria} className="bg-[#090A0D] border border-[#232530] rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-[#D4AF37]/15 text-[#F5DA76] text-[10px] font-bold flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <span className="font-bold text-xs text-white font-sans">{cat.categoria}</span>
                            </div>
                            <span className="text-xs font-bold text-[#F5DA76]">
                              {formatUSD(cat.totalUSD)}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-gray-400">
                            <span>{cat.tiposProductos} tipos de productos</span>
                            <span>{cat.unidadesVendidas % 1 === 0 ? cat.unidadesVendidas : cat.unidadesVendidas.toFixed(2)} unidades</span>
                          </div>

                          <div className="flex items-center gap-2 pt-0.5">
                            <div className="flex-1 bg-black/60 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-[#D4AF37] to-[#F5DA76] h-full rounded-full" 
                                style={{ width: `${Math.min(100, Math.max(3, cat.porcentajeVentas))}%` }}
                              />
                            </div>
                            <span className="text-[9px] text-gray-400 shrink-0 font-mono">
                              {cat.porcentajeVentas.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Gráfico de Ventas Diarias */}
        <div className="bg-[#111216] border border-[#232530] rounded-2xl p-4 space-y-2 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-black text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp size={14} className="text-[#D4AF37]" />
              Tendencia de Ventas ({chartData.length} registros)
            </h3>
          </div>
          
          <div className="h-44 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232530" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#666" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    dy={5}
                  />
                  <YAxis 
                    stroke="#666" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111216', borderColor: '#D4AF37', borderRadius: '12px', fontSize: '11px', boxShadow: '0 10px 25px rgba(0,0,0,0.8)' }}
                    itemStyle={{ color: '#F5DA76', fontWeight: 'bold' }}
                    formatter={(value: number) => [`${formatUSD(value)}`, 'Ventas']}
                    labelStyle={{ color: '#888', marginBottom: '2px' }}
                  />
                  <Bar dataKey="total" fill="url(#colorTotal)" radius={[6, 6, 0, 0]} maxBarSize={36} />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#F5DA76" 
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0, fill: '#D4AF37' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-500 font-mono">
                Sin movimientos registrados para el gráfico.
              </div>
            )}
          </div>
        </div>

        {/* Action Button: Ejecutar Cierre Diario */}
        <button
          id="btn-ejecutar-cierre-apps-script"
          onClick={handleTriggerScriptCierre}
          disabled={isProcessingCierre}
          className="gold-gradient-btn text-black font-black rounded-2xl shadow-[0_4px_25px_rgba(212,175,55,0.3)] hover:shadow-[0_4px_30px_rgba(212,175,55,0.45)] active:scale-95 transition-all uppercase flex items-center justify-center gap-2.5 py-4 px-4 text-xs w-full cursor-pointer tracking-widest"
        >
          {isProcessingCierre ? (
            <>
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              <span>GENERANDO REPORTE DETALLADO DE CIERRE...</span>
            </>
          ) : (
            <>
              <Play size={16} className="fill-current stroke-none" />
              <span>EJECUTAR CIERRE DIARIO Y GENERAR REPORTE DETALLADO</span>
            </>
          )}
        </button>
      </div>

      {/* MODAL 1: REPORTE DE CIERRE CONSOLIDADO DIARIO CON DETALLE DE PRODUCTOS */}
      {showEmailPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 font-mono">
          <div className="bg-[#111216] border border-[#D4AF37]/40 rounded-2xl w-full max-w-3xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] max-h-[92vh] flex flex-col overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#232530] bg-gradient-to-r from-[#161820] to-[#121318]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.2)]">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase font-sans tracking-wide">
                    Reporte de Cierre Consolidado
                  </h3>
                  <p className="text-[10px] text-gray-400">
                    {config.nombreBodega || 'Comercio'} • {new Date().toLocaleDateString('es-ES')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowEmailPreviewModal(false)}
                  className="text-gray-400 hover:text-white text-xs font-bold p-1.5 rounded-lg bg-[#232530] hover:bg-[#2F3242] transition-colors cursor-pointer"
                >
                  ✕ Cerrar
                </button>
              </div>
            </div>

            {/* Modal Subtabs */}
            <div className="flex border-b border-[#232530] bg-[#0E0F14] text-xs px-3">
              <button
                type="button"
                onClick={() => setModalTab('productos')}
                className={`py-2.5 px-3 font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  modalTab === 'productos' 
                    ? 'border-[#D4AF37] text-[#D4AF37]' 
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <Package size={14} />
                <span>Productos Vendidos ({productosVendidosDetalle.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab('financiero')}
                className={`py-2.5 px-3 font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  modalTab === 'financiero' 
                    ? 'border-[#D4AF37] text-[#D4AF37]' 
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <DollarSign size={14} />
                <span>Arqueo y Finanzas</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab('ticket')}
                className={`py-2.5 px-3 font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  modalTab === 'ticket' 
                    ? 'border-[#D4AF37] text-[#D4AF37]' 
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <Printer size={14} />
                <span>Ticket de Impresión</span>
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#090A0D] custom-scrollbar text-xs">
              {/* TAB 1: DETALLE DE PRODUCTOS VENDIDOS */}
              {modalTab === 'productos' && (
                <div className="space-y-3">
                  {/* Top KPI Card */}
                  <div className="p-3 bg-gradient-to-r from-[#1A1813] to-[#121318] border border-[#D4AF37]/35 rounded-xl flex items-center justify-between flex-wrap gap-2 shadow-md">
                    <div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Total Facturado en Productos</div>
                      <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#F5DA76] via-[#D4AF37] to-[#A88120] mt-0.5">
                        {formatUSD(totalUSDProductos)}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        ≈ {formatLocal(totalUSDProductos, config.tasaCambioUSD, config.simboloMonedaLocal)}
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-gray-300 space-y-0.5">
                      <div>Total Artículos: <strong className="text-white">{totalCantidadArticulosVendidos % 1 === 0 ? totalCantidadArticulosVendidos : totalCantidadArticulosVendidos.toFixed(2)} un</strong></div>
                      <div>Variedad: <strong className="text-[#F5DA76]">{productosVendidosDetalle.length} ítems</strong></div>
                      <div>Tasa Oficial: <strong className="text-white">Bs. {config.tasaCambioUSD.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong></div>
                    </div>
                  </div>

                  {/* Sold Products Table */}
                  {productosVendidosDetalle.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-[#111216] rounded-xl border border-white/5 font-sans">
                      <Package size={24} className="mx-auto mb-1.5 opacity-40 text-[#D4AF37]" />
                      No se registraron ventas en este período.
                    </div>
                  ) : (
                    <div className="border border-[#232530] rounded-xl overflow-hidden bg-[#111216]">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-[11px]">
                          <thead>
                            <tr className="bg-[#161820] text-gray-400 border-b border-[#232530] text-[10px] uppercase font-mono">
                              <th className="p-2.5 w-8 text-center">#</th>
                              <th className="p-2.5">Producto</th>
                              <th className="p-2.5">Categoría</th>
                              <th className="p-2.5 text-center">Cant.</th>
                              <th className="p-2.5 text-right">P. Unit</th>
                              <th className="p-2.5 text-right">Total USD</th>
                              <th className="p-2.5 text-right">Total ({config.simboloMonedaLocal})</th>
                              <th className="p-2.5 text-right">% Día</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1D2029]">
                            {productosVendidosDetalle.map((p, idx) => {
                              const cantForm = p.cantidadTotal % 1 === 0 ? p.cantidadTotal : p.cantidadTotal.toFixed(2);
                              return (
                                <tr key={p.id} className="hover:bg-white/5 transition-colors">
                                  <td className="p-2.5 text-center text-gray-500 font-mono">{idx + 1}</td>
                                  <td className="p-2.5 font-bold text-white font-sans">{p.nombre}</td>
                                  <td className="p-2.5">
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#D4AF37]/10 text-[#F5DA76] border border-[#D4AF37]/25">
                                      {p.categoria}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-center text-gray-300">
                                    {cantForm} <span className="text-[9px] text-gray-500">{formatUnit(p.unidad)}</span>
                                  </td>
                                  <td className="p-2.5 text-right text-gray-300">
                                    {formatUSD(p.precioUnitarioPromedio)}
                                  </td>
                                  <td className="p-2.5 text-right font-bold text-[#D4AF37]">
                                    {formatUSD(p.totalUSD)}
                                  </td>
                                  <td className="p-2.5 text-right text-gray-400">
                                    {formatLocal(p.totalUSD, config.tasaCambioUSD, config.simboloMonedaLocal)}
                                  </td>
                                  <td className="p-2.5 text-right text-gray-400">
                                    {p.porcentajeVentas.toFixed(1)}%
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="bg-[#161820] font-bold text-white border-t border-[#232530]">
                              <td colSpan={3} className="p-2.5 text-right uppercase text-[10px]">
                                Totales ({productosVendidosDetalle.length} prods):
                              </td>
                              <td className="p-2.5 text-center text-[#F5DA76]">
                                {totalCantidadArticulosVendidos % 1 === 0 ? totalCantidadArticulosVendidos : totalCantidadArticulosVendidos.toFixed(2)}
                              </td>
                              <td></td>
                              <td className="p-2.5 text-right text-[#D4AF37] text-xs">
                                {formatUSD(totalUSDProductos)}
                              </td>
                              <td className="p-2.5 text-right text-gray-300">
                                {formatLocal(totalUSDProductos, config.tasaCambioUSD, config.simboloMonedaLocal)}
                              </td>
                              <td className="p-2.5 text-right text-gray-400">100%</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Categories Breakdown */}
                  {categoriasVentasResumen.length > 0 && (
                    <div className="bg-[#111216] p-3 rounded-xl border border-[#232530] space-y-2">
                      <div className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                        Resumen de Ventas por Categoría
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {categoriasVentasResumen.map(c => (
                          <div key={c.categoria} className="bg-[#161820] p-2 rounded-lg border border-white/5">
                            <div className="text-white font-bold text-xs font-sans">{c.categoria}</div>
                            <div className="text-[#D4AF37] font-bold text-xs mt-0.5">{formatUSD(c.totalUSD)}</div>
                            <div className="text-[9px] text-gray-500">
                              {c.unidadesVendidas % 1 === 0 ? c.unidadesVendidas : c.unidadesVendidas.toFixed(2)} un • {c.porcentajeVentas.toFixed(1)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: RESUMEN FINANCIERO Y ARQUEO */}
              {modalTab === 'financiero' && (
                <div className="space-y-3">
                  <div className="p-4 bg-gradient-to-b from-[#1C1A14] to-[#121318] border border-[#D4AF37]/40 rounded-xl text-center shadow-lg">
                    <div className="text-sm font-bold text-[#F5DA76] font-sans">🏪 {config.nombreBodega || 'Comercio'}</div>
                    <div className="text-[9px] text-gray-400 mt-0.5">
                      Cierre de Caja • {new Date().toLocaleDateString('es-ES')}
                    </div>
                    <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#F5DA76] via-[#D4AF37] to-[#A88120] mt-1.5">
                      {formatUSD(totalVentasUSD)}
                    </div>
                    <div className="text-[11px] text-[#E0E2EC] font-mono mt-0.5">
                      ≈ {formatLocal(totalVentasUSD, config.tasaCambioUSD, config.simboloMonedaLocal)}
                    </div>
                  </div>

                  {/* Formas de Pago */}
                  <div className="space-y-1.5 bg-[#111216] p-3 rounded-xl border border-[#232530]">
                    <div className="font-bold text-gray-300 text-[10px] uppercase mb-1">💳 Formas de Pago:</div>
                    <div className="flex justify-between text-gray-300 text-xs py-1 border-b border-white/5">
                      <span>💵 Efectivo:</span>
                      <span className="text-[#D4AF37] font-bold">{formatUSD(ventasEfectivo)} ({formatLocal(ventasEfectivo, config.tasaCambioUSD, config.simboloMonedaLocal)})</span>
                    </div>
                    <div className="flex justify-between text-gray-300 text-xs py-1 border-b border-white/5">
                      <span>📱 Pago Móvil:</span>
                      <span className="text-[#38BDF8] font-bold">{formatUSD(ventasPagoMovil)} ({formatLocal(ventasPagoMovil, config.tasaCambioUSD, config.simboloMonedaLocal)})</span>
                    </div>
                    <div className="flex justify-between text-gray-300 text-xs py-1 border-b border-white/5">
                      <span>💲 Divisa USD:</span>
                      <span className="text-[#F59E0B] font-bold">{formatUSD(ventasDivisa)}</span>
                    </div>
                    <div className="flex justify-between text-gray-300 text-xs py-1">
                      <span>📝 Fiado Otorgado:</span>
                      <span className="text-[#FF5252] font-bold">{formatUSD(ventasFiado)}</span>
                    </div>
                  </div>

                  {/* Cobranzas y Gastos */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#111216] p-3 rounded-xl border border-[#232530]">
                      <div className="font-bold text-gray-300 text-[10px] uppercase mb-0.5">📥 Abonos Cobrados:</div>
                      <div className="text-base font-bold text-[#00E676]">+{formatUSD(totalAbonosUSD)}</div>
                      <div className="text-[9px] text-gray-500">{filteredAbonos.length} cobros recibidos</div>
                    </div>
                    <div className="bg-[#111216] p-3 rounded-xl border border-[#232530]">
                      <div className="font-bold text-gray-300 text-[10px] uppercase mb-0.5">💸 Gastos Operativos:</div>
                      <div className="text-base font-bold text-[#FF5252]">-{formatUSD(totalGastosUSD)}</div>
                      <div className="text-[9px] text-gray-500">{filteredGastos.length} salidas registradas</div>
                    </div>
                  </div>

                  {/* Gaveta Física */}
                  <div className="bg-gradient-to-r from-[#1C1810] to-[#121318] p-3.5 rounded-xl border border-[#D4AF37]/50 flex justify-between items-center shadow-md">
                    <div>
                      <span className="text-[11px] font-bold text-[#F5DA76] uppercase block">Gaveta Física (Efectivo Neto):</span>
                      <span className="text-[9px] text-gray-400">Total en mano (Efectivo + Divisa - Gastos efectivo)</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-white">{formatUSD(totalEfectivoGavetaUSD)}</div>
                      <div className="text-[10px] text-[#D4AF37]">{formatLocal(totalEfectivoGavetaUSD, config.tasaCambioUSD, config.simboloMonedaLocal)}</div>
                    </div>
                  </div>

                  {/* Stock Crítico */}
                  {productosBajoStock.length > 0 && (
                    <div className="bg-[#1E1212] border border-[#FF5252]/40 p-3 rounded-xl space-y-1">
                      <div className="text-[10px] font-bold text-[#FF5252] flex items-center gap-1 uppercase font-sans">
                        <AlertTriangle size={12} />
                        Alertas de Reposición de Inventario ({productosBajoStock.length}):
                      </div>
                      <div className="space-y-0.5 max-h-24 overflow-y-auto">
                        {productosBajoStock.map((p) => (
                          <div key={p.ID_Producto} className="flex justify-between text-[10px] text-[#FF8A80]">
                            <span className="font-sans">{p.Nombre}</span>
                            <span>Stock actual: <strong>{p.Stock_Actual}</strong> (mínimo: {p.Stock_Minimo})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: TICKET DE IMPRESIÓN (TÉRMICO) */}
              {modalTab === 'ticket' && (
                <div className="bg-white text-black p-4 rounded-lg font-mono text-[11px] leading-tight max-w-sm mx-auto shadow-2xl border border-gray-300">
                  <div className="text-center font-bold text-sm mb-1 uppercase">
                    {config.nombreBodega || 'SISTEMA POS'}
                  </div>
                  {config.rif && <div className="text-center text-[10px]">RIF: {config.rif}</div>}
                  <div className="text-center text-[10px]">CIERRE DE CAJA DIARIO</div>
                  <div className="text-center text-[10px] mb-2">{new Date().toLocaleString('es-ES')}</div>
                  <div className="border-b border-dashed border-gray-500 my-1.5" />
                  
                  <div className="flex justify-between text-[10px] mb-1 font-bold">
                    <span>CANT PRODUCTO</span>
                    <span>TOTAL</span>
                  </div>

                  <div className="space-y-1">
                    {productosVendidosDetalle.map(p => {
                      const cant = p.cantidadTotal % 1 === 0 ? p.cantidadTotal : p.cantidadTotal.toFixed(2);
                      return (
                        <div key={p.id}>
                          <div className="flex justify-between font-bold">
                            <span className="truncate max-w-[170px]">{cant}x {p.nombre}</span>
                            <span>${p.totalUSD.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-[9px] text-gray-600 pl-2">
                            <span>@{formatUSD(p.precioUnitarioPromedio)} ea</span>
                            <span>{formatLocal(p.totalUSD, config.tasaCambioUSD, config.simboloMonedaLocal)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-b border-dashed border-gray-500 my-2" />
                  <div className="flex justify-between font-bold text-xs">
                    <span>TOTAL VENTAS:</span>
                    <span>${totalVentasUSD.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-700">
                    <span>En Moneda Local:</span>
                    <span>{formatLocal(totalVentasUSD, config.tasaCambioUSD, config.simboloMonedaLocal)}</span>
                  </div>
                  <div className="border-b border-dashed border-gray-500 my-1.5" />

                  <div className="space-y-0.5 text-[10px]">
                    <div className="flex justify-between"><span>Efectivo:</span><span>${ventasEfectivo.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Pago Móvil:</span><span>${ventasPagoMovil.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Divisa USD:</span><span>${ventasDivisa.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Fiado:</span><span>${ventasFiado.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Abonos Recibidos:</span><span>+${totalAbonosUSD.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Gastos:</span><span>-${totalGastosUSD.toFixed(2)}</span></div>
                  </div>

                  <div className="border-b border-dashed border-gray-500 my-1.5" />
                  <div className="flex justify-between font-bold text-xs">
                    <span>GAVETA FÍSICA:</span>
                    <span>${totalEfectivoGavetaUSD.toFixed(2)}</span>
                  </div>
                  <div className="text-center text-[9px] text-gray-600 mt-3 pt-2 border-t border-gray-300">
                    *** Reporte Consolidado ***
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-3 border-t border-[#232530] bg-[#161820] flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleCopyReportText}
                  className="bg-[#232530] hover:bg-[#2C2E3C] text-gray-200 px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer font-bold border border-white/5"
                >
                  {copiedSuccess ? <Check size={14} className="text-[#00E676]" /> : <Copy size={14} />}
                  <span>Copiar</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="bg-[#232530] hover:bg-[#2C2E3C] text-gray-200 px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer font-bold border border-white/5"
                >
                  <Printer size={14} />
                  <span>Imprimir</span>
                </button>
                <button
                  type="button"
                  onClick={generatePDFReport}
                  className="bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#F5DA76] border border-[#D4AF37]/40 px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer font-bold"
                >
                  <Download size={14} />
                  <span>Descargar PDF</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleShareWhatsAppReport}
                  className="bg-[#00E676]/15 hover:bg-[#00E676]/25 text-[#00E676] border border-[#00E676]/40 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <MessageCircle size={14} />
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowEmailPreviewModal(false)}
                  className="gold-gradient-btn text-black font-extrabold rounded-xl px-4 py-2 text-xs cursor-pointer active:scale-95 transition-all uppercase shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                >
                  ENTENDIDO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: TICKET TÉRMICO DIRECTO (IMPRESORA 80mm/58mm) */}
      {showPrintTicketModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-mono">
          <div className="bg-[#111216] border border-[#D4AF37]/40 rounded-2xl w-full max-w-md p-4 shadow-[0_20px_60px_rgba(0,0,0,0.85)] flex flex-col max-h-[90vh] animate-fadeIn">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#232530] mb-3">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase font-sans tracking-wide">
                <Printer className="text-[#D4AF37]" size={16} />
                Ticket de Cierre Diario
              </h3>
              <button
                onClick={() => setShowPrintTicketModal(false)}
                className="text-gray-400 hover:text-white text-xs font-bold p-1 rounded-lg bg-[#232530] hover:bg-[#2F3242] cursor-pointer"
              >
                ✕ Cerrar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-white text-black p-4 rounded-lg font-mono text-xs leading-tight shadow-inner custom-scrollbar">
              <div className="text-center font-bold text-sm mb-1 uppercase">
                {config.nombreBodega || 'SISTEMA POS'}
              </div>
              {config.rif && <div className="text-center text-[10px]">RIF: {config.rif}</div>}
              {config.telefonoAdmin && <div className="text-center text-[10px]">Telf: {config.telefonoAdmin}</div>}
              <div className="text-center text-[10px] mt-1 font-bold">CIERRE DE CAJA DIARIO</div>
              <div className="text-center text-[10px]">{new Date().toLocaleString('es-ES')}</div>
              <div className="text-center text-[9px] text-gray-600">Tasa: Bs. {config.tasaCambioUSD.toLocaleString('es-VE', { minimumFractionDigits: 2 })}/USD</div>
              <div className="border-b border-dashed border-gray-600 my-2" />

              <div className="text-[10px] font-bold mb-1">
                PRODUCTOS VENDIDOS ({productosVendidosDetalle.length} variedades - {totalCantidadArticulosVendidos % 1 === 0 ? totalCantidadArticulosVendidos : totalCantidadArticulosVendidos.toFixed(2)} un)
              </div>

              <div className="space-y-1.5">
                {productosVendidosDetalle.map((p, idx) => {
                  const cant = p.cantidadTotal % 1 === 0 ? p.cantidadTotal : p.cantidadTotal.toFixed(2);
                  return (
                    <div key={p.id} className="text-[11px]">
                      <div className="flex justify-between font-bold">
                        <span className="truncate max-w-[200px]">{idx + 1}. {p.nombre}</span>
                        <span>${p.totalUSD.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-600 pl-3">
                        <span>{cant} {formatUnit(p.unidad)} x ${p.precioUnitarioPromedio.toFixed(2)}</span>
                        <span>{formatLocal(p.totalUSD, config.tasaCambioUSD, config.simboloMonedaLocal)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-b border-dashed border-gray-600 my-2" />
              <div className="flex justify-between font-bold text-sm">
                <span>TOTAL FACTURADO:</span>
                <span>${totalVentasUSD.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-gray-700">
                <span>Total Moneda Local:</span>
                <span>{formatLocal(totalVentasUSD, config.tasaCambioUSD, config.simboloMonedaLocal)}</span>
              </div>
              <div className="border-b border-dashed border-gray-600 my-2" />

              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between"><span>Efectivo ($/Bs):</span><span>${ventasEfectivo.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Pago Móvil:</span><span>${ventasPagoMovil.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Divisas Físicas:</span><span>${ventasDivisa.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Fiado Otorgado:</span><span>${ventasFiado.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Abonos Recibidos:</span><span>+${totalAbonosUSD.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Gastos y Pagos:</span><span>-${totalGastosUSD.toFixed(2)}</span></div>
              </div>

              <div className="border-b border-dashed border-gray-600 my-2" />
              <div className="flex justify-between font-bold text-xs bg-gray-100 p-1.5 rounded">
                <span>GAVETA FÍSICA:</span>
                <span>${totalEfectivoGavetaUSD.toFixed(2)}</span>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-300 text-center text-[9px] text-gray-600">
                Firma Responsable: ____________________
              </div>
            </div>

            <div className="flex gap-2 pt-3">
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 gold-gradient-btn text-black font-extrabold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[0_0_15px_rgba(212,175,55,0.3)] uppercase tracking-wide"
              >
                <Printer size={15} />
                <span>Imprimir Ticket</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPrintTicketModal(false)}
                className="bg-[#232530] hover:bg-[#2C2E3C] text-gray-300 font-bold px-4 py-2.5 rounded-xl text-xs cursor-pointer transition-all border border-white/5"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
