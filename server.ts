import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

// Simple in-memory sliding-window rate limiter for production stability
const ipRequestCounts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const record = ipRequestCounts.get(ip);
  if (!record || now > record.resetAt) {
    ipRequestCounts.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (record.count >= maxRequests) {
    return false;
  }
  record.count += 1;
  return true;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '10mb' }));

  // Health check endpoint for cloud orchestrators (Docker / Cloud Run / Kubernetes / Render)
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'el-cuaderno-del-bodeguero-backend',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // LegaBox AI Business Copilot endpoint
  app.post('/api/legabox-chat', async (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp, 40, 60 * 1000)) {
      return res.status(429).json({ error: 'Límite de consultas excedido. Por favor, espera unos segundos.' });
    }

    const { prompt, messages, businessContext } = req.body;

    // Helper heuristic fallback response when API key is missing or service is offline
    const getHeuristicResponse = () => {
      const p = (prompt || '').toLowerCase();
      const config = businessContext?.config || {};
      const nombre = config?.nombreBodega || 'Tu Comercio';
      const rubro = config?.rubro || 'Comercio General';
      const tasa = Number(config?.tasaCambioUSD) || 1;
      const formatBs = (usd: number) => `Bs. ${(usd * tasa).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const formatUSD = (usd: number) => `$${Number(usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      const totales = businessContext?.totales || {};
      const ventasUSD = Number(totales.totalVentasUSD) || 0;
      const cantVentas = Number(totales.totalVentasCantidad) || 0;
      const fiadosUSD = Number(totales.totalEnFiadosUSD) || 0;
      const gastosUSD = Number(totales.totalGastosUSD) || 0;
      const inventarioCosto = Number(totales.valorInventarioCostoUSD) || 0;
      const gananciaBruta = Number(totales.gananciaBrutaEstimadaUSD) || 0;
      const productosBajoStock = Number(totales.productosBajoStockCount) || 0;
      const productosAgotados = Number(totales.productosAgotadosCount) || 0;
      const totalProductos = Number(totales.totalProductosRegistrados) || 0;

      const topDeudores = businessContext?.topDeudores || [];
      const productosCriticos = businessContext?.productosCriticos || [];
      const topVendidos = businessContext?.topProductosVendidos || [];

      if (p.includes('diagnostico') || p.includes('diagnóstico') || p.includes('resumen') || p.includes('360') || p.includes('estado')) {
        let resp = `### 🤖 Diagnóstico Ejecutivo 360° para **${nombre}** (${rubro})\n\n`;
        resp += `¡Hola! He analizado a fondo toda la base de datos viva de tu negocio. Aquí tienes la radiografía financiera y comercial al día de hoy:\n\n`;
        resp += `#### 📊 Métricas Financieras Clave:\n`;
        resp += `* 💰 **Ventas Totales:** **${formatUSD(ventasUSD)}** (${formatBs(ventasUSD)}) en **${cantVentas}** transacciones registradas.\n`;
        resp += `* 📉 **Gastos Operativos:** **${formatUSD(gastosUSD)}** (${formatBs(gastosUSD)}).\n`;
        resp += `* ⚖️ **Margen Operativo Bruto:** **${formatUSD(gananciaBruta)}** (${formatBs(gananciaBruta)}).\n`;
        resp += `* 🚨 **Cuentas por Cobrar (Fiados en la calle):** **${formatUSD(fiadosUSD)}** (${formatBs(fiadosUSD)}).\n`;
        resp += `* 📦 **Capital en Inventario:** **${formatUSD(inventarioCosto)}** (${formatBs(inventarioCosto)}) distribuidos en ${totalProductos} productos.\n\n`;

        resp += `#### 🔍 Diagnóstico & Puntos de Atención:\n`;
        if (fiadosUSD > ventasUSD * 0.3 && fiadosUSD > 0) {
          resp += `* ⚠️ **Alerta de Liquidez:** Tus cuentas por cobrar representan un volumen considerable respecto a tus ingresos. Tienes capital congelado en clientes deudores.\n`;
        } else if (fiadosUSD > 0) {
          resp += `* ✅ **Crédito Controlado:** El fiado está en niveles manejables, pero es vital mantener seguimiento de los vencimientos para que no se estanque.\n`;
        } else {
          resp += `* 🌟 **Cero Deudas Pendientes:** Tus clientes están 100% al día en pagos.\n`;
        }

        if (productosBajoStock > 0 || productosAgotados > 0) {
          resp += `* 📦 **Riesgo de Quiebre de Stock:** Tienes **${productosBajoStock} productos** en stock crítico y **${productosAgotados} agotados**. ¡Esto representa ventas perdidas directas!\n`;
        } else {
          resp += `* 📦 **Inventario Sano:** Todos tus productos cuentan con stock por encima del umbral mínimo.\n`;
        }

        resp += `\n#### 🚀 3 Recomendaciones Prioritarias para Crecer:\n`;
        resp += `1. **Plan Rápido de Recuperación de Fiados:** Activa recordatorios amables vía WhatsApp para los deudores principales. Ofrece un pequeño incentivo si liquidan hoy de contado.\n`;
        resp += `2. **Reposición Inmediata de Líderes:** Reabastece los artículos más solicitados para no perder ventas en caja.\n`;
        resp += `3. **Estrategia de Ticket Promedio:** Agrupa productos de alta rotación con artículos de mayor margen en combos de mostrador.\n\n`;
        resp += `¿Deseas que elaboremos un plan específico de promociones, cobranza o compras? ¡Solo indícamelo!`;
        return resp;
      }

      if (p.includes('stock') || p.includes('inventario') || p.includes('reponer') || p.includes('agotado')) {
        let resp = `### 📦 Auditoría de Inventario & Reposición para **${nombre}**\n\n`;
        resp += `Revisé tus ${totalProductos} artículos en catálogo y encontré los siguientes datos críticos:\n\n`;
        if (productosCriticos.length > 0) {
          resp += `#### 🚨 Artículos con Stock Crítico o Agotado:\n`;
          productosCriticos.slice(0, 8).forEach((item: any) => {
            resp += `* **${item.nombre}**: Stock actual: **${item.stockActual}** (Mínimo requerido: ${item.stockMinimo}) - Categoría: ${item.categoria || 'General'}\n`;
          });
          resp += `\n💡 **Recomendación:** Contacta a tus proveedores hoy para coordinar pedido de estos artículos. Cada día sin stock es una venta que se lleva tu competencia.\n`;
        } else {
          resp += `✅ ¡Excelente noticia! No tienes productos por debajo del umbral mínimo en este momento.\n`;
        }

        if (topVendidos.length > 0) {
          resp += `\n#### 🏆 Artículos Más Vendidos (Líderes de Rotación):\n`;
          topVendidos.slice(0, 5).forEach((item: any, idx: number) => {
            resp += `${idx + 1}. **${item.nombre}**: ${item.cantidadVendida} unid. vendidas (${formatUSD(item.totalGeneradoUSD)})\n`;
          });
        }

        resp += `\n#### 💡 Consejos de Optimización de Bodega:\n`;
        resp += `* Aplica la regla 80/20: el 20% de tus productos genera el 80% de tus ingresos. Nunca permitas que esos líderes falten.\n`;
        resp += `* Revisa artículos con stock alto que no hayan registrado ventas en los últimos 15 días y ponles descuento visible en el mostrador para liberar efectivo.`;
        return resp;
      }

      if (p.includes('fiado') || p.includes('deud') || p.includes('cobrar') || p.includes('cuentas por cobrar')) {
        let resp = `### 💳 Diagnóstico de Cuentas por Cobrar (El Fiado)\n\n`;
        resp += `* 💵 **Total en la calle:** **${formatUSD(fiadosUSD)}** (${formatBs(fiadosUSD)})\n`;
        resp += `* 👥 **Total clientes deudores:** ${topDeudores.length} personas con saldo pendiente.\n\n`;

        if (topDeudores.length > 0) {
          resp += `#### 📋 Mayores Deudores Registrados:\n`;
          topDeudores.slice(0, 6).forEach((d: any, idx: number) => {
            resp += `${idx + 1}. **${d.nombre}**: Debe **${formatUSD(d.deudaUSD)}** (${formatBs(d.deudaUSD)}) - Estado: *${d.estadoCredito || 'Activo'}*\n`;
          });
          resp += `\n#### 🎯 Tácticas para Cobrar sin Perder al Cliente:\n`;
          resp += `1. **Mensaje de Agradecimiento y Balance:** Envía un mensaje cordial por WhatsApp recordando el saldo con un desglose claro.\n`;
          resp += `2. **Abonos Parciales Flexibles:** Si no pueden liquidar el 100%, pídeles un abono mínimo semanal ($5 o $10) que mantenga el crédito activo.\n`;
          resp += `3. **Límite Estricto:** Frena nuevas compras a crédito a quienes hayan superado el 80% de su límite hasta que hagan un abono.`;
        } else {
          resp += `🎉 ¡Enhorabuena! No tienes deudas pendientes de clientes. Tu cartera está 100% limpia y al día.`;
        }
        return resp;
      }

      if (p.includes('promocion') || p.includes('promoción') || p.includes('promo') || p.includes('vender más') || p.includes('crecer') || p.includes('estrategia') || p.includes('combos')) {
        let resp = `### 🚀 Estrategias y Promociones para Impulsar **${nombre}**\n\n`;
        resp += `Adaptado al rubro comercial **${rubro}** y a tus datos de venta actuales, aquí tienes 4 tácticas de alto impacto:\n\n`;
        resp += `#### 1. 🔥 El "Combo Ahorro Quincenal":\n`;
        resp += `Empaqueta 3 productos esenciales de alta demanda con un 5% de descuento respecto a su precio individual. La gente percibe ahorro directo y tú aumentas el ticket promedio en un 25% a 35%.\n\n`;
        resp += `#### 2. ⚡ Descuento por Pago de Contado Inmediato (Cash o Pago Móvil):\n`;
        resp += `Ofrece un beneficio especial (ej. un producto menor de obsequio o 3% de descuento) para quienes paguen 100% de contado en vez de pedir fiado. Esto acelera tu liquidez diaria.\n\n`;
        resp += `#### 3. 🎯 Venta Cruzada en Mostrador (Up-selling):\n`;
        resp += `Ubica productos de compra por impulso al lado de la caja registradora. Cada vez que cobres, sugiere un complemento de bajo costo. 3 de cada 10 clientes aceptan.\n\n`;
        resp += `#### 4. 📲 Catálogo en Estados de WhatsApp:\n`;
        resp += `Tus clientes locales revisan estados todos los días. Publica 2 ofertas del día al mediodía con fotos y precios en Bs. y Divisa para generar compras inmediatas.\n\n`;
        resp += `¿Cuál de estas te gustaría implementar primero? Puedo ayudarte a calcular los márgenes.`;
        return resp;
      }

      // Default contextual response
      let resp = `### 💡 Análisis de Negocio LegaBox para **${nombre}**\n\n`;
      resp += `Con base en la base de datos viva de tu comercio (${rubro}):\n\n`;
      resp += `* 💰 **Ventas Totales Registradas:** ${formatUSD(ventasUSD)} (${formatBs(ventasUSD)}) en ${cantVentas} transacciones.\n`;
      resp += `* 📦 **Inventario Activo:** ${totalProductos} productos catalogados (${formatUSD(inventarioCosto)} en inventario a costo).\n`;
      resp += `* 🚨 **Cuentas por Cobrar:** ${formatUSD(fiadosUSD)} en fiados activos.\n`;
      resp += `* 📉 **Gastos Operativos:** ${formatUSD(gastosUSD)} (${formatBs(gastosUSD)}).\n\n`;
      resp += `Para responder a tu inquietud sobre *"**${prompt}**"*:\n\n`;
      resp += `Te sugiero priorizar: **1) Acelerar la rotación de tus productos estrella**, **2) Recuperar los saldos fiados antes de que pierdan valor**, y **3) Mantener actualizada la tasa oficial (${formatBs(1)})** para proteger tu margen de ganancia.\n\n`;
      resp += `👉 Puedes hacer clic en cualquiera de las consultas rápidas recomendadas o formularme cualquier pregunta puntual sobre un producto, cliente o periodo específico.`;
      return resp;
    };

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        const fallback = getHeuristicResponse();
        return res.json({ 
          message: fallback,
          isHeuristic: true,
          note: 'Análisis realizado con el motor inteligente de datos de LegaBox.' 
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const config = businessContext?.config || {};
      const systemInstruction = `Eres LegaBox, el asesor de negocios con inteligencia artificial de élite integrado en el software POS "${config?.nombreBodega || 'el comercio'}".
Tu misión es ser el copiloto estratégico del dueño y del administrador del negocio.
Tienes acceso total en tiempo real a la base de datos viva del comercio:
- Datos del comercio: Nombre: "${config?.nombreBodega || 'Comercio'}", Rubro: "${config?.rubro || 'General'}", Dueño: "${config?.propietario || 'Comerciante'}", Tasa de cambio: Bs. ${config?.tasaCambioUSD || 1} por USD.
- Métricas consolidadas (JSON): ${JSON.stringify(businessContext?.totales || {})}
- Top productos vendidos: ${JSON.stringify(businessContext?.topProductosVendidos || [])}
- Productos con stock crítico o agotado: ${JSON.stringify(businessContext?.productosCriticos || [])}
- Clientes con deuda pendiente (fiados): ${JSON.stringify(businessContext?.topDeudores || [])}
- Gastos recientes: ${JSON.stringify(businessContext?.gastosRecientes || [])}
- Proveedores: ${JSON.stringify(businessContext?.proveedoresPendientes || [])}

Directrices para tus respuestas:
1. Responde de forma precisa, analítica, profesional y con tono motivador, empático y orientado a resultados y rentabilidad.
2. Utiliza Markdown enriquecido: títulos (# o ###), negritas, viñetas, emojis relevantes y separadores.
3. Cuando menciones montos, exprésalos tanto en USD ($) como en Bolívares (Bs.) usando la tasa actual del negocio (Bs. ${config?.tasaCambioUSD || 1}).
4. Si te preguntan sobre inventario, deudas, ventas o sugerencias para crecer, apóyate directamente en los datos proporcionados y ofrece recomendaciones prácticas y viables para pequeños y medianos comercios (retail/bodegas/papelerías/charcuterías).
5. Mantén respuestas concisas, dinámicas y fáciles de leer en pantalla.`;

      // Build turn history
      const contentsPayload: any[] = [];
      if (Array.isArray(messages) && messages.length > 0) {
        // take last 6 messages for context
        const recentMessages = messages.slice(-6);
        for (const m of recentMessages) {
          contentsPayload.push({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          });
        }
      }

      // Add current prompt turn with system instruction context
      contentsPayload.push({
        role: 'user',
        parts: [{ text: `${systemInstruction}\n\nPregunta del usuario:\n"${prompt}"` }]
      });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contentsPayload,
      });

      const replyText = response.text || '';
      if (!replyText.trim()) {
        const fallback = getHeuristicResponse();
        return res.json({ message: fallback, isHeuristic: true });
      }

      res.json({ message: replyText, isHeuristic: false });
    } catch (error: any) {
      console.error('Error al contactar Gemini en LegaBox:', error);
      // Seamlessly fallback so user experience is always preserved
      const fallback = getHeuristicResponse();
      res.json({ 
        message: fallback, 
        isHeuristic: true, 
        errorNotice: 'Gemini temporalmente no disponible, respuesta generada con motor de datos local.' 
      });
    }
  });

  // AI Assistant endpoint with rate limiter protection
  app.post('/api/inventory-assistant', async (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp, 15, 60 * 1000)) {
      return res.status(429).json({ error: 'Límite de consultas excedido. Por favor, espera un momento.' });
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ error: 'La clave GEMINI_API_KEY no está configurada en el servidor.' });
      }

      const { prompt, inventario, ventas } = req.body;
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Eres un asistente experto en retail, finanzas y compras para pequeñas bodegas y supermercados.\n\nEl usuario tiene la siguiente pregunta:\n"${prompt}"\n\nAquí están los datos de su negocio:\nINVENTARIO (JSON):\n${JSON.stringify(inventario).substring(0, 50000)}\n\nVENTAS DE LOS ÚLTIMOS 30 DÍAS (JSON):\n${JSON.stringify(ventas).substring(0, 50000)}\n\nPor favor, responde de forma concisa, útil y usando lenguaje natural. No respondas con código, y dirígete al dueño de forma amigable.`
              }
            ]
          }
        ]
      });

      res.json({ message: response.text });
    } catch (error: any) {
      console.error('Error en Gemini:', error);
      res.status(500).json({ error: 'Error interno del asistente', details: error.message });
    }
  });

  // BCV Rate cache & endpoint
  let cachedBcvRate: {
    tasa: number;
    tasaExacta: number;
    fechaValor: string;
    fuente: string;
    timestamp: string;
    cachedAt: number;
  } | null = null;

  app.get('/api/bcv-tasa', async (_req, res) => {
    try {
      const now = Date.now();
      // Return fresh cache if less than 15 minutes old
      if (cachedBcvRate && (now - cachedBcvRate.cachedAt < 15 * 60 * 1000)) {
        return res.json({ success: true, ...cachedBcvRate, cached: true });
      }

      const https = await import('https');
      const urlsToTry = [
        'https://www.bcv.org.ve/',
        'https://www.bcv.org.ve/estadisticas/indice-de-inversion',
      ];

      // 1. Primary: Direct official BCV extraction
      for (const url of urlsToTry) {
        try {
          const directResult = await new Promise<{
            tasa: number;
            tasaExacta: number;
            fechaValor: string;
            fuente: string;
            timestamp: string;
          }>((resolve, reject) => {
            const agent = new https.Agent({ rejectUnauthorized: false });
            const req = https.get(
              url,
              { agent, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }, timeout: 7000 },
              (response) => {
                let data = '';
                response.on('data', (chunk) => { data += chunk; });
                response.on('end', () => {
                  const dolarMatch = data.match(/id=["']dolar["'][\s\S]*?<strong[^>]*class=["']strong-tb["'][^>]*>([\s\S]*?)<\/strong>/i);
                  const dateMatch = data.match(/Fecha Valor:[\s\S]*?<span[^>]*class=["']date-display-single["'][^>]*>([\s\S]*?)<\/span>/i);
                  if (dolarMatch) {
                    const rawRate = dolarMatch[1].trim().replace(/\./g, '').replace(',', '.');
                    const rate = parseFloat(rawRate);
                    if (!isNaN(rate) && rate > 0) {
                      return resolve({
                        tasa: Math.round(rate * 100) / 100,
                        tasaExacta: rate,
                        fechaValor: dateMatch ? dateMatch[1].trim().replace(/\s+/g, ' ') : 'Al día',
                        fuente: 'Banco Central de Venezuela (bcv.org.ve)',
                        timestamp: new Date().toISOString(),
                      });
                    }
                  }
                  reject(new Error('No se encontró el selector de dólar'));
                });
              }
            );
            req.on('error', reject);
            req.on('timeout', () => {
              req.destroy();
              reject(new Error('Timeout de conexión con BCV'));
            });
          });

          cachedBcvRate = { ...directResult, cachedAt: now };
          return res.json({ success: true, ...directResult, cached: false });
        } catch {
          // Continue to next URL / fallback
        }
      }

      // 2. Fallback: DolarAPI oficial BCV
      try {
        const apiRes = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', { signal: AbortSignal.timeout(5000) });
        if (apiRes.ok) {
          const data = (await apiRes.json()) as any;
          if (data && typeof data.promedio === 'number' && data.promedio > 0) {
            const apiResult = {
              tasa: Math.round(data.promedio * 100) / 100,
              tasaExacta: data.promedio,
              fechaValor: data.fechaActualizacion ? new Date(data.fechaActualizacion).toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Oficial',
              fuente: 'Banco Central de Venezuela (Respaldo API)',
              timestamp: new Date().toISOString(),
            };
            cachedBcvRate = { ...apiResult, cachedAt: now };
            return res.json({ success: true, ...apiResult, cached: false });
          }
        }
      } catch {
        // Fallback failed
      }

      // 3. Fallback to existing cache if available
      if (cachedBcvRate) {
        return res.json({
          success: true,
          ...cachedBcvRate,
          cached: true,
          warning: 'Servidor BCV temporalmente no disponible, usando último registro conocido',
        });
      }

      return res.status(502).json({
        success: false,
        error: 'No se pudo contactar al portal del BCV ni a los servicios de respaldo.',
      });
    } catch (err: any) {
      console.error('Error al consultar BCV:', err);
      return res.status(500).json({ success: false, error: err.message || 'Error interno' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
