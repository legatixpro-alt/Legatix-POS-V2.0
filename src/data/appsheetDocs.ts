export interface SheetColumnDef {
  columna: string;
  tipoAppSheet: string;
  requerido: boolean;
  descripcion: string;
  appFormula?: string;
  validIf?: string;
}

export interface SheetTableDef {
  nombreHoja: string;
  descripcion: string;
  clavePrimaria: string;
  columnas: SheetColumnDef[];
}

export const googleSheetsSchema: SheetTableDef[] = [
  {
    nombreHoja: 'Usuarios',
    descripcion: 'Control de acceso de cajeros, administradores y personal de bodega.',
    clavePrimaria: 'ID_Usuario',
    columnas: [
      { columna: 'ID_Usuario', tipoAppSheet: 'Text (Key)', requerido: true, descripcion: 'Identificador único (ej. USR-001 o UNIQUEID())', appFormula: 'UNIQUEID()' },
      { columna: 'Nombre_Completo', tipoAppSheet: 'Name', requerido: true, descripcion: 'Nombre del bodeguero o cajero' },
      { columna: 'Rol', tipoAppSheet: 'Enum', requerido: true, descripcion: 'Permisos: [Administrador, Cajero, Bodeguero]' },
      { columna: 'Nombre_Bodega', tipoAppSheet: 'Text', requerido: true, descripcion: 'Nombre comercial del minimarket' },
      { columna: 'Telefono', tipoAppSheet: 'Phone', requerido: false, descripcion: 'Número móvil de contacto' },
      { columna: 'Email', tipoAppSheet: 'Email', requerido: true, descripcion: 'Correo para autenticación y reportes' },
      { columna: 'Activo', tipoAppSheet: 'Yes/No', requerido: true, descripcion: 'Estado del usuario en el sistema' },
      { columna: 'Fecha_Creacion', tipoAppSheet: 'DateTime', requerido: true, descripcion: 'Fecha de alta', appFormula: 'NOW()' }
    ]
  },
  {
    nombreHoja: 'Inventario',
    descripcion: 'Catálogo de productos, costos, precios de venta y control de existencias.',
    clavePrimaria: 'ID_Producto',
    columnas: [
      { columna: 'ID_Producto', tipoAppSheet: 'Text (Key)', requerido: true, descripcion: 'Código único de producto', appFormula: 'UNIQUEID()' },
      { columna: 'Codigo_Barras', tipoAppSheet: 'Text (Scannable)', requerido: false, descripcion: 'Código EAN/UPC leído por la cámara móvil' },
      { columna: 'Nombre', tipoAppSheet: 'Text', requerido: true, descripcion: 'Nombre y presentación del producto' },
      { columna: 'Categoria', tipoAppSheet: 'Enum', requerido: true, descripcion: 'Víveres, Bebidas, Lácteos, Frescos, Limpieza, Otros' },
      { columna: 'Costo', tipoAppSheet: 'Price', requerido: true, descripcion: 'Costo unitario de reposición en USD' },
      { columna: 'Precio_Venta', tipoAppSheet: 'Price', requerido: true, descripcion: 'Precio al público en USD base' },
      { columna: 'Stock_Actual', tipoAppSheet: 'Number', requerido: true, descripcion: 'Existencia física actual' },
      { columna: 'Stock_Minimo', tipoAppSheet: 'Number', requerido: true, descripcion: 'Umbral para disparar alerta visual de reposición' },
      { columna: 'Unidad_Medida', tipoAppSheet: 'Enum', requerido: true, descripcion: 'Unidad, Paquete, Kilogramo, Litro, Lata' },
      { columna: 'Alerta_Bajo_Stock', tipoAppSheet: 'Virtual (Yes/No)', requerido: false, descripcion: 'Calculado: TRUE si Stock_Actual <= Stock_Minimo', appFormula: '[Stock_Actual] <= [Stock_Minimo]' }
    ]
  },
  {
    nombreHoja: 'Clientes',
    descripcion: 'Libreta de clientes y control centralizado de cuentas por cobrar ("Fiados").',
    clavePrimaria: 'ID_Cliente',
    columnas: [
      { columna: 'ID_Cliente', tipoAppSheet: 'Text (Key)', requerido: true, descripcion: 'Identificador único del cliente', appFormula: 'UNIQUEID()' },
      { columna: 'Nombre_Completo', tipoAppSheet: 'Name', requerido: true, descripcion: 'Nombre o apodo reconocible del vecino/cliente' },
      { columna: 'Telefono_WhatsApp', tipoAppSheet: 'Phone', requerido: true, descripcion: 'Número móvil con código de país para cobro por WhatsApp' },
      { columna: 'Limite_Credito', tipoAppSheet: 'Price', requerido: true, descripcion: 'Monto máximo permitido en fiado (USD)' },
      { columna: 'Deuda_Total', tipoAppSheet: 'Price (Calculated)', requerido: true, descripcion: 'Saldo deudor acumulado en USD', appFormula: 'SUM(SELECT(Ventas[Total_Venta], AND([ID_Cliente] = [_THISROW].[ID_Cliente], [Metodo_Pago] = "Fiado", [Estado_Transaccion] = "Completada"))) - SUM(SELECT(Abonos[Monto_Abonado], [ID_Cliente] = [_THISROW].[ID_Cliente]))' },
      { columna: 'Estado_Credito', tipoAppSheet: 'Enum (Virtual)', requerido: false, descripcion: 'Al Día, Crédito Activo, Cerca del Límite, Bloqueado', appFormula: 'IFS([Deuda_Total] <= 0, "Al Día", [Deuda_Total] >= [Limite_Credito], "Bloqueado", [Deuda_Total] >= ([Limite_Credito] * 0.8), "Cerca del Límite", TRUE, "Crédito Activo")' },
      { columna: 'Notas', tipoAppSheet: 'LongText', requerido: false, descripcion: 'Dirección, acuerdos de pago o referencias' }
    ]
  },
  {
    nombreHoja: 'Ventas',
    descripcion: 'Tabla maestra de transacciones de venta registradas en el POS móvil.',
    clavePrimaria: 'ID_Transaccion',
    columnas: [
      { columna: 'ID_Transaccion', tipoAppSheet: 'Text (Key)', requerido: true, descripcion: 'Identificador único de ticket', appFormula: 'CONCATENATE("VTA-", TEXT(NOW(), "YYYYMMDD-HHMMSS-"), RIGHT(UNIQUEID(), 4))' },
      { columna: 'Fecha_Hora', tipoAppSheet: 'DateTime', requerido: true, descripcion: 'Estampa temporal exacta de la venta', appFormula: 'NOW()' },
      { columna: 'ID_Cliente', tipoAppSheet: 'Ref (Clientes)', requerido: false, descripcion: 'Cliente asociado si el método es Fiado o registrado', validIf: 'IF([Metodo_Pago] = "Fiado", ISNOTBLANK([ID_Cliente]), TRUE)' },
      { columna: 'Total_Venta', tipoAppSheet: 'Price', requerido: true, descripcion: 'Suma de los subtotales del detalle de venta', appFormula: 'SUM([Related Detalle_Ventas][Subtotal])' },
      { columna: 'Metodo_Pago', tipoAppSheet: 'Enum', requerido: true, descripcion: 'Opciones: [Efectivo, Pago Móvil, Divisa, Fiado]' },
      { columna: 'Estado_Transaccion', tipoAppSheet: 'Enum', requerido: true, descripcion: 'Opciones: [Completada, Pendiente, Anulada]' },
      { columna: 'Tasa_Cambio_Aplicada', tipoAppSheet: 'Decimal', requerido: true, descripcion: 'Tasa de cambio del día capturada al momento del cobro' },
      { columna: 'Total_Moneda_Local', tipoAppSheet: 'Decimal (Virtual)', requerido: false, descripcion: 'Total convertido a moneda local', appFormula: '[Total_Venta] * [Tasa_Cambio_Aplicada]' },
      { columna: 'ID_Usuario', tipoAppSheet: 'Ref (Usuarios)', requerido: true, descripcion: 'Cajero/Bodeguero responsable', appFormula: 'USEREMAIL()' }
    ]
  },
  {
    nombreHoja: 'Detalle_Ventas',
    descripcion: 'Tabla transaccional 1NF que contiene cada línea/ítem vendido para aligerar la tabla maestra.',
    clavePrimaria: 'ID_Detalle',
    columnas: [
      { columna: 'ID_Detalle', tipoAppSheet: 'Text (Key)', requerido: true, descripcion: 'Identificador único de ítem vendido', appFormula: 'UNIQUEID()' },
      { columna: 'ID_Transaccion', tipoAppSheet: 'Ref (Ventas) [IsPartOf: Yes]', requerido: true, descripcion: 'Enlace a la cabecera de la venta maestra' },
      { columna: 'ID_Producto', tipoAppSheet: 'Ref (Inventario)', requerido: true, descripcion: 'Producto vendido' },
      { columna: 'Cantidad', tipoAppSheet: 'Number', requerido: true, descripcion: 'Unidades vendidas', validIf: '[Cantidad] > 0 AND [Cantidad] <= [ID_Producto].[Stock_Actual]' },
      { columna: 'Precio_Unitario_Historico', tipoAppSheet: 'Price', requerido: true, descripcion: 'Precio congelado al momento de la venta', appFormula: '[ID_Producto].[Precio_Venta]' },
      { columna: 'Subtotal', tipoAppSheet: 'Price', requerido: true, descripcion: 'Monto de la línea', appFormula: '[Cantidad] * [Precio_Unitario_Historico]' }
    ]
  },
  {
    nombreHoja: 'Abonos',
    descripcion: 'Registro de pagos parciales o totales de deudas de clientes fiados.',
    clavePrimaria: 'ID_Abono',
    columnas: [
      { columna: 'ID_Abono', tipoAppSheet: 'Text (Key)', requerido: true, descripcion: 'Identificador de recibo de abono', appFormula: 'CONCATENATE("ABN-", TEXT(NOW(), "YYYYMMDD-HHMMSS-"), RIGHT(UNIQUEID(), 4))' },
      { columna: 'ID_Cliente', tipoAppSheet: 'Ref (Clientes)', requerido: true, descripcion: 'Cliente que realiza el abono' },
      { columna: 'Fecha_Hora', tipoAppSheet: 'DateTime', requerido: true, descripcion: 'Fecha y hora del pago', appFormula: 'NOW()' },
      { columna: 'Monto_Abonado', tipoAppSheet: 'Price', requerido: true, descripcion: 'Monto en USD abonado a la cuenta', validIf: '[Monto_Abonado] > 0 AND [Monto_Abonado] <= [ID_Cliente].[Deuda_Total]' },
      { columna: 'Saldo_Anterior', tipoAppSheet: 'Price', requerido: true, descripcion: 'Deuda antes del abono', appFormula: '[ID_Cliente].[Deuda_Total]' },
      { columna: 'Saldo_Restante', tipoAppSheet: 'Price', requerido: true, descripcion: 'Deuda después del abono', appFormula: '[Saldo_Anterior] - [Monto_Abonado]' },
      { columna: 'Metodo_Abono', tipoAppSheet: 'Enum', requerido: true, descripcion: 'Opciones: [Efectivo, Pago Móvil, Divisa]' },
      { columna: 'Comprobante_Ref', tipoAppSheet: 'Text', requerido: false, descripcion: 'Número de referencia bancaria o detalle físico' },
      { columna: 'ID_Usuario', tipoAppSheet: 'Ref (Usuarios)', requerido: true, descripcion: 'Bodeguero que recibió el dinero', appFormula: 'USEREMAIL()' }
    ]
  }
];

