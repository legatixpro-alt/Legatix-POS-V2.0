import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Phone, 
  MapPin, 
  FileText, 
  MessageCircle, 
  Star, 
  ShoppingCart, 
  Edit3, 
  Trash2, 
  Sparkles, 
  Send, 
  Copy, 
  Check, 
  X, 
  Mail, 
  DollarSign, 
  ShieldCheck, 
  TrendingUp, 
  Tag,
  Share2,
  Building2,
  ChevronRight,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Cliente, ConfiguracionApp, VentaMaestro } from '../types/schema';

interface ClientesModuleProps {
  clientes: Cliente[];
  ventas: VentaMaestro[];
  config: ConfiguracionApp;
  onCrearCliente: (cliente: any) => Cliente | Promise<Cliente>;
  onEditarCliente?: (cliente: Cliente) => void;
  onEliminarCliente?: (id: string) => void;
  onIniciarVentaConCliente: (cliente: Cliente) => void;
  role?: 'Administrador' | 'Cajero';
}

export const ClientesModule: React.FC<ClientesModuleProps> = ({
  clientes,
  ventas,
  config,
  onCrearCliente,
  onEditarCliente,
  onEliminarCliente,
  onIniciarVentaConCliente,
  role = 'Administrador',
}) => {
  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<'Todos' | 'VIP' | 'Frecuente' | 'Mayorista' | 'Ocasional' | 'ConDeuda'>('Todos');

  // Modals
  const [showModalCrear, setShowModalCrear] = useState(false);
  const [clienteEnEdicion, setClienteEnEdicion] = useState<Cliente | null>(null);
  const [showRemarketingModal, setShowRemarketingModal] = useState(false);
  const [clienteAEliminar, setClienteAEliminar] = useState<Cliente | null>(null);

  // Form State (New / Edit)
  const [docTipo, setDocTipo] = useState<'V-' | 'J-' | 'E-' | 'G-'>('V-');
  const [docNumero, setDocNumero] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [email, setEmail] = useState('');
  const [limiteCredito, setLimiteCredito] = useState('50');
  const [categoriaRemarketing, setCategoriaRemarketing] = useState<'Frecuente' | 'Mayorista' | 'Ocasional' | 'VIP'>('Frecuente');
  const [notas, setNotas] = useState('');

  // Remarketing Tool State
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<'oferta' | 'nuevo' | 'vip' | 'saludo'>('oferta');
  const [mensajeRemarketing, setMensajeRemarketing] = useState(
    `¡Hola {nombre}! En ${config.nombreBodega || 'nuestra tienda'} tenemos promociones y descuentos especiales esta semana. ¡Visítanos o escríbenos para hacer tu pedido!`
  );
  const [segmentoRemarketing, setSegmentoRemarketing] = useState<'Todos' | 'VIP' | 'Frecuente' | 'Mayorista'>('Todos');

  // Populate form for editing
  const handleOpenEditar = (cli: Cliente) => {
    setClienteEnEdicion(cli);
    const rif = cli.RIF_Cedula || '';
    if (rif.startsWith('J-') || rif.startsWith('E-') || rif.startsWith('G-')) {
      setDocTipo(rif.slice(0, 2) as any);
      setDocNumero(rif.slice(2));
    } else if (rif.startsWith('V-')) {
      setDocTipo('V-');
      setDocNumero(rif.slice(2));
    } else {
      setDocTipo('V-');
      setDocNumero(rif);
    }
    setNombre(cli.Nombre_Completo);
    setTelefono(cli.Telefono_WhatsApp === 'S/N' ? '' : cli.Telefono_WhatsApp);
    setDireccion(cli.Direccion || '');
    setEmail(cli.Email || '');
    setLimiteCredito(cli.Limite_Credito?.toString() || '50');
    setCategoriaRemarketing(cli.Categoria_Remarketing || 'Frecuente');
    setNotas(cli.Notas || '');
    setShowModalCrear(true);
  };

  const handleOpenCrear = () => {
    setClienteEnEdicion(null);
    setDocTipo('V-');
    setDocNumero('');
    setNombre('');
    setTelefono('');
    setDireccion('');
    setEmail('');
    setLimiteCredito('50');
    setCategoriaRemarketing('Frecuente');
    setNotas('');
    setShowModalCrear(true);
  };

  const handleGuardarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error('El nombre o razón social es obligatorio');
      return;
    }

    const rifFinal = docNumero.trim() ? `${docTipo}${docNumero.trim().toUpperCase()}` : undefined;
    const telFinal = telefono.trim() || 'S/N';
    const lim = parseFloat(limiteCredito.replace(/,/g, '.')) || 50;

    if (clienteEnEdicion && onEditarCliente) {
      const editado: Cliente = {
        ...clienteEnEdicion,
        Nombre_Completo: nombre.trim(),
        RIF_Cedula: rifFinal,
        Telefono_WhatsApp: telFinal,
        Direccion: direccion.trim() || undefined,
        Email: email.trim() || undefined,
        Limite_Credito: lim,
        Categoria_Remarketing: categoriaRemarketing,
        Notas: notas.trim() || undefined,
      };
      onEditarCliente(editado);
      toast.success(`Cliente "${editado.Nombre_Completo}" actualizado con éxito`);
    } else {
      const nuevoObj = {
        ID_Cliente: `CLI-${Date.now().toString().slice(-5)}`,
        Nombre_Completo: nombre.trim(),
        RIF_Cedula: rifFinal,
        Telefono_WhatsApp: telFinal,
        Direccion: direccion.trim() || undefined,
        Email: email.trim() || undefined,
        Limite_Credito: lim,
        Categoria_Remarketing: categoriaRemarketing,
        Notas: notas.trim() || undefined,
        Deuda_Total: 0,
        Estado_Credito: 'Al Día',
        Fecha_Registro: new Date().toLocaleDateString('es-VE'),
      };
      await onCrearCliente(nuevoObj);
      toast.success(`Cliente "${nombre.trim()}" registrado para facturación y ofertas`);
    }

    setShowModalCrear(false);
  };

  // KPIs
  const totalClientes = clientes.length;
  const clientesConWhatsApp = useMemo(() => {
    return clientes.filter(c => c.Telefono_WhatsApp && c.Telefono_WhatsApp !== 'S/N' && c.Telefono_WhatsApp.length >= 7).length;
  }, [clientes]);
  const clientesVIP = useMemo(() => {
    return clientes.filter(c => c.Categoria_Remarketing === 'VIP').length;
  }, [clientes]);
  const clientesConDeuda = useMemo(() => {
    return clientes.filter(c => (Number(c.Deuda_Total) || 0) > 0).length;
  }, [clientes]);

  // Filtered Clients
  const clientesFiltrados = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return clientes.filter(c => {
      // Search match
      const matchSearch = 
        !term ||
        c.Nombre_Completo.toLowerCase().includes(term) ||
        (c.RIF_Cedula && c.RIF_Cedula.toLowerCase().includes(term)) ||
        (c.Telefono_WhatsApp && c.Telefono_WhatsApp.toLowerCase().includes(term)) ||
        (c.Direccion && c.Direccion.toLowerCase().includes(term));

      if (!matchSearch) return false;

      // Category filter
      if (filterCategoria === 'VIP') return c.Categoria_Remarketing === 'VIP';
      if (filterCategoria === 'Frecuente') return c.Categoria_Remarketing === 'Frecuente';
      if (filterCategoria === 'Mayorista') return c.Categoria_Remarketing === 'Mayorista';
      if (filterCategoria === 'Ocasional') return c.Categoria_Remarketing === 'Ocasional';
      if (filterCategoria === 'ConDeuda') return (Number(c.Deuda_Total) || 0) > 0;

      return true;
    });
  }, [clientes, searchTerm, filterCategoria]);

  // Audience for Remarketing
  const audienciaRemarketing = useMemo(() => {
    return clientes.filter(c => {
      const tieneTelefono = c.Telefono_WhatsApp && c.Telefono_WhatsApp !== 'S/N' && c.Telefono_WhatsApp.length >= 7;
      if (!tieneTelefono) return false;
      if (segmentoRemarketing === 'Todos') return true;
      return c.Categoria_Remarketing === segmentoRemarketing;
    });
  }, [clientes, segmentoRemarketing]);

  // Template switch for Remarketing
  const handleSelectPlantilla = (tipo: 'oferta' | 'nuevo' | 'vip' | 'saludo') => {
    setPlantillaSeleccionada(tipo);
    const bodega = config.nombreBodega || 'nuestra tienda';
    if (tipo === 'oferta') {
      setMensajeRemarketing(
        `¡Hola {nombre}! 🎉 En ${bodega} tenemos super ofertas de la semana para ti. Ven y aprovecha los mejores precios a la tasa oficial. ¡Te esperamos!`
      );
    } else if (tipo === 'nuevo') {
      setMensajeRemarketing(
        `¡Hola {nombre}! 📦 Te avisamos que acaba de llegar nueva mercancía y reposición de inventario a ${bodega}. ¡Pregúntanos por la disponibilidad o pasa a visitarnos!`
      );
    } else if (tipo === 'vip') {
      setMensajeRemarketing(
        `¡Hola {nombre}! ⭐ Como eres uno de nuestros clientes preferenciales en ${bodega}, tenemos un descuento especial para ti en tu próxima compra. ¡Contáctanos para apartar tus productos!`
      );
    } else {
      setMensajeRemarketing(
        `¡Hola {nombre}! 👋 Te enviamos un cordial saludo de parte del equipo de ${bodega}. Estamos a tu orden con los mejores artículos y atención inmediata.`
      );
    }
  };

  // Open direct WhatsApp chat with client
  const handleEnviarWhatsAppCliente = (cli: Cliente, mensajePersonalizado?: string) => {
    if (!cli.Telefono_WhatsApp || cli.Telefono_WhatsApp === 'S/N') {
      toast.error(`El cliente ${cli.Nombre_Completo} no tiene un teléfono WhatsApp registrado`);
      return;
    }
    // Clean phone number (strip non-digits, ensure country code if Venezuelan 04xx)
    let raw = cli.Telefono_WhatsApp.replace(/\D/g, '');
    if (raw.startsWith('04')) {
      raw = '58' + raw.slice(1);
    } else if (raw.length === 10 && raw.startsWith('4')) {
      raw = '58' + raw;
    }

    const msg = (mensajePersonalizado || mensajeRemarketing)
      .replace(/{nombre}/g, cli.Nombre_Completo.split(' ')[0])
      .replace(/{negocio}/g, config.nombreBodega || 'nuestro negocio');

    const url = `https://api.whatsapp.com/send?phone=${raw}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0B0C0E] text-white overflow-hidden font-sans select-none">
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & METRICS BAR                                              */}
      {/* ========================================================================= */}
      <div className="p-3 sm:p-4 bg-[#111216] border-b border-[#D4AF37]/25 flex flex-col gap-3 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37]/25 to-[#D4AF37]/5 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              <Users size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white uppercase font-display tracking-wide">
                  Directorio de Clientes & Remarketing
                </h2>
                <span className="text-[10px] bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#FFF0BA] px-2 py-0.5 rounded-full font-mono font-bold">
                  {totalClientes} registrados
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Personalización fiscal SENIAT para Notas de Entrega y envío de promociones por WhatsApp.
              </p>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowRemarketingModal(true)}
              className="px-3 sm:px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-mono font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] cursor-pointer active:scale-95"
            >
              <MessageCircle size={15} />
              <span>Campaña Remarketing ({clientesConWhatsApp})</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCrear}
              className="px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-[#F5DA76] via-[#D4AF37] to-[#A88120] hover:brightness-110 text-black font-mono font-black text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(212,175,55,0.35)] cursor-pointer active:scale-95"
            >
              <UserPlus size={15} className="stroke-[2.5]" />
              <span>+ Nuevo Cliente</span>
            </button>
          </div>
        </div>

        {/* Mini KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono">
          <div className="p-2 sm:p-2.5 rounded-xl bg-black/40 border border-white/10 flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/15 text-blue-400">
              <Users size={16} />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase block">Total Clientes</span>
              <span className="text-sm sm:text-base font-black text-white">{totalClientes}</span>
            </div>
          </div>

          <div className="p-2 sm:p-2.5 rounded-xl bg-black/40 border border-emerald-500/25 flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400">
              <Phone size={16} />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase block">Con WhatsApp</span>
              <span className="text-sm sm:text-base font-black text-emerald-300">{clientesConWhatsApp}</span>
            </div>
          </div>

          <div className="p-2 sm:p-2.5 rounded-xl bg-black/40 border border-amber-500/25 flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400">
              <Star size={16} />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase block">Clientes VIP</span>
              <span className="text-sm sm:text-base font-black text-amber-300">{clientesVIP}</span>
            </div>
          </div>

          <div className="p-2 sm:p-2.5 rounded-xl bg-black/40 border border-purple-500/25 flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-500/15 text-purple-400">
              <TrendingUp size={16} />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase block">Con Saldo Fiado</span>
              <span className="text-sm sm:text-base font-black text-purple-300">{clientesConDeuda}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SEARCH & FILTER BAR                                                   */}
      {/* ========================================================================= */}
      <div className="p-3 bg-[#131418] border-b border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
          <input
            type="text"
            placeholder="Buscar por Nombre, C.I., RIF, Teléfono o Dirección..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/50 border border-white/15 focus:border-[#D4AF37] rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none font-mono placeholder:text-gray-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Categorías de Filtro */}
        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-0.5 text-xs font-mono">
          {(['Todos', 'VIP', 'Frecuente', 'Mayorista', 'Ocasional', 'ConDeuda'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategoria(cat)}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer shrink-0 border ${
                filterCategoria === cat
                  ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#FFF0BA] shadow-[0_0_10px_rgba(212,175,55,0.2)]'
                  : 'bg-black/40 border-white/10 text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {cat === 'ConDeuda' ? '⚠️ Con Deuda' : cat === 'VIP' ? '⭐ VIP' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CLIENT LIST / GRID VIEW                                               */}
      {/* ========================================================================= */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar">
        {clientesFiltrados.length === 0 ? (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 text-gray-500">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 mb-3">
              <Users size={32} />
            </div>
            <h3 className="text-base font-bold text-gray-300 uppercase font-display">
              {searchTerm ? 'No se encontraron clientes' : 'Aún no hay clientes registrados'}
            </h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm">
              {searchTerm 
                ? 'Prueba con otro término de búsqueda o limpia los filtros activos.'
                : 'Registra a tus clientes habituales para que sus Notas de Entrega salgan 100% personalizadas según el SENIAT y puedas enviarles ofertas por WhatsApp.'}
            </p>
            <button
              type="button"
              onClick={handleOpenCrear}
              className="mt-4 px-4 py-2 rounded-xl bg-[#D4AF37] text-black font-mono font-bold text-xs hover:brightness-110 cursor-pointer shadow-md"
            >
              + Registrar Primer Cliente
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {clientesFiltrados.map((cli) => {
              const tieneWhatsApp = cli.Telefono_WhatsApp && cli.Telefono_WhatsApp !== 'S/N' && cli.Telefono_WhatsApp.length >= 7;
              const tieneDeuda = (Number(cli.Deuda_Total) || 0) > 0;
              const categoria = cli.Categoria_Remarketing || 'Frecuente';

              return (
                <div
                  key={cli.ID_Cliente}
                  className="bg-[#14151B] border border-white/10 hover:border-[#D4AF37]/50 rounded-2xl p-3.5 flex flex-col justify-between gap-3 transition-all shadow-sm hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)] group"
                >
                  {/* Top: Name & Badges */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-sm sm:text-base text-white truncate leading-tight group-hover:text-[#FFF0BA] transition-colors">
                            {cli.Nombre_Completo}
                          </h4>
                          {/* Segment Badge */}
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold uppercase shrink-0 ${
                            categoria === 'VIP'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : categoria === 'Mayorista'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                              : categoria === 'Frecuente'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                              : 'bg-white/10 text-gray-300'
                          }`}>
                            {categoria === 'VIP' ? '⭐ VIP' : categoria}
                          </span>
                        </div>

                        {/* RIF / Cédula Fiscal */}
                        <div className="flex items-center gap-2 mt-1 font-mono text-xs">
                          <span className="text-[#D4AF37] font-bold">
                            {cli.RIF_Cedula || 'S/N (Consumidor Final)'}
                          </span>
                          <span className="text-gray-600">•</span>
                          <span className="text-gray-400 text-[11px] truncate">
                            ID: {cli.ID_Cliente}
                          </span>
                        </div>
                      </div>

                      {/* Deuda Status Badge */}
                      {tieneDeuda && (
                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded">
                            Debe: ${Number(cli.Deuda_Total).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Contact & Fiscal Details */}
                    <div className="mt-3 pt-2.5 border-t border-white/5 flex flex-col gap-1.5 text-xs font-mono text-gray-300">
                      {/* WhatsApp Phone */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-gray-400 truncate">
                          <Phone size={13} className={tieneWhatsApp ? 'text-emerald-400' : 'text-gray-500'} />
                          <span>{cli.Telefono_WhatsApp || 'Sin teléfono registrado'}</span>
                        </span>
                        {tieneWhatsApp && (
                          <button
                            type="button"
                            onClick={() => handleEnviarWhatsAppCliente(cli)}
                            className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            title="Enviar oferta o saludo por WhatsApp"
                          >
                            <MessageCircle size={12} />
                            <span>WhatsApp</span>
                          </button>
                        )}
                      </div>

                      {/* Fiscal Address */}
                      <div className="flex items-start gap-1.5 text-gray-400">
                        <MapPin size={13} className="text-[#D4AF37] shrink-0 mt-0.5" />
                        <span className="text-[11px] line-clamp-1 text-gray-300" title={cli.Direccion || 'Sin dirección fiscal registrada'}>
                          {cli.Direccion || 'Sin dirección fiscal registrada (se usa default SENIAT)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Action Buttons */}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-1.5">
                    {/* Botón Iniciar Venta en POS con este cliente */}
                    <button
                      type="button"
                      onClick={() => onIniciarVentaConCliente(cli)}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#F5DA76] to-[#D4AF37] hover:brightness-110 text-black font-mono font-black text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95"
                      title="Vender a este cliente en el POS para que la Nota de Entrega salga personalizada"
                    >
                      <ShoppingCart size={13} className="stroke-[2.5]" />
                      <span>Vender (POS)</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditar(cli)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        title="Editar datos del cliente"
                      >
                        <Edit3 size={15} />
                      </button>

                      {/* Delete Button */}
                      {onEliminarCliente && role === 'Administrador' && (
                        <button
                          type="button"
                          onClick={() => setClienteAEliminar(cli)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Eliminar cliente"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL: REGISTRAR / EDITAR CLIENTE (Con Datos SENIAT)                   */}
      {/* ========================================================================= */}
      {showModalCrear && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[#121318] border border-[#D4AF37]/40 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.9)] flex flex-col gap-4 text-white max-h-[92vh] overflow-y-auto custom-scrollbar">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white uppercase font-display tracking-wide">
                    {clienteEnEdicion ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
                  </h3>
                  <p className="text-xs text-gray-400">
                    Datos requeridos para Nota de Entrega SENIAT y Remarketing
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModalCrear(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGuardarCliente} className="flex flex-col gap-3.5 text-xs font-mono">
              
              {/* Nombre Completo / Razón Social */}
              <div>
                <label className="text-gray-300 font-bold block mb-1">
                  Nombre Completo / Razón Social: <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Inversiones La Central C.A. o María Delgado"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full bg-black/50 border border-white/15 focus:border-[#D4AF37] rounded-xl px-3 py-2 text-white text-xs outline-none font-sans"
                />
              </div>

              {/* Documento de Identidad / RIF Fiscal */}
              <div>
                <label className="text-gray-300 font-bold block mb-1">
                  Cédula de Identidad o RIF (Normativa SENIAT):
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={docTipo}
                    onChange={(e) => setDocTipo(e.target.value as any)}
                    className="bg-black/60 border border-white/15 focus:border-[#D4AF37] rounded-xl px-2.5 py-2 text-[#D4AF37] font-bold text-xs outline-none cursor-pointer"
                  >
                    <option value="V-">V- (Venezolano)</option>
                    <option value="J-">J- (Jurídico / Empresa)</option>
                    <option value="E-">E- (Extranjero)</option>
                    <option value="G-">G- (Gubernamental)</option>
                  </select>
                  <input
                    type="text"
                    placeholder="12345678 o 30123456-9"
                    value={docNumero}
                    onChange={(e) => setDocNumero(e.target.value)}
                    className="flex-1 bg-black/50 border border-white/15 focus:border-[#D4AF37] rounded-xl px-3 py-2 text-white text-xs outline-none uppercase font-bold"
                  />
                </div>
              </div>

              {/* Teléfono WhatsApp (Crucial para Remarketing) */}
              <div>
                <label className="text-gray-300 font-bold block mb-1 flex items-center justify-between">
                  <span>Teléfono WhatsApp (Para Ofertas y Contacto):</span>
                  <span className="text-[10px] text-emerald-400">📱 Clave Remarketing</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 text-gray-500" size={14} />
                  <input
                    type="text"
                    placeholder="+58 412 1234567 o 0414 9876543"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full bg-black/50 border border-white/15 focus:border-[#D4AF37] rounded-xl pl-9 pr-3 py-2 text-white text-xs outline-none"
                  />
                </div>
              </div>

              {/* Dirección o Domicilio Fiscal */}
              <div>
                <label className="text-gray-300 font-bold block mb-1">
                  Dirección o Domicilio Fiscal (Para Nota de Entrega):
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 text-gray-500" size={14} />
                  <input
                    type="text"
                    placeholder="Ej. Calle Principal, Local 4, Caracas"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    className="w-full bg-black/50 border border-white/15 focus:border-[#D4AF37] rounded-xl pl-9 pr-3 py-2 text-white text-xs outline-none font-sans"
                  />
                </div>
              </div>

              {/* Categoría de Remarketing & Límite de Crédito */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-gray-300 font-bold block mb-1">
                    Segmento Remarketing:
                  </label>
                  <select
                    value={categoriaRemarketing}
                    onChange={(e) => setCategoriaRemarketing(e.target.value as any)}
                    className="w-full bg-black/60 border border-white/15 focus:border-[#D4AF37] rounded-xl px-2.5 py-2 text-white text-xs outline-none cursor-pointer"
                  >
                    <option value="Frecuente">🔄 Cliente Frecuente</option>
                    <option value="VIP">⭐ Cliente VIP</option>
                    <option value="Mayorista">🏢 Mayorista / Comercio</option>
                    <option value="Ocasional">🛍️ Ocasional</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-300 font-bold block mb-1">
                    Límite Crédito (USD):
                  </label>
                  <input
                    type="number"
                    step="5"
                    min="0"
                    placeholder="50"
                    value={limiteCredito}
                    onChange={(e) => setLimiteCredito(e.target.value)}
                    className="w-full bg-black/50 border border-white/15 focus:border-[#D4AF37] rounded-xl px-3 py-2 text-white text-xs outline-none"
                  />
                </div>
              </div>

              {/* Notas opcionales */}
              <div>
                <label className="text-gray-300 font-bold block mb-1">
                  Notas u Observaciones (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Preferencias de productos, persona de contacto..."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className="w-full bg-black/50 border border-white/15 focus:border-[#D4AF37] rounded-xl px-3 py-2 text-white text-xs outline-none font-sans"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModalCrear(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#F5DA76] via-[#D4AF37] to-[#A88120] hover:brightness-110 text-black font-black cursor-pointer shadow-md"
                >
                  {clienteEnEdicion ? 'Actualizar Cliente' : 'Guardar Cliente'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: HERRAMIENTA DE CAMPAÑAS DE REMARKETING POR WHATSAPP             */}
      {/* ========================================================================= */}
      {showRemarketingModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[#111216] border border-emerald-500/40 rounded-2xl w-full max-w-2xl p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.9)] flex flex-col gap-4 text-white max-h-[92vh] overflow-y-auto custom-scrollbar">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
                  <MessageCircle size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white uppercase font-display tracking-wide">
                    Campañas de Remarketing por WhatsApp
                  </h3>
                  <p className="text-xs text-gray-400">
                    Envía promociones, ofertas y novedades directamente a tus clientes registrados.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRemarketingModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            {/* Plantillas de Campaña */}
            <div>
              <label className="text-xs font-bold text-gray-300 uppercase block mb-1.5 font-mono">
                1. Selecciona la Plantilla de Oferta:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => handleSelectPlantilla('oferta')}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    plantillaSeleccionada === 'oferta'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  🎉 Super Oferta
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPlantilla('nuevo')}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    plantillaSeleccionada === 'nuevo'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  📦 Nueva Mercancía
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPlantilla('vip')}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    plantillaSeleccionada === 'vip'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  ⭐ Descuento VIP
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPlantilla('saludo')}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    plantillaSeleccionada === 'saludo'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  👋 Saludo & Precios
                </button>
              </div>
            </div>

            {/* Mensaje Personalizable */}
            <div>
              <div className="flex items-center justify-between mb-1.5 text-xs font-mono">
                <label className="text-gray-300 font-bold uppercase">
                  2. Personaliza el Mensaje:
                </label>
                <span className="text-[10px] text-gray-400">
                  Usa <strong className="text-emerald-400">{'{nombre}'}</strong> para personalizar
                </span>
              </div>
              <textarea
                rows={3}
                value={mensajeRemarketing}
                onChange={(e) => setMensajeRemarketing(e.target.value)}
                className="w-full bg-black/50 border border-white/15 focus:border-emerald-500 rounded-xl p-3 text-xs text-white outline-none font-sans leading-relaxed"
              />
            </div>

            {/* Segmento de Destinatarios */}
            <div className="flex items-center justify-between gap-2 p-3 bg-black/40 rounded-xl border border-white/10 font-mono text-xs">
              <span className="text-gray-300 font-bold">Enviar a segmento:</span>
              <div className="flex items-center gap-1">
                {(['Todos', 'VIP', 'Frecuente', 'Mayorista'] as const).map((seg) => (
                  <button
                    key={seg}
                    type="button"
                    onClick={() => setSegmentoRemarketing(seg)}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      segmentoRemarketing === seg
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {seg}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista de Clientes en la Audiencia */}
            <div>
              <div className="flex items-center justify-between mb-2 text-xs font-mono">
                <span className="text-gray-400">
                  Destinatarios con WhatsApp ({audienciaRemarketing.length} clientes):
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(mensajeRemarketing);
                    toast.success('Mensaje copiado al portapapeles');
                  }}
                  className="text-gray-400 hover:text-white flex items-center gap-1 text-[11px]"
                >
                  <Copy size={12} />
                  <span>Copiar mensaje</span>
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                {audienciaRemarketing.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">
                    No hay clientes con teléfono WhatsApp registrado en este segmento.
                  </p>
                ) : (
                  audienciaRemarketing.map((cli) => (
                    <div
                      key={cli.ID_Cliente}
                      className="flex items-center justify-between p-2 rounded-xl bg-black/30 border border-white/5 hover:border-white/20 text-xs font-mono"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white truncate">{cli.Nombre_Completo}</div>
                        <div className="text-[10px] text-gray-400 flex items-center gap-2">
                          <span>{cli.Telefono_WhatsApp}</span>
                          <span>•</span>
                          <span className="text-emerald-400 font-bold">{cli.Categoria_Remarketing || 'Frecuente'}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleEnviarWhatsAppCliente(cli)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 shrink-0"
                      >
                        <Send size={12} />
                        <span>Enviar</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setShowRemarketingModal(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono font-bold text-xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Confirmation Modal to Delete Client */}
      {clienteAEliminar && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#18191E] border border-red-500/40 rounded-2xl w-full max-w-sm p-5 text-white text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
              <Trash2 size={22} />
            </div>
            <h3 className="text-base font-bold uppercase">¿Eliminar Cliente?</h3>
            <p className="text-xs text-gray-400">
              ¿Estás seguro de que deseas eliminar a <strong>{clienteAEliminar.Nombre_Completo}</strong>? Sus registros históricos de compras se mantendrán en el sistema.
            </p>
            <div className="flex w-full gap-2 pt-2">
              <button
                type="button"
                onClick={() => setClienteAEliminar(null)}
                className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/15 font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onEliminarCliente) onEliminarCliente(clienteAEliminar.ID_Cliente);
                  setClienteAEliminar(null);
                  toast.success('Cliente eliminado');
                }}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 font-bold text-xs cursor-pointer shadow-md"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
