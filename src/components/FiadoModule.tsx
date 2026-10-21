import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, PlusCircle, CheckCircle2, Phone, Clock, FileText, 
  ChevronDown, Wallet, UserPlus, FileSearch, Smartphone, Copy, Check, Calendar, Filter, Camera, X, ImageIcon,
  Truck, Building2, MessageCircle, DollarSign, Edit, Trash2, Plus, ExternalLink, AlertCircle, FilePlus, Receipt, Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Cliente, ConfiguracionApp, Abono, Gasto, VentaMaestro, Proveedor } from '../types/schema';
import { formatUSD, formatLocal, generateWhatsAppCobroLink, calcularDiasVencimiento, InfoVencimientoDeuda } from '../utils/formatters';
import { useNativeBackHandler } from '../utils/nativeNavigation';

const CATEGORIAS_PROVEEDOR = [
  'Víveres y Alimentos',
  'Bebidas y Refrescos',
  'Carnicería y Embutidos',
  'Lácteos y Quesos',
  'Frutas y Verduras',
  'Panadería y Harinas',
  'Desechables y Empaques',
  'Limpieza y Mantenimiento',
  'Golosinas y Snacks',
  'Servicios y Otros',
];

interface FiadoModuleProps {
  clientes: Cliente[];
  abonos: Abono[];
  gastos: Gasto[];
  proveedores?: Proveedor[];
  ventas: VentaMaestro[];
  config: ConfiguracionApp;
  onRegistrarAbono: (clienteId: string, montoUSD: number, metodoPago: 'Efectivo' | 'Pago Móvil' | 'Divisa', comprobanteRef?: string) => void;
  onCrearCliente: (cliente: Partial<Cliente>) => void;
  onCargarDeudaCliente?: (clienteId: string, montoUSD: number, concepto?: string) => void;
  onRegistrarGasto: (gasto: Gasto) => void;
  onCrearProveedor?: (proveedor: Partial<Proveedor>) => void;
  onEditarProveedor?: (proveedor: Proveedor) => void;
  onEliminarProveedor?: (idProveedor: string) => void;
  onEditarCliente?: (clienteEditado: Cliente) => void;
  onEliminarCliente?: (idCliente: string) => void;
  initialTab?: 'deudores' | 'proveedores' | 'gastos';
  role?: 'Administrador' | 'Cajero';
}

const soundEffects = {
  playCashRegisterChime: () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
      oscillator.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.error("Audio not supported or blocked");
    }
  }
};