export const appsheetFormulasDocumentation = [
  {
    titulo: '1. Cálculo Automático del Total de Venta',
    tabla: 'Ventas',
    campo: 'Total_Venta',
    formula: 'SUM([Related Detalle_Ventas][Subtotal])',
    explicacion: 'AppSheet calcula de forma reactiva la suma de todos los registros hijos en la tabla Detalle_Ventas vinculados a esta transacción.'
  },
  {
    titulo: '2. Subtotal por Línea con Precio Histórico',
    tabla: 'Detalle_Ventas',
    campo: 'Subtotal',
    formula: '[Cantidad] * [Precio_Unitario_Historico]',
    explicacion: 'Multiplica la cantidad vendida por el precio congelado del producto al momento de añadirlo, protegiendo históricos ante futuros aumentos de precio.'
  },
  {
    titulo: '3. Reducción Automática de Stock en Inventario (AppSheet Bot / Action)',
    tabla: 'Detalle_Ventas -> Inventario',
    campo: 'Stock_Actual',
    formula: '[Stock_Actual] - [_THISROW].[Cantidad]',
    explicacion: 'Configurar una Acción en AppSheet: "Data: set the values of some columns in this row" referenciada a Inventario, disparada automáticamente al crearse cada fila en Detalle_Ventas.'
  },
  {
    titulo: '4. Cálculo Dinámico de la Deuda del Cliente (Cuentas por Cobrar)',
    tabla: 'Clientes',
    campo: 'Deuda_Total',
    formula: 'SUM(SELECT(Ventas[Total_Venta], AND([ID_Cliente] = [_THISROW].[ID_Cliente], [Metodo_Pago] = "Fiado", [Estado_Transaccion] = "Completada"))) - SUM(SELECT(Abonos[Monto_Abonado], [ID_Cliente] = [_THISROW].[ID_Cliente]))',
    explicacion: 'Suma todas las compras realizadas a crédito ("Fiado") y resta la totalidad de los abonos registrados a nombre del cliente.'
  },
  {
    titulo: '5. Validación Estricta de Límite de Crédito (Valid_If)',
    tabla: 'Ventas',
    campo: 'ID_Cliente',
    formula: 'IF([Metodo_Pago] = "Fiado", ([ID_Cliente].[Deuda_Total] + [_THISROW].[Total_Venta]) <= [ID_Cliente].[Limite_Credito], TRUE)',
    explicacion: 'Bloquea el botón de "Cobrar Fiado" si la nueva venta excede el límite máximo de crédito asignado al cliente.'
  },
  {
    titulo: '6. Validación de Stock Disponible en Tiempo Real (Valid_If)',
    tabla: 'Detalle_Ventas',
    campo: 'Cantidad',
    formula: '[Cantidad] <= [ID_Producto].[Stock_Actual]',
    explicacion: 'Evita registrar ventas por encima de la existencia física en almacén.'
  }
];

