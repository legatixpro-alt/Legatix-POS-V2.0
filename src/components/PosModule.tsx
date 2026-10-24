import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Smartphone, 
  CreditCard, 
  Banknote, 
  DollarSign, 
  Plus, 
  Minus, 
  X, 
  MessageCircle, 
  Store,
  Barcode,
  Layers,
  Sparkles,
  Calculator,
  ArrowRight,
  Package,
  LayoutGrid,
  List,
  UserCheck,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  FileText,
  Users,
  Coins,
  Check,
  ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Producto, Cliente, ConfiguracionApp, MetodoPago, DesglosePagoItem } from '../types/schema';
import { VueltoModal } from './VueltoModal';
import { TasaModal } from './TasaModal';
import { NotaEntregaModal, NotaEntregaData } from './NotaEntregaModal';
import { BcvRateResponse } from '../lib/bcvService';
import { useNativeBackHandler } from '../utils/nativeNavigation';
import { soundEffects } from '../utils/audio';

interface PosModuleProps {
  productos: Producto[];
  clientes: Cliente[];
  config: ConfiguracionApp;
  onCompletarVenta: (
    items: CartItem[], 
    totalUSD: number, 
    metodoPago: MetodoPago,
    clienteId?: string,
    desglosePagos?: DesglosePagoItem[],
    montoCredito?: number,
    montoAbonado?: number
  ) => boolean | void;
  onUpdateTasa: (newTasa: number, options?: { autoSync?: boolean; isManual?: boolean }) => void;
  onNavigateToFiado: () => void;
  role?: 'Administrador' | 'Cajero';
  bcvData?: BcvRateResponse | null;
  onRefreshBcv?: () => Promise<void>;
  onOpenConfigModal?: () => void;
  onCrearCliente?: (nuevoCliente: any) => Promise<any> | any;
  preSelectedCliente?: Cliente | null;
  onClearPreSelectedCliente?: () => void;
}

interface CartItem extends Producto {
  cantidad: number;
}

