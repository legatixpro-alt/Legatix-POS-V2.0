import React, { useState, useEffect, useRef } from 'react';
import { ConfiguracionApp, Producto, Cliente, VentaMaestro, Abono, Proveedor, ActiveTab } from '../types/schema';
import { 
  Bot, 
  Send, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  Package, 
  DollarSign, 
  RotateCcw, 
  Copy, 
  Check, 
  Lightbulb, 
  ArrowUpRight,
  ShieldCheck,
  Store,
  ChevronRight,
  RefreshCw,
  Award
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface LegaboxModuleProps {
  config: ConfiguracionApp;
  productos: Producto[];
  clientes: Cliente[];
  ventas: VentaMaestro[];
  abonos: Abono[];
  gastos: any[];
  proveedores: Proveedor[];
  onNavigateToTab?: (tab: ActiveTab, subTab?: string) => void;
  onOpenConfigModal?: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'legabox';
  text: string;
  timestamp: string;
  isHeuristic?: boolean;
}

export const LegaboxModule: React.FC<LegaboxModuleProps> = ({
  config,
  productos,
  clientes,
  ventas,
  abonos,
  gastos,
  proveedores,
  onNavigateToTab,
  onOpenConfigModal,
}) => {
  const tasa = Number(config?.tasaCambioUSD) || 1;
  const nombreBodega = config?.nombreBodega || 'Tu Negocio';
  const rubro = config?.rubro || 'Comercio General';
  const propietario = config?.propietario || 'Comerciante';

  // Formatters
  const formatUSD = (val: number) => `$${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatBs = (val: number) => `Bs. ${(Number(val || 0) * tasa).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Calculated Business Metrics
  const totalVentasUSD = ventas.reduce((acc, v) => acc + (Number(v.Total_Venta) || 0), 0);
  const totalFiadosUSD = clientes.reduce((acc, c) => acc + (Number(c.Deuda_Total) || 0), 0);
  const totalGastosUSD = gastos.reduce((acc, g) => acc + (Number(g.Monto_USD || g.Monto) || 0), 0);
  const totalAbonosUSD = abonos.reduce((acc, a) => acc + (Number(a.Monto_Abonado) || 0), 0);
  const valorInventarioCosto = productos.reduce((acc, p) => acc + ((Number(p.Costo) || 0) * (Number(p.Stock_Actual) || 0)), 0);
  const valorInventarioVenta = productos.reduce((acc, p) => acc + ((Number(p.Precio_Venta) || 0) * (Number(p.Stock_Actual) || 0)), 0);
  const gananciaBrutaUSD = totalVentasUSD - totalGastosUSD;

  const productosCriticos = productos.filter((p) => Number(p.Stock_Actual) <= Number(p.Stock_Minimo));
  const productosAgotados = productos.filter((p) => Number(p.Stock_Actual) === 0);
  const clientesDeudores = clientes.filter((c) => Number(c.Deuda_Total) > 0).sort((a, b) => b.Deuda_Total - a.Deuda_Total);

  // Top products sold
  const productosVendidosMap: Record<string, { nombre: string; cantidad: number; totalUSD: number }> = {};
  ventas.forEach((v) => {
    if (Array.isArray(v.Items)) {
      v.Items.forEach((it) => {
        const id = it.producto?.ID_Producto || it.producto?.Nombre || 'otro';
        if (!productosVendidosMap[id]) {
          productosVendidosMap[id] = {
            nombre: it.producto?.Nombre || 'Producto',
            cantidad: 0,
            totalUSD: 0,
          };
        }
        productosVendidosMap[id].cantidad += it.cantidad || 0;
        productosVendidosMap[id].totalUSD += (it.cantidad || 0) * (it.producto?.Precio_Venta || 0);
      });
    }
  });

  const topProductosVendidos = Object.values(productosVendidosMap)
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 8)
    .map((p) => ({
      nombre: p.nombre,
      cantidadVendida: p.cantidad,
      totalGeneradoUSD: p.totalUSD,
    }));

  // Initial greeting
  const getInitialMessage = (): ChatMessage => ({
    id: 'welcome-msg',
    sender: 'legabox',
    text: `### 🤖 ¡Hola, ${propietario}! Soy **LegaBox**, tu copiloto de inteligencia artificial para **${nombreBodega}**.

He sincronizado y analizado toda la base de datos viva de tu comercio:
* 📦 **${productos.length}** productos en inventario (${formatUSD(valorInventarioCosto)} en mercancía a costo).
* 💰 **${ventas.length}** ventas registradas por un total de **${formatUSD(totalVentasUSD)}** (${formatBs(totalVentasUSD)}).
* 🚨 **${clientesDeudores.length}** clientes con saldo fiado pendiente (**${formatUSD(totalFiadosUSD)}** por cobrar).
* 📉 **${gastos.length}** gastos operativos registrados (**${formatUSD(totalGastosUSD)}**).
${productosCriticos.length > 0 ? `* ⚠️ **Atención:** Tienes **${productosCriticos.length} productos** en stock crítico o agotados.\n` : '* ✅ **Inventario:** Niveles de stock saludables sin quiebres críticos.\n'}

¿Qué deseas analizar o mejorar hoy? Puedes pulsar cualquiera de las opciones rápidas abajo o hacerme una pregunta directa.`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('legabox_chat_history_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return [getInitialMessage()];
  });

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Persist chat history
  useEffect(() => {
    localStorage.setItem('legabox_chat_history_v1', JSON.stringify(messages));
  }, [messages]);

  // Send question to backend
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    // Prepare full business context
    const businessContext = {
      config: {
        nombreBodega,
        rubro,
        propietario,
        tasaCambioUSD: tasa,
      },
      totales: {
        totalVentasUSD,
        totalVentasCantidad: ventas.length,
        totalEnFiadosUSD: totalFiadosUSD,
        totalGastosUSD,
        totalAbonosUSD,
        valorInventarioCostoUSD: valorInventarioCosto,
        valorInventarioVentaUSD: valorInventarioVenta,
        gananciaBrutaEstimadaUSD: gananciaBrutaUSD,
        productosBajoStockCount: productosCriticos.length,
        productosAgotadosCount: productosAgotados.length,
        totalProductosRegistrados: productos.length,
      },
      topProductosVendidos,
      productosCriticos: productosCriticos.slice(0, 15).map((p) => ({
        nombre: p.Nombre,
        stockActual: p.Stock_Actual,
        stockMinimo: p.Stock_Minimo,
        categoria: p.Categoria,
        costo: p.Costo,
        precio: p.Precio_Venta,
      })),
      topDeudores: clientesDeudores.slice(0, 15).map((c) => ({
        nombre: c.Nombre_Completo,
        deudaUSD: c.Deuda_Total,
        limiteCredito: c.Limite_Credito,
        estadoCredito: c.Estado_Credito,
        telefono: c.Telefono_WhatsApp,
      })),
      gastosRecientes: gastos.slice(0, 10).map((g) => ({
        descripcion: g.Concepto || g.Descripcion || 'Gasto',
        montoUSD: g.Monto_USD || g.Monto || 0,
        categoria: g.Categoria || 'General',
        fecha: g.Fecha || g.Fecha_Hora || '',
      })),
      proveedoresPendientes: proveedores.filter((p) => Number(p.Saldo_Pendiente) > 0).map((p) => ({
        nombre: p.Nombre_Empresa,
        saldoPendiente: p.Saldo_Pendiente,
        rubro: p.Categoria_Rubro,
      })),
    };

    try {
      const response = await fetch('/api/legabox-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          messages: messages.slice(-6).map((m) => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.text,
          })),
          businessContext,
        }),
      });

      const data = await response.json();
      const replyText = data.message || 'LegaBox ha procesado la información pero no pudo generar una respuesta.';

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'legabox',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isHeuristic: data.isHeuristic,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error('Error al consultar LegaBox:', err);
      // Fallback message
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'legabox',
        text: `### ⚠️ Aviso de Conexión
Ocurrió una interrupción al contactar el servidor de LegaBox. 

**Resumen rápido de emergencia:**
* Ventas acumuladas: **${formatUSD(totalVentasUSD)}** (${formatBs(totalVentasUSD)})
* Fiados pendientes: **${formatUSD(totalFiadosUSD)}**
* Productos con stock crítico: **${productosCriticos.length} artículos**

Por favor verifica tu conexión y vuelve a intentar tu pregunta.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleClearChat = () => {
    if (confirm('¿Deseas reiniciar la conversación con LegaBox?')) {
      const initial = [getInitialMessage()];
      setMessages(initial);
      localStorage.setItem('legabox_chat_history_v1', JSON.stringify(initial));
      toast.success('Conversación reiniciada');
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copiado al portapapeles');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Render markdown with nice formatting
  const renderFormattedText = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, index) => {
      const trimmed = line.trim();

      // Heading 3
      if (trimmed.startsWith('### ')) {
        return (
          <h3 key={index} className="text-base sm:text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#FFF0BA] via-[#D4AF37] to-[#F5DA76] font-display mt-3 mb-2 flex items-center gap-2">
            {trimmed.replace('### ', '')}
          </h3>
        );
      }
      // Heading 4
      if (trimmed.startsWith('#### ')) {
        return (
          <h4 key={index} className="text-xs sm:text-sm font-bold text-[#E5C158] uppercase tracking-wider font-mono mt-2.5 mb-1.5 flex items-center gap-1.5">
            {trimmed.replace('#### ', '')}
          </h4>
        );
      }
      // Bullet point
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        const bulletContent = trimmed.substring(2);
        return (
          <div key={index} className="flex items-start gap-2 py-0.5 text-xs sm:text-sm text-gray-200">
            <span className="text-[#D4AF37] font-bold mt-1 shrink-0">•</span>
            <span dangerouslySetInnerHTML={{ __html: parseInlineStyles(bulletContent) }} />
          </div>
        );
      }
      // Numbered list
      if (/^\d+\.\s/.test(trimmed)) {
        const match = trimmed.match(/^(\d+)\.\s(.*)/);
        if (match) {
          return (
            <div key={index} className="flex items-start gap-2.5 py-1 text-xs sm:text-sm text-gray-200">
              <span className="w-5 h-5 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] font-mono text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                {match[1]}
              </span>
              <span dangerouslySetInnerHTML={{ __html: parseInlineStyles(match[2]) }} />
            </div>
          );
        }
      }
      // Empty line
      if (trimmed === '') {
        return <div key={index} className="h-2" />;
      }
      // Regular paragraph
      return (
        <p key={index} className="text-xs sm:text-sm text-gray-200 leading-relaxed mb-1" dangerouslySetInnerHTML={{ __html: parseInlineStyles(line) }} />
      );
    });
  };

  const parseInlineStyles = (raw: string): string => {
    return raw
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="text-gray-300 italic">$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-black/60 px-1 py-0.5 rounded text-[#D4AF37] font-mono text-[11px] border border-white/10">$1</code>');
  };

  const quickPrompts = [
    {
      title: 'Diagnóstico 360°',
      prompt: 'Dame un diagnóstico completo del estado de mi negocio con recomendaciones para crecer y mejorar la rentabilidad.',
      icon: TrendingUp,
      color: 'text-amber-400',
    },
    {
      title: 'Inventario & Stock',
      prompt: '¿Qué productos tienen stock crítico o agotado y cuáles son mis recomendaciones prioritarias de compra y reposición?',
      icon: Package,
      color: 'text-cyan-400',
    },
    {
      title: 'Cobranza de Fiados',
      prompt: 'Analiza mis deudores y cuentas por cobrar. ¿Cuánto dinero tengo en la calle y qué estrategia me recomiendas para cobrar más rápido sin perder clientes?',
      icon: Users,
      color: 'text-emerald-400',
    },
    {
      title: 'Promociones & Combos',
      prompt: `¿Qué promociones, combos o estrategias de marketing me sugieres para aumentar las ventas de mi ${rubro} este fin de semana?`,
      icon: Lightbulb,
      color: 'text-purple-400',
    },
    {
      title: 'Balance & Flujo de Caja',
      prompt: '¿Cuál es el balance entre mis ventas y mis gastos operativos? ¿Cuál es mi ganancia neta estimada y cómo puedo recortar costos?',
      icon: DollarSign,
      color: 'text-blue-400',
    },
    {
      title: 'Productos Más Vendidos',
      prompt: '¿Cuáles son mis productos más vendidos en volumen y dinero? ¿Cómo puedo aumentar las ventas de los otros productos?',
      icon: Award,
      color: 'text-orange-400',
    },
  ];

  return (
    <div className="h-full w-full flex flex-col bg-[#0A0A0C] text-[#E0E0E0] select-text overflow-hidden">
      
      {/* Top Banner / LegaBox Identity Bar */}
      <header className="bg-gradient-to-r from-[#14151B] via-[#101115] to-[#14151B] border-b border-[#D4AF37]/30 px-3 sm:px-6 py-2.5 sm:py-3 shrink-0 flex items-center justify-between gap-3 shadow-[0_4px_25px_rgba(0,0,0,0.6)] z-20">
        <div className="flex items-center gap-3 min-w-0">
          {/* Futuristic Glowing Avatar */}
          <div className="relative group shrink-0">
            <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl overflow-hidden border-2 border-[#D4AF37] p-0.5 bg-gradient-to-br from-[#D4AF37] via-[#917223] to-[#594511] shadow-[0_0_20px_rgba(212,175,55,0.4)]">
              <img
                src="/legabox.jpg"
                alt="LegaBox IA"
                className="w-full h-full object-cover rounded-[14px]"
                onError={(e) => {
                  // Fallback if image path fails
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-[#00E676] border-2 border-black rounded-full animate-pulse shadow-[0_0_8px_rgba(0,230,118,0.8)]" title="En línea y sincronizado con tu base de datos"></span>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-lg font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#FFF0BA] via-[#D4AF37] to-[#F5DA76] font-display uppercase truncate">
                LEGABOX IA
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-[#D4AF37]/25 to-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/40 text-[9px] sm:text-[10px] font-mono font-bold tracking-wider uppercase flex items-center gap-1 shrink-0">
                <Sparkles size={11} className="text-[#D4AF37] animate-spin" style={{ animationDuration: '6s' }} />
                Copiloto Comercial
              </span>
            </div>

            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-400 font-mono mt-0.5 truncate">
              <span className="text-white font-semibold truncate flex items-center gap-1">
                <Store size={12} className="text-[#D4AF37]" />
                {nombreBodega}
              </span>
              <span className="text-gray-600">•</span>
              <span className="text-[#00E676] font-semibold hidden xs:inline">Data Viva Conectada</span>
              <span className="text-gray-600 hidden xs:inline">•</span>
              <span className="text-gray-400 truncate hidden sm:inline">{rubro}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={handleClearChat}
            title="Reiniciar conversación"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-mono transition-all cursor-pointer active:scale-95"
          >
            <RotateCcw size={13} className="text-gray-400" />
            <span className="hidden md:inline text-[11px]">Limpiar Chat</span>
          </button>

          {onNavigateToTab && (
            <button
              type="button"
              onClick={() => onNavigateToTab('inventario')}
              title="Ir a Inventario"
              className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#D4AF37]/30 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-mono font-bold transition-all cursor-pointer active:scale-95"
            >
              <Package size={13} />
              <span className="text-[11px]">Inventario</span>
            </button>
          )}

          {onNavigateToTab && (
            <button
              type="button"
              onClick={() => onNavigateToTab('fiado')}
              title="Ir a Deudores"
              className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#00E676]/30 bg-[#00E676]/10 hover:bg-[#00E676]/20 text-[#00E676] text-xs font-mono font-bold transition-all cursor-pointer active:scale-95"
            >
              <Users size={13} />
              <span className="text-[11px]">Deudores</span>
            </button>
          )}
        </div>
      </header>

      {/* Live Business KPI Strip (Quick Glance) */}
      <div className="bg-[#0C0D10] border-b border-white/5 px-3 sm:px-6 py-2 overflow-x-auto no-scrollbar shrink-0">
        <div className="flex items-center gap-2 sm:gap-4 min-w-max text-xs">
          <div className="flex items-center gap-2 bg-[#121318] border border-white/10 px-2.5 py-1 rounded-lg">
            <span className="text-[10px] text-gray-400 font-mono uppercase">Ventas:</span>
            <span className="text-emerald-400 font-bold font-mono">{formatUSD(totalVentasUSD)}</span>
            <span className="text-[10px] text-gray-500 font-mono">({formatBs(totalVentasUSD)})</span>
          </div>

          <div className="flex items-center gap-2 bg-[#121318] border border-white/10 px-2.5 py-1 rounded-lg">
            <span className="text-[10px] text-gray-400 font-mono uppercase">Fiado en Calle:</span>
            <span className={`font-bold font-mono ${totalFiadosUSD > 0 ? 'text-amber-400' : 'text-gray-400'}`}>
              {formatUSD(totalFiadosUSD)}
            </span>
            <span className="text-[10px] text-gray-500 font-mono">({clientesDeudores.length} deudores)</span>
          </div>

          <div className="flex items-center gap-2 bg-[#121318] border border-white/10 px-2.5 py-1 rounded-lg">
            <span className="text-[10px] text-gray-400 font-mono uppercase">Inventario a Costo:</span>
            <span className="text-[#D4AF37] font-bold font-mono">{formatUSD(valorInventarioCosto)}</span>
            <span className="text-[10px] text-gray-500 font-mono">({productos.length} items)</span>
          </div>

          {productosCriticos.length > 0 && (
            <div className="flex items-center gap-1.5 bg-red-950/40 border border-red-500/40 px-2.5 py-1 rounded-lg text-red-300">
              <AlertTriangle size={12} className="text-red-400 animate-pulse" />
              <span className="text-[10px] font-mono font-bold">{productosCriticos.length} en stock bajo</span>
            </div>
          )}

          <div className="flex items-center gap-2 bg-[#121318] border border-white/10 px-2.5 py-1 rounded-lg">
            <span className="text-[10px] text-gray-400 font-mono uppercase">Tasa Activa:</span>
            <span className="text-white font-bold font-mono">Bs. {tasa.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Main Chat Stream Area */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4">
        {messages.map((msg) => {
          const isLegaBox = msg.sender === 'legabox';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-4xl ${isLegaBox ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
            >
              {/* Bot or User Avatar */}
              {isLegaBox ? (
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl overflow-hidden border border-[#D4AF37]/60 shrink-0 bg-[#16171D] p-0.5 shadow-[0_0_12px_rgba(212,175,55,0.25)] mt-1">
                  <img
                    src="/legabox.jpg"
                    alt="LegaBox"
                    className="w-full h-full object-cover rounded-[10px]"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#8A6C1F] text-black font-bold flex items-center justify-center shrink-0 text-xs font-mono shadow-[0_0_10px_rgba(212,175,55,0.3)] mt-1">
                  TÚ
                </div>
              )}

              {/* Message Bubble Container */}
              <div
                className={`flex flex-col max-w-[88%] sm:max-w-[85%] rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm shadow-lg transition-all ${
                  isLegaBox
                    ? 'bg-[#121318]/95 border border-[#D4AF37]/30 text-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.5)]'
                    : 'bg-gradient-to-r from-[#D4AF37] via-[#C99E2E] to-[#B88C22] text-black font-medium border border-[#FFF0BA]/40 shadow-[0_4px_15px_rgba(212,175,55,0.25)]'
                }`}
              >
                {/* Header of the message */}
                <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-white/5">
                  <div className="flex items-center gap-1.5">
                    <span className={`font-bold font-display uppercase tracking-wider text-[10px] sm:text-[11px] ${isLegaBox ? 'text-[#D4AF37]' : 'text-black'}`}>
                      {isLegaBox ? 'LegaBox IA' : (propietario || 'Tú')}
                    </span>
                    {isLegaBox && msg.isHeuristic && (
                      <span className="text-[9px] bg-white/5 border border-white/10 px-1.5 py-0.2 rounded text-gray-400 font-mono">
                        Motor Local
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono ${isLegaBox ? 'text-gray-500' : 'text-black/70'}`}>
                      {msg.timestamp}
                    </span>
                    {isLegaBox && (
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg.id, msg.text)}
                        title="Copiar respuesta"
                        className="text-gray-400 hover:text-[#D4AF37] p-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        {copiedId === msg.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Body of message */}
                <div className="select-text break-words">
                  {isLegaBox ? (
                    renderFormattedText(msg.text)
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed font-sans text-black font-semibold">
                      {msg.text}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading / Thinking Animation */}
        {isLoading && (
          <div className="flex gap-3 mr-auto max-w-2xl animate-in fade-in duration-200">
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-[#D4AF37] p-0.5 bg-[#16171D] shadow-[0_0_15px_rgba(212,175,55,0.4)]">
              <img src="/legabox.jpg" alt="LegaBox" className="w-full h-full object-cover rounded-[10px]" />
            </div>
            <div className="bg-[#121318] border border-[#D4AF37]/40 rounded-2xl p-4 text-xs text-gray-300 flex items-center gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="font-mono text-[#D4AF37] font-semibold text-[11px] animate-pulse">
                LegaBox está analizando las ventas, inventario y deudas de tu negocio...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Interactive Area */}
      <footer className="bg-[#101115] border-t border-[#D4AF37]/30 p-2.5 sm:p-4 shrink-0 shadow-[0_-4px_25px_rgba(0,0,0,0.6)] z-10">
        <div className="max-w-4xl mx-auto space-y-2.5">
          
          {/* Quick Prompts Carousel / Pills */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1">
            <span className="text-[10px] uppercase font-mono font-bold text-gray-400 shrink-0 flex items-center gap-1 pl-1">
              <Sparkles size={11} className="text-[#D4AF37]" />
              Sugerencias:
            </span>
            {quickPrompts.map((qp, idx) => {
              const Icon = qp.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSendMessage(qp.prompt)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10 bg-white/5 hover:bg-[#D4AF37]/15 hover:border-[#D4AF37]/50 text-gray-300 hover:text-white text-xs font-mono transition-all active:scale-95 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group shadow-sm"
                >
                  <Icon size={12} className={`${qp.color} group-hover:scale-110 transition-transform`} />
                  <span className="text-[11px]">{qp.title}</span>
                  <ChevronRight size={10} className="text-gray-500 group-hover:text-[#D4AF37]" />
                </button>
              );
            })}
          </div>

          {/* User Input & Send Button */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 bg-[#08090B] border border-[#D4AF37]/50 focus-within:border-[#D4AF37] rounded-xl p-1.5 shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all"
          >
            <div className="pl-2 sm:pl-3 text-[#D4AF37] shrink-0">
              <Bot size={18} />
            </div>

            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`Pregunta a LegaBox sobre tus ventas, clientes, fiados o ideas para crecer...`}
              disabled={isLoading}
              className="flex-1 bg-transparent text-white placeholder-gray-500 text-xs sm:text-sm px-2 py-2 focus:outline-none font-sans"
            />

            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="flex items-center gap-1.5 px-3.5 sm:px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#F5DA76] via-[#D4AF37] to-[#A88120] text-black font-black text-xs font-display uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 shadow-[0_0_12px_rgba(212,175,55,0.4)] hover:brightness-110"
            >
              <span>Preguntar</span>
              <Send size={13} className="text-black" />
            </button>
          </form>

          {/* Micro Footer Notice */}
          <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono px-1">
            <span>💡 LegaBox tiene visión de 360° sobre ventas, compras, fiados y márgenes.</span>
            <span className="text-[#D4AF37]/70">Legatix Intelligence</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
