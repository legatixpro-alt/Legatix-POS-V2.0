import { Cliente, ConfiguracionApp, VentaMaestro } from '../types/schema';

export function formatUSD(amount: number): string {
  const safeAmount = Number(amount) || 0;
  return "$" + safeAmount.toFixed(2);
}
export function formatLocal(amountUSD: number, rate: number, symbol: string = 'Bs.'): string {
  const localAmount = amountUSD * rate;
  return `${symbol} ${localAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function sanitizeWhatsAppPhone(phone?: string): string {
  if (!phone) return '';
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0')) {
    clean = '58' + clean.slice(1);
  } else if (clean.length === 10 && (clean.startsWith('414') || clean.startsWith('424') || clean.startsWith('412') || clean.startsWith('416') || clean.startsWith('426') || clean.startsWith('422'))) {
    clean = '58' + clean;
  }
  return clean;
}

export interface InfoVencimientoDeuda {
  diasTranscurridos: number;
  plazoDias: number;
  diasVencida: number;
  diasRestantes: number;
  estaVencida: boolean;
  fechaOrigen: Date;
  fechaOrigenStr: string;
  badgeLabel: string;
  badgeColor: 'red' | 'amber' | 'yellow' | 'green';
}

export function calcularDiasVencimiento(
  cliente: Cliente,
  ventas: VentaMaestro[] = []
): InfoVencimientoDeuda {
  const deuda = Number(cliente?.Deuda_Total) || 0;
  const plazoDias = Number(cliente?.Dias_Credito) || 7;

  if (deuda <= 0) {
    return {
      diasTranscurridos: 0,
      plazoDias,
      diasVencida: 0,
      diasRestantes: plazoDias,
      estaVencida: false,
      fechaOrigen: new Date(),
      fechaOrigenStr: 'Al día',
      badgeLabel: 'Sin deuda',
      badgeColor: 'green'
    };
  }

  // Buscar ventas a fiado de este cliente ordenadas cronológicamente
  const fiadoVentas = (ventas || [])
    .filter(v => v.ID_Cliente === cliente.ID_Cliente && (v.Metodo_Pago === 'Fiado' || (v.Monto_Credito && v.Monto_Credito > 0)))
    .filter(v => Boolean(v.Fecha_Hora))
    .sort((a, b) => new Date(a.Fecha_Hora).getTime() - new Date(b.Fecha_Hora).getTime());

  let fechaOrigen: Date;

  if (fiadoVentas.length > 0 && fiadoVentas[0].Fecha_Hora) {
    const d = new Date(fiadoVentas[0].Fecha_Hora);
    fechaOrigen = isNaN(d.getTime()) ? new Date() : d;
  } else if (cliente.Fecha_Registro) {
    if (cliente.Fecha_Registro.includes('/')) {
      const parts = cliente.Fecha_Registro.split('/');
      if (parts.length === 3) {
        const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        fechaOrigen = isNaN(d.getTime()) ? new Date() : d;
      } else {
        fechaOrigen = new Date();
      }
    } else {
      const d = new Date(cliente.Fecha_Registro);
      fechaOrigen = isNaN(d.getTime()) ? new Date() : d;
    }
  } else {
    fechaOrigen = new Date();
  }

  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - fechaOrigen.getTime());
  const diasTranscurridos = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diasRestantes = plazoDias - diasTranscurridos;
  const estaVencida = diasRestantes < 0;
  const diasVencida = estaVencida ? Math.abs(diasRestantes) : 0;

  let badgeLabel = '';
  let badgeColor: 'red' | 'amber' | 'yellow' | 'green' = 'yellow';

  if (estaVencida) {
    badgeLabel = `${diasVencida} ${diasVencida === 1 ? 'día' : 'días'} vencida (${diasTranscurridos}d)`;
    badgeColor = 'red';
  } else if (diasRestantes === 0) {
    badgeLabel = `Vence hoy (${diasTranscurridos}d)`;
    badgeColor = 'amber';
  } else {
    badgeLabel = `${diasTranscurridos}d deuda (Vence en ${diasRestantes}d)`;
    badgeColor = 'yellow';
  }

  return {
    diasTranscurridos,
    plazoDias,
    diasVencida,
    diasRestantes,
    estaVencida,
    fechaOrigen,
    fechaOrigenStr: fechaOrigen.toLocaleDateString('es-VE'),
    badgeLabel,
    badgeColor
  };
}

export function generateWhatsAppCobroLink(
  cliente: Cliente, 
  config: ConfiguracionApp,
  diasInfo?: { diasTranscurridos: number; diasVencida: number; plazoDias: number; estaVencida: boolean }
): string {
  const deuda = Number(cliente?.Deuda_Total) || 0;
  const tasa = Number(config?.tasaCambioUSD) || 1;
  const saldoLocal = deuda * tasa;
  const nombreBodega = config?.nombreBodega || 'nuestro negocio';
  const phoneSanitized = sanitizeWhatsAppPhone(cliente?.Telefono_WhatsApp);

  let mensaje = '';

  if (deuda <= 0) {
    mensaje = `Hola *${cliente.Nombre_Completo}*, le saludamos cordialmente desde *${nombreBodega}* 🏪.\n\n` +
      `Le confirmamos con agrado que su estado de cuenta se encuentra *al día* con un saldo de *$0.00 USD* (Bs. 0,00).\n\n` +
      `¡Muchísimas gracias por su preferencia y puntualidad! 🙏`;
  } else {
    let estadoTexto = '';
    if (diasInfo) {
      if (diasInfo.estaVencida && diasInfo.diasVencida > 0) {
        estadoTexto = `⚠️ *Estado de la deuda:* Cuenta con *${diasInfo.diasVencida} ${diasInfo.diasVencida === 1 ? 'día' : 'días'} de vencimiento* (Plazo acordado: ${diasInfo.plazoDias} días).\n\n`;
      } else {
        estadoTexto = `⏱️ *Antigüedad:* ${diasInfo.diasTranscurridos} ${diasInfo.diasTranscurridos === 1 ? 'día' : 'días'} de crédito acumulados (Plazo: ${diasInfo.plazoDias} días).\n\n`;
      }
    }

    mensaje = `Hola *${cliente.Nombre_Completo}*, le escribimos cordialmente desde *${nombreBodega}* 🏪 para la gestión de su cuenta en el cuaderno de fiados.\n\n` +
      `📌 *Saldo pendiente por pagar:*\n` +
      `• *USD:* $${deuda.toFixed(2)} USD\n` +
      `• *Bolívares:* ${config.simboloMonedaLocal || 'Bs.'} ${saldoLocal.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Tasa oficial: Bs. ${tasa.toFixed(2)})\n\n` +
      estadoTexto +
      `💳 *Formas de pago disponibles:*\n` +
      `• Efectivo o divisas directamente en caja.\n` +
      (config.telefonoAdmin ? `• Pago Móvil al número: *${config.telefonoAdmin}* ${config.rif ? `(RIF: ${config.rif})` : ''}\n\n` : `\n`) +
      `Agradecemos coordinar su abono o cancelación a la brevedad para mantener su crédito activo. ¡Gracias por su preferencia! 🙏`;
  }

  return `https://api.whatsapp.com/send?phone=${phoneSanitized}&text=${encodeURIComponent(mensaje)}`;
}
