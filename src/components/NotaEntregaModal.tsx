import React, { useState, useRef } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  MessageCircle, 
  CheckCircle2, 
  Building2, 
  FileText, 
  ShieldCheck, 
  CreditCard,
  Percent,
  Check,
  Share2
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ConfiguracionApp, CartItem, Cliente } from '../types/schema';

export interface NotaEntregaData {
  numeroControl: string;
  fechaHora: string;
  items: CartItem[];
  cliente?: Cliente | null;
  metodoPago: string;
  totalUSD: number;
  tasaCambio: number;
  totalBs: number;
  observaciones?: string;
}

interface NotaEntregaModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: NotaEntregaData | null;
  config: ConfiguracionApp;
}

export const NotaEntregaModal: React.FC<NotaEntregaModalProps> = ({
  isOpen,
  onClose,
  data,
  config,
}) => {
  if (!isOpen || !data) return null;

  // Estado editable para receptor / cliente
  const [nombreCliente, setNombreCliente] = useState(
    data.cliente?.Nombre_Completo || 'CONSUMIDOR FINAL / CONTADO'
  );
  const [rifCliente, setRifCliente] = useState(
    data.cliente?.RIF_Cedula ||
    (data.cliente?.Notas?.includes('RIF:') 
      ? data.cliente.Notas.split('RIF:')[1]?.trim() 
      : 'V-00000000')
  );
  const [telefonoCliente, setTelefonoCliente] = useState(
    data.cliente?.Telefono_WhatsApp && data.cliente.Telefono_WhatsApp !== 'S/N'
      ? data.cliente.Telefono_WhatsApp
      : 'S/N'
  );
  const [direccionCliente, setDireccionCliente] = useState(
    data.cliente?.Direccion || config.direccion || 'Localidad / Ciudad'
  );

  React.useEffect(() => {
    if (data) {
      setNombreCliente(data.cliente?.Nombre_Completo || 'CONSUMIDOR FINAL / CONTADO');
      setRifCliente(
        data.cliente?.RIF_Cedula ||
        (data.cliente?.Notas?.includes('RIF:') ? data.cliente.Notas.split('RIF:')[1]?.trim() : 'V-00000000')
      );
      setTelefonoCliente(
        data.cliente?.Telefono_WhatsApp && data.cliente.Telefono_WhatsApp !== 'S/N'
          ? data.cliente.Telefono_WhatsApp 
          : 'S/N'
      );
      setDireccionCliente(data.cliente?.Direccion || config.direccion || 'Localidad / Ciudad');
    }
  }, [data, config]);

  // Estado de Retención de IVA
  const [aplicaRetencion, setAplicaRetencion] = useState(config.aplicaRetencionIva ?? false);
  const [porcentajeRetencion, setPorcentajeRetencion] = useState<number>(config.porcentajeRetencionIva || 75);
  const [comprobanteRetencion, setComprobanteRetencion] = useState('');

  // Cálculos Fiscales SENIAT (16% IVA por defecto)
  const ivaPorcentaje = config.porcentajeIva ?? 16;
  const tasaBCV = data.tasaCambio > 0 ? data.tasaCambio : config.tasaCambioUSD;
  
  // Total bruto de la orden en USD y Bs.
  const totalOperacionUSD = data.totalUSD;
  const totalOperacionBs = data.totalBs;

  // Desglose Base Imponible e IVA (Precios en tienda ya incluyen IVA para el consumidor final)
  // Base Imponible = Total / (1 + IVA)
  const factorIva = 1 + (ivaPorcentaje / 100);
  const baseImponibleBs = totalOperacionBs / factorIva;
  const montoIvaBs = totalOperacionBs - baseImponibleBs;

  const baseImponibleUSD = totalOperacionUSD / factorIva;
  const montoIvaUSD = totalOperacionUSD - baseImponibleUSD;

  // Retención de IVA si aplica (75% o 100%)
  const montoRetencionIvaBs = aplicaRetencion ? montoIvaBs * (porcentajeRetencion / 100) : 0;
  const montoRetencionIvaUSD = aplicaRetencion ? montoIvaUSD * (porcentajeRetencion / 100) : 0;

  // Monto neto liquidado por Punto de Venta
  const netoPagarBs = totalOperacionBs - montoRetencionIvaBs;
  const netoPagarUSD = totalOperacionUSD - montoRetencionIvaUSD;

  const formatBs = (num: number) =>
    num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatUSD = (num: number) =>
    num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Función de Impresión Directa (Tickets 80mm o Hoja Normal)
  const handlePrint = () => {
    window.print();
  };

  // Función para Descargar PDF con jsPDF y autoTable
  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      // Encabezado
      const logoEl = document.getElementById('nota-entrega-logo') as HTMLImageElement;
      if (logoEl && logoEl.complete && logoEl.naturalWidth > 0) {
        try {
          doc.addImage(logoEl, 'PNG', 14, 8, 16, 16);
        } catch (e) {
          console.warn('No se pudo añadir logo al PDF:', e);
        }
      }

      doc.setFontSize(14);
      doc.setTextColor(20, 20, 20);
      doc.text((config.nombreBodega || 'Legatix POS').toUpperCase(), pageWidth / 2, 14, { align: 'center' });

      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      const rifNegocio = config.rif || 'J-50123849-0';
      doc.text(`RIF: ${rifNegocio} | TEL: ${config.telefonoAdmin || '+58 412 1234567'}`, pageWidth / 2, 20, { align: 'center' });

      const dirNegocio = config.direccion || 'Av. Principal, Local Comercial, Venezuela';
      doc.setFontSize(8.5);
      doc.text(dirNegocio, pageWidth / 2, 25, { align: 'center' });

      doc.setDrawColor(200, 200, 200);
      doc.line(14, 28, pageWidth - 14, 28);

      // Título del Documento Fiscal
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('NOTA DE ENTREGA / COMPROBANTE FISCAL', pageWidth / 2, 34, { align: 'center' });

      // Datos del Documento y Cliente
      doc.setFontSize(8.5);
      doc.setTextColor(40, 40, 40);
      doc.text(`N° Control: ${data.numeroControl}`, 14, 41);
      doc.text(`Fecha y Hora: ${data.fechaHora}`, 14, 46);
      doc.text(`Forma de Pago: PUNTO DE VENTA (DÉBITO / CRÉDITO)`, 14, 51);
      doc.text(`Tasa Oficial BCV: Bs. ${formatBs(tasaBCV)} / USD`, 14, 56);

      doc.text(`Cliente / Razón Social: ${nombreCliente.toUpperCase()}`, pageWidth / 2, 41);
      doc.text(`Cédula / RIF: ${rifCliente.toUpperCase()}`, pageWidth / 2, 46);
      doc.text(`Teléfono: ${telefonoCliente}`, pageWidth / 2, 51);
      doc.text(`Dirección: ${direccionCliente}`, pageWidth / 2, 56);

      // Tabla de Productos
      const tableBody = data.items.map((it, idx) => {
        const cant = it.cantidad;
        const pBs = it.producto.Precio_Venta * tasaBCV;
        const totBs = pBs * cant;
        return [
          (idx + 1).toString(),
          cant % 1 === 0 ? cant.toString() : cant.toFixed(2),
          it.producto.Unidad_Medida || 'UND',
          it.producto.Nombre,
          `Bs. ${formatBs(pBs)}`,
          `${ivaPorcentaje}% (G)`,
          `Bs. ${formatBs(totBs)}`
        ];
      });

      autoTable(doc, {
        startY: 61,
        head: [['#', 'Cant.', 'Unid.', 'Descripción del Producto', 'P. Unitario', 'Alíc.', 'Total Bs.']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 14, halign: 'center' },
          2: { cellWidth: 14, halign: 'center' },
          3: { cellWidth: 'auto' },
          4: { cellWidth: 26, halign: 'right' },
          5: { cellWidth: 16, halign: 'center' },
          6: { cellWidth: 28, halign: 'right' },
        }
      });

      let finalY = (doc as any).lastAutoTable.finalY + 6;

      // Resumen Fiscal
      doc.setFontSize(8.5);
      const rightX = pageWidth - 14;

      doc.text(`Base Imponible (Gravable ${ivaPorcentaje}%):`, rightX - 70, finalY);
      doc.text(`Bs. ${formatBs(baseImponibleBs)}`, rightX, finalY, { align: 'right' });
      finalY += 5;

      doc.text(`Impuesto al Valor Agregado (IVA ${ivaPorcentaje}%):`, rightX - 70, finalY);
      doc.text(`Bs. ${formatBs(montoIvaBs)}`, rightX, finalY, { align: 'right' });
      finalY += 5;

      if (aplicaRetencion) {
        doc.text(`(-) Retención IVA (${porcentajeRetencion}%):`, rightX - 70, finalY);
        doc.text(`-Bs. ${formatBs(montoRetencionIvaBs)}`, rightX, finalY, { align: 'right' });
        finalY += 5;
        if (comprobanteRetencion) {
          doc.text(`Comp. Retención N°: ${comprobanteRetencion}`, 14, finalY - 5);
        }
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`TOTAL PUNTO DE VENTA:`, rightX - 70, finalY + 1);
      doc.text(`Bs. ${formatBs(netoPagarBs)}`, rightX, finalY + 1, { align: 'right' });
      finalY += 6;

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(`Contravalor en Divisas: $${formatUSD(netoPagarUSD)} USD (Tasa BCV: Bs. ${formatBs(tasaBCV)})`, rightX, finalY, { align: 'right' });
      finalY += 10;

      // Pie Legal SENIAT
      doc.setFontSize(7.5);
      doc.setTextColor(100, 100, 100);
      const pieTexto = `Documento emitido según Providencia Administrativa SENIAT SNAT/2011/00071 para Notas de Entrega y Facturación. Pagado mediante Punto de Venta electrónico. Exprese los montos en Bolívares y divisa referencial a la tasa oficial del Banco Central de Venezuela.`;
      doc.text(pieTexto, 14, finalY, { maxWidth: pageWidth - 28 });

      doc.save(`Nota_Entrega_${data.numeroControl}.pdf`);
      toast.success('Nota de Entrega descargada en PDF');
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('No se pudo generar el PDF');
    }
  };

  // Función para compartir por WhatsApp
  const handleShareWhatsApp = () => {
    let msg = `*${config.nombreBodega.toUpperCase()}*\n`;
    msg += `*NOTA DE ENTREGA: ${data.numeroControl}*\n`;
    msg += `RIF: ${config.rif || 'J-50123849-0'}\n`;
    msg += `Fecha: ${data.fechaHora}\n`;
    msg += `Cliente: ${nombreCliente} (CI/RIF: ${rifCliente})\n`;
    msg += `--------------------------------\n`;
    data.items.forEach((it) => {
      const totBs = it.producto.Precio_Venta * tasaBCV * it.cantidad;
      msg += `• ${it.cantidad}x ${it.producto.Nombre} = Bs. ${formatBs(totBs)}\n`;
    });
    msg += `--------------------------------\n`;
    msg += `Base Imponible: Bs. ${formatBs(baseImponibleBs)}\n`;
    msg += `IVA (${ivaPorcentaje}%): Bs. ${formatBs(montoIvaBs)}\n`;
    if (aplicaRetencion) {
      msg += `(-) Retención IVA (${porcentajeRetencion}%): -Bs. ${formatBs(montoRetencionIvaBs)}\n`;
    }
    msg += `*TOTAL PUNTO DE VENTA: Bs. ${formatBs(netoPagarBs)}*\n`;
    msg += `Ref. USD: $${formatUSD(netoPagarUSD)} (Tasa BCV: Bs. ${formatBs(tasaBCV)})\n`;
    msg += `--------------------------------\n`;
    msg += `¡Gracias por su preferencia!`;

    const encoded = encodeURIComponent(msg);
    let cleanPhone = telefonoCliente.replace(/\D/g, '');
    if (cleanPhone.startsWith('04')) cleanPhone = '58' + cleanPhone.slice(1);
    else if (cleanPhone.length === 10 && cleanPhone.startsWith('4')) cleanPhone = '58' + cleanPhone;

    const url = cleanPhone.length >= 10
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;

    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      
      {/* Container Principal */}
      <div className="bg-[#121318] border border-[#D4AF37]/40 rounded-2xl w-full max-w-3xl max-h-[95vh] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden">
        
        {/* Barra Superior de Control (NO se imprime) */}
        <div className="p-3 bg-[#181920] border-b border-white/10 flex items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2 font-display">
                <span>Nota de Entrega Fiscal (SENIAT)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                  Punto de Venta
                </span>
              </h3>
              <span className="text-[11px] text-gray-400 font-mono">
                Control: {data.numeroControl} • {data.fechaHora}
              </span>
            </div>
          </div>

          {/* Acciones de Cabecera */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Imprimir documento"
            >
              <Printer size={15} />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              className="px-3 py-1.5 rounded-xl bg-[#D4AF37] hover:bg-[#ECC855] text-black text-xs font-black font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              title="Descargar en PDF"
            >
              <Download size={15} />
              <span className="hidden sm:inline">PDF</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              title="Compartir por WhatsApp"
            >
              <Share2 size={15} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Panel Desplegable de Ajustes Rápidos Fiscales (Cliente / Retención IVA) - NO se imprime */}
        <div className="p-3 bg-[#15161C] border-b border-white/5 flex flex-wrap gap-2 items-center justify-between text-xs font-mono print:hidden">
          {/* Datos Cliente Rápidos */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            <input
              type="text"
              placeholder="Nombre / Razón Social Cliente..."
              value={nombreCliente}
              onChange={(e) => setNombreCliente(e.target.value)}
              className="bg-black/50 border border-white/15 focus:border-[#D4AF37] rounded-lg px-2.5 py-1 text-white text-xs outline-none flex-1 min-w-[150px]"
            />
            <input
              type="text"
              placeholder="CI o RIF (ej. V-12345678)"
              value={rifCliente}
              onChange={(e) => setRifCliente(e.target.value)}
              className="bg-black/50 border border-white/15 focus:border-[#D4AF37] rounded-lg px-2.5 py-1 text-white text-xs outline-none w-32 uppercase"
            />
          </div>

          {/* Selector de Retención IVA */}
          <div className="flex items-center gap-2 shrink-0">
            <label className="flex items-center gap-1.5 cursor-pointer text-gray-300 hover:text-white">
              <input
                type="checkbox"
                checked={aplicaRetencion}
                onChange={(e) => setAplicaRetencion(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-[#D4AF37] focus:ring-0 bg-black border-white/20 cursor-pointer"
              />
              <span className="text-[11px] font-bold">Retención IVA</span>
            </label>

            {aplicaRetencion && (
              <select
                value={porcentajeRetencion}
                onChange={(e) => setPorcentajeRetencion(Number(e.target.value))}
                className="bg-black/60 border border-amber-500/50 rounded-lg px-2 py-1 text-amber-300 text-xs font-bold outline-none cursor-pointer"
              >
                <option value={75}>75% IVA Retenido</option>
                <option value={100}>100% IVA Retenido</option>
              </select>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DOCUMENTO FISCAL SENIAT (Visible en pantalla y formateado para IMPRESIÓN) */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white text-black font-sans print:p-0 print:overflow-visible custom-scrollbar">
          
          <div className="max-w-2xl mx-auto border border-gray-300 p-4 sm:p-6 rounded-lg print:border-none print:p-0 shadow-sm">
            
            {/* 1. ENCABEZADO SENIAT */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 pb-3 border-b-2 border-gray-800">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border border-gray-300 shadow-sm shrink-0 bg-black">
                  <img 
                    id="nota-entrega-logo"
                    src="/pwa-512x512.png" 
                    alt="Legatix Logo" 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div className="text-center sm:text-left">
                  <h2 className="text-lg sm:text-xl font-black uppercase tracking-wide text-gray-900 leading-tight">
                    {config.nombreBodega || 'Legatix POS'}
                  </h2>
                  <p className="text-xs font-bold text-gray-800 mt-0.5">
                    RIF: {config.rif || 'J-50123849-0'}{config.telefonoAdmin ? ` • TEL: ${config.telefonoAdmin}` : ''}
                  </p>
                  {config.direccion && (
                    <p className="text-[11px] text-gray-700 leading-tight mt-0.5 max-w-md">
                      {config.direccion}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-center sm:text-right shrink-0">
                <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider">
                  Contribuyente Ordinario
                </p>
                <p className="text-[10px] text-gray-500 font-medium">
                  Impuesto al Valor Agregado (IVA)
                </p>
              </div>
            </div>

            {/* 2. DATOS DEL DOCUMENTO FISCAL */}
            <div className="py-3 border-b border-gray-400 grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-[13px] font-black tracking-wider text-gray-900 uppercase">
                  NOTA DE ENTREGA
                </div>
                <div className="font-mono font-bold text-red-700 text-sm">
                  {data.numeroControl}
                </div>
                <div className="text-[11px] text-gray-600 mt-1">
                  <strong>Fecha y Hora:</strong> {data.fechaHora}
                </div>
                <div className="text-[11px] text-gray-600">
                  <strong>Forma de Pago:</strong> PUNTO DE VENTA (TARJETA)
                </div>
              </div>

              <div className="text-right">
                <div className="text-[11px] text-gray-700">
                  <strong>Tasa Oficial BCV:</strong> Bs. {formatBs(tasaBCV)} / USD
                </div>
                <div className="text-[11px] text-gray-700 mt-0.5">
                  <strong>Cajero / Operador:</strong> {config.emailAdmin || 'Caja Principal'}
                </div>
                <div className="mt-1">
                  <span className="inline-block px-2 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-bold text-gray-700 uppercase">
                    Comprobante de Despacho
                  </span>
                </div>
              </div>
            </div>

            {/* 3. DATOS DEL CLIENTE / RECEPTOR */}
            <div className="py-2.5 border-b border-gray-400 text-xs leading-relaxed bg-gray-50/70 p-2 rounded my-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                <div>
                  <span className="text-gray-600 font-medium">Cliente / Razón Social: </span>
                  <strong className="text-gray-900 uppercase">{nombreCliente}</strong>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">C.I. / RIF: </span>
                  <strong className="text-gray-900 font-mono uppercase">{rifCliente}</strong>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">Teléfono: </span>
                  <span className="text-gray-800">{telefonoCliente}</span>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">Dirección: </span>
                  <span className="text-gray-800">{direccionCliente}</span>
                </div>
              </div>
            </div>

            {/* 4. TABLA DE ÍTEMS SENIAT */}
            <div className="mt-3">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-800 text-[11px] font-bold text-gray-900 uppercase">
                    <th className="py-1.5 w-7 text-center">#</th>
                    <th className="py-1.5 w-12 text-center">Cant.</th>
                    <th className="py-1.5">Descripción del Producto</th>
                    <th className="py-1.5 text-right w-24">P. Unit. (Bs.)</th>
                    <th className="py-1.5 text-center w-14">Alíc.</th>
                    <th className="py-1.5 text-right w-24">Total (Bs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.items.map((it, idx) => {
                    const cant = it.cantidad;
                    const pBs = it.producto.Precio_Venta * tasaBCV;
                    const totBs = pBs * cant;
                    return (
                      <tr key={it.producto.ID_Producto || idx} className="text-gray-800">
                        <td className="py-1.5 text-center font-mono text-[11px] text-gray-500">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 text-center font-mono font-bold">
                          {cant % 1 === 0 ? cant : cant.toFixed(2)}
                        </td>
                        <td className="py-1.5 font-medium leading-tight">
                          <span>{it.producto.Nombre}</span>
                          <span className="text-[10px] text-gray-500 block">
                            ${formatUSD(it.producto.Precio_Venta)} • {it.producto.Unidad_Medida || 'Unidad'}
                          </span>
                        </td>
                        <td className="py-1.5 text-right font-mono font-medium">
                          {formatBs(pBs)}
                        </td>
                        <td className="py-1.5 text-center font-mono text-[10px]">
                          {ivaPorcentaje}% (G)
                        </td>
                        <td className="py-1.5 text-right font-mono font-bold">
                          {formatBs(totBs)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 5. LIQUIDACIÓN FISCAL SENIAT */}
            <div className="mt-4 pt-3 border-t-2 border-gray-800 flex justify-end">
              <div className="w-full sm:w-80 text-xs space-y-1.5">
                <div className="flex justify-between text-gray-700">
                  <span>Base Imponible Gravable ({ivaPorcentaje}%):</span>
                  <span className="font-mono font-bold">Bs. {formatBs(baseImponibleBs)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Impuesto al Valor Agregado (IVA {ivaPorcentaje}%):</span>
                  <span className="font-mono font-bold">Bs. {formatBs(montoIvaBs)}</span>
                </div>

                {aplicaRetencion && (
                  <div className="flex justify-between text-amber-900 bg-amber-50 p-1 rounded font-bold">
                    <span>(-) Retención de IVA ({porcentajeRetencion}%):</span>
                    <span className="font-mono text-red-600">-Bs. {formatBs(montoRetencionIvaBs)}</span>
                  </div>
                )}

                <div className="pt-2 border-t-2 border-gray-900 flex justify-between items-baseline text-sm">
                  <span className="font-black text-gray-900 uppercase">
                    TOTAL PUNTO DE VENTA:
                  </span>
                  <span className="font-mono font-black text-base text-gray-950">
                    Bs. {formatBs(netoPagarBs)}
                  </span>
                </div>

                <div className="text-right text-[11px] text-gray-600 font-mono">
                  Contravalor Ref: <strong>${formatUSD(netoPagarUSD)} USD</strong> (Tasa: Bs. {formatBs(tasaBCV)})
                </div>
              </div>
            </div>

            {/* 6. PIE LEGAL SENIAT */}
            <div className="mt-6 pt-3 border-t border-gray-300 text-[10px] text-gray-500 leading-tight text-center space-y-1">
              <p>
                <strong>NORMATIVA SENIAT:</strong> Documento emitido conforme a las providencias administrativas del SENIAT (Providencia SNAT/2011/00071).
              </p>
              <p>
                Los montos están expresados en moneda de curso legal (Bolívares) con equivalencia en Divisas calculada a la tasa oficial del Banco Central de Venezuela.
              </p>
              <p className="font-bold text-gray-700">
                ¡Gracias por su compra en {config.nombreBodega || 'nuestro establecimiento'}!
              </p>
            </div>

          </div>
        </div>

        {/* Barra Inferior (NO se imprime) */}
        <div className="p-3 bg-[#181920] border-t border-white/10 flex items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="text-xs font-mono text-gray-400">
            Cobrado con: <strong className="text-white">PUNTO DE VENTA</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer size={15} />
              <span>Imprimir Ticket</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#F5DA76] via-[#D4AF37] to-[#A88120] hover:brightness-110 text-black font-mono font-black text-xs active:scale-95 transition-all cursor-pointer shadow-md"
            >
              Listo / Nueva Venta
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