export const PosModule: React.FC<PosModuleProps> = ({
  productos,
  clientes,
  config,
  onCompletarVenta,
  onUpdateTasa,
  onNavigateToFiado,
  role = 'Administrador',
  bcvData,
  onRefreshBcv,
  onOpenConfigModal,
  onCrearCliente,
  preSelectedCliente,
  onClearPreSelectedCliente,
}) => {
  const formatUnit = (unidad: string) => {
    switch (unidad) {
      case 'Kilogramo': return 'kg';
      case 'Gramos': return 'g';
      case 'Unidad': return 'un';
      case 'Paquete': return 'pqt';
      case 'Botella': return 'bot';
      case 'Lata': return 'lata';
      case 'Mazo': return 'mazo';
      case 'Malla': return 'malla';
      case 'Cesta': return 'cesta';
      case 'Bulto': return 'bulto';
      case 'Saco': return 'saco';
      case 'Caja': return 'caja';
      default: return unidad || 'un';
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState<boolean>(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState<string>('');
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close category dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Desktop workstation view modes: grid of cards or rapid table list
  const [catalogViewMode, setCatalogViewMode] = useState<'grid' | 'table'>(() => {
    return (localStorage.getItem('bodeguero_pos_view_mode') as 'grid' | 'table') || 'grid';
  });

  useEffect(() => {
    localStorage.setItem('bodeguero_pos_view_mode', catalogViewMode);
  }, [catalogViewMode]);

  // Desktop shortcut: '/' to quickly focus search bar
  useEffect(() => {
    const handleSearchShortcut = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleSearchShortcut);
    return () => window.removeEventListener('keydown', handleSearchShortcut);
  }, []);

  const paymentOptions = [
    { 
      id: 'Divisa', 
      label: 'Dólares ($)', 
      sublabel: 'Efectivo USD', 
      isUSD: true, 
      icon: DollarSign, 
      color: 'text-[#00E676]', 
      bg: 'bg-[#00E676]/10', 
      border: 'border-[#00E676]/30',
      activeBg: 'bg-[#00E676]/20',
      activeBorder: 'border-[#00E676]',
      glow: 'shadow-[0_0_15px_rgba(0,230,118,0.25)]',
      badge: '$ USD'
    },
    { 
      id: 'Pago Móvil', 
      label: 'Pago Móvil', 
      sublabel: 'Bs. Digital', 
      isUSD: false, 
      icon: Smartphone, 
      color: 'text-[#D4AF37]', 
      bg: 'bg-[#D4AF37]/10', 
      border: 'border-[#D4AF37]/30',
      activeBg: 'bg-[#D4AF37]/20',
      activeBorder: 'border-[#D4AF37]',
      glow: 'shadow-[0_0_15px_rgba(212,175,55,0.25)]',
      badge: 'Bs.'
    },
    { 
      id: 'Divisa', 
      label: 'Punto de Venta', 
      sublabel: 'Débito / Tarjeta', 
      isUSD: false, 
      icon: CreditCard, 
      color: 'text-[#38BDF8]', 
      bg: 'bg-[#38BDF8]/10', 
      border: 'border-[#38BDF8]/30',
      activeBg: 'bg-[#38BDF8]/20',
      activeBorder: 'border-[#38BDF8]',
      glow: 'shadow-[0_0_15px_rgba(56,189,248,0.25)]',
      badge: 'Bs.'
    },
    { 
      id: 'Efectivo', 
      label: 'Efectivo Bs.', 
      sublabel: 'Billetes (Bs.)', 
      isUSD: false, 
      icon: Banknote, 
      color: 'text-amber-300', 
      bg: 'bg-amber-400/10', 
      border: 'border-amber-400/30',
      activeBg: 'bg-amber-400/20',
      activeBorder: 'border-amber-400',
      glow: 'shadow-[0_0_15px_rgba(251,191,36,0.25)]',
      badge: 'Bs.'
    },
  ];
  const [selectedPaymentIdx, setSelectedPaymentIdx] = useState(0);
  const [pagos, setPagos] = useState<{
    id: string;
    metodo: string;
    label: string;
    isUSD: boolean;
    monto: number;
    montoUSD: number;
    referencia?: string;
  }[]>([]);
  const [montoInput, setMontoInput] = useState('');
  const [referenciaInput, setReferenciaInput] = useState('');
  
  // Cliente & Crédito / Fiado State
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [showClienteSelectModal, setShowClienteSelectModal] = useState(false);
  const [showNuevoClienteModal, setShowNuevoClienteModal] = useState(false);
  const [clienteSearch, setClienteSearch] = useState('');
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState('');
  const [nuevoClienteRif, setNuevoClienteRif] = useState('');
  const [nuevoClienteTelefono, setNuevoClienteTelefono] = useState('');
  const [nuevoClienteDireccion, setNuevoClienteDireccion] = useState('');
  const [nuevoClienteLimite, setNuevoClienteLimite] = useState('50');

  // Handle external pre-selected client from ClientesModule
  useEffect(() => {
    if (preSelectedCliente) {
      setSelectedCliente(preSelectedCliente);
      if (onClearPreSelectedCliente) onClearPreSelectedCliente();
      toast.success(`Cliente "${preSelectedCliente.Nombre_Completo}" asignado para Nota de Entrega SENIAT`, { icon: '👤' });
    }
  }, [preSelectedCliente]);

  const [showTasaModal, setShowTasaModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showVueltoModal, setShowVueltoModal] = useState(false);
  const [showNotaEntregaModal, setShowNotaEntregaModal] = useState(false);
  const [notaEntregaData, setNotaEntregaData] = useState<NotaEntregaData | null>(null);

  // Native Mobile Back Button Support
  useNativeBackHandler(showPaymentModal, () => setShowPaymentModal(false), 'pos_payment_modal');
  useNativeBackHandler(showTasaModal, () => setShowTasaModal(false), 'pos_tasa_modal');
  useNativeBackHandler(showClearConfirm, () => setShowClearConfirm(false), 'pos_clear_confirm');
  useNativeBackHandler(showVueltoModal, () => setShowVueltoModal(false), 'pos_vuelto_modal');
  useNativeBackHandler(showClienteSelectModal, () => setShowClienteSelectModal(false), 'pos_cliente_modal');
  useNativeBackHandler(showNuevoClienteModal, () => setShowNuevoClienteModal(false), 'pos_nuevo_cliente_modal');
  useNativeBackHandler(showNotaEntregaModal, () => setShowNotaEntregaModal(false), 'pos_nota_entrega_modal');

  // Categories list
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    productos.forEach(p => {
      if (p.Categoria) set.add(p.Categoria);
    });
    return ['Todos', ...Array.from(set)];
  }, [productos]);

  const productCountByCategory = useMemo(() => {
    const counts: Record<string, number> = { Todos: productos.length };
    productos.forEach(p => {
      if (p.Categoria) {
        counts[p.Categoria] = (counts[p.Categoria] || 0) + 1;
      }
    });
    return counts;
  }, [productos]);

  const filteredDropdownCategories = useMemo(() => {
    if (!categorySearchQuery.trim()) return categoriesList;
    const q = categorySearchQuery.toLowerCase().trim();
    return categoriesList.filter(cat => cat.toLowerCase().includes(q));
  }, [categoriesList, categorySearchQuery]);

  // Computed Cart
  const cartTotalUSD = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.Precio_Venta * item.cantidad, 0);
  }, [cart]);

  const cartTotalLocal = cartTotalUSD * config.tasaCambioUSD;

  // Formatting helpers
  const formatBs = (montoUSD: number) => {
    return (montoUSD * config.tasaCambioUSD).toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatUSD = (monto: number) => {
    return monto.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Search Logic (dropdown & instant matching)
  const filteredProductsDropdown = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return productos.filter(
      (p) =>
        (p.Nombre || "").toLowerCase().includes(term) ||
        (p.Codigo_Barras || "").includes(term) ||
        (p.Categoria || "").toLowerCase().includes(term)
    ).slice(0, 10);
  }, [productos, searchTerm]);

  // Desktop Catalog Grid filtered products
  const desktopCatalogProducts = useMemo(() => {
    let list = productos;
    if (selectedCategory !== 'Todos') {
      list = list.filter(p => p.Categoria === selectedCategory);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(p => 
        (p.Nombre || '').toLowerCase().includes(term) ||
        (p.Codigo_Barras || '').includes(term) ||
        (p.Categoria || '').toLowerCase().includes(term)
      );
    }
    return list;
  }, [productos, selectedCategory, searchTerm]);

  const addToCart = (prod: Producto) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.ID_Producto === prod.ID_Producto);
      if (existing) {
        if (existing.cantidad >= prod.Stock_Actual) return prev;
        return prev.map((item) =>
          item.ID_Producto === prod.ID_Producto
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      return [...prev, { ...prod, cantidad: 1 }];
    });
    soundEffects.playBeep();
  };

  const setItemQty = (id: string, qty: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.ID_Producto === id) {
          const newQty = Math.max(0, qty);
          if (newQty > item.Stock_Actual) return { ...item, cantidad: item.Stock_Actual };
          return { ...item, cantidad: newQty };
        }
        return item;
      })
    );
  };

  const incrementQty = (id: string) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.ID_Producto === id) {
          if (item.cantidad >= item.Stock_Actual) return item;
          return { ...item, cantidad: item.cantidad + 1 };
        }
        return item;
      })
    );
    soundEffects.playBeep();
  };

  const decrementQty = (id: string) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.ID_Producto === id) {
            return { ...item, cantidad: Math.max(0, item.cantidad - 1) };
          }
          return item;
        })
        .filter((item) => item.cantidad > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.ID_Producto !== id));
  };

  // Barcode / Fast Input Keyboard Enter handler
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const term = searchTerm.trim().toLowerCase();
      if (!term) return;

      // 1. Check exact barcode match first (standard USB barcode scanner behavior)
      const exactBarcode = productos.find(p => p.Codigo_Barras && p.Codigo_Barras.trim() === term);
      if (exactBarcode) {
        addToCart(exactBarcode);
        setSearchTerm('');
        return;
      }

      // 2. Exact name match
      const exactName = productos.find(p => p.Nombre && p.Nombre.toLowerCase().trim() === term);
      if (exactName) {
        addToCart(exactName);
        setSearchTerm('');
        return;
      }

      // 3. Single match in filtered list
      if (filteredProductsDropdown.length === 1) {
        addToCart(filteredProductsDropdown[0]);
        setSearchTerm('');
      }
    }
  };

  // Keyboard shortcut: F8 to complete sale
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F8') {
        e.preventDefault();
        if (cart.length > 0) {
          handleProcesar();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, pagos]);

  // Payment totals logic
  const totalPagadoUSD = useMemo(() => {
    return pagos.reduce((acc, p) => acc + p.montoUSD, 0);
  }, [pagos]);

  const totalPagadoBs = totalPagadoUSD * config.tasaCambioUSD;
  const faltaUSD = Number((cartTotalUSD - totalPagadoUSD).toFixed(2));
  const faltaBs = Number((cartTotalLocal - totalPagadoBs).toFixed(2));

  const hasAbonos = pagos.length > 0;
  const isCredito = selectedCliente !== null && faltaUSD > 0.009;
  const isCambio = faltaUSD < -0.009;
  const isExacto = hasAbonos && Math.abs(faltaUSD) <= 0.009;

  const handleAddPago = (montoDirecto?: number) => {
    const val = montoDirecto !== undefined ? montoDirecto : parseFloat(montoInput.replace(/,/g, '.'));
    if (isNaN(val) || val <= 0) {
      toast.error('Por favor escribe un monto válido mayor a 0');
      return;
    }
    const option = paymentOptions[selectedPaymentIdx];
    const montoUSD = option.isUSD ? val : val / (config.tasaCambioUSD || 1);

    const nuevoPago = {
      id: Math.random().toString(),
      metodo: option.id,
      label: option.label,
      isUSD: option.isUSD,
      monto: Number(val.toFixed(2)),
      montoUSD: Number(montoUSD.toFixed(4)),
      referencia: referenciaInput.trim() || undefined
    };

    setPagos(prev => [...prev, nuevoPago]);
    setMontoInput('');
    setReferenciaInput('');
    soundEffects.playBeep();
    toast.success(`Abono registrado: ${option.label} (${option.isUSD ? '$' : 'Bs.'}${val.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`);
  };

  const handlePagarRestanteExacto = () => {
    const option = paymentOptions[selectedPaymentIdx];
    if (option.isUSD) {
      const rest = Math.max(0, faltaUSD);
      if (rest > 0) handleAddPago(rest);
    } else {
      const restBs = Math.max(0, faltaBs);
      if (restBs > 0) handleAddPago(restBs);
    }
  };

  const handleRemovePago = (id: string) => {
    setPagos(prev => prev.filter(p => p.id !== id));
  };

  const handleGuardarNuevoCliente = async () => {
    if (!nuevoClienteNombre.trim()) {
      toast.error('El nombre del cliente es obligatorio');
      return;
    }
    const nuevo: Cliente = {
      ID_Cliente: `CLI-${Date.now().toString().slice(-5)}`,
      Nombre_Completo: nuevoClienteNombre.trim(),
      RIF_Cedula: nuevoClienteRif.trim() || undefined,
      Telefono_WhatsApp: nuevoClienteTelefono.trim() || 'S/N',
      Direccion: nuevoClienteDireccion.trim() || undefined,
      Limite_Credito: parseFloat(nuevoClienteLimite.replace(/,/g, '.')) || 50,
      Deuda_Total: 0,
      Estado_Credito: 'Al Día',
      Ultimo_Movimiento: 'Hoy',
      Fecha_Registro: new Date().toLocaleDateString('es-VE'),
    };

    let clienteFinal = nuevo;
    if (onCrearCliente) {
      try {
        const res = await onCrearCliente(nuevo);
        if (res && typeof res === 'object' && res.ID_Cliente) {
          clienteFinal = res;
        }
      } catch (err) {
        console.error('Error creating client in POS:', err);
      }
    }
    setSelectedCliente(clienteFinal);
    setShowNuevoClienteModal(false);
    setShowClienteSelectModal(false);
    setNuevoClienteNombre('');
    setNuevoClienteRif('');
    setNuevoClienteTelefono('');
    setNuevoClienteDireccion('');
    setNuevoClienteLimite('50');
    toast.success(`Cliente "${clienteFinal.Nombre_Completo}" registrado para la venta y Nota de Entrega SENIAT`);
  };

  const generateReceiptText = (method: string) => {
    let text = `*${config.nombreBodega}*\n`;
    text += `*Recibo de Compra*\n`;
    text += `Fecha: ${new Date().toLocaleString()}\n`;
    text += `------------------------\n`;
    cart.forEach(item => {
      text += `${item.cantidad}x ${item.Nombre}\n`;
      text += `  $${(item.Precio_Venta * item.cantidad).toFixed(2)}\n`;
    });
    text += `------------------------\n`;
    text += `*Total USD: $${formatUSD(cartTotalUSD)}*\n`;
    text += `*Total Bs: Bs ${formatBs(cartTotalUSD)}*\n`;
    if (pagos.length > 0) {
      text += `--- Pagos Realizados ---\n`;
      pagos.forEach(p => {
        text += `${p.label}: ${p.isUSD ? '$' : 'Bs.'}${p.monto.toFixed(2)}${p.referencia ? ` (Ref: ${p.referencia})` : ''}\n`;
      });
      text += `Total Abonado: $${formatUSD(totalPagadoUSD)}\n`;
    }
    if (isCredito && selectedCliente) {
      text += `*Saldo a Crédito (Fiado): $${formatUSD(faltaUSD)}*\n`;
      text += `Cliente Deudor: ${selectedCliente.Nombre_Completo}\n`;
    }
    text += `Método: ${method}\n`;
    text += `------------------------\n`;
    text += `¡Gracias por su compra!\n`;
    return text;
  };

  const handleProcesar = () => {
    if (cart.length === 0) return;

    // Check if payments were added; if not, charge 100% with the selected payment method,
    // or if cashier entered an amount in montoInput, treat it as payment
    let effectivePagos = [...pagos];
    if (effectivePagos.length === 0) {
      const option = paymentOptions[selectedPaymentIdx];
      const val = parseFloat(montoInput.replace(/,/g, '.'));
      if (!isNaN(val) && val > 0) {
        const montoUSD = option.isUSD ? val : val / (config.tasaCambioUSD || 1);
        effectivePagos.push({
          id: Math.random().toString(),
          metodo: option.id,
          label: option.label,
          isUSD: option.isUSD,
          monto: Number(val.toFixed(2)),
          montoUSD: Number(montoUSD.toFixed(4)),
          referencia: referenciaInput.trim() || undefined
        });
      } else if (!selectedCliente) {
        // No manual abonos added: cover 100% with selected payment method
        const totalEnMoneda = option.isUSD ? cartTotalUSD : cartTotalLocal;
        effectivePagos.push({
          id: Math.random().toString(),
          metodo: option.id,
          label: option.label,
          isUSD: option.isUSD,
          monto: Number(totalEnMoneda.toFixed(2)),
          montoUSD: cartTotalUSD,
          referencia: referenciaInput.trim() || undefined
        });
      }
    } else {
      // If there are already payments and still remaining balance, and cashier pressed the main button without a debtor client:
      // Auto-cover the remaining balance with currently selected payment method
      const currentPagadoUSD = effectivePagos.reduce((acc, p) => acc + p.montoUSD, 0);
      const remainingFaltaUSD = Number((cartTotalUSD - currentPagadoUSD).toFixed(2));
      if (remainingFaltaUSD > 0.009 && !selectedCliente) {
        const option = paymentOptions[selectedPaymentIdx];
        const restEnMoneda = option.isUSD ? remainingFaltaUSD : remainingFaltaUSD * config.tasaCambioUSD;
        effectivePagos.push({
          id: Math.random().toString(),
          metodo: option.id,
          label: option.label,
          isUSD: option.isUSD,
          monto: Number(restEnMoneda.toFixed(2)),
          montoUSD: remainingFaltaUSD,
          referencia: referenciaInput.trim() || undefined
        });
      }
    }

    const effectiveTotalPagadoUSD = effectivePagos.reduce((acc, p) => acc + p.montoUSD, 0);
    const effectiveFaltaUSD = Number((cartTotalUSD - effectiveTotalPagadoUSD).toFixed(2));
    const effectiveIsCredito = effectiveFaltaUSD > 0.009;

    // Check if there is remaining credit and debtor is missing
    if (effectiveIsCredito && !selectedCliente) {
      setShowClienteSelectModal(true);
      toast.error(`Falta por cobrar $${formatUSD(effectiveFaltaUSD)}. Selecciona un cliente para registrar la parte a Crédito (Fiado).`, {
        icon: '⚠️',
        duration: 4500
      });
      return;
    }

    let finalMethod: MetodoPago = 'Mixto';
    if (effectivePagos.length === 0 && effectiveIsCredito) {
      finalMethod = 'Fiado';
    } else if (effectivePagos.length === 1 && !effectiveIsCredito) {
      const lbl = effectivePagos[0].label;
      finalMethod = lbl.includes('Efectivo') 
        ? (effectivePagos[0].isUSD ? 'Divisa' : 'Efectivo') 
        : lbl.includes('Móvil') 
        ? 'Pago Móvil' 
        : 'Divisa';
    } else {
      finalMethod = 'Mixto';
    }

    const schemaItems = cart.map(item => {
      const { cantidad, ...producto } = item;
      return { producto: producto as any, cantidad };
    });

    const desgloseFormat: DesglosePagoItem[] = effectivePagos.map(p => ({
      id: p.id,
      metodo: p.metodo,
      label: p.label,
      isUSD: p.isUSD,
      monto: p.monto,
      montoUSD: p.montoUSD,
      referencia: p.referencia
    }));

    const montoCredito = effectiveIsCredito ? effectiveFaltaUSD : 0;
    const montoAbonado = effectiveTotalPagadoUSD;

    // Detectar si la venta fue cobrada total o parcialmente con Punto de Venta
    const isPuntoDeVenta = 
      selectedPaymentIdx === 2 || 
      paymentOptions[selectedPaymentIdx]?.label === 'Punto de Venta' ||
      effectivePagos.some(p => p.label === 'Punto de Venta' || p.metodo === 'Punto de Venta');

    // Preparar datos oficiales de la Nota de Entrega SENIAT
    const now = new Date();
    const fechaHoraStr = `${now.toLocaleDateString('es-VE')} ${now.toLocaleTimeString('es-VE')}`;
    const correlativoControl = `NE-${now.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const notaData: NotaEntregaData = {
      numeroControl: correlativoControl,
      fechaHora: fechaHoraStr,
      items: cart.map(item => {
        const { cantidad, ...producto } = item;
        return { producto: producto as any, cantidad };
      }),
      cliente: selectedCliente,
      metodoPago: 'Punto de Venta',
      totalUSD: cartTotalUSD,
      tasaCambio: config.tasaCambioUSD,
      totalBs: cartTotalLocal,
    };

    onCompletarVenta(
      schemaItems as any, 
      cartTotalUSD, 
      finalMethod, 
      selectedCliente?.ID_Cliente,
      desgloseFormat,
      montoCredito,
      montoAbonado
    );
    
    soundEffects.playCashRegisterChime();

    if (isPuntoDeVenta) {
      setNotaEntregaData(notaData);
      setShowNotaEntregaModal(true);
      toast.success(`💳 Venta cobrada con Punto de Venta. Generando Nota de Entrega SENIAT...`, {
        icon: '📄',
        duration: 4000
      });
    } else if (effectiveIsCredito && selectedCliente) {
      toast.success(
        `🎉 Venta registrada: Cobrado $${formatUSD(effectiveTotalPagadoUSD)} y Fiado $${formatUSD(effectiveFaltaUSD)} a ${selectedCliente.Nombre_Completo}`,
        { duration: 5000 }
      );
    } else if (effectiveFaltaUSD < -0.01) {
      toast.success(
        `💵 Venta cobrada. Vuelto al cliente: $${formatUSD(Math.abs(effectiveFaltaUSD))} (Bs. ${(Math.abs(effectiveFaltaUSD) * config.tasaCambioUSD).toFixed(2)})`,
        { duration: 5000 }
      );
    } else {
      toast.success(`⚡ Venta cobrada con éxito ($${formatUSD(cartTotalUSD)})`);
    }

    setCart([]);
    setPagos([]);
    setMontoInput('');
    setReferenciaInput('');
    setSelectedCliente(null);
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 h-full w-full bg-transparent text-white select-none overflow-hidden font-sans">
      
      {/* ========================================================================= */}
      {/* LEFT / CENTER PANEL: PRODUCT CATALOG WORKSTATION (Desktop & Mobile)      */}
      {/* ========================================================================= */}
      <div className="lg:col-span-6 xl:col-span-6 2xl:col-span-6 flex flex-col h-full overflow-hidden border-b lg:border-b-0 lg:border-r border-white/10">
        
        {/* Top Header / Search / Filter Bar */}
        <div className="p-2 sm:p-2.5 bg-[#101115] border-b border-white/10 flex flex-col gap-2">
          {/* Search Row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
              <input 
                ref={searchInputRef}
                type="text"
                placeholder="Buscar o escanear código (presiona / o F6)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full bg-[#15161A] border border-[#D4AF37]/25 focus:border-[#D4AF37] focus:shadow-[0_0_15px_rgba(212,175,55,0.25)] rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-white placeholder-gray-500 outline-none transition-all font-mono"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Desktop Workstation View Mode Toggle */}
            <div className="flex items-center gap-1 bg-[#15161A] border border-[#D4AF37]/25 rounded-xl p-1 shrink-0">
              <button
                type="button"
                onClick={() => setCatalogViewMode('grid')}
                title="Vista Cuadrícula / Tarjetas"
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  catalogViewMode === 'grid'
                    ? 'bg-gradient-to-r from-[#F5DA76] to-[#D4AF37] text-black shadow-sm font-bold'
                    : 'text-gray-400 hover:text-[#FFF0BA] hover:bg-[#D4AF37]/10'
                }`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                type="button"
                onClick={() => setCatalogViewMode('table')}
                title="Vista Lista / Tabla Rápida de Mostrador"
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  catalogViewMode === 'table'
                    ? 'bg-gradient-to-r from-[#F5DA76] to-[#D4AF37] text-black shadow-sm font-bold'
                    : 'text-gray-400 hover:text-[#FFF0BA] hover:bg-[#D4AF37]/10'
                }`}
              >
                <List size={16} />
              </button>
            </div>

            {/* Direct Tasa Button */}
            <button 
              onClick={() => setShowTasaModal(true)}
              className="flex items-center gap-1.5 font-mono text-xs border border-[#D4AF37]/50 bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 rounded-xl px-2.5 py-2 active:scale-95 transition-all text-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.15)] cursor-pointer shrink-0"
              title="Tasa oficial BCV"
            >
              <span className="font-bold hidden sm:inline">BCV:</span>
              <span className="font-bold">
                Bs. {(Number(config?.tasaCambioUSD) || 1).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </button>
          </div>

          {/* Category Dropdown Filter Bar */}
          <div className="flex items-center gap-2 relative z-30" ref={categoryDropdownRef}>
            
            {/* The Dropdown Selector Button */}
            <div className="relative flex-1 max-w-md sm:max-w-lg">
              <button
                type="button"
                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl border text-xs transition-all cursor-pointer shadow-sm group active:scale-[0.99] ${
                  selectedCategory !== 'Todos'
                    ? 'bg-gradient-to-r from-[#D4AF37]/20 via-[#1C1D24] to-[#121316] border-[#D4AF37] text-white shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                    : 'bg-[#15161B] border-white/10 hover:border-[#D4AF37]/50 text-gray-200'
                }`}
                title="Filtrar catálogo por categoría"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${
                    selectedCategory !== 'Todos'
                      ? 'bg-[#D4AF37] text-black border-[#FFF0BA]'
                      : 'bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/30'
                  }`}>
                    <Layers size={13} />
                  </div>
                  <div className="flex flex-col text-left min-w-0">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-gray-400 leading-none">
                      Filtrar por Categoría:
                    </span>
                    <span className="font-bold text-xs truncate mt-0.5 text-white group-hover:text-[#FFF0BA]">
                      {selectedCategory === 'Todos' ? 'Todas las Categorías' : selectedCategory}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                    selectedCategory !== 'Todos'
                      ? 'bg-[#D4AF37]/30 text-[#FFF0BA] border border-[#D4AF37]/50'
                      : 'bg-white/5 text-gray-400 border border-white/10'
                  }`}>
                    {selectedCategory === 'Todos'
                      ? `${productos.length} ítems`
                      : `${productCountByCategory[selectedCategory] || 0} ítems`}
                  </span>
                  <ChevronDown
                    size={15}
                    className={`text-gray-400 group-hover:text-[#D4AF37] transition-transform duration-200 ${
                      isCategoryDropdownOpen ? 'rotate-180 text-[#D4AF37]' : ''
                    }`}
                  />
                </div>
              </button>

              {/* The Dropdown Popover */}
              {isCategoryDropdownOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-full sm:min-w-[340px] max-w-md bg-[#121317] border border-[#D4AF37]/70 rounded-2xl shadow-[0_14px_45px_rgba(0,0,0,0.95)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md">
                  
                  {/* Search inside dropdown */}
                  <div className="p-2.5 border-b border-white/10 bg-black/70 sticky top-0 z-10">
                    <div className="relative flex items-center">
                      <Search size={14} className="absolute left-2.5 text-[#D4AF37]" />
                      <input
                        type="text"
                        value={categorySearchQuery}
                        onChange={(e) => setCategorySearchQuery(e.target.value)}
                        placeholder="Escribe para buscar categoría..."
                        autoFocus
                        className="w-full bg-[#1A1B22] border border-[#D4AF37]/30 focus:border-[#D4AF37] rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-gray-500 outline-none font-mono"
                      />
                      {categorySearchQuery && (
                        <button
                          type="button"
                          onClick={() => setCategorySearchQuery('')}
                          className="absolute right-2 text-gray-400 hover:text-white p-0.5 cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Categories List */}
                  <div className="max-h-64 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
                    {filteredDropdownCategories.map((cat) => {
                      const isSelected = selectedCategory === cat;
                      const count = productCountByCategory[cat] ?? 0;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(cat);
                            setIsCategoryDropdownOpen(false);
                            setCategorySearchQuery('');
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all text-left cursor-pointer group ${
                            isSelected
                              ? 'bg-gradient-to-r from-[#F5DA76] via-[#D4AF37] to-[#A88120] text-black font-black shadow-md'
                              : 'text-gray-200 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${
                              isSelected ? 'bg-black' : 'bg-[#D4AF37]/60 group-hover:bg-[#D4AF37]'
                            }`} />
                            <span className="truncate">
                              {cat === 'Todos' ? '🌟 Todas las Categorías' : cat}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                              isSelected
                                ? 'bg-black/25 text-black'
                                : 'bg-black/40 text-gray-400 border border-white/5'
                            }`}>
                              {count} {count === 1 ? 'ítem' : 'ítems'}
                            </span>
                            {isSelected && (
                              <Check size={14} strokeWidth={3} className="text-black shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    })}

                    {filteredDropdownCategories.length === 0 && (
                      <div className="py-6 text-center text-gray-400 text-xs">
                        No se encontró ninguna categoría con ese nombre.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Reset Button if not 'Todos' */}
            {selectedCategory !== 'Todos' && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('Todos');
                  setIsCategoryDropdownOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#FFF0BA] text-xs font-mono font-bold transition-all cursor-pointer active:scale-95 shrink-0 shadow-sm"
                title="Quitar filtro y mostrar todas las categorías"
              >
                <X size={13} className="text-[#D4AF37]" />
                <span>Ver Todos</span>
              </button>
            )}

            {/* Total Results Counter */}
            <div className="ml-auto text-right text-[11px] font-mono text-gray-400 hidden sm:block shrink-0">
              <span className="text-white font-bold">{desktopCatalogProducts.length}</span>
              <span className="text-gray-500"> / {productos.length} productos</span>
            </div>
          </div>
        </div>

        {/* Product Catalog Workstation (Desktop Visual Mode: Grid or Table) */}
        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          {desktopCatalogProducts.length === 0 ? (
            <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-gray-500 p-8 text-center bg-white/[0.01] rounded-2xl border border-dashed border-white/5">
              <Package size={36} className="mb-2 text-[#00E676]/40" />
              <h4 className="text-sm font-bold text-gray-300">No se encontraron productos</h4>
              <p className="text-xs text-gray-500 mt-1 max-w-sm">
                {searchTerm ? `No hay coincidencias para "${searchTerm}"` : 'Agrega productos en el Módulo de Inventario para visualizarlos aquí.'}
              </p>
            </div>
          ) : catalogViewMode === 'table' ? (
            /* DESKTOP TABLE VIEW (Rapid Retail Counter Mode) */
            <div className="overflow-x-auto custom-scrollbar border border-white/10 rounded-xl bg-[#141519]">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-[#18191E] text-gray-400 border-b border-white/10 text-[10px] uppercase font-sans">
                    <th className="p-2.5">SKU / Barras</th>
                    <th className="p-2.5">Producto</th>
                    <th className="p-2.5">Categoría</th>
                    <th className="p-2.5 text-center">Stock</th>
                    <th className="p-2.5 text-right">Precio USD</th>
                    <th className="p-2.5 text-right">Precio ({config?.simboloMonedaLocal || 'Bs.'})</th>
                    <th className="p-2.5 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {desktopCatalogProducts.map((prod) => {
                    const isOutOfStock = prod.Stock_Actual <= 0;
                    const isLowStock = prod.Stock_Actual <= prod.Stock_Minimo;
                    const inCartItem = cart.find(c => c.ID_Producto === prod.ID_Producto);

                    return (
                      <tr 
                        key={prod.ID_Producto} 
                        onClick={() => !isOutOfStock && addToCart(prod)}
                        className={`transition-colors cursor-pointer ${
                          isOutOfStock 
                            ? 'opacity-40 cursor-not-allowed bg-black/20' 
                            : inCartItem 
                            ? 'bg-[#D4AF37]/15 hover:bg-[#D4AF37]/20' 
                            : 'hover:bg-[#D4AF37]/5'
                        }`}
                      >
                        <td className="p-2.5 text-gray-400 font-mono text-[11px]">
                          {prod.Codigo_Barras || '-'}
                        </td>
                        <td className="p-2.5 font-bold text-white font-sans text-xs">
                          {prod.Nombre}
                        </td>
                        <td className="p-2.5 text-gray-400">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#121316] border border-[#D4AF37]/20 text-gray-300">
                            {prod.Categoria || 'General'}
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          <span className={`font-bold ${isOutOfStock ? 'text-red-500' : isLowStock ? 'text-amber-400' : 'text-gray-300'}`}>
                            {prod.Stock_Actual} {formatUnit(prod.Unidad_Medida)}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-black text-[#ECC855]">
                          ${formatUSD(prod.Precio_Venta)}
                        </td>
                        <td className="p-2.5 text-right text-gray-300">
                          Bs. {formatBs(prod.Precio_Venta)}
                        </td>
                        <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            disabled={isOutOfStock}
                            onClick={() => addToCart(prod)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              isOutOfStock
                                ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                                : inCartItem
                                ? 'bg-gradient-to-r from-[#F5DA76] to-[#D4AF37] text-black font-black shadow-[0_0_10px_rgba(212,175,55,0.4)]'
                                : 'bg-[#15161A] hover:bg-[#D4AF37] hover:text-black border border-[#D4AF37]/30 text-gray-200'
                            }`}
                          >
                            {inCartItem ? `+${inCartItem.cantidad}` : '+ Agregar'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* DESKTOP GRID VIEW */
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-2">
              {desktopCatalogProducts.map((prod) => {
                const isOutOfStock = prod.Stock_Actual <= 0;
                const isLowStock = prod.Stock_Actual <= prod.Stock_Minimo;
                const inCartItem = cart.find(c => c.ID_Producto === prod.ID_Producto);

                return (
                  <button
                    key={prod.ID_Producto}
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => addToCart(prod)}
                    className={`group relative flex flex-col justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer active:scale-95 ${
                      isOutOfStock
                        ? 'bg-[#121214] border-white/5 opacity-50 cursor-not-allowed'
                        : inCartItem
                        ? 'bg-[#181610] border-[#D4AF37] shadow-[0_0_16px_rgba(212,175,55,0.25)] hover:border-[#F5DA76]'
                        : 'bg-[#13151A] border-[#D4AF37]/15 hover:border-[#D4AF37]/60 hover:bg-[#181A22] shadow-sm'
                    }`}
                  >
                    {/* Cart counter badge if added */}
                    {inCartItem && (
                      <span className="absolute top-1.5 right-1.5 bg-gradient-to-r from-[#F5DA76] to-[#D4AF37] text-black text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                        {inCartItem.cantidad}
                      </span>
                    )}

                    {/* Top: Name & Category */}
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-gray-400 font-mono block truncate">
                        {prod.Categoria || 'General'}
                      </span>
                      <h4 className="font-bold text-xs text-white line-clamp-2 mt-0.5 group-hover:text-[#FFF0BA] transition-colors leading-snug">
                        {prod.Nombre}
                      </h4>
                    </div>

                    {/* Bottom: Stock & Price */}
                    <div className="mt-2 pt-1.5 border-t border-white/10 flex items-baseline justify-between gap-1">
                      <div>
                        <div className="text-sm sm:text-base font-black text-[#ECC855] font-mono leading-none">
                          ${formatUSD(prod.Precio_Venta)}
                        </div>
                        <div className="text-[10px] text-gray-300 font-mono mt-0.5">
                          Bs. {formatBs(prod.Precio_Venta)}
                        </div>
                      </div>

                      <span className={`text-[10px] font-mono font-medium shrink-0 ${isLowStock ? 'text-amber-400' : 'text-gray-400'}`}>
                        {prod.Stock_Actual} {formatUnit(prod.Unidad_Medida)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT PANEL: CART & CHECKOUT TERMINAL WORKSTATION                         */}
      {/* ========================================================================= */}
      <div className="lg:col-span-6 xl:col-span-6 2xl:col-span-6 flex flex-col h-full bg-[#0D0E12] overflow-hidden">
        
        {/* Cart Header */}
        <div className="p-2.5 sm:p-3 bg-[#131418] border-b border-[#D4AF37]/25 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart size={17} className="text-[#D4AF37]" />
            <h3 className="text-sm font-bold text-white uppercase font-display tracking-wider">Órden Actual</h3>
            <span className="bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#FFF0BA] text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
              {cart.reduce((a, c) => a + c.cantidad, 0)} ítems
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button 
              type="button"
              onClick={() => {
                const now = new Date();
                const fechaHoraStr = `${now.toLocaleDateString('es-VE')} ${now.toLocaleTimeString('es-VE')}`;
                const correlativoControl = `NE-${now.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
                setNotaEntregaData({
                  numeroControl: correlativoControl,
                  fechaHora: fechaHoraStr,
                  items: cart.map(item => {
                    const { cantidad, ...prod } = item;
                    return { producto: prod as any, cantidad };
                  }),
                  cliente: selectedCliente,
                  metodoPago: paymentOptions[selectedPaymentIdx].label,
                  totalUSD: cartTotalUSD,
                  tasaCambio: config.tasaCambioUSD,
                  totalBs: cartTotalLocal,
                });
                setShowNotaEntregaModal(true);
              }}
              disabled={cart.length === 0}
              title="Ver / Imprimir Nota de Entrega SENIAT"
              className="px-2 py-1 rounded-lg text-gray-300 hover:text-[#FFF0BA] bg-white/5 hover:bg-[#D4AF37]/20 border border-white/10 hover:border-[#D4AF37]/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 text-[11px] font-mono font-bold"
            >
              <FileText size={14} className="text-[#D4AF37]" />
              <span className="hidden sm:inline">Nota Entrega</span>
            </button>

            <button 
              onClick={() => setShowClearConfirm(true)}
              disabled={cart.length === 0}
              title="Vaciar carrito"
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-all disabled:opacity-30 cursor-pointer"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Live Subtotal & Total Indicator Bar while mounting items */}
        {cart.length > 0 && (
          <div className="px-3 py-1.5 bg-[#0F1014] border-b border-[#D4AF37]/25 flex items-center justify-between text-xs font-mono shadow-inner animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 text-gray-300">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">SUBTOTAL:</span>
              <span className="font-bold text-white text-xs">${formatUSD(cartTotalUSD)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#FFF0BA] font-bold uppercase tracking-wider">TOTAL A COBRAR:</span>
              <span className="font-black text-[#ECC855] text-xs sm:text-sm">Bs. {formatBs(cartTotalUSD)}</span>
            </div>
          </div>
        )}

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-2.5 space-y-1.5 custom-scrollbar min-h-0">
          {cart.length === 0 ? (
            <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-gray-500 opacity-60">
              <ShoppingCart size={34} className="mb-1 text-[#D4AF37]/60" />
              <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-400">
                El carrito está vacío
              </span>
              <span className="text-[11px] text-gray-500 mt-0.5">Haz clic en los productos para agregarlos</span>
            </div>
          ) : (
            cart.map((item) => (
              <div 
                key={item.ID_Producto} 
                className="bg-[#16171C] border border-[#D4AF37]/20 hover:border-[#D4AF37]/50 px-2.5 py-1.5 rounded-xl flex items-center gap-2.5 transition-all shadow-sm"
              >
                {/* Quantity Controls */}
                <div className="flex items-center gap-0.5 bg-black/60 border border-[#D4AF37]/20 rounded-lg p-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => decrementQty(item.ID_Producto)}
                    className="w-5 h-5 rounded flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10 cursor-pointer"
                  >
                    <Minus size={11} />
                  </button>
                  <input 
                    type="number" 
                    step="any" 
                    value={item.cantidad || ''} 
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) setItemQty(item.ID_Producto, val);
                    }} 
                    className="font-bold text-white w-8 text-center bg-transparent outline-none hide-arrows text-xs font-mono" 
                  />
                  <button
                    type="button"
                    onClick={() => incrementQty(item.ID_Producto)}
                    className="w-5 h-5 rounded flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10 cursor-pointer"
                  >
                    <Plus size={11} />
                  </button>
                </div>
                
                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-white truncate leading-tight" title={item.Nombre}>
                    {item.Nombre}
                  </h4>
                  <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                    ${formatUSD(item.Precio_Venta)} • {formatUnit(item.Unidad_Medida)}
                  </div>
                </div>
                
                {/* Item Total */}
                <div className="text-right shrink-0">
                  <div className="font-bold text-white text-xs font-mono leading-tight">
                    Bs. {formatBs(item.Precio_Venta * item.cantidad)}
                  </div>
                  <div className="text-[11px] text-[#ECC855] font-black font-mono">
                    ${formatUSD(item.Precio_Venta * item.cantidad)}
                  </div>
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeFromCart(item.ID_Producto)}
                  className="text-gray-400 hover:text-red-400 p-1 rounded hover:bg-white/10 cursor-pointer transition-colors shrink-0"
                  title="Eliminar de la orden"
                >
                  <X size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Bottom Checkout & Payment Terminal Workstation */}
        <div className="p-2.5 sm:p-3 bg-[#101115] border-t border-[#D4AF37]/25 flex flex-col gap-2.5 shrink-0 max-h-[62vh] overflow-y-auto custom-scrollbar">
          
          {/* 1. Resumen Financiero: SUBTOTAL & TOTAL CLARO Y DESTACADO */}
          <div className="bg-gradient-to-br from-[#1A1B22] via-[#14151B] to-[#0D0E12] p-3 rounded-2xl border border-[#D4AF37]/40 shadow-[0_0_25px_rgba(212,175,55,0.08)] flex flex-col gap-2">
            
            {/* Fila Clara de Subtotal */}
            <div className="flex items-center justify-between pb-1.5 border-b border-white/10 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">SUBTOTAL</span>
                <span className="text-[10px] bg-white/10 text-gray-300 px-1.5 py-0.2 rounded font-mono">
                  {cart.reduce((a, c) => a + c.cantidad, 0)} {cart.reduce((a, c) => a + c.cantidad, 0) === 1 ? 'artículo' : 'artículos'}
                </span>
              </div>
              <div className="text-right flex items-baseline gap-2">
                <span className="font-bold text-gray-300 text-xs">
                  Bs. {formatBs(cartTotalUSD)}
                </span>
                <span className="font-bold text-[#ECC855] text-xs">
                  (${formatUSD(cartTotalUSD)})
                </span>
              </div>
            </div>

            {/* Total General a Cobrar (Ultra Destacado y Claro) */}
            <div className="flex items-end justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#FFF0BA] font-mono">
                    TOTAL GENERAL:
                  </span>
                  <span className="text-[9px] font-mono text-gray-400 bg-white/5 border border-white/10 px-1.5 py-0.2 rounded">
                    Tasa: Bs. {config.tasaCambioUSD.toFixed(2)}
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFF0BA] via-[#D4AF37] to-[#ECC855] leading-tight font-mono tracking-tight">
                  Bs. {formatBs(cartTotalUSD)}
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] text-gray-400 uppercase font-mono block">En Dólares</span>
                <div className="text-lg sm:text-xl font-black text-[#00E676] font-mono leading-none flex items-baseline justify-end gap-1">
                  <span>${formatUSD(cartTotalUSD)}</span>
                  <span className="text-[11px] text-gray-400 font-normal">USD</span>
                </div>
              </div>
            </div>

            {/* Barra de progreso de pago si hay abonos */}
            {pagos.length > 0 && cartTotalUSD > 0 && (
              <div className="pt-2 border-t border-white/10 flex flex-col gap-1.5">
                <div className="w-full bg-black/60 rounded-full h-2 overflow-hidden border border-white/10 p-[1px]">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      faltaUSD < -0.009 
                        ? 'bg-gradient-to-r from-[#00E676] to-emerald-400' 
                        : faltaUSD <= 0.009 
                        ? 'bg-gradient-to-r from-[#00E676] via-[#D4AF37] to-[#ECC855]' 
                        : 'bg-gradient-to-r from-[#D4AF37] to-[#00E676]'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, (totalPagadoUSD / cartTotalUSD) * 100))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Abonado: <strong className="text-white">${formatUSD(totalPagadoUSD)}</strong>
                  </span>

                  {faltaUSD > 0.009 ? (
                    <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                      Resta: <strong className="text-[#FFF0BA]">Bs. {formatBs(faltaUSD)}</strong> <span className="text-gray-400 text-[10px]">(${formatUSD(faltaUSD)})</span>
                    </span>
                  ) : faltaUSD < -0.009 ? (
                    <span className="flex items-center gap-1.5 text-emerald-300 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Vuelto: <strong className="text-white">Bs. {Math.abs(faltaBs).toFixed(2)}</strong> <span className="text-emerald-400 text-[10px]">(${formatUSD(Math.abs(faltaUSD))})</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[#00E676] font-bold">
                      <Check size={12} className="stroke-[3]" />
                      100% Cubierto
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. Lista de Abonos Realizados */}
          {pagos.length > 0 && (
            <div className="bg-[#15161C] border border-white/10 rounded-2xl p-2.5 flex flex-col gap-1.5 shadow-sm">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-gray-300">
                <span className="flex items-center gap-1.5 text-gray-200">
                  <Coins size={13} className="text-[#00E676]" />
                  Abonos Realizados ({pagos.length})
                </span>
                <span className="text-[11px] text-gray-400 font-normal">
                  {Math.round((totalPagadoUSD / (cartTotalUSD || 1)) * 100)}% cubierto
                </span>
              </div>

              <div className="flex flex-col gap-1 max-h-24 overflow-y-auto custom-scrollbar pr-0.5">
                {pagos.map((p) => {
                  const opt = paymentOptions.find(o => o.id === p.metodo || o.label === p.label);
                  const IconComp = opt?.icon || Coins;
                  return (
                    <div 
                      key={p.id} 
                      className="flex items-center justify-between px-2.5 py-1.5 bg-black/45 rounded-xl border border-white/10 text-xs font-mono hover:border-white/20 transition-all"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`p-1 rounded-md ${opt ? opt.bg : 'bg-white/10'} ${opt ? opt.color : 'text-white'} shrink-0`}>
                          <IconComp size={12} />
                        </div>
                        <span className="text-gray-200 font-semibold truncate text-xs">{p.label}</span>
                        {p.referencia && (
                          <span className="text-[10px] text-gray-300 bg-white/10 px-1.5 py-0.5 rounded truncate max-w-[90px]">
                            Ref: {p.referencia}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-white font-bold text-xs">
                          {p.isUSD ? '$' : 'Bs.'} {p.monto.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          {!p.isUSD && (
                            <span className="text-[10px] text-gray-400 ml-1 font-normal">
                              (~${formatUSD(p.montoUSD)})
                            </span>
                          )}
                        </span>
                        <button 
                          type="button"
                          onClick={() => handleRemovePago(p.id)} 
                          title="Eliminar este abono"
                          className="text-gray-500 hover:text-red-400 p-1 rounded hover:bg-white/10 cursor-pointer transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Selector Compacto de Forma de Pago & Entrada de Monto */}
          <div className="bg-[#15161C] border border-white/10 rounded-2xl p-2 sm:p-2.5 flex flex-col gap-1.5 shadow-sm">
            <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono px-0.5">
              <span className="flex items-center gap-1.5 text-gray-300">
                <Coins size={12} className="text-[#D4AF37]" />
                {pagos.length > 0 ? 'Método para siguiente abono:' : 'Forma de Pago:'}
              </span>
              <span className="text-[10px] text-[#FFF0BA] font-bold font-mono px-1.5 py-0.2 rounded bg-[#D4AF37]/10 border border-[#D4AF37]/20">
                {paymentOptions[selectedPaymentIdx].label}
              </span>
            </div>

            {/* 4 Botones de Pago Compactos (Sleek Ribbon en 4 Columnas) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {paymentOptions.map((opt, idx) => {
                const isSelected = selectedPaymentIdx === idx;
                const IconComp = opt.icon;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setSelectedPaymentIdx(idx)}
                    className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border text-center transition-all cursor-pointer relative ${
                      isSelected
                        ? `${opt.activeBg} ${opt.activeBorder} ${opt.glow} ring-1 ring-white/30`
                        : 'bg-black/50 border-white/10 hover:border-white/25 hover:bg-white/5 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <IconComp size={14} className={`shrink-0 ${isSelected ? opt.color : 'text-gray-400'}`} />
                    <span className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                      {opt.label}
                    </span>
                    <span className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold shrink-0 ${
                      opt.isUSD 
                        ? 'bg-[#00E676]/20 text-[#00E676]' 
                        : 'bg-[#D4AF37]/20 text-[#D4AF37]'
                    }`}>
                      {opt.badge}
                    </span>
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#00E676]"></span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Opciones de Cobro del Monto */}
            {cart.length > 0 && (
              <div className="flex flex-col gap-1.5 pt-1.5 border-t border-white/10">
                
                {/* Botón de 1 solo clic para abonar el restante exacto (visible si hay abonos previos y queda saldo) */}
                {pagos.length > 0 && faltaUSD > 0.009 && (
                  <button
                    type="button"
                    onClick={handlePagarRestanteExacto}
                    className="w-full py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37]/20 via-[#D4AF37]/30 to-[#ECC855]/20 hover:from-[#D4AF37]/35 hover:to-[#ECC855]/35 border border-[#D4AF37]/50 hover:border-[#D4AF37] text-[#FFF0BA] text-xs font-bold font-mono flex items-center justify-between transition-all cursor-pointer shadow-sm active:scale-98 group"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-[#D4AF37]/30 text-white text-[10px] font-black">⚡ 1-CLIC</span>
                      <span>Abonar resto con {paymentOptions[selectedPaymentIdx].label}:</span>
                    </span>
                    <span className="font-black text-sm text-white group-hover:scale-105 transition-transform">
                      {paymentOptions[selectedPaymentIdx].isUSD ? `$${formatUSD(faltaUSD)}` : `Bs. ${formatBs(faltaUSD)}`}
                    </span>
                  </button>
                )}

                {/* Fila Limpia: Monto Manual + Botón Abonar */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#D4AF37] font-mono text-xs font-bold pointer-events-none">
                      {paymentOptions[selectedPaymentIdx].isUSD ? '$' : 'Bs.'}
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      placeholder={faltaUSD > 0.009 ? "Monto a abonar..." : `Monto (${paymentOptions[selectedPaymentIdx].isUSD ? '$' : 'Bs.'})...`}
                      value={montoInput}
                      onChange={(e) => setMontoInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddPago(); }}
                      className="w-full bg-black/60 border border-white/15 focus:border-[#D4AF37] rounded-xl pl-8 pr-3 py-1.5 text-white font-mono font-bold text-xs outline-none transition-all placeholder:text-gray-500"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={cart.length === 0 || !montoInput}
                    onClick={() => handleAddPago()}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-[#F5DA76] via-[#D4AF37] to-[#A88120] hover:brightness-110 text-black rounded-xl font-black text-xs active:scale-95 transition-all shadow-[0_0_12px_rgba(212,175,55,0.3)] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <Plus size={14} className="stroke-[3]" />
                    <span>Abonar</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 4. Estado de Saldo / Asistente de Fiado / Vuelto */}
          {cart.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {/* Caso: Vuelto al cliente si pagó de más */}
              {faltaUSD < -0.009 ? (
                <div className="p-2.5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-between shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block leading-none font-mono">
                        Cambio (Vuelto al Cliente):
                      </span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-base font-black text-white font-mono leading-none">
                          Bs. {Math.abs(faltaBs).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-xs text-emerald-300 font-mono font-bold">
                          (${formatUSD(Math.abs(faltaUSD))})
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowVueltoModal(true)}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 text-xs font-bold font-mono transition-all cursor-pointer"
                  >
                    Asistente Vuelto
                  </button>
                </div>
              ) : faltaUSD <= 0.009 && pagos.length > 0 ? (
                /* Caso: Cuenta 100% Cubierta con abonos */
                <div className="p-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-300 font-mono">
                  <CheckCircle2 size={15} className="text-emerald-400" />
                  <span>Cuenta 100% Cubierta al Contado</span>
                </div>
              ) : null}

              {/* Si hay un cliente seleccionado para Fiado */}
              {selectedCliente && (
                <div className="p-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/40">
                      <UserCheck size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                        <span>{selectedCliente.Nombre_Completo}</span>
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1 rounded font-mono">Fiado</span>
                      </div>
                      <div className="text-[10px] text-gray-300 font-mono">
                        {faltaUSD > 0.009 ? (
                          <>Queda a cuenta: <strong className="text-amber-400">${formatUSD(faltaUSD)} (Bs. {formatBs(faltaUSD)})</strong></>
                        ) : (
                          <span className="text-emerald-400 font-bold">Cuenta cubierta (Cliente asociado)</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCliente(null)}
                    className="text-gray-400 hover:text-red-400 text-[11px] font-mono px-2 py-1 rounded hover:bg-white/5 cursor-pointer shrink-0"
                    title="Desvincular cliente"
                  >
                    Quitar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 5. Distribución de Botones de Acción (Cliente/Fiado + Botón de Cobro) */}
          <div className="flex items-center gap-2 pt-0.5 safe-bottom">
            {/* Botón de Asignar Cliente / Fiado directo */}
            <button
              type="button"
              onClick={() => setShowClienteSelectModal(true)}
              disabled={cart.length === 0}
              className={`py-3 px-3 sm:px-3.5 rounded-xl font-bold font-mono text-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border ${
                cart.length === 0
                  ? 'bg-white/5 text-gray-600 border-white/5 cursor-not-allowed'
                  : selectedCliente
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)] hover:bg-amber-500/30'
                  : 'bg-black/60 border-white/15 hover:border-amber-500/50 text-gray-300 hover:text-amber-300 hover:bg-white/5'
              }`}
              title={selectedCliente ? `Cliente: ${selectedCliente.Nombre_Completo}` : "Asignar Cliente o Venta a Crédito / Fiado"}
            >
              <UserCheck size={16} className={selectedCliente ? 'text-amber-400' : 'text-gray-400'} />
              <span className="hidden sm:inline">
                {selectedCliente ? selectedCliente.Nombre_Completo.split(' ')[0] : 'Fiar / Cliente'}
              </span>
            </button>

            {/* Botón de Cobro Principal (Adaptativo & Destacado) */}
            <button 
              type="button"
              onClick={handleProcesar}
              disabled={cart.length === 0}
              className={`flex-1 rounded-xl font-black tracking-wider text-xs sm:text-sm transition-all duration-300 uppercase flex items-center justify-center gap-2 py-3 sm:py-3.5 cursor-pointer shadow-lg ${
                cart.length === 0
                  ? 'bg-white/5 text-gray-500 border border-white/10 cursor-not-allowed'
                  : selectedCliente && faltaUSD > 0.009
                  ? totalPagadoUSD > 0
                    ? 'bg-gradient-to-r from-amber-500 via-[#D4AF37] to-[#A88120] text-black shadow-[0_0_20px_rgba(245,158,11,0.35)] active:scale-95'
                    : 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 text-black shadow-[0_0_20px_rgba(245,158,11,0.35)] active:scale-95'
                  : pagos.length > 0 && faltaUSD > 0.009
                  ? 'bg-gradient-to-r from-[#D4AF37] via-[#ECC855] to-[#A88120] text-black shadow-[0_0_20px_rgba(212,175,55,0.35)] active:scale-95'
                  : faltaUSD < -0.009
                  ? 'bg-gradient-to-r from-[#00E676] via-[#10B981] to-[#059669] text-black shadow-[0_0_25px_rgba(0,230,118,0.4)] active:scale-95'
                  : 'bg-gradient-to-r from-[#F5DA76] via-[#D4AF37] to-[#A88120] text-black shadow-[0_0_25px_rgba(212,175,55,0.45)] hover:brightness-110 active:scale-98'
              }`}
            >
              <span className="truncate">
                {cart.length === 0
                  ? 'AGREGA PRODUCTOS PARA COBRAR'
                  : selectedCliente && faltaUSD > 0.009
                  ? totalPagadoUSD > 0
                    ? `COBRAR $${formatUSD(totalPagadoUSD)} + FIAR $${formatUSD(faltaUSD)}`
                    : `FIAR A ${selectedCliente.Nombre_Completo.toUpperCase()} ($${formatUSD(cartTotalUSD)})`
                  : pagos.length > 0 && faltaUSD > 0.009
                  ? `COBRAR RESTO CON ${paymentOptions[selectedPaymentIdx].label.toUpperCase()} (${paymentOptions[selectedPaymentIdx].isUSD ? '$' + formatUSD(faltaUSD) : 'Bs. ' + formatBs(faltaUSD)})`
                  : faltaUSD < -0.009
                  ? `FINALIZAR VENTA (VUELTO $${formatUSD(Math.abs(faltaUSD))})`
                  : pagos.length > 0
                  ? `FINALIZAR VENTA ($${formatUSD(cartTotalUSD)})`
                  : `COBRAR CON ${paymentOptions[selectedPaymentIdx].label.toUpperCase()} ($${formatUSD(cartTotalUSD)})`
                }
              </span>
              <span className="text-[10px] opacity-80 font-mono px-1.5 py-0.5 bg-black/30 rounded font-bold shrink-0">F8</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODALS                                                                    */}
      {/* ========================================================================= */}
      {/* Tasa Modal */}
      <TasaModal
        isOpen={showTasaModal}
        onClose={() => setShowTasaModal(false)}
        config={config}
        onSaveTasa={onUpdateTasa}
        bcvData={bcvData}
        onRefreshBcv={onRefreshBcv}
      />

      {/* Selector de Cliente Deudor (Crédito / Fiado) */}
      {showClienteSelectModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18191E] border border-white/15 rounded-2xl w-full max-w-md p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-amber-400" />
                <h4 className="text-sm font-bold text-white uppercase font-display">
                  Identificar Cliente (SENIAT / Facturación / Fiado)
                </h4>
              </div>
              <button 
                onClick={() => setShowClienteSelectModal(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X size={16} />
              </button>
            </div>

            {faltaUSD > 0.009 ? (
              <div className="p-2.5 my-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-300 flex items-center justify-between">
                <span>Saldo que quedará fiado:</span>
                <strong className="text-amber-400 text-sm font-bold">${formatUSD(faltaUSD)} (Bs. {formatBs(faltaUSD)})</strong>
              </div>
            ) : (
              <div className="p-2.5 my-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-300 flex items-center justify-between font-mono">
                <span>Datos fiscales para Nota de Entrega SENIAT</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-bold">Oficial</span>
              </div>
            )}

            {/* Opción rápida: Consumidor Final */}
            <button
              type="button"
              onClick={() => {
                setSelectedCliente(null);
                setShowClienteSelectModal(false);
                toast('Asignado: Consumidor Final (Venta sin datos fiscales)', { icon: '👤' });
              }}
              className="w-full mb-2.5 p-2 rounded-xl border border-dashed border-white/20 hover:border-white/40 bg-white/[0.02] hover:bg-white/[0.06] text-xs font-semibold text-gray-300 flex items-center justify-between transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300 text-[10px] font-bold">SENIAT</span>
                <span>Continuar como Consumidor Final (Genérico)</span>
              </div>
              <span className="text-[10px] text-gray-500 font-mono">V-00000000</span>
            </button>

            {/* Search Input & Nuevo Cliente Button */}
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, Cédula/RIF o teléfono..."
                  value={clienteSearch}
                  onChange={(e) => setClienteSearch(e.target.value)}
                  className="w-full bg-[#121316] border border-white/15 focus:border-amber-400 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-gray-500 outline-none font-mono"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowNuevoClienteModal(true)}
                className="px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              >
                <UserPlus size={14} />
                <span>+ Registrar</span>
              </button>
            </div>

            {/* List of Clients */}
            <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
              {clientes.filter(c => 
                (c.Nombre_Completo || '').toLowerCase().includes(clienteSearch.toLowerCase()) ||
                (c.RIF_Cedula || '').toLowerCase().includes(clienteSearch.toLowerCase()) ||
                (c.Telefono_WhatsApp || '').includes(clienteSearch)
              ).length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-xs">
                  <p>No se encontraron clientes registrados.</p>
                  <button
                    type="button"
                    onClick={() => setShowNuevoClienteModal(true)}
                    className="mt-2 text-amber-400 hover:underline font-bold"
                  >
                    Registrar nuevo cliente fiscal aquí
                  </button>
                </div>
              ) : (
                clientes.filter(c => 
                  (c.Nombre_Completo || '').toLowerCase().includes(clienteSearch.toLowerCase()) ||
                  (c.RIF_Cedula || '').toLowerCase().includes(clienteSearch.toLowerCase()) ||
                  (c.Telefono_WhatsApp || '').includes(clienteSearch)
                ).map((c) => {
                  const nuevaDeuda = (c.Deuda_Total || 0) + faltaUSD;
                  const isExceeded = faltaUSD > 0 && nuevaDeuda > (c.Limite_Credito || 50);

                  return (
                    <button
                      key={c.ID_Cliente}
                      type="button"
                      onClick={() => {
                        setSelectedCliente(c);
                        setShowClienteSelectModal(false);
                        toast.success(`Cliente ${c.Nombre_Completo} seleccionado`);
                      }}
                      className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer group ${
                        selectedCliente?.ID_Cliente === c.ID_Cliente
                          ? 'border-amber-400 bg-amber-400/10'
                          : 'border-white/5 hover:border-amber-400/50 bg-white/[0.02] hover:bg-white/[0.06]'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-amber-300 flex items-center gap-1.5">
                          <span>{c.Nombre_Completo}</span>
                          {c.Categoria_Remarketing && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                              {c.Categoria_Remarketing}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                          <span className="text-gray-300 font-bold">{c.RIF_Cedula || 'Sin RIF'}</span>
                          {c.Telefono_WhatsApp ? ` • ${c.Telefono_WhatsApp}` : ''}
                          {c.Deuda_Total > 0 ? ` • Deuda: $${formatUSD(c.Deuda_Total)}` : ''}
                        </div>
                        {c.Direccion && (
                          <div className="text-[9px] text-gray-500 truncate max-w-[260px] mt-0.5">
                            📍 {c.Direccion}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        {faltaUSD > 0 ? (
                          <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                            isExceeded 
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                              : 'bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30'
                          }`}>
                            {isExceeded ? '⚠️ Supera Límite' : '✓ Disponible'}
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30">
                            ✓ Asignar
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-white/10 mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowClienteSelectModal(false)}
                className="py-1.5 px-4 bg-white/10 hover:bg-white/15 text-gray-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rápido de Nuevo Cliente (SENIAT / Fiado) */}
      {showNuevoClienteModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18191E] border border-white/15 rounded-2xl w-full max-w-sm p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2 uppercase font-sans">
              <UserPlus className="text-amber-400" size={16} />
              Registrar Cliente Fiscal (SENIAT)
            </h4>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-gray-400 font-bold block mb-1">Nombre Completo o Razón Social *</label>
                <input
                  type="text"
                  placeholder="Ej: Inversiones Los Teques C.A."
                  value={nuevoClienteNombre}
                  onChange={(e) => setNuevoClienteNombre(e.target.value)}
                  className="w-full bg-[#121316] border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-bold block mb-1">Cédula / RIF (SENIAT)</label>
                <input
                  type="text"
                  placeholder="Ej: V-12345678 o J-12345678-9"
                  value={nuevoClienteRif}
                  onChange={(e) => setNuevoClienteRif(e.target.value)}
                  className="w-full bg-[#121316] border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-bold block mb-1">Teléfono / WhatsApp</label>
                <input
                  type="text"
                  placeholder="Ej: 0414-1234567"
                  value={nuevoClienteTelefono}
                  onChange={(e) => setNuevoClienteTelefono(e.target.value)}
                  className="w-full bg-[#121316] border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-bold block mb-1">Dirección Fiscal</label>
                <input
                  type="text"
                  placeholder="Ej: Calle Bolívar, Local 12"
                  value={nuevoClienteDireccion}
                  onChange={(e) => setNuevoClienteDireccion(e.target.value)}
                  className="w-full bg-[#121316] border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-bold block mb-1">Límite de Crédito ($ USD)</label>
                <input
                  type="number"
                  step="5"
                  placeholder="50"
                  value={nuevoClienteLimite}
                  onChange={(e) => setNuevoClienteLimite(e.target.value)}
                  className="w-full bg-[#121316] border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowNuevoClienteModal(false)}
                className="flex-1 py-2 bg-white/10 hover:bg-white/15 text-gray-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGuardarNuevoCliente}
                className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold rounded-xl text-xs cursor-pointer shadow-sm"
              >
                Guardar y Asignar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Selection Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18191E] border border-white/15 rounded-2xl w-full max-w-sm p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2 uppercase font-sans">
              <CreditCard className="text-[#00E676]" size={16} />
              Seleccionar Método de Pago
            </h4>
            <div className="space-y-1.5">
              {paymentOptions.map((option, idx) => {
                const Icon = option.icon;
                const isSelected = selectedPaymentIdx === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedPaymentIdx(idx);
                      setShowPaymentModal(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? `${option.activeBg} ${option.activeBorder} ${option.glow} text-white`
                        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${option.bg} ${option.color}`}>
                        <Icon size={18} />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-sm text-white">{option.label}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{option.sublabel}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold font-mono ${option.isUSD ? 'bg-[#00E676]/20 text-[#00E676]' : 'bg-[#D4AF37]/20 text-[#D4AF37]'}`}>
                        {option.badge}
                      </span>
                      {isSelected && (
                        <span className="text-xs text-[#00E676] font-bold">✓</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowPaymentModal(false)}
              className="w-full mt-3 py-2 bg-white/10 hover:bg-white/15 text-gray-300 rounded-xl text-xs font-bold cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    
      {/* Vuelto Modal */}
      <VueltoModal 
        isOpen={showVueltoModal}
        onClose={() => setShowVueltoModal(false)}
        cambioTotalUSD={Math.abs(faltaUSD)}
        tasaCambio={config.tasaCambioUSD}
      />

      {/* Nota de Entrega Fiscal Modal (Normativa SENIAT / Punto de Venta) */}
      <NotaEntregaModal
        isOpen={showNotaEntregaModal}
        onClose={() => setShowNotaEntregaModal(false)}
        data={notaEntregaData}
        config={config}
      />

      {/* Clear Cart Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18191E] border border-white/15 rounded-2xl w-full max-w-sm p-6 flex flex-col items-center animate-in fade-in zoom-in duration-200">
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-3 border border-red-500/30">
              <Trash2 size={26} className="text-red-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-1 uppercase text-center">Vaciar Carrito</h3>
            <p className="text-xs text-gray-400 text-center mb-5">¿Deseas eliminar todos los artículos de la orden actual?</p>
            <div className="flex w-full gap-3">
              <button 
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  setCart([]);
                  setPagos([]);
                  setShowClearConfirm(false);
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs cursor-pointer"
              >
                Vaciar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