export const FiadoModule: React.FC<FiadoModuleProps> = ({ 
  clientes, 
  abonos, 
  gastos, 
  proveedores = [], 
  ventas, 
  config, 
  onRegistrarAbono, 
  onCrearCliente, 
  onCargarDeudaCliente,
  onRegistrarGasto, 
  onCrearProveedor,
  onEditarProveedor,
  onEliminarProveedor,
  initialTab = 'deudores', 
  onEditarCliente, 
  onEliminarCliente, 
  role = 'Administrador' 
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'deudores' | 'proveedores' | 'gastos'>(initialTab);
  
  React.useEffect(() => {
    if (initialTab) setActiveSubTab(initialTab);
  }, [initialTab]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  const [selectedClienteForAbono, setSelectedClienteForAbono] = useState<Cliente | null>(null);
  const [expandedClienteId, setExpandedClienteId] = useState<string | null>(null);
  
  const [montoAbonoInput, setMontoAbonoInput] = useState('');
  const [monedaAbono, setMonedaAbono] = useState<'USD' | 'BS'>('USD');
  const [metodoAbono, setMetodoAbono] = useState<'Efectivo' | 'Pago Móvil' | 'Divisa'>('Efectivo');
  const [comprobanteRef, setComprobanteRef] = useState('');
  const [showNuevoClienteModal, setShowNuevoClienteModal] = useState(false);
  const [copiedLinkIndex, setCopiedLinkIndex] = useState<string | null>(null);

  // Cargar Deuda / Nuevo Fiado a Cliente
  const [selectedClienteForCargarDeuda, setSelectedClienteForCargarDeuda] = useState<Cliente | null>(null);
  const [cargarDeudaMonto, setCargarDeudaMonto] = useState('');
  const [cargarDeudaMoneda, setCargarDeudaMoneda] = useState<'USD' | 'BS'>('USD');
  const [cargarDeudaConcepto, setCargarDeudaConcepto] = useState('');

  // Editar Cliente
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editTelefono, setEditTelefono] = useState('');
  const [editLimite, setEditLimite] = useState('');
  const [editDeuda, setEditDeuda] = useState('');
  const [editDiasCredito, setEditDiasCredito] = useState('7');
  const [editNotas, setEditNotas] = useState('');

  // New Client Form state
  const [newNombre, setNewNombre] = useState('');
  const [newTelefono, setNewTelefono] = useState('');
  const [newLimite, setNewLimite] = useState('30.00');
  const [newDiasCredito, setNewDiasCredito] = useState('7');
  const [newNotas, setNewNotas] = useState('');
  const [newDeuda, setNewDeuda] = useState('');
  const [newDeglose, setNewDeglose] = useState('');

  // Gastos Form state
  const [showNuevoGastoModal, setShowNuevoGastoModal] = useState(false);
  const [gastoDesc, setGastoDesc] = useState('');
  const [gastoMonto, setGastoMonto] = useState('');
  const [gastoCat, setGastoCat] = useState<'Inventario' | 'Servicios' | 'Personal' | 'Mantenimiento' | 'Otros'>('Otros');
  const [gastoMetodo, setGastoMetodo] = useState<'Efectivo' | 'Pago Móvil' | 'Divisa'>('Efectivo');
  const [gastoEntidad, setGastoEntidad] = useState('');
  const [gastoRecibo, setGastoRecibo] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Proveedores State
  const [internalProveedores, setInternalProveedores] = useState<Proveedor[]>(() => {
    if (proveedores && proveedores.length > 0) {
      return proveedores.filter(p => !['PROV-001', 'PROV-002', 'PROV-003'].includes(p.ID_Proveedor));
    }
    const saved = localStorage.getItem('bodeguero_proveedores_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((p: any) => !['PROV-001', 'PROV-002', 'PROV-003'].includes(p.ID_Proveedor));
        }
      } catch {}
    }
    return [];
  });

  useEffect(() => {
    if (proveedores && proveedores.length > 0) {
      setInternalProveedores(proveedores);
    }
  }, [proveedores]);

  useEffect(() => {
    localStorage.setItem('bodeguero_proveedores_v1', JSON.stringify(internalProveedores));
  }, [internalProveedores]);

  const [searchQueryProv, setSearchQueryProv] = useState('');
  const [filtroCategoriaProv, setFiltroCategoriaProv] = useState<string>('Todos');
  const [showNuevoProveedorModal, setShowNuevoProveedorModal] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null);
  const [selectedProveedorForPago, setSelectedProveedorForPago] = useState<Proveedor | null>(null);
  const [selectedProveedorForFactura, setSelectedProveedorForFactura] = useState<Proveedor | null>(null);

  // Form State for Nuevo / Editar Proveedor
  const [provNombre, setProvNombre] = useState('');
  const [provContacto, setProvContacto] = useState('');
  const [provTelefono, setProvTelefono] = useState('');
  const [provRif, setProvRif] = useState('');
  const [provCategoria, setProvCategoria] = useState('Víveres y Alimentos');
  const [provDias, setProvDias] = useState('');
  const [provSaldo, setProvSaldo] = useState('0.00');
  const [provDireccion, setProvDireccion] = useState('');
  const [provNotas, setProvNotas] = useState('');

  // Form State for Pago Proveedor
  const [pagoProvMonto, setPagoProvMonto] = useState('');
  const [pagoProvMetodo, setPagoProvMetodo] = useState<'Efectivo' | 'Pago Móvil' | 'Divisa'>('Efectivo');
  const [pagoProvRef, setPagoProvRef] = useState('');
  const [crearGastoAuto, setCrearGastoAuto] = useState(true);

  // Form State for Cargar Factura Proveedor
  const [facturaProvMonto, setFacturaProvMonto] = useState('');
  const [facturaProvDetalle, setFacturaProvDetalle] = useState('');

  // Native Mobile Back Button Support
  useNativeBackHandler(showNuevoClienteModal, () => setShowNuevoClienteModal(false), 'fiado_nuevo_cliente');
  useNativeBackHandler(showNuevoGastoModal, () => setShowNuevoGastoModal(false), 'fiado_nuevo_gasto');
  useNativeBackHandler(!!selectedClienteForAbono, () => setSelectedClienteForAbono(null), 'fiado_abono');
  useNativeBackHandler(!!selectedClienteForCargarDeuda, () => setSelectedClienteForCargarDeuda(null), 'fiado_cargar_deuda');
  useNativeBackHandler(!!editingCliente, () => setEditingCliente(null), 'fiado_editar_cliente');
  useNativeBackHandler(showNuevoProveedorModal, () => setShowNuevoProveedorModal(false), 'fiado_nuevo_proveedor');
  useNativeBackHandler(!!editingProveedor, () => setEditingProveedor(null), 'fiado_editar_proveedor');
  useNativeBackHandler(!!selectedProveedorForPago, () => setSelectedProveedorForPago(null), 'fiado_pago_proveedor');
  useNativeBackHandler(!!selectedProveedorForFactura, () => setSelectedProveedorForFactura(null), 'fiado_factura_proveedor');

  const filteredClientes = useMemo(() => {
    let result = clientes;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.Nombre_Completo.toLowerCase().includes(q) || 
        c.Telefono_WhatsApp.includes(q)
      );
    }

    if (activeFilters.length > 0) {
      result = result.filter(c => activeFilters.includes(c.Estado_Credito));
    }

    // Default sort: highest debt first
    return result.sort((a, b) => b.Deuda_Total - a.Deuda_Total);
  }, [clientes, searchQuery, activeFilters]);

  const totalCuentasPorCobrarUSD = useMemo(() => {
    return clientes.reduce((sum, c) => sum + (Number(c.Deuda_Total) || 0), 0);
  }, [clientes]);

  const clientesConDeudaCount = useMemo(() => {
    return clientes.filter(c => (Number(c.Deuda_Total) || 0) > 0).length;
  }, [clientes]);

  const toggleFilter = (filter: string) => {
    setActiveFilters(prev => 
      prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    );
  };

  const handleConfirmAbono = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClienteForAbono) return;

    if (selectedClienteForAbono.Deuda_Total <= 0) {
      toast.error('Este cliente no posee deuda pendiente que abonar.');
      return;
    }

    let parsedMonto = parseFloat(montoAbonoInput.replace(/,/g, '.').replace(/[^0-9.]/g, ''));
    if (isNaN(parsedMonto) || parsedMonto <= 0) {
      toast.error('Ingrese un monto válido a abonar');
      return;
    }

    if (monedaAbono === 'BS') {
      parsedMonto = parsedMonto / (config.tasaCambioUSD || 1);
    }

    if (parsedMonto > selectedClienteForAbono.Deuda_Total) {
      parsedMonto = selectedClienteForAbono.Deuda_Total; 
    }

    onRegistrarAbono(
      selectedClienteForAbono.ID_Cliente,
      parsedMonto,
      metodoAbono,
      comprobanteRef
    );

    soundEffects.playCashRegisterChime();
    setSelectedClienteForAbono(null);
    setMontoAbonoInput('');
    setComprobanteRef('');
  };

  const handleCreateNewClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNombre.trim() || !newTelefono.trim()) {
      toast.error('Nombre y teléfono son obligatorios');
      return;
    }

    const parsedDeuda = parseFloat(newDeuda.replace(/,/g, '.').replace(/[^0-9.]/g, '')) || 0;
    const parsedLimite = parseFloat(newLimite.replace(/,/g, '.').replace(/[^0-9.]/g, '')) || 30;
    const parsedDiasCredito = parseInt(newDiasCredito) || 7;

    onCrearCliente({
      Nombre_Completo: newNombre.trim(),
      Telefono_WhatsApp: newTelefono.trim(),
      Limite_Credito: parsedLimite,
      Dias_Credito: parsedDiasCredito,
      Notas: newNotas.trim(),
      Deuda_Inicial: parsedDeuda,
      Deuda_Total: parsedDeuda,
      Deglose: newDeglose.trim()
    } as any);

    soundEffects.playCashRegisterChime();
    setShowNuevoClienteModal(false);
    setNewNombre('');
    setNewTelefono('');
    setNewLimite('30.00');
    setNewDiasCredito('7');
    setNewNotas('');
    setNewDeuda('');
    setNewDeglose('');
  };

  const handleCargarDeudaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClienteForCargarDeuda) return;
    
    let monto = parseFloat(cargarDeudaMonto.replace(/,/g, '.').replace(/[^0-9.]/g, '')) || 0;
    if (monto <= 0) {
      toast.error('Ingrese un monto válido mayor a 0');
      return;
    }

    if (cargarDeudaMoneda === 'BS') {
      monto = monto / (config.tasaCambioUSD || 1);
    }

    if (onCargarDeudaCliente) {
      onCargarDeudaCliente(selectedClienteForCargarDeuda.ID_Cliente, monto, cargarDeudaConcepto.trim());
    } else if (onEditarCliente) {
      const nuevaDeuda = (Number(selectedClienteForCargarDeuda.Deuda_Total) || 0) + monto;
      const nuevoEstado =
        nuevaDeuda >= selectedClienteForCargarDeuda.Limite_Credito
          ? 'Bloqueado'
          : nuevaDeuda >= selectedClienteForCargarDeuda.Limite_Credito * 0.8
          ? 'Cerca del Límite'
          : 'Crédito Activo';

      onEditarCliente({
        ...selectedClienteForCargarDeuda,
        Deuda_Total: nuevaDeuda,
        Estado_Credito: nuevoEstado,
        Ultimo_Movimiento: 'Fiado: Hoy, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      toast.success(`Fiado de $${monto.toFixed(2)} cargado a ${selectedClienteForCargarDeuda.Nombre_Completo}`);
    }

    soundEffects.playCashRegisterChime();
    setSelectedClienteForCargarDeuda(null);
    setCargarDeudaMonto('');
    setCargarDeudaConcepto('');
  };

  const handleEditarClienteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCliente || !onEditarCliente) return;

    const deudaParsed = parseFloat(editDeuda.replace(/,/g, '.').replace(/[^0-9.]/g, '')) || 0;
    const limiteParsed = parseFloat(editLimite.replace(/,/g, '.').replace(/[^0-9.]/g, '')) || 30;
    const diasCreditoParsed = parseInt(editDiasCredito) || 7;

    const nuevoEstado =
      deudaParsed > 0
        ? deudaParsed >= limiteParsed
          ? 'Bloqueado'
          : deudaParsed >= limiteParsed * 0.8
          ? 'Cerca del Límite'
          : 'Crédito Activo'
        : 'Al Día';

    onEditarCliente({
      ...editingCliente,
      Nombre_Completo: editNombre.trim(),
      Telefono_WhatsApp: editTelefono.trim(),
      Limite_Credito: limiteParsed,
      Deuda_Total: deudaParsed,
      Dias_Credito: diasCreditoParsed,
      Estado_Credito: nuevoEstado,
      Notas: editNotas.trim(),
      Ultimo_Movimiento: 'Ajustado hoy',
    });

    toast.success(`Cliente ${editNombre.trim()} actualizado`);
    setEditingCliente(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 800;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.5); // high compression
          setGastoRecibo(dataUrl);
        }
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateGasto = (e: React.FormEvent) => {
    e.preventDefault();
    const monto = parseFloat(gastoMonto);
    if (!gastoDesc.trim() || isNaN(monto) || monto <= 0) return;

    const nuevoGasto: Gasto = {
      ID_Gasto: `GST-${Date.now().toString().slice(-6)}`,
      Fecha_Hora: new Date().toISOString().replace('T', ' ').slice(0, 19),
      Descripcion: gastoDesc.trim(),
      Entidad: gastoEntidad.trim(),
      Monto_USD: monto,
      Monto_Moneda_Local: monto * config.tasaCambioUSD,
      Categoria: gastoCat,
      ID_Usuario: 'USR-001',
      Metodo_Pago: gastoMetodo,
      Recibo_Base64: gastoRecibo || undefined
    };

    onRegistrarGasto(nuevoGasto);
    setShowNuevoGastoModal(false);
    setGastoDesc('');
    setGastoMonto('');
    setGastoCat('Otros');
    setGastoMetodo('Efectivo');
    setGastoEntidad('');
    setGastoRecibo(null);
  };

  const toggleExpanded = (id: string) => {
    setExpandedClienteId(prev => prev === id ? null : id);
  };

  const handleAbrirWhatsAppCobro = (cliente: Cliente) => {
    if (!cliente.Telefono_WhatsApp || !cliente.Telefono_WhatsApp.trim()) {
      toast.error('Este cliente no posee número de teléfono registrado');
      return;
    }
    const diasInfo = calcularDiasVencimiento(cliente, ventas);
    const link = generateWhatsAppCobroLink(cliente, config, diasInfo);
    window.open(link, '_blank');
    toast.success(`Abriendo WhatsApp de cobranza para ${cliente.Nombre_Completo}`, { icon: '💬' });
  };

  const handleCopyWhatsAppText = (cliente: Cliente) => {
    const diasInfo = calcularDiasVencimiento(cliente, ventas);
    const link = generateWhatsAppCobroLink(cliente, config, diasInfo);
    try {
      const url = new URL(link);
      const text = url.searchParams.get('text') || link;
      navigator.clipboard?.writeText(text);
    } catch {
      navigator.clipboard?.writeText(link);
    }
    setCopiedLinkIndex(cliente.ID_Cliente);
    toast.success('Mensaje de cobranza copiado al portapapeles', { icon: '📋' });
    setTimeout(() => setCopiedLinkIndex(null), 2000);
  };

  // Proveedores Handlers
  const resetProvForm = () => {
    setProvNombre('');
    setProvContacto('');
    setProvTelefono('');
    setProvRif('');
    setProvCategoria('Víveres y Alimentos');
    setProvDias('');
    setProvSaldo('0.00');
    setProvDireccion('');
    setProvNotas('');
  };

  const handleCrearProveedorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!provNombre.trim()) return;

    const saldo = parseFloat(provSaldo) || 0;
    const nuevo: Proveedor = {
      ID_Proveedor: `PROV-${Date.now().toString().slice(-6)}`,
      Nombre_Empresa: provNombre.trim(),
      Contacto_Nombre: provContacto.trim() || undefined,
      Telefono_WhatsApp: provTelefono.trim(),
      RIF: provRif.trim() || undefined,
      Categoria_Rubro: provCategoria || 'Víveres y Alimentos',
      Dias_Visita: provDias.trim() || undefined,
      Saldo_Pendiente: saldo,
      Direccion: provDireccion.trim() || undefined,
      Notas: provNotas.trim() || undefined,
      Fecha_Registro: new Date().toLocaleDateString('es-VE'),
    };

    if (onCrearProveedor) {
      onCrearProveedor(nuevo);
    }
    setInternalProveedores(prev => [nuevo, ...prev]);
    setShowNuevoProveedorModal(false);
    resetProvForm();
    soundEffects.playCashRegisterChime();
  };

  const handleOpenEditarProveedor = (prov: Proveedor) => {
    setEditingProveedor(prov);
    setProvNombre(prov.Nombre_Empresa);
    setProvContacto(prov.Contacto_Nombre || '');
    setProvTelefono(prov.Telefono_WhatsApp);
    setProvRif(prov.RIF || '');
    setProvCategoria(prov.Categoria_Rubro || 'Víveres y Alimentos');
    setProvDias(prov.Dias_Visita || '');
    setProvSaldo(prov.Saldo_Pendiente ? prov.Saldo_Pendiente.toString() : '0.00');
    setProvDireccion(prov.Direccion || '');
    setProvNotas(prov.Notas || '');
  };

  const handleEditarProveedorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProveedor || !provNombre.trim()) return;

    const editado: Proveedor = {
      ...editingProveedor,
      Nombre_Empresa: provNombre.trim(),
      Contacto_Nombre: provContacto.trim() || undefined,
      Telefono_WhatsApp: provTelefono.trim(),
      RIF: provRif.trim() || undefined,
      Categoria_Rubro: provCategoria || 'Víveres y Alimentos',
      Dias_Visita: provDias.trim() || undefined,
      Direccion: provDireccion.trim() || undefined,
      Notas: provNotas.trim() || undefined,
    };

    if (onEditarProveedor) {
      onEditarProveedor(editado);
    }
    setInternalProveedores(prev => prev.map(p => p.ID_Proveedor === editado.ID_Proveedor ? editado : p));
    setEditingProveedor(null);
    resetProvForm();
  };

  const handleEliminarProveedorClick = (id: string, nombre: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar al proveedor "${nombre}"?`)) {
      if (onEliminarProveedor) {
        onEliminarProveedor(id);
      }
      setInternalProveedores(prev => prev.filter(p => p.ID_Proveedor !== id));
    }
  };

  const handleWhatsAppProveedor = (proveedor: Proveedor) => {
    const cleanPhone = proveedor.Telefono_WhatsApp.replace(/[^\d+]/g, '');
    const nombreNegocio = config.nombreBodega || 'nuestro negocio';
    const texto = encodeURIComponent(
      `Hola ${proveedor.Contacto_Nombre || proveedor.Nombre_Empresa}, te escribo desde ${nombreNegocio}. Quisiera consultar disponibilidad y precios para nuestro próximo pedido.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${texto}`, '_blank');
  };

  const handlePagarProveedorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProveedorForPago) return;
    const monto = parseFloat(pagoProvMonto);
    if (isNaN(monto) || monto <= 0) return;

    const nuevoSaldo = Math.max(0, (selectedProveedorForPago.Saldo_Pendiente || 0) - monto);
    const provActualizado = { ...selectedProveedorForPago, Saldo_Pendiente: nuevoSaldo };

    if (onEditarProveedor) {
      onEditarProveedor(provActualizado);
    }
    setInternalProveedores(prev => prev.map(p => p.ID_Proveedor === provActualizado.ID_Proveedor ? provActualizado : p));

    if (crearGastoAuto) {
      const nuevoGasto: Gasto = {
        ID_Gasto: `GST-${Date.now().toString().slice(-6)}`,
        Fecha_Hora: new Date().toISOString().replace('T', ' ').slice(0, 19),
        Descripcion: `Pago a proveedor: ${selectedProveedorForPago.Nombre_Empresa}${pagoProvRef ? ` (Ref: ${pagoProvRef})` : ''}`,
        Entidad: selectedProveedorForPago.Nombre_Empresa,
        Monto_USD: monto,
        Monto_Moneda_Local: monto * config.tasaCambioUSD,
        Categoria: 'Inventario',
        ID_Usuario: 'USR-001',
        Metodo_Pago: pagoProvMetodo,
      };
      onRegistrarGasto(nuevoGasto);
    }

    setSelectedProveedorForPago(null);
    setPagoProvMonto('');
    setPagoProvRef('');
    soundEffects.playCashRegisterChime();
  };

  const handleFacturaProveedorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProveedorForFactura) return;
    const monto = parseFloat(facturaProvMonto);
    if (isNaN(monto) || monto <= 0) return;

    const nuevoSaldo = (selectedProveedorForFactura.Saldo_Pendiente || 0) + monto;
    const provActualizado = { 
      ...selectedProveedorForFactura, 
      Saldo_Pendiente: nuevoSaldo,
      Notas: facturaProvDetalle ? `${selectedProveedorForFactura.Notas ? selectedProveedorForFactura.Notas + ' | ' : ''}Factura: ${facturaProvDetalle}` : selectedProveedorForFactura.Notas
    };

    if (onEditarProveedor) {
      onEditarProveedor(provActualizado);
    }
    setInternalProveedores(prev => prev.map(p => p.ID_Proveedor === provActualizado.ID_Proveedor ? provActualizado : p));

    setSelectedProveedorForFactura(null);
    setFacturaProvMonto('');
    setFacturaProvDetalle('');
  };

  const filteredProveedores = useMemo(() => {
    let result = internalProveedores;
    if (searchQueryProv.trim()) {
      const q = searchQueryProv.toLowerCase();
      result = result.filter(p => 
        p.Nombre_Empresa.toLowerCase().includes(q) ||
        (p.Contacto_Nombre && p.Contacto_Nombre.toLowerCase().includes(q)) ||
        p.Telefono_WhatsApp.includes(q) ||
        (p.RIF && p.RIF.toLowerCase().includes(q)) ||
        (p.Categoria_Rubro && p.Categoria_Rubro.toLowerCase().includes(q))
      );
    }
    if (filtroCategoriaProv !== 'Todos') {
      result = result.filter(p => p.Categoria_Rubro === filtroCategoriaProv);
    }
    return result.sort((a, b) => (b.Saldo_Pendiente || 0) - (a.Saldo_Pendiente || 0));
  }, [internalProveedores, searchQueryProv, filtroCategoriaProv]);

  const totalCuentasPorPagarUSD = useMemo(() => {
    return internalProveedores.reduce((sum, p) => sum + (Number(p.Saldo_Pendiente) || 0), 0);
  }, [internalProveedores]);

  const proveedoresConDeudaCount = useMemo(() => {
    return internalProveedores.filter(p => (Number(p.Saldo_Pendiente) || 0) > 0).length;
  }, [internalProveedores]);

  return (
    <div className="flex flex-col h-full bg-[#090A0D] text-white">
      {/* Sub Tab Navigation */}
      <div className="flex px-3 pt-2.5 bg-[#0D0E12] gap-2 border-b border-[#232530]">
        <button
          onClick={() => setActiveSubTab('deudores')}
          className={`flex-1 py-2.5 text-[11px] font-black uppercase transition-all tracking-wider flex items-center justify-center gap-2 rounded-t-xl ${
            activeSubTab === 'deudores'
              ? 'bg-gradient-to-t from-[#D4AF37]/20 to-transparent border-b-2 border-[#D4AF37] text-[#F5DA76] shadow-[0_2px_10px_rgba(212,175,55,0.15)]'
              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
          }`}
        >
          <Users size={15} className={activeSubTab === 'deudores' ? 'text-[#D4AF37]' : 'text-gray-400'} />
          <span>Cuentas por Cobrar</span>
        </button>
        {role === 'Administrador' && (
          <button
            onClick={() => setActiveSubTab('proveedores')}
            className={`flex-1 py-2.5 text-[11px] font-black uppercase transition-all tracking-wider flex items-center justify-center gap-2 rounded-t-xl ${
              activeSubTab === 'proveedores'
                ? 'bg-gradient-to-t from-[#D4AF37]/20 to-transparent border-b-2 border-[#D4AF37] text-[#F5DA76] shadow-[0_2px_10px_rgba(212,175,55,0.15)]'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <Truck size={15} className={activeSubTab === 'proveedores' ? 'text-[#D4AF37]' : 'text-gray-400'} />
            <span>Proveedores</span>
          </button>
        )}
        {role === 'Administrador' && (
          <button
            onClick={() => setActiveSubTab('gastos')}
            className={`flex-1 py-2.5 text-[11px] font-black uppercase transition-all tracking-wider flex items-center justify-center gap-2 rounded-t-xl ${
              activeSubTab === 'gastos'
                ? 'bg-gradient-to-t from-[#D4AF37]/20 to-transparent border-b-2 border-[#D4AF37] text-[#F5DA76] shadow-[0_2px_10px_rgba(212,175,55,0.15)]'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <Receipt size={15} className={activeSubTab === 'gastos' ? 'text-[#D4AF37]' : 'text-gray-400'} />
            <span>Gastos</span>
          </button>
        )}
      </div>

      {activeSubTab === 'deudores' && (
        <div className="flex flex-col flex-1 overflow-hidden bg-[#090A0D]">
          <div className="p-3 bg-[#0D0E12] border-b border-[#232530] space-y-2.5">
            <div className="flex items-center justify-end">
              <button
                id="btn-nuevo-deudor"
                onClick={() => setShowNuevoClienteModal(true)}
                className="gold-gradient-btn text-black font-extrabold rounded-xl py-2.5 px-4 text-xs w-full uppercase tracking-wider shadow-[0_4px_15px_rgba(212,175,55,0.25)] flex items-center justify-center gap-2"
              >
                <UserPlus size={16} />
                <span>Nuevo Deudor</span>
              </button>
            </div>
            
            <div className="bg-[#111216] border border-[#D4AF37]/30 rounded-2xl p-3.5 flex items-center justify-between font-mono shadow-lg relative overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#D4AF37]/5 to-transparent pointer-events-none" />
              <div>
                <div className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest font-sans flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse"></span>
                  Total Cuentas por Cobrar
                </div>
                <div className="text-3xl font-extrabold text-white tracking-wider mt-0.5">
                  {formatUSD(totalCuentasPorCobrarUSD)}
                </div>
                <div className="text-xs font-semibold text-[#D4AF37]/80 tracking-wide mt-0.5">
                  {formatLocal(totalCuentasPorCobrarUSD, config.tasaCambioUSD, config.simboloMonedaLocal)}
                </div>
              </div>
              <div className="text-right z-10">
                <div className="text-[10px] font-bold text-[#F5DA76] bg-[#D4AF37]/15 px-3 py-1.5 rounded-xl border border-[#D4AF37]/30 shadow-sm">
                  {clientesConDeudaCount} {clientesConDeudaCount === 1 ? 'DEUDOR ACTIVO' : 'DEUDORES ACTIVOS'}
                </div>
              </div>
            </div>

            {/* Search Input for Deudores */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar cliente por nombre o teléfono..."
                className="w-full bg-[#111216] border border-[#232530] focus:border-[#D4AF37] rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-gray-500 outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto pb-6 custom-scrollbar p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredClientes.map((cliente, index) => {
              const diasInfo = calcularDiasVencimiento(cliente, ventas);
              const clientVentas = ventas.filter(v => v.ID_Cliente === cliente.ID_Cliente && (v.Metodo_Pago === 'Fiado' || (v.Monto_Credito && v.Monto_Credito > 0)));
              const clientAbonos = abonos.filter(a => a.ID_Cliente === cliente.ID_Cliente);
              
              return (
                <div key={`${cliente.ID_Cliente}-${index}`} className="bg-[#111216] border border-[#232530] hover:border-[#D4AF37]/40 rounded-xl overflow-hidden transition-all shadow-md group">
                  <div 
                    onClick={() => toggleExpanded(cliente.ID_Cliente)}
                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="min-w-0 flex-1 mr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-white group-hover:text-[#F5DA76] transition-colors truncate">
                          {cliente.Nombre_Completo}
                        </h4>
                        {cliente.RIF_Cedula && (
                          <span className="text-[10px] text-gray-400 bg-white/5 border border-white/10 px-1.5 py-0.2 rounded font-mono">
                            {cliente.RIF_Cedula}
                          </span>
                        )}
                      </div>

                      {/* Teléfono & Días de Vencimiento de la Deuda */}
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <div className="text-[11px] text-gray-400 flex items-center gap-1 font-mono">
                          <Smartphone size={12} className="text-gray-500" />
                          <span>{cliente.Telefono_WhatsApp || 'Sin teléfono'}</span>
                        </div>

                        {/* Botón rápido WhatsApp icono en cabecera */}
                        {cliente.Telefono_WhatsApp && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAbrirWhatsAppCobro(cliente);
                            }}
                            className="p-1 rounded bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] transition-colors cursor-pointer"
                            title="Cobrar por WhatsApp"
                          >
                            <MessageCircle size={11} />
                          </button>
                        )}

                        {/* Badge de Días de Vencimiento / Estado de la Deuda */}
                        {cliente.Deuda_Total > 0 ? (
                          diasInfo.estaVencida ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1 shadow-sm">
                              <Clock size={11} className="text-red-400 animate-pulse" />
                              <span>⚠️ {diasInfo.diasVencida} {diasInfo.diasVencida === 1 ? 'día vencido' : 'días vencidos'}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <Clock size={11} className="text-amber-400" />
                              <span>⏱️ Vence en {diasInfo.diasRestantes}d ({diasInfo.diasTranscurridos}d deuda)</span>
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30 flex items-center gap-1">
                            <CheckCircle2 size={11} />
                            <span>Al Día (Sin deuda)</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`text-sm font-extrabold font-mono ${cliente.Deuda_Total > 0 ? 'text-[#FF6B6B]' : 'text-gray-400'}`}>
                        {formatUSD(cliente.Deuda_Total)}
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono">
                        {formatLocal(cliente.Deuda_Total, config.tasaCambioUSD, config.simboloMonedaLocal)}
                      </div>
                      {cliente.Deuda_Total > 0 && (
                        <div className="text-[9px] text-gray-500 font-mono mt-0.5">
                          Plazo: {diasInfo.plazoDias}d
                        </div>
                      )}
                    </div>
                  </div>

                  {expandedClienteId === cliente.ID_Cliente && (
                    <div className="px-3 pb-3 bg-[#0D0E12] border-t border-[#232530] pt-2.5 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Botón WhatsApp Cobranza destacado */}
                        <button
                          type="button"
                          onClick={() => handleAbrirWhatsAppCobro(cliente)}
                          className="bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/50 text-[#25D366] hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[0_2px_10px_rgba(37,211,102,0.15)] active:scale-95 group"
                          title="Abrir WhatsApp para enviar recordatorio de cobranza con días de vencimiento"
                        >
                          <MessageCircle size={14} className="text-[#25D366] group-hover:scale-110 transition-transform" />
                          <span>WhatsApp</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedClienteForCargarDeuda(cliente);
                            setCargarDeudaMonto('');
                            setCargarDeudaConcepto('');
                          }}
                          className="bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#F5DA76] hover:bg-[#D4AF37]/25 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                          title="Cargar nuevo fiado o deuda"
                        >
                          <Plus size={13} />
                          <span>+ Fiado</span>
                        </button>
                        <button
                          onClick={() => setSelectedClienteForAbono(cliente)}
                          className="flex-1 min-w-[85px] gold-gradient-btn text-black font-extrabold text-xs py-1.5 rounded-lg uppercase tracking-wider shadow-[0_2px_8px_rgba(212,175,55,0.25)] flex items-center justify-center gap-1.5"
                        >
                          <Wallet size={13} />
                          <span>Abonar</span>
                        </button>
                        {onEditarCliente && role === 'Administrador' && (
                          <button
                            onClick={() => {
                              setEditingCliente(cliente);
                              setEditNombre(cliente.Nombre_Completo);
                              setEditTelefono(cliente.Telefono_WhatsApp);
                              setEditLimite(cliente.Limite_Credito.toString());
                              setEditDeuda(cliente.Deuda_Total.toString());
                              setEditDiasCredito((cliente.Dias_Credito || 7).toString());
                              setEditNotas(cliente.Notas || '');
                            }}
                            className="bg-[#181A22] border border-[#2A2D3A] px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-center text-gray-300 hover:text-white transition-colors"
                            title="Editar datos, plazo de crédito o ajustar saldo"
                          >
                            <Edit size={12} className="mr-1" />
                            <span>Editar</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleCopyWhatsAppText(cliente)}
                          className="bg-[#181A22] border border-[#2A2D3A] px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 text-gray-300 hover:text-white hover:border-[#D4AF37]/50 transition-colors"
                          title="Copiar texto del mensaje de cobranza"
                        >
                          <Copy size={12} />
                          <span>{copiedLinkIndex === cliente.ID_Cliente ? '¡Copiado!' : 'MSJ'}</span>
                        </button>
                        <button
                          onClick={() => {
                            if (onEliminarCliente && confirm(`¿Deseas eliminar al cliente ${cliente.Nombre_Completo}?`)) {
                              onEliminarCliente(cliente.ID_Cliente);
                            }
                          }}
                          className="bg-red-500/10 border border-red-500/20 px-2 py-1.5 rounded-lg text-xs flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors"
                          title="Eliminar cliente"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          </div>
        </div>
      )}

      {/* Proveedores Tab */}
      {activeSubTab === 'proveedores' && role === 'Administrador' && (
        <div className="flex flex-col flex-1 overflow-hidden bg-[#090A0D]">
          {/* Top Bar with New Supplier Button and Debt Metrics */}
          <div className="p-3 bg-[#0D0E12] border-b border-[#232530] space-y-2.5">
            <div className="flex items-center justify-end">
              <button
                id="btn-nuevo-proveedor"
                onClick={() => {
                  resetProvForm();
                  setShowNuevoProveedorModal(true);
                }}
                className="gold-gradient-btn text-black font-extrabold rounded-xl py-2.5 px-4 text-xs w-full uppercase tracking-wider shadow-[0_4px_15px_rgba(212,175,55,0.25)] flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Truck size={16} />
                <span>Nuevo Proveedor</span>
              </button>
            </div>

            {/* Metric Banner: Cuentas por Pagar */}
            <div className="bg-[#111216] border border-[#D4AF37]/30 rounded-2xl p-3.5 flex items-center justify-between font-mono shadow-lg relative overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#D4AF37]/5 to-transparent pointer-events-none" />
              <div>
                <div className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest font-sans flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse"></span>
                  Total Cuentas por Pagar (Proveedores)
                </div>
                <div className="text-3xl font-extrabold text-white tracking-wider mt-0.5">
                  {formatUSD(totalCuentasPorPagarUSD)}
                </div>
                <div className="text-xs font-semibold text-[#D4AF37]/80 tracking-wide mt-0.5">
                  {formatLocal(totalCuentasPorPagarUSD, config.tasaCambioUSD, config.simboloMonedaLocal)}
                </div>
              </div>
              <div className="text-right z-10">
                <div className="text-[10px] font-bold text-[#F5DA76] bg-[#D4AF37]/15 px-3 py-1.5 rounded-xl border border-[#D4AF37]/30 shadow-sm">
                  {proveedoresConDeudaCount} {proveedoresConDeudaCount === 1 ? 'POR PAGAR' : 'POR PAGAR'} • {internalProveedores.length} TOTAL
                </div>
              </div>
            </div>

            {/* Search and Category Filter */}
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-500" />
                <input
                  type="text"
                  value={searchQueryProv}
                  onChange={(e) => setSearchQueryProv(e.target.value)}
                  placeholder="Buscar por empresa, contacto, teléfono o RIF..."
                  className="w-full bg-[#111216] border border-[#232530] focus:border-[#D4AF37] rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-gray-500 outline-none transition-colors"
                />
                {searchQueryProv && (
                  <button
                    onClick={() => setSearchQueryProv('')}
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <select
                value={filtroCategoriaProv}
                onChange={(e) => setFiltroCategoriaProv(e.target.value)}
                className="bg-[#111216] border border-[#232530] text-gray-300 text-xs rounded-xl px-3 py-2 outline-none font-sans shrink-0 focus:border-[#D4AF37]"
              >
                <option value="Todos">Todas las Categorías</option>
                {CATEGORIAS_PROVEEDOR.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Suppliers List */}
          <div className="flex-1 overflow-y-auto pb-6 custom-scrollbar p-3">
            {filteredProveedores.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-3 bg-[#111216] rounded-2xl border border-[#232530] m-2">
                <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center mx-auto border border-[#D4AF37]/20">
                  <Truck size={24} />
                </div>
                <h4 className="text-sm font-bold text-white">No hay proveedores registrados</h4>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  Organiza tus distribuidores, teléfonos de contacto, días de visita y control de cuentas por pagar haciendo clic en "Nuevo Proveedor".
                </p>
                <button
                  onClick={() => {
                    resetProvForm();
                    setShowNuevoProveedorModal(true);
                  }}
                  className="gold-gradient-btn text-black text-xs font-bold px-4 py-2 rounded-xl inline-flex items-center gap-1.5 shadow-[0_4px_15px_rgba(212,175,55,0.25)] cursor-pointer"
                >
                  <Plus size={14} /> Registrar Primer Proveedor
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredProveedores.map((prov) => {
                const tieneDeuda = (prov.Saldo_Pendiente || 0) > 0;
                return (
                  <div key={prov.ID_Proveedor} className="bg-[#111216] border border-[#232530] hover:border-[#D4AF37]/40 rounded-xl p-3.5 space-y-2.5 transition-all shadow-md group">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-white tracking-wide font-sans group-hover:text-[#F5DA76] transition-colors">{prov.Nombre_Empresa}</h4>
                          {prov.Categoria_Rubro && (
                            <span className="text-[10px] font-bold text-[#F5DA76] bg-[#D4AF37]/15 border border-[#D4AF37]/30 px-2 py-0.5 rounded-full font-mono">
                              {prov.Categoria_Rubro}
                            </span>
                          )}
                          {prov.RIF && (
                            <span className="text-[10px] text-gray-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/10 font-mono">
                              {prov.RIF}
                            </span>
                          )}
                        </div>
                        {prov.Contacto_Nombre && (
                          <div className="text-xs text-gray-300 mt-1 font-sans">
                            <span className="text-gray-500">Contacto:</span> {prov.Contacto_Nombre}
                          </div>
                        )}
                      </div>

                      {/* Saldo Badge */}
                      <div className="text-right shrink-0">
                        {tieneDeuda ? (
                          <div>
                            <div className="text-[10px] uppercase font-bold text-[#FF6B6B]">Por Pagar</div>
                            <div className="text-base font-extrabold text-[#FF6B6B] leading-tight">
                              {formatUSD(prov.Saldo_Pendiente)}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              {formatLocal(prov.Saldo_Pendiente, config.tasaCambioUSD, config.simboloMonedaLocal)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-[#00E676] bg-[#00E676]/15 border border-[#00E676]/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 size={11} /> Al Día
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Details row: Días de visita, Dirección, Teléfono */}
                    <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap pt-1 border-t border-white/5 font-sans">
                      {prov.Dias_Visita && (
                        <div className="flex items-center gap-1 text-[11px] text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded-lg border border-[#D4AF37]/20">
                          <Calendar size={12} />
                          <span>Visita: {prov.Dias_Visita}</span>
                        </div>
                      )}
                      {prov.Direccion && (
                        <div className="text-[11px] text-gray-400 truncate max-w-xs">
                          📍 {prov.Direccion}
                        </div>
                      )}
                      {prov.Notas && (
                        <div className="w-full text-[11px] text-gray-400 italic bg-black/30 p-2 rounded-lg border border-white/5">
                          💬 {prov.Notas}
                        </div>
                      )}
                    </div>

                    {/* Actions row */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 flex-wrap">
                      {/* WhatsApp Button */}
                      <button
                        onClick={() => handleWhatsAppProveedor(prov)}
                        className="bg-[#00E676]/10 hover:bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/30 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer font-sans active:scale-95"
                      >
                        <MessageCircle size={13} />
                        <span>WhatsApp ({prov.Telefono_WhatsApp})</span>
                      </button>

                      <div className="flex items-center gap-1.5 ml-auto">
                        <button
                          onClick={() => {
                            setSelectedProveedorForPago(prov);
                            setPagoProvMonto(prov.Saldo_Pendiente > 0 ? prov.Saldo_Pendiente.toString() : '');
                          }}
                          className="gold-gradient-btn text-black px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1 shadow-[0_2px_8px_rgba(212,175,55,0.25)] transition-all cursor-pointer"
                          title="Registrar pago o abono a este proveedor"
                        >
                          <DollarSign size={13} />
                          <span>Pagar</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedProveedorForFactura(prov);
                            setFacturaProvMonto('');
                            setFacturaProvDetalle('');
                          }}
                          className="bg-[#181A22] hover:bg-[#222530] text-gray-200 border border-[#2A2D3A] px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer hover:border-[#D4AF37]/40"
                          title="Cargar factura o compra a crédito"
                        >
                          <FilePlus size={12} />
                          <span>+ Factura</span>
                        </button>

                        <button
                          onClick={() => handleOpenEditarProveedor(prov)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                          title="Editar Proveedor"
                        >
                          <Edit size={13} />
                        </button>

                        <button
                          onClick={() => handleEliminarProveedorClick(prov.ID_Proveedor, prov.Nombre_Empresa)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                          title="Eliminar Proveedor"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
              }
              </div>
            )}
          </div>
        </div>
      )}

      {/* Gastos Tab */}
      {activeSubTab === 'gastos' && role === 'Administrador' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#090A0D]">
          <div className="bg-[#111216] p-3.5 rounded-2xl border border-[#D4AF37]/30 flex justify-between items-center shadow-lg relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#D4AF37]/5 to-transparent pointer-events-none" />
            <div>
              <div className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse"></span>
                Gastos Totales Registrados
              </div>
              <div className="text-3xl font-extrabold text-white tracking-wider mt-0.5">
                {formatUSD(gastos.reduce((sum, g) => sum + g.Monto_USD, 0))}
              </div>
              <div className="text-xs font-semibold text-[#D4AF37]/80 tracking-wide mt-0.5">
                {formatLocal(gastos.reduce((sum, g) => sum + g.Monto_USD, 0), config.tasaCambioUSD, config.simboloMonedaLocal)}
              </div>
            </div>
            <button
              onClick={() => setShowNuevoGastoModal(true)}
              className="gold-gradient-btn text-black px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-[0_4px_15px_rgba(212,175,55,0.25)] flex items-center gap-2 z-10"
            >
              <Plus size={15} />
              <span>Nuevo Gasto</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 pb-6">
            {gastos.map((g, index) => (
              <div key={`${g.ID_Gasto}-${index}`} className="bg-[#111216] border border-[#232530] hover:border-[#D4AF37]/40 rounded-xl p-3 shadow-md group transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-xs text-white group-hover:text-[#F5DA76] transition-colors">{g.Descripcion}</h4>
                    {g.Entidad && <div className="text-[10px] text-gray-400 mt-0.5">{g.Entidad}</div>}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="inline-block px-2 py-0.5 bg-[#181A22] border border-[#D4AF37]/20 rounded-md text-[9px] text-[#F5DA76] font-bold uppercase tracking-wider">{g.Categoria}</div>
                      {g.Recibo_Base64 && (
                        <button 
                          onClick={() => setPreviewImage(g.Recibo_Base64!)}
                          className="flex items-center gap-1 text-[9px] text-[#00E676] bg-[#00E676]/10 border border-[#00E676]/30 px-2 py-0.5 rounded-md uppercase tracking-wider hover:bg-[#00E676]/20 transition-colors"
                        >
                          <ImageIcon size={10} /> Factura
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-[#FF6B6B] text-base">{formatUSD(g.Monto_USD)}</span>
                    <div className="text-[10px] text-gray-400">
                      {formatLocal(g.Monto_USD, config.tasaCambioUSD, config.simboloMonedaLocal)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals placed outside conditional render */}
      {selectedClienteForAbono && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#111216] rounded-2xl border border-[#D4AF37]/50 p-5 w-full max-w-sm shadow-[0_20px_60px_rgba(0,0,0,0.95)] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#232530]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center">
                  <Wallet size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Registrar Abono</h3>
                  <p className="text-[11px] text-gray-400 truncate max-w-[190px]">{selectedClienteForAbono.Nombre_Completo}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedClienteForAbono(null)} 
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            {selectedClienteForAbono.Deuda_Total <= 0 ? (
              <div className="bg-[#FFB020]/10 border border-[#FFB020]/30 rounded-xl p-3.5 text-xs text-[#FFB020] space-y-2.5">
                <div className="font-bold flex items-center gap-1.5 text-sm">
                  <AlertCircle size={16} />
                  <span>Este cliente actualmente tiene $0.00 de deuda</span>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  Para registrar un abono, el cliente debe tener una deuda pendiente. Puedes cargarle un fiado o ajustar su saldo directamente aquí:
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const c = selectedClienteForAbono;
                      setSelectedClienteForAbono(null);
                      setSelectedClienteForCargarDeuda(c);
                    }}
                    className="flex-1 gold-gradient-btn text-black font-extrabold py-2 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_2px_8px_rgba(212,175,55,0.25)]"
                  >
                    <Plus size={14} />
                    <span>+ Cargar Fiado</span>
                  </button>
                  {onEditarCliente && role === 'Administrador' && (
                    <button
                      type="button"
                      onClick={() => {
                        const c = selectedClienteForAbono;
                        setSelectedClienteForAbono(null);
                        setEditingCliente(c);
                        setEditNombre(c.Nombre_Completo);
                        setEditTelefono(c.Telefono_WhatsApp);
                        setEditLimite(c.Limite_Credito.toString());
                        setEditDeuda(c.Deuda_Total.toString());
                        setEditNotas(c.Notas || '');
                      }}
                      className="bg-[#181A22] text-white border border-[#232530] hover:bg-[#222530] font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1"
                    >
                      <Edit size={13} />
                      <span>Ajustar Saldo</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-[#090A0D] border border-[#232530] rounded-xl p-3 flex justify-between items-center text-xs">
                <span className="text-gray-400">Deuda Pendiente:</span>
                <div className="text-right">
                  <span className="font-extrabold text-[#FF6B6B] text-base">
                    {formatUSD(selectedClienteForAbono.Deuda_Total)}
                  </span>
                  <div className="text-[10px] text-gray-400">
                    {formatLocal(selectedClienteForAbono.Deuda_Total, config.tasaCambioUSD, config.simboloMonedaLocal)}
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleConfirmAbono} className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                    Monto a Abonar *
                  </label>
                  <div className="flex bg-[#090A0D] rounded-lg p-0.5 border border-[#232530]">
                    <button
                      type="button"
                      onClick={() => setMonedaAbono('USD')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${monedaAbono === 'USD' ? 'gold-gradient-btn text-black' : 'text-gray-400'}`}
                    >
                      USD ($)
                    </button>
                    <button
                      type="button"
                      onClick={() => setMonedaAbono('BS')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${monedaAbono === 'BS' ? 'gold-gradient-btn text-black' : 'text-gray-400'}`}
                    >
                      {config.simboloMonedaLocal}
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={montoAbonoInput}
                  onChange={(e) => setMontoAbonoInput(e.target.value)}
                  className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] text-white rounded-xl p-2.5 text-base font-bold outline-none"
                  placeholder="0.00"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Método de Pago
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['Efectivo', 'Pago Móvil', 'Divisa'] as const).map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setMetodoAbono(m)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        metodoAbono === m
                          ? 'gold-gradient-btn text-black shadow-[0_2px_8px_rgba(212,175,55,0.25)]'
                          : 'bg-[#181A22] text-gray-400 hover:text-white border border-[#232530]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Comprobante / Referencia (Opcional)
                </label>
                <input
                  type="text"
                  value={comprobanteRef}
                  onChange={(e) => setComprobanteRef(e.target.value)}
                  className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] text-white rounded-xl p-2 text-xs outline-none"
                  placeholder="Ej. Ref #1234..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setSelectedClienteForAbono(null)} 
                  className="flex-1 bg-[#181A22] hover:bg-[#222530] text-gray-300 font-bold py-2.5 rounded-xl text-xs transition-colors border border-[#232530]"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 gold-gradient-btn text-black font-extrabold py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-[0_4px_15px_rgba(212,175,55,0.25)]"
                >
                  Confirmar Abono
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showNuevoClienteModal && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#111216] rounded-2xl border border-[#D4AF37]/50 p-5 w-full max-w-sm overflow-y-auto max-h-[90vh] shadow-[0_20px_60px_rgba(0,0,0,0.95)]">
            <div className="flex items-center justify-between pb-3 border-b border-[#232530] mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-[#F5DA76] text-sm uppercase tracking-wider">Nuevo Deudor</h3>
                  <p className="text-[11px] text-gray-400">Registrar cuenta de fiado</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNuevoClienteModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateNewClient} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">Nombre y Apellido *</label>
                <input
                  type="text"
                  required
                  value={newNombre}
                  onChange={(e) => setNewNombre(e.target.value)}
                  className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] text-white rounded-xl p-2.5 text-xs outline-none"
                  placeholder="Ej. Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">Número de WhatsApp *</label>
                <input
                  type="text"
                  required
                  value={newTelefono}
                  onChange={(e) => setNewTelefono(e.target.value)}
                  className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] text-white rounded-xl p-2.5 text-xs outline-none"
                  placeholder="Ej. +584141234567"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#FF6B6B] uppercase tracking-wider mb-1">Deuda ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newDeuda}
                    onChange={(e) => setNewDeuda(e.target.value)}
                    className="w-full bg-[#090A0D] border border-[#FF6B6B]/40 focus:border-[#FF6B6B] text-[#FF6B6B] font-bold rounded-xl p-2.5 text-xs outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">Límite ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={newLimite}
                    onChange={(e) => setNewLimite(e.target.value)}
                    className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] text-white rounded-xl p-2.5 text-xs outline-none"
                    placeholder="30.00"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">Plazo (Días)</label>
                  <input
                    type="number"
                    min="1"
                    value={newDiasCredito}
                    onChange={(e) => setNewDiasCredito(e.target.value)}
                    className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] text-white rounded-xl p-2.5 text-xs outline-none font-mono"
                    placeholder="7"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">Desglose / Artículos fiados</label>
                <textarea
                  rows={2}
                  value={newDeglose}
                  onChange={(e) => setNewDeglose(e.target.value)}
                  className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] text-white rounded-xl p-2 text-xs outline-none"
                  placeholder="Ej. 2x Harina, 1x Queso..."
                />
              </div>
              
              {/* Optional Receipt Upload */}
              <div className="pt-1">
                <label className="block text-xs font-bold text-gray-400 mb-1 flex items-center justify-between">
                  <span>Factura / Recibo <span className="text-[10px] font-normal text-gray-500">(Opcional)</span></span>
                  {gastoRecibo && (
                    <button 
                      type="button" 
                      onClick={() => setGastoRecibo(null)}
                      className="text-[#FF6B6B] flex items-center gap-1 text-[10px] hover:underline"
                    >
                      <X size={12} /> Quitar
                    </button>
                  )}
                </label>
                
                {!gastoRecibo ? (
                  <label className="flex items-center justify-center w-full h-12 px-4 transition bg-[#090A0D] border border-dashed border-[#232530] rounded-xl appearance-none cursor-pointer hover:border-[#D4AF37]/50 focus:outline-none">
                    <span className="flex items-center space-x-2">
                      <Camera size={16} className="text-[#D4AF37]" />
                      <span className="font-medium text-gray-400 text-xs">Capturar o subir foto</span>
                    </span>
                    <input type="file" name="file_upload" className="hidden" accept="image/*" capture="environment" onChange={handleImageUpload} />
                  </label>
                ) : (
                  <div className="w-full h-20 rounded-xl border border-[#D4AF37]/30 overflow-hidden relative group">
                    <img src={gastoRecibo} alt="Recibo" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <ImageIcon size={20} className="text-white" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowNuevoClienteModal(false)} className="w-1/3 bg-[#181A22] text-gray-300 font-bold uppercase text-xs py-2.5 rounded-xl hover:bg-[#222530] transition-colors border border-[#232530]">Cancelar</button>
                <button type="submit" className="flex-1 gold-gradient-btn text-black font-extrabold uppercase text-xs py-2.5 rounded-xl active:scale-95 transition-transform shadow-[0_4px_15px_rgba(212,175,55,0.25)]">Guardar y Asignar Deuda</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showNuevoGastoModal && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#111216] rounded-2xl border border-[#D4AF37]/50 p-5 w-full max-w-sm overflow-y-auto max-h-[90vh] shadow-[0_20px_60px_rgba(0,0,0,0.95)]">
            <div className="flex items-center justify-between pb-3 border-b border-[#232530] mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center">
                  <Receipt size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-[#F5DA76] text-sm uppercase tracking-wider">Nuevo Gasto</h3>
                  <p className="text-[11px] text-gray-400">Registrar egreso del negocio</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNuevoGastoModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGasto} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">Categoría del Gasto *</label>
                <select
                  value={gastoCat}
                  onChange={(e) => setGastoCat(e.target.value as any)}
                  className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] text-white rounded-xl p-2.5 text-xs outline-none"
                >
                  <option value="Inventario">Inventario (Mercancía)</option>
                  <option value="Personal">Personal (Nómina/Pagos)</option>
                  <option value="Servicios">Servicios (Agua, Luz, Internet)</option>
                  <option value="Mantenimiento">Mantenimiento</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">Empresa / Beneficiario (Opcional)</label>
                <input
                  type="text"
                  value={gastoEntidad}
                  onChange={(e) => setGastoEntidad(e.target.value)}
                  className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] text-white rounded-xl p-2.5 text-xs outline-none"
                  placeholder="Ej. Distribuidora Polar, Juan Mecánico..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">Concepto / Descripción *</label>
                <input
                  type="text"
                  required
                  value={gastoDesc}
                  onChange={(e) => setGastoDesc(e.target.value)}
                  className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] text-white rounded-xl p-2.5 text-xs outline-none"
                  placeholder="Ej. Pago de factura #1234, Limpieza..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#FF6B6B] uppercase tracking-wider mb-1">Monto de la Factura ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={gastoMonto}
                  onChange={(e) => setGastoMonto(e.target.value)}
                  className="w-full bg-[#090A0D] border border-[#FF6B6B]/40 focus:border-[#FF6B6B] text-[#FF6B6B] font-bold rounded-xl p-2.5 text-xs outline-none"
                  placeholder="0.00"
                />
              </div>
              
              {/* Optional Receipt Upload */}
              <div className="pt-1">
                <label className="block text-xs font-bold text-gray-400 mb-1 flex items-center justify-between">
                  <span>Factura / Recibo <span className="text-[10px] font-normal text-gray-500">(Opcional)</span></span>
                  {gastoRecibo && (
                    <button 
                      type="button" 
                      onClick={() => setGastoRecibo(null)}
                      className="text-[#FF6B6B] flex items-center gap-1 text-[10px] hover:underline"
                    >
                      <X size={12} /> Quitar
                    </button>
                  )}
                </label>
                
                {!gastoRecibo ? (
                  <label className="flex items-center justify-center w-full h-12 px-4 transition bg-[#090A0D] border border-dashed border-[#232530] rounded-xl appearance-none cursor-pointer hover:border-[#D4AF37]/50 focus:outline-none">
                    <span className="flex items-center space-x-2">
                      <Camera size={16} className="text-[#D4AF37]" />
                      <span className="font-medium text-gray-400 text-xs">Capturar o subir foto</span>
                    </span>
                    <input type="file" name="file_upload" className="hidden" accept="image/*" capture="environment" onChange={handleImageUpload} />
                  </label>
                ) : (
                  <div className="w-full h-20 rounded-xl border border-[#D4AF37]/30 overflow-hidden relative group">
                    <img src={gastoRecibo} alt="Recibo" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <ImageIcon size={20} className="text-white" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowNuevoGastoModal(false)} className="w-1/3 bg-[#181A22] text-gray-300 font-bold uppercase text-xs py-2.5 rounded-xl hover:bg-[#222530] transition-colors border border-[#232530]">Cancelar</button>
                <button type="submit" className="flex-1 gold-gradient-btn text-black font-extrabold uppercase text-xs py-2.5 rounded-xl active:scale-95 transition-all shadow-[0_4px_15px_rgba(212,175,55,0.25)]">Registrar Gasto</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Visor de Factura */}
      {previewImage && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-md flex justify-end mb-2">
            <button 
              onClick={() => setPreviewImage(null)}
              className="text-white hover:text-gray-300 p-2 bg-[#2A2A2A] rounded-full"
            >
              <X size={24} />
            </button>
          </div>
          <div className="w-full max-w-md bg-black rounded-lg overflow-hidden border border-[#333]">
            <img src={previewImage} alt="Factura/Recibo" className="w-full h-auto object-contain max-h-[75vh]" />
          </div>
        </div>
      )}

      {/* Modal: Registrar Nuevo Proveedor */}
      {showNuevoProveedorModal && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#111216] rounded-2xl border border-[#D4AF37]/50 p-4 sm:p-5 w-full max-w-md overflow-y-auto max-h-[90vh] shadow-[0_20px_60px_rgba(0,0,0,0.95)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#232530]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center shrink-0">
                  <Truck size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-[#F5DA76] text-base leading-tight">Registrar Nuevo Proveedor</h3>
                  <p className="text-[11px] text-gray-400">Añade distribuidor y gestiona pedidos y pagos</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNuevoProveedorModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCrearProveedorSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Empresa / Distribuidora *
                </label>
                <input
                  type="text"
                  required
                  value={provNombre}
                  onChange={(e) => setProvNombre(e.target.value)}
                  className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] text-white rounded-xl p-2.5 text-xs outline-none font-semibold"
                  placeholder="Ej. Distribuidora Polar, Plumrose, San Antonio..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Persona de Contacto
                  </label>
                  <input
                    type="text"
                    value={provContacto}
                    onChange={(e) => setProvContacto(e.target.value)}
                    className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] text-white rounded-xl p-2.5 text-xs outline-none"
                    placeholder="Ej. Carlos Gómez"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                    RIF / Documento
                  </label>
                  <input
                    type="text"
                    value={provRif}
                    onChange={(e) => setProvRif(e.target.value)}
                    className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] text-white rounded-xl p-2.5 text-xs outline-none"
                    placeholder="Ej. J-00041372-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Teléfono / WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    value={provTelefono}
                    onChange={(e) => setProvTelefono(e.target.value)}
                    className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] text-white rounded-xl p-2.5 text-xs outline-none"
                    placeholder="Ej. +584141234567"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Categoría / Rubro
                  </label>
                  <select
                    value={provCategoria}
                    onChange={(e) => setProvCategoria(e.target.value)}
                    className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] text-white rounded-xl p-2.5 text-xs outline-none"
                  >
                    {CATEGORIAS_PROVEEDOR.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Días de Visita / Despacho
                  </label>
                  <input
                    type="text"
                    value={provDias}
                    onChange={(e) => setProvDias(e.target.value)}
                    className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] text-white rounded-xl p-2.5 text-xs outline-none"
                    placeholder="Ej. Martes y Jueves"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#FF6B6B] uppercase tracking-wider mb-1">
                    Saldo Inicial ($ USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={provSaldo}
                    onChange={(e) => setProvSaldo(e.target.value)}
                    className="w-full bg-[#090A0D] border border-[#FF6B6B]/40 focus:border-[#FF6B6B] text-[#FF6B6B] font-bold rounded-xl p-2.5 text-xs outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Dirección o Zona de Entrega
                </label>
                <input
                  type="text"
                  value={provDireccion}
                  onChange={(e) => setProvDireccion(e.target.value)}
                  className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] text-white rounded-xl p-2.5 text-xs outline-none"
                  placeholder="Ej. Calle 4 Zona Industrial, Galpón 8"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Notas / Condiciones Comerciales
                </label>
                <textarea
                  rows={2}
                  value={provNotas}
                  onChange={(e) => setProvNotas(e.target.value)}
                  className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] text-white rounded-xl p-2 text-xs outline-none"
                  placeholder="Ej. Crédito a 7 días, despacho a partir de 10 bultos"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNuevoProveedorModal(false)}
                  className="flex-1 bg-[#181A22] hover:bg-[#222530] text-white font-bold py-2.5 rounded-xl text-xs transition-colors border border-[#232530] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 gold-gradient-btn text-black font-extrabold py-2.5 rounded-xl text-xs shadow-[0_4px_15px_rgba(212,175,55,0.25)] transition-all cursor-pointer uppercase tracking-wider"
                >
                  Guardar Proveedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Proveedor */}
      {editingProveedor && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#111216] rounded-2xl border border-[#D4AF37]/50 p-4 sm:p-5 w-full max-w-md overflow-y-auto max-h-[90vh] shadow-[0_20px_60px_rgba(0,0,0,0.95)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#232530]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center shrink-0">
                  <Edit size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-[#F5DA76] text-base leading-tight">Editar Proveedor</h3>
                  <p className="text-[11px] text-gray-400">{editingProveedor.Nombre_Empresa}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingProveedor(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditarProveedorSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Empresa / Distribuidora *
                </label>
                <input
                  type="text"
                  required
                  value={provNombre}
                  onChange={(e) => setProvNombre(e.target.value)}
                  className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] text-white rounded-xl p-2.5 text-xs outline-none font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Persona de Contacto
                  </label>
                  <input
                    type="text"
                    value={provContacto}
                    onChange={(e) => setProvContacto(e.target.value)}
                    className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] text-white rounded-xl p-2.5 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                    RIF / Documento
                  </label>
                  <input
                    type="text"
                    value={provRif}
                    onChange={(e) => setProvRif(e.target.value)}
                    className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] text-white rounded-xl p-2.5 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Teléfono / WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    value={provTelefono}
                    onChange={(e) => setProvTelefono(e.target.value)}
                    className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] text-white rounded-xl p-2.5 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Categoría / Rubro
                  </label>
                  <select
                    value={provCategoria}
                    onChange={(e) => setProvCategoria(e.target.value)}
                    className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] text-white rounded-xl p-2.5 text-xs outline-none"
                  >
                    {CATEGORIAS_PROVEEDOR.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Días de Visita / Despacho
                </label>
                <input
                  type="text"
                  value={provDias}
                  onChange={(e) => setProvDias(e.target.value)}
                  className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] text-white rounded-xl p-2.5 text-xs outline-none"
                  placeholder="Ej. Lunes y Jueves"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Dirección o Ubicación
                </label>
                <input
                  type="text"
                  value={provDireccion}
                  onChange={(e) => setProvDireccion(e.target.value)}
                  className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] text-white rounded-xl p-2.5 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Notas / Condiciones Comerciales
                </label>
                <textarea
                  rows={2}
                  value={provNotas}
                  onChange={(e) => setProvNotas(e.target.value)}
                  className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] text-white rounded-xl p-2 text-xs outline-none"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProveedor(null)}
                  className="flex-1 bg-[#181A22] hover:bg-[#222530] text-white font-bold py-2.5 rounded-xl text-xs transition-colors border border-[#232530] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 gold-gradient-btn text-black font-extrabold py-2.5 rounded-xl text-xs shadow-[0_4px_15px_rgba(212,175,55,0.25)] transition-all cursor-pointer uppercase tracking-wider"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar Pago a Proveedor */}
      {selectedProveedorForPago && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#111216] rounded-2xl border border-[#D4AF37]/50 p-4 sm:p-5 w-full max-w-sm space-y-4 shadow-[0_20px_60px_rgba(0,0,0,0.95)]">
            <div className="flex items-center justify-between pb-3 border-b border-[#232530]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center">
                  <DollarSign size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-[#F5DA76] text-sm">Registrar Pago</h3>
                  <p className="text-[11px] text-gray-400 truncate max-w-[190px]">{selectedProveedorForPago.Nombre_Empresa}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProveedorForPago(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-[#090A0D] border border-[#232530] rounded-xl p-3 flex justify-between items-center text-xs">
              <span className="text-gray-400">Saldo Pendiente:</span>
              <span className="font-extrabold text-[#FF6B6B] text-base">
                {formatUSD(selectedProveedorForPago.Saldo_Pendiente || 0)}
              </span>
            </div>

            <form onSubmit={handlePagarProveedorSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Monto a Pagar ($ USD) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={pagoProvMonto}
                  onChange={(e) => setPagoProvMonto(e.target.value)}
                  className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] text-white rounded-xl p-2.5 text-base font-bold outline-none"
                  placeholder="0.00"
                  autoFocus
                />
                {pagoProvMonto && parseFloat(pagoProvMonto) > 0 && (
                  <div className="text-[11px] text-[#D4AF37] mt-1 font-semibold">
                    Equivalente: {formatLocal(parseFloat(pagoProvMonto), config.tasaCambioUSD, config.simboloMonedaLocal)}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Método de Pago
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Efectivo', 'Pago Móvil', 'Divisa'] as const).map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setPagoProvMetodo(m)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        pagoProvMetodo === m
                          ? 'gold-gradient-btn text-black shadow-[0_2px_8px_rgba(212,175,55,0.25)]'
                          : 'bg-[#181A22] text-gray-400 hover:text-white border border-[#232530]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Comprobante o Referencia (Opcional)
                </label>
                <input
                  type="text"
                  value={pagoProvRef}
                  onChange={(e) => setPagoProvRef(e.target.value)}
                  className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] text-white rounded-xl p-2 text-xs outline-none"
                  placeholder="Ej. Ref #1234, Factura 450"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-[#090A0D] border border-[#232530] flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="chk-crear-gasto"
                  checked={crearGastoAuto}
                  onChange={(e) => setCrearGastoAuto(e.target.checked)}
                  className="w-4 h-4 accent-[#D4AF37] rounded cursor-pointer"
                />
                <label htmlFor="chk-crear-gasto" className="text-xs text-gray-300 cursor-pointer select-none">
                  Registrar automáticamente en <strong className="text-[#F5DA76]">Gastos Operativos (Inventario)</strong>
                </label>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedProveedorForPago(null)}
                  className="flex-1 bg-[#181A22] hover:bg-[#222530] text-white font-bold py-2.5 rounded-xl text-xs transition-colors border border-[#232530]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 gold-gradient-btn text-black font-extrabold py-2.5 rounded-xl text-xs shadow-[0_4px_15px_rgba(212,175,55,0.25)] transition-all cursor-pointer uppercase tracking-wider"
                >
                  Confirmar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cargar Factura a Proveedor */}
      {selectedProveedorForFactura && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#111216] rounded-2xl border border-[#D4AF37]/50 p-4 sm:p-5 w-full max-w-sm space-y-4 shadow-[0_20px_60px_rgba(0,0,0,0.95)]">
            <div className="flex items-center justify-between pb-3 border-b border-[#232530]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center">
                  <FilePlus size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-[#F5DA76] text-sm">Cargar Compra a Crédito</h3>
                  <p className="text-[11px] text-gray-400 truncate max-w-[190px]">{selectedProveedorForFactura.Nombre_Empresa}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProveedorForFactura(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFacturaProveedorSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#FF6B6B] uppercase tracking-wider mb-1">
                  Monto de la Factura / Compra ($ USD) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={facturaProvMonto}
                  onChange={(e) => setFacturaProvMonto(e.target.value)}
                  className="w-full bg-[#090A0D] border border-[#FF6B6B]/40 focus:border-[#FF6B6B] text-[#FF6B6B] rounded-xl p-2.5 text-base font-bold outline-none"
                  placeholder="0.00"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  N° Factura / Descripción de Mercancía
                </label>
                <textarea
                  rows={2}
                  value={facturaProvDetalle}
                  onChange={(e) => setFacturaProvDetalle(e.target.value)}
                  className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] text-white rounded-xl p-2 text-xs outline-none"
                  placeholder="Ej. Factura #9812 - 5 cajas de refrescos, 2 bultos de harina"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedProveedorForFactura(null)}
                  className="flex-1 bg-[#181A22] hover:bg-[#222530] text-white font-bold py-2.5 rounded-xl text-xs transition-colors border border-[#232530]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 gold-gradient-btn text-black font-extrabold py-2.5 rounded-xl text-xs shadow-[0_4px_15px_rgba(212,175,55,0.25)] transition-all cursor-pointer uppercase tracking-wider"
                >
                  Cargar a Cuenta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cargar Fiado / Nueva Deuda a Cliente */}
      {selectedClienteForCargarDeuda && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#111216] rounded-2xl border border-[#D4AF37]/50 p-4 sm:p-5 w-full max-w-sm space-y-4 shadow-[0_20px_60px_rgba(0,0,0,0.95)]">
            <div className="flex items-center justify-between pb-3 border-b border-[#232530]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center">
                  <PlusCircle size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-[#F5DA76] text-sm">Cargar Nuevo Fiado</h3>
                  <p className="text-[11px] text-gray-400 truncate max-w-[200px]">{selectedClienteForCargarDeuda.Nombre_Completo}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClienteForCargarDeuda(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-[#090A0D] border border-[#232530] rounded-xl p-3 flex justify-between items-center text-xs">
              <span className="text-gray-400">Saldo actual del cliente:</span>
              <span className="font-extrabold text-[#FF6B6B] text-sm">
                {formatUSD(selectedClienteForCargarDeuda.Deuda_Total)}
              </span>
            </div>

            <form onSubmit={handleCargarDeudaSubmit} className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#FF6B6B] uppercase tracking-wider">
                    Monto a Cargar *
                  </label>
                  <div className="flex bg-[#090A0D] rounded-lg p-0.5 border border-[#232530]">
                    <button
                      type="button"
                      onClick={() => setCargarDeudaMoneda('USD')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${cargarDeudaMoneda === 'USD' ? 'gold-gradient-btn text-black' : 'text-gray-400'}`}
                    >
                      USD ($)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCargarDeudaMoneda('BS')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${cargarDeudaMoneda === 'BS' ? 'gold-gradient-btn text-black' : 'text-gray-400'}`}
                    >
                      {config.simboloMonedaLocal}
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={cargarDeudaMonto}
                  onChange={(e) => setCargarDeudaMonto(e.target.value)}
                  className="w-full bg-[#090A0D] border border-[#FF6B6B]/40 focus:border-[#FF6B6B] text-[#FF6B6B] rounded-xl p-2.5 text-base font-bold outline-none"
                  placeholder="0.00"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Concepto / Desglose de Artículos (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={cargarDeudaConcepto}
                  onChange={(e) => setCargarDeudaConcepto(e.target.value)}
                  className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] text-white rounded-xl p-2 text-xs outline-none"
                  placeholder="Ej. 2 Harinas PAN, 1 Margarina, Saldo acordado..."
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedClienteForCargarDeuda(null)}
                  className="flex-1 bg-[#181A22] hover:bg-[#222530] text-white font-bold py-2.5 rounded-xl text-xs transition-colors border border-[#232530]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 gold-gradient-btn text-black font-extrabold py-2.5 rounded-xl text-xs shadow-[0_4px_15px_rgba(212,175,55,0.25)] transition-all cursor-pointer uppercase tracking-wider"
                >
                  Cargar Fiado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Cliente y Ajustar Saldo */}
      {editingCliente && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#111216] rounded-2xl border border-[#D4AF37]/50 p-4 sm:p-5 w-full max-w-md overflow-y-auto max-h-[90vh] shadow-[0_20px_60px_rgba(0,0,0,0.95)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#232530]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center shrink-0">
                  <Edit size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-[#F5DA76] text-base leading-tight">Editar Cliente</h3>
                  <p className="text-[11px] text-gray-400">{editingCliente.Nombre_Completo}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCliente(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditarClienteSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] text-white rounded-xl p-2.5 text-xs outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Teléfono / WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  value={editTelefono}
                  onChange={(e) => setEditTelefono(e.target.value)}
                  className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] text-white rounded-xl p-2.5 text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#FF6B6B] uppercase tracking-wider mb-1">
                    Deuda ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editDeuda}
                    onChange={(e) => setEditDeuda(e.target.value)}
                    className="w-full bg-[#090A0D] border border-[#FF6B6B]/40 focus:border-[#FF6B6B] text-[#FF6B6B] font-bold rounded-xl p-2.5 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Límite ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={editLimite}
                    onChange={(e) => setEditLimite(e.target.value)}
                    className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] text-white rounded-xl p-2.5 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Plazo (Días)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editDiasCredito}
                    onChange={(e) => setEditDiasCredito(e.target.value)}
                    className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] text-white rounded-xl p-2.5 text-xs outline-none font-mono"
                    placeholder="7"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Notas / Observaciones
                </label>
                <textarea
                  rows={2}
                  value={editNotas}
                  onChange={(e) => setEditNotas(e.target.value)}
                  className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] text-white rounded-xl p-2 text-xs outline-none"
                  placeholder="Ej. Vecino de confianza, paga los 15"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCliente(null)}
                  className="flex-1 bg-[#181A22] hover:bg-[#222530] text-white font-bold py-2.5 rounded-xl text-xs transition-colors border border-[#232530]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 gold-gradient-btn text-black font-extrabold py-2.5 rounded-xl text-xs shadow-[0_4px_15px_rgba(212,175,55,0.25)] transition-all uppercase tracking-wider"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