export const googleAppsScriptCode = `/**
 * ==============================================================================
 * PROYECTO: "El Cuaderno del Bodeguero" - Micro-SaaS B2B Móvil
 * ARCHIVO: Code.gs (Google Apps Script)
 * FUNCIÓN: Cierre de Caja Diario Automatizado, Validación Anti-Duplicados y Reporte Móvil
 * AUTOR: Arquitectura Cloud Bodeguero
 * ==============================================================================
 */

// CONFIGURACIÓN GLOBAL DEL SISTEMA
const CONFIG = {
  NOMBRE_BODEGA: 'Minimarket La Bendición',
  EMAIL_ADMIN: 'javiercol28@gmail.com', // Se reemplaza con el correo del propietario
  MONEDA_BASE: 'USD',
  SIMBOLO_LOCAL: 'Bs.',
  HOJAS: {
    VENTAS: 'Ventas',
    DETALLES: 'Detalle_Ventas',
    ABONOS: 'Abonos',
    INVENTARIO: 'Inventario',
    CLIENTES: 'Clientes',
    CIERRES_LOG: 'Cierres_Caja_Log'
  }
};

/**
 * Función principal que se ejecuta diariamente (vía Trigger a las 9:30 PM o botón manual en AppSheet)
 */
function generarCierreDeCajaDiario() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const fechaHoy = new Date();
  const fechaStr = Utilities.formatDate(fechaHoy, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const horaStr = Utilities.formatDate(fechaHoy, Session.getScriptTimeZone(), 'hh:mm a');

  Logger.log('Iniciando Cierre de Caja para la fecha: ' + fechaStr);

  // 1. OBTENER Y VALIDAR DATOS DE VENTAS DEL DÍA
  const hojaVentas = ss.getSheetByName(CONFIG.HOJAS.VENTAS);
  const datosVentas = hojaVentas.getDataRange().getValues();
  if (datosVentas.length <= 1) {
    Logger.log('No hay registros de ventas.');
    return;
  }

  const cabeceraVentas = datosVentas[0];
  const idxIdVenta = cabeceraVentas.indexOf('ID_Transaccion');
  const idxFecha = cabeceraVentas.indexOf('Fecha_Hora');
  const idxTotal = cabeceraVentas.indexOf('Total_Venta');
  const idxMetodo = cabeceraVentas.indexOf('Metodo_Pago');
  const idxEstado = cabeceraVentas.indexOf('Estado_Transaccion');
  const idxTasa = cabeceraVentas.indexOf('Tasa_Cambio_Aplicada');

  // FILTRADO Y VALIDACIÓN ANTI-DUPLICADOS EN MEMORIA
  const idsProcesados = new Set();
  let totalVentasUSD = 0;
  let ventasEfectivoUSD = 0;
  let ventasPagoMovilUSD = 0;
  let ventasDivisaUSD = 0;
  let ventasFiadoUSD = 0;
  let conteoVentas = 0;
  let ultimaTasa = 45.50;

  for (let i = 1; i < datosVentas.length; i++) {
    const fila = datosVentas[i];
    const idTransaccion = String(fila[idxIdVenta]).trim();
    const fechaHora = fila[idxFecha];
    const estado = String(fila[idxEstado]).trim();

    if (!idTransaccion || estado === 'Anulada') continue;

    // PREVENCIÓN DE DUPLICADOS
    if (idsProcesados.has(idTransaccion)) {
      Logger.warn('Registro duplicado detectado y omitido: ' + idTransaccion);
      continue;
    }
    idsProcesados.add(idTransaccion);

    // Comparar fecha del registro con hoy
    const fechaFilaStr = Utilities.formatDate(new Date(fechaHora), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    if (fechaFilaStr === fechaStr) {
      const total = Number(fila[idxTotal]) || 0;
      const metodo = String(fila[idxMetodo]).trim();
      const tasa = Number(fila[idxTasa]) || ultimaTasa;
      ultimaTasa = tasa;

      totalVentasUSD += total;
      conteoVentas++;

      switch (metodo) {
        case 'Efectivo':
          ventasEfectivoUSD += total;
          break;
        case 'Pago Móvil':
          ventasPagoMovilUSD += total;
          break;
        case 'Divisa':
          ventasDivisaUSD += total;
          break;
        case 'Fiado':
          ventasFiadoUSD += total;
          break;
      }
    }
  }

  // 2. OBTENER Y PROCESAR ABONOS DEL DÍA
  const hojaAbonos = ss.getSheetByName(CONFIG.HOJAS.ABONOS);
  let totalAbonosUSD = 0;
  let abonosEfectivoUSD = 0;
  let abonosPagoMovilUSD = 0;
  let abonosDivisaUSD = 0;
  let conteoAbonos = 0;

  if (hojaAbonos) {
    const datosAbonos = hojaAbonos.getDataRange().getValues();
    if (datosAbonos.length > 1) {
      const cabeceraAbonos = datosAbonos[0];
      const idxAbonoId = cabeceraAbonos.indexOf('ID_Abono');
      const idxAbonoFecha = cabeceraAbonos.indexOf('Fecha_Hora');
      const idxAbonoMonto = cabeceraAbonos.indexOf('Monto_Abonado');
      const idxAbonoMetodo = cabeceraAbonos.indexOf('Metodo_Abono');

      for (let j = 1; j < datosAbonos.length; j++) {
        const filaAbono = datosAbonos[j];
        const fechaAbonoStr = Utilities.formatDate(new Date(filaAbono[idxAbonoFecha]), Session.getScriptTimeZone(), 'yyyy-MM-dd');
        if (fechaAbonoStr === fechaStr) {
          const monto = Number(filaAbono[idxAbonoMonto]) || 0;
          const metodo = String(filaAbono[idxAbonoMetodo]).trim();
          totalAbonosUSD += monto;
          conteoAbonos++;

          if (metodo === 'Efectivo') abonosEfectivoUSD += monto;
          else if (metodo === 'Pago Móvil') abonosPagoMovilUSD += monto;
          else if (metodo === 'Divisa') abonosDivisaUSD += monto;
        }
      }
    }
  }

  // 3. OBTENER ALERTAS DE STOCK BAJO
  const hojaInventario = ss.getSheetByName(CONFIG.HOJAS.INVENTARIO);
  const datosInv = hojaInventario.getDataRange().getValues();
  const productosBajoStock = [];

  if (datosInv.length > 1) {
    const cabeceraInv = datosInv[0];
    const idxNombreProd = cabeceraInv.indexOf('Nombre');
    const idxStockAct = cabeceraInv.indexOf('Stock_Actual');
    const idxStockMin = cabeceraInv.indexOf('Stock_Minimo');

    for (let k = 1; k < datosInv.length; k++) {
      const prod = datosInv[k];
      const stock = Number(prod[idxStockAct]) || 0;
      const min = Number(prod[idxStockMin]) || 0;
      if (stock <= min) {
        productosBajoStock.push({
          nombre: String(prod[idxNombreProd]),
          stock: stock,
          min: min
        });
      }
    }
  }

  // CÁLCULO DE CAJA EFECTIVO NETO (Ventas Efectivo + Divisas Efectivo + Abonos Efectivo)
  const efectivoNetoUSD = ventasEfectivoUSD + ventasDivisaUSD + abonosEfectivoUSD + abonosDivisaUSD;
  const totalGeneralIngresadoUSD = (totalVentasUSD - ventasFiadoUSD) + totalAbonosUSD;

  // 4. GUARDAR REGISTRO EN HOJA DE LOGS (Auditoría Histórica)
  registrarCierreEnLog(ss, fechaStr, horaStr, totalVentasUSD, totalAbonosUSD, efectivoNetoUSD, conteoVentas, conteoAbonos);

  // 5. ENVIAR REPORTE HTML MÓVIL AL ADMINISTRADOR
  enviarEmailReporteMovil({
    fechaStr,
    horaStr,
    tasa: ultimaTasa,
    totalVentasUSD,
    ventasEfectivoUSD,
    ventasPagoMovilUSD,
    ventasDivisaUSD,
    ventasFiadoUSD,
    conteoVentas,
    totalAbonosUSD,
    abonosEfectivoUSD,
    abonosPagoMovilUSD,
    abonosDivisaUSD,
    conteoAbonos,
    efectivoNetoUSD,
    totalGeneralIngresadoUSD,
    productosBajoStock
  });
}

/**
 * Registra el cierre consolidado en la hoja Cierres_Caja_Log
 */
function registrarCierreEnLog(ss, fechaStr, horaStr, totalVentas, totalAbonos, efectivoNeto, conteoVentas, conteoAbonos) {
  let hojaLog = ss.getSheetByName(CONFIG.HOJAS.CIERRES_LOG);
  if (!hojaLog) {
    hojaLog = ss.insertSheet(CONFIG.HOJAS.CIERRES_LOG);
    hojaLog.appendRow([
      'Fecha', 'Hora_Cierre', 'Total_Ventas_USD', 'Total_Abonos_USD', 
      'Efectivo_Neto_Caja_USD', 'Cant_Ventas', 'Cant_Abonos', 'Timestamp_Generacion'
    ]);
  }
  hojaLog.appendRow([
    fechaStr, horaStr, totalVentas, totalAbonos, efectivoNeto, conteoVentas, conteoAbonos, new Date()
  ]);
}

/**
 * Genera y envía un correo con plantilla HTML Dark Mode optimizada para teléfonos celulares
 */
function enviarEmailReporteMovil(data) {
  const subject = '📊 Cierre de Caja [' + data.fechaStr + '] - ' + CONFIG.NOMBRE_BODEGA;

  const filasAlertasStock = data.productosBajoStock.map(p => 
    '<div style="background-color: #2A1B1B; border-left: 3px solid #FF5252; padding: 8px 10px; margin-bottom: 6px; border-radius: 4px;">' +
    '<div style="font-weight: bold; color: #FFFFFF; font-size: 13px;">' + p.nombre + '</div>' +
    '<div style="color: #FF8A80; font-size: 12px;">Quedan: <strong style="color:#FF5252;">' + p.stock + '</strong> (Mínimo sugerido: ' + p.min + ')</div>' +
    '</div>'
  ).join('');

  const htmlBody = \`
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <style>
      body { margin:0; padding:0; background-color:#121212; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif; color:#FFFFFF; }
      .card { background-color:#1E1E1E; border-radius:12px; padding:16px; margin:12px; border:1px solid #2A2A2A; }
      .title { font-size:18px; font-weight:bold; color:#00E676; margin-bottom:4px; }
      .subtitle { font-size:12px; color:#A0A0A0; margin-bottom:14px; }
      .stat-grid { display:flex; gap:8px; margin-bottom:12px; }
      .stat-box { flex:1; background-color:#262626; border-radius:8px; padding:10px; text-align:center; }
      .stat-val { font-size:18px; font-weight:bold; color:#00E676; }
      .stat-lbl { font-size:10px; color:#888888; text-transform:uppercase; margin-top:2px; }
      .row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #2C2C2C; font-size:13px; }
      .badge-fiado { color:#FF5252; font-weight:bold; }
      .badge-cash { color:#00E676; font-weight:bold; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="title">🏪 \${CONFIG.NOMBRE_BODEGA}</div>
      <div class="subtitle">Reporte Diario de Cierre de Caja • \${data.fechaStr} (\${data.horaStr})</div>

      <div class="stat-box" style="margin-bottom:12px; background-color:#173322; border:1px solid #00E676;">
        <div class="stat-lbl" style="color:#A7F3D0;">Total Ventas Facturadas (USD)</div>
        <div class="stat-val" style="font-size:24px;">$\${data.totalVentasUSD.toFixed(2)}</div>
        <div style="font-size:11px; color:#6EE7B7; margin-top:2px;">≈ \${CONFIG.SIMBOLO_LOCAL} \${(data.totalVentasUSD * data.tasa).toFixed(2)} (Tasa: \${data.tasa})</div>
      </div>

      <div style="font-weight:bold; font-size:13px; color:#E0E0E0; margin:14px 0 6px 0;">💳 Desglose por Método de Pago:</div>
      <div class="row"><span>💵 Efectivo (USD/Local):</span><span class="badge-cash">$\${data.ventasEfectivoUSD.toFixed(2)}</span></div>
      <div class="row"><span>📱 Pago Móvil / Transf:</span><span>$\${data.ventasPagoMovilUSD.toFixed(2)}</span></div>
      <div class="row"><span>💲 Divisa (Efectivo $):</span><span class="badge-cash">$\${data.ventasDivisaUSD.toFixed(2)}</span></div>
      <div class="row"><span>📝 Fiados Otorgados hoy:</span><span class="badge-fiado">$\${data.ventasFiadoUSD.toFixed(2)}</span></div>

      <div style="font-weight:bold; font-size:13px; color:#E0E0E0; margin:14px 0 6px 0;">📥 Cobranza de Deudas (Abonos):</div>
      <div class="row"><span>Total Recaudado (\${data.conteoAbonos} abonos):</span><span style="color:#00E676; font-weight:bold;">+$\${data.totalAbonosUSD.toFixed(2)}</span></div>

      <div style="background-color:#262626; border-radius:8px; padding:12px; margin-top:12px;">
        <div style="font-size:12px; color:#A0A0A0;">Dinero Físico en Gaveta (Efectivo + Divisas):</div>
        <div style="font-size:20px; font-weight:bold; color:#00E676;">$\${data.efectivoNetoUSD.toFixed(2)}</div>
      </div>

      \${data.productosBajoStock.length > 0 ? \`
        <div style="font-weight:bold; font-size:13px; color:#FF5252; margin:16px 0 8px 0;">⚠️ Alertas de Reposición Urgente (\${data.productosBajoStock.length}):</div>
        \${filasAlertasStock}
      \` : ''}

      <div style="text-align:center; font-size:10px; color:#666666; margin-top:16px;">
        Generado automáticamente por El Cuaderno del Bodeguero Móvil
      </div>
    </div>
  </body>
  </html>
  \`;

  MailApp.sendEmail({
    to: CONFIG.EMAIL_ADMIN,
    subject: subject,
    htmlBody: htmlBody
  });

  Logger.log('Correo de cierre enviado exitosamente a ' + CONFIG.EMAIL_ADMIN);
}

/**
 * Disparador automático: Configura la ejecución del cierre todas las noches a las 9:30 PM
 */
function configurarTriggerDiario() {
  // Eliminar triggers existentes para evitar duplicación
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'generarCierreDeCajaDiario') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Crear nuevo Time-Driven Trigger a las 21:30 horas
  ScriptApp.newTrigger('generarCierreDeCajaDiario')
    .timeBased()
    .everyDays(1)
    .atHour(21)
    .nearMinute(30)
    .create();

  Logger.log('Trigger diario configurado con éxito para las 9:30 PM.');
}
`;
