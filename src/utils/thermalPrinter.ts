/**
 * Utilidad de Impresión Térmica y Tickets Digitales (58mm / 80mm y WhatsApp)
 * Formateado para impresoras térmicas USB/Bluetooth (ESC/POS) y recibos rápidos.
 */

import { VentaMaestro, ConfiguracionApp } from '../types/schema';

export function generateReceiptText(venta: VentaMaestro, config: ConfiguracionApp): string {
  const line = '--------------------------------';
  const doubleLine = '================================';
  const tasa = venta.Tasa_Cambio_Aplicada || config.tasaCambioUSD || 1;
  const simbolo = config.simboloMonedaLocal || 'Bs.';

  let out = '';
  out += `${config.nombreBodega || 'MI BODEGA'}\n`;
  if (config.rif) out += `RIF: ${config.rif}\n`;
  if (config.telefonoAdmin) out += `Tel: ${config.telefonoAdmin}\n`;
  out += `${doubleLine}\n`;
  out += `RECIBO: #${venta.ID_Transaccion}\n`;
  out += `FECHA:  ${venta.Fecha_Hora}\n`;
  if (venta.Nombre_Cliente) {
    out += `CLIENTE: ${venta.Nombre_Cliente}\n`;
  }
  out += `PAGO:    ${venta.Metodo_Pago}\n`;
  out += `${line}\n`;
  out += `CANT  DESCRIPCION         TOTAL\n`;
  out += `${line}\n`;

  if (venta.Items && venta.Items.length > 0) {
    venta.Items.forEach((item) => {
      const nombre = (item.producto?.Nombre || (item as any).Nombre || 'Item').substring(0, 16);
      const precio = item.producto?.Precio_Venta || (item as any).Precio_Venta || 0;
      const subtotalUSD = (item.cantidad * precio).toFixed(2);
      out += `${item.cantidad.toString().padEnd(5)} ${nombre.padEnd(16)} $${subtotalUSD}\n`;
    });
  } else {
    out += `1     Consumo General       $${venta.Total_Venta.toFixed(2)}\n`;
  }

  out += `${line}\n`;
  out += `TOTAL USD:        $${venta.Total_Venta.toFixed(2)}\n`;
  out += `TASA CAMBIO:      ${simbolo} ${tasa.toLocaleString('es-VE', { minimumFractionDigits: 2 })}\n`;
  out += `TOTAL LOCAL:      ${simbolo} ${(venta.Total_Moneda_Local || venta.Total_Venta * tasa).toLocaleString('es-VE', { minimumFractionDigits: 2 })}\n`;

  if (venta.Monto_Credito && venta.Monto_Credito > 0) {
    out += `SALDO FIADO:      $${venta.Monto_Credito.toFixed(2)}\n`;
  }

  out += `${doubleLine}\n`;
  out += `   ¡Gracias por su compra!\n`;
  out += `  Legatix POS\n`;

  return out;
}

export function printThermalTicket(venta: VentaMaestro, config: ConfiguracionApp): void {
  if (typeof window === 'undefined') return;

  const tasa = venta.Tasa_Cambio_Aplicada || config.tasaCambioUSD || 1;
  const simbolo = config.simboloMonedaLocal || 'Bs.';
  const totalLocal = (venta.Total_Moneda_Local || venta.Total_Venta * tasa).toLocaleString('es-VE', { minimumFractionDigits: 2 });

  const printWindow = window.open('', '_blank', 'width=380,height=600');
  if (!printWindow) return;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Ticket #${venta.ID_Transaccion}</title>
        <style>
          @page {
            margin: 0;
            size: 58mm auto;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            width: 58mm;
            max-width: 58mm;
            margin: 0 auto;
            padding: 8px 4px;
            color: #000;
            background: #fff;
          }
          .center { text-align: center; }
          .right { text-align: right; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 5px 0; }
          .double-divider { border-top: 2px solid #000; margin: 6px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { padding: 2px 0; }
          @media print {
            body { width: 58mm; }
          }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size: 14px;">${config.nombreBodega || 'MI BODEGA'}</div>
        ${config.rif ? `<div class="center">RIF: ${config.rif}</div>` : ''}
        ${config.telefonoAdmin ? `<div class="center">Tel: ${config.telefonoAdmin}</div>` : ''}
        <div class="double-divider"></div>

        <div><strong>Ticket:</strong> #${venta.ID_Transaccion}</div>
        <div><strong>Fecha:</strong> ${venta.Fecha_Hora}</div>
        ${venta.Nombre_Cliente ? `<div><strong>Cliente:</strong> ${venta.Nombre_Cliente}</div>` : ''}
        <div><strong>Método:</strong> ${venta.Metodo_Pago}</div>
        
        <div class="divider"></div>
        <table>
          <thead>
            <tr>
              <th align="left">Cant</th>
              <th align="left">Producto</th>
              <th align="right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${(venta.Items || [])
              .map(
                (i) => `
              <tr>
                <td valign="top">${i.cantidad}</td>
                <td valign="top">${i.producto?.Nombre || (i as any).Nombre || 'Item'}</td>
                <td align="right" valign="top">$${(i.cantidad * (i.producto?.Precio_Venta || (i as any).Precio_Venta || 0)).toFixed(2)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
        
        <div class="divider"></div>
        <div class="right bold" style="font-size: 14px;">TOTAL: $${venta.Total_Venta.toFixed(2)}</div>
        <div class="right bold" style="font-size: 13px;">${simbolo} ${totalLocal}</div>
        <div class="right" style="font-size: 10px;">Tasa: ${simbolo} ${tasa.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>
        
        ${venta.Monto_Credito && venta.Monto_Credito > 0 ? `<div class="right bold" style="color: red;">Saldo Fiado: $${venta.Monto_Credito.toFixed(2)}</div>` : ''}

        <div class="double-divider"></div>
        <div class="center bold">¡GRACIAS POR SU COMPRA!</div>
        <div class="center" style="font-size: 9px; margin-top: 4px;">Legatix POS</div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
