import React, { useState, useMemo, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  Barcode,
  Layers,
  Edit2,
  Trash2,
  Store,
  Tag,
  Ruler,
  Lock,
  ImagePlus,
  X
} from 'lucide-react';
import { Producto, ConfiguracionApp, ColorProducto } from '../types/schema';
import { formatUSD, formatLocal } from '../utils/formatters';
import { soundEffects } from '../utils/audio';
import { useNativeBackHandler } from '../utils/nativeNavigation';
import { RUBROS_CATALOG, getRubroConfig, RubroDefinition } from '../data/rubrosConfig';
import { VentaMaestro } from '../types/schema';
import { SearchableCategorySelect } from './SearchableCategorySelect';
import { ProductNameCombobox, ProductOption } from './ProductNameCombobox';

const COLORES_RAPIDOS: ColorProducto[] = [
  { nombre: 'Negro', hex: '#111111' },
  { nombre: 'Blanco', hex: '#FFFFFF' },
  { nombre: 'Gris', hex: '#9CA3AF' },
  { nombre: 'Azul', hex: '#2563EB' },
  { nombre: 'Azul Marino', hex: '#1E3A8A' },
  { nombre: 'Rojo', hex: '#DC2626' },
  { nombre: 'Verde', hex: '#16A34A' },
  { nombre: 'Amarillo', hex: '#FACC15' },
  { nombre: 'Rosado', hex: '#EC4899' },
  { nombre: 'Beige', hex: '#D6C3A1' },
  { nombre: 'Marrón', hex: '#78350F' },
  { nombre: 'Morado', hex: '#7C3AED' },
];

// Reduce la foto a máx. 600px y la guarda como JPEG liviano (data URL)
const comprimirImagen = (file: File, maxSize = 600, quality = 0.75): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Imagen inválida'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas no disponible'));
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });

interface InventarioModuleProps {
  productos: Producto[];
  config: ConfiguracionApp;
  onActualizarStock: (prodId: string, cantidadSumar: number) => void;
  onCrearProducto: (nuevoProducto: Omit<Producto, 'ID_Producto'>) => void;
  onEditarProducto?: (productoEditado: Producto) => void;
  onEliminarProducto?: (idProducto: string) => void;
  role?: 'Administrador' | 'Cajero';
  isSuperAdmin?: boolean;
  ventas?: VentaMaestro[];
  onUpdateConfig?: (updated: Partial<ConfiguracionApp>) => void;
  onOpenConfigModal?: () => void;
}

export const InventarioModule: React.FC<InventarioModuleProps> = ({
  productos,
  config,
  onActualizarStock,
  onCrearProducto,
  onEditarProducto,
  onEliminarProducto,
  role = 'Administrador',
  isSuperAdmin = false,
  ventas = [],
  onUpdateConfig,
  onOpenConfigModal,
}) => {
  const [modalRubro, setModalRubro] = useState<string>(config?.rubro || 'Ropa Deportiva');

  useEffect(() => {
    if (config?.rubro) {
      setModalRubro(config.rubro);
    }
  }, [config?.rubro]);

  const rubroConfig = useMemo(() => {
    return getRubroConfig(modalRubro);
  }, [modalRubro]);

  // Custom user categories and units persisted in config
  const [customCategories, setCustomCategories] = useState<string[]>(config?.categoriasPersonalizadas || []);
  const [customUnits, setCustomUnits] = useState<string[]>(config?.unidadesPersonalizadas || []);

  useEffect(() => {
    if (config?.categoriasPersonalizadas) {
      setCustomCategories(config.categoriasPersonalizadas);
    }
    if (config?.unidadesPersonalizadas) {
      setCustomUnits(config.unidadesPersonalizadas);
    }
  }, [config?.categoriasPersonalizadas, config?.unidadesPersonalizadas]);

  // Merge and deduplicate all categories (rubro presets + custom + product categories)
  const allCategories = useMemo(() => {
    const list = [...rubroConfig.categories, ...customCategories];
    productos.forEach((p) => {
      if (p.Categoria && !list.includes(p.Categoria)) {
        list.push(p.Categoria);
      }
    });
    return Array.from(new Set(list.filter(Boolean)));
  }, [rubroConfig.categories, customCategories, productos]);

  // Merge and deduplicate all units
  const allUnits = useMemo(() => {
    const base = rubroConfig.availableUnits.map(u => ({ value: u.value, label: u.label }));
    customUnits.forEach(u => {
      if (!base.some(b => b.value.toLowerCase() === u.toLowerCase())) {
        base.push({ value: u, label: `${u} (Personalizada)` });
      }
    });
    productos.forEach(p => {
      if (p.Unidad_Medida && !base.some(b => b.value.toLowerCase() === p.Unidad_Medida.toLowerCase())) {
        base.push({ value: p.Unidad_Medida, label: p.Unidad_Medida });
      }
    });
    return base;
  }, [rubroConfig.availableUnits, customUnits, productos]);

  // Count items per category for search helper
  const categoryProductCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    productos.forEach((p) => {
      if (p.Categoria) {
        counts[p.Categoria] = (counts[p.Categoria] || 0) + 1;
      }
    });
    return counts;
  }, [productos]);

  const formatUnit = (unidad: string) => {
    switch (unidad) {
      case 'Kilogramo': return 'Kg';
      case 'Gramos': return 'g';
      case 'Unidad': return 'Un';
      case 'Paquete': return 'Pqt';
      case 'Caja': return 'Cja';
      case 'Resma': return 'Resma';
      case 'Docena': return 'Doc';
      case 'Pliego': return 'Pliego';
      case 'Rollo': return 'Rollo';
      case 'Servicio': return 'Serv';
      case 'Botella': return 'Bot';
      case 'Lata': return 'Lata';
      case 'Pieza': return 'Pza';
      case 'Blíster': return 'Blíst';
      case 'Metro': return 'm';
      case 'Mazo': return 'Mazo';
      case 'Malla': return 'Malla';
      case 'Cesta': return 'Cesta';
      case 'Bulto': return 'Bulto';
      case 'Saco': return 'Saco';
      default: return unidad || '';
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('Todos');
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAsistenteModal, setShowAsistenteModal] = useState(false);

  // Native Mobile Back Button Support
  useNativeBackHandler(showAddProductModal, () => setShowAddProductModal(false), 'inv_add_modal');
  useNativeBackHandler(showAsistenteModal, () => setShowAsistenteModal(false), 'inv_asistente_modal');
  const [aiPrompt, setAiPrompt] = useState('¿Qué productos debería comprar para este fin de semana?');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Quick category & unit creation state
  const [showAddCategoryInput, setShowAddCategoryInput] = useState(false);
  const [newCustomCategoryName, setNewCustomCategoryName] = useState('');
  const [showAddUnitInput, setShowAddUnitInput] = useState(false);
  const [newCustomUnitName, setNewCustomUnitName] = useState('');

  const handleAddNewCategory = (nameToAdd?: string) => {
    const cat = (nameToAdd || newCustomCategoryName).trim();
    if (!cat) return;
    if (!customCategories.includes(cat)) {
      const updated = [...customCategories, cat];
      setCustomCategories(updated);
      if (onUpdateConfig) {
        onUpdateConfig({ categoriasPersonalizadas: updated });
      }
    }
    setNewCategoria(cat);
    setNewCustomCategoryName('');
    setShowAddCategoryInput(false);
  };

  const handleAddNewUnit = (unitToAdd?: string) => {
    const unit = (unitToAdd || newCustomUnitName).trim();
    if (!unit) return;
    if (!customUnits.includes(unit)) {
      const updated = [...customUnits, unit];
      setCustomUnits(updated);
      if (onUpdateConfig) {
        onUpdateConfig({ unidadesPersonalizadas: updated });
      }
    }
    setNewUnidad(unit);
    setNewCustomUnitName('');
    setShowAddUnitInput(false);
  };

  const handleAskAI = async () => {
    setIsAiLoading(true);
    setAiResponse('');
    try {
      const res = await fetch('/api/inventory-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, inventario: productos, ventas })
      });
      const data = await res.json();
      if (data.message) {
        setAiResponse(data.message);
      } else {
        setAiResponse('Ocurrió un error al procesar tu solicitud.');
      }
    } catch (e) {
      setAiResponse('Error de conexión con el Asistente Inteligente.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const [adjustingProduct, setAdjustingProduct] = useState<Producto | null>(null);
  const [cantidadAjusteInput, setCantidadAjusteInput] = useState('6');

  // New product form
  const productCatalogOptions = useMemo<ProductOption[]>(
    () =>
      rubroConfig.categories
        .filter((c) => c.includes(': '))
        .map((c) => ({ nombre: c.slice(c.indexOf(': ') + 2), categoria: c })),
    [rubroConfig.categories]
  );
  const [newNombre, setNewNombre] = useState('');
  const [newCodigo, setNewCodigo] = useState('');
  const [newCategoria, setNewCategoria] = useState(rubroConfig.categories[0] || 'General');
  const [newCosto, setNewCosto] = useState('1.00');
  const [newPrecio, setNewPrecio] = useState('1.50');
  const [newStock, setNewStock] = useState('12');
  const [newStockMin, setNewStockMin] = useState('6');
  const [newUnidad, setNewUnidad] = useState(rubroConfig.defaultUnit || 'Unidad');
  const [newReferencia, setNewReferencia] = useState('');
  const [newImagen, setNewImagen] = useState('');
  const [newColores, setNewColores] = useState<ColorProducto[]>([]);
  const [colorNombre, setColorNombre] = useState('');
  const [colorHex, setColorHex] = useState('#111111');

  const handleImagenChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setNewImagen(await comprimirImagen(file));
    } catch {
      alert('No se pudo cargar la imagen. Intenta con otra foto.');
    }
  };

  const handleAddColor = (color?: ColorProducto) => {
    const nuevo = color || { nombre: colorNombre.trim(), hex: colorHex };
    if (!nuevo.nombre) return;
    if (newColores.some((c) => c.nombre.toLowerCase() === nuevo.nombre.toLowerCase())) return;
    setNewColores([...newColores, nuevo]);
    setColorNombre('');
  };

  // When rubro changes, update category and unit defaults
  useEffect(() => {
    setNewCategoria(rubroConfig.categories[0] || 'General');
    setNewUnidad(rubroConfig.defaultUnit || 'Unidad');
  }, [rubroConfig]);

  const lowStockCount = productos.filter((p) => p.Stock_Actual <= p.Stock_Minimo).length;

  const filteredProducts = productos.filter((p) => {
    const matchesSearch =
      (p.Nombre || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.Codigo_Barras || "").includes(searchQuery) ||
      (p.Referencia || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.Colores || []).some((col) => col.nombre.toLowerCase().includes(searchQuery.toLowerCase()));

    if (selectedFilter === 'Bajo Stock') return matchesSearch && p.Stock_Actual <= p.Stock_Minimo;
    return matchesSearch;
  });

  const handleExecuteStockAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    const cant = parseFloat(cantidadAjusteInput);
    if (!isNaN(cant) && cant !== 0) {
      onActualizarStock(adjustingProduct.ID_Producto, cant);
      soundEffects.playCashRegisterChime();
      setAdjustingProduct(null);
    }
  };

  const handleCreateProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNombre.trim()) return;

    onCrearProducto({
      Codigo_Barras: newCodigo.trim() || `759${Date.now().toString().slice(-10)}`,
      Nombre: newNombre.trim(),
      Categoria: newCategoria,
      Costo: parseFloat(newCosto) || 0.5,
      Precio_Venta: parseFloat(newPrecio) || 1.0,
      Stock_Actual: parseFloat(newStock) || 0,
      Stock_Minimo: parseFloat(newStockMin) || 5,
      Unidad_Medida: newUnidad,
      Referencia: newReferencia.trim(),
      Imagen: newImagen || undefined,
      Colores: newColores,
    });

    soundEffects.playCashRegisterChime();
    setShowAddProductModal(false);
    // Reset
    setNewNombre('');
    setNewCodigo('');
    setNewCosto('1.00');
    setNewPrecio('1.50');
    setNewStock('12');
    setNewStockMin('6');
    setNewReferencia('');
    setNewImagen('');
    setNewColores([]);
    setColorNombre('');
  };

  return (
    <div className="flex flex-col h-full bg-[#090A0D] text-white p-3 sm:p-4 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-3.5">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#F5DA76] via-[#D4AF37] to-[#A88120] uppercase tracking-widest font-sans">
            Catálogo & Inventario
          </h2>
          <p className="text-[11px] text-gray-400 font-medium">Control de existencias, costos y márgenes de ganancia</p>
        </div>
        <div className="flex gap-2">
          {role === 'Administrador' && (
            <>
              <button
                onClick={() => setShowAsistenteModal(true)}
                className="bg-[#181A22] hover:bg-[#222530] border border-[#D4AF37]/40 text-[#F5DA76] font-bold py-2 px-3 rounded-xl shadow-md active:scale-95 transition-transform flex items-center gap-1.5 cursor-pointer text-xs"
              >
                <span>🤖 Asistente IA</span>
              </button>
              <button
                id="btn-nuevo-producto"
                onClick={() => {
                  setNewCategoria(rubroConfig.categories[0] || 'General');
                  setNewUnidad(rubroConfig.defaultUnit || 'Unidad');
                  setShowAddProductModal(true);
                }}
                className="gold-gradient-btn text-black font-extrabold py-2 px-4 rounded-xl shadow-[0_4px_15px_rgba(212,175,55,0.25)] active:scale-95 transition-transform flex items-center gap-1.5 cursor-pointer text-xs uppercase tracking-wider"
              >
                <Plus size={15} />
                <span>Nuevo Producto</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards - Hidden for Cajero */}
      {role === 'Administrador' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3.5">
          <div className="bg-[#111216] border border-[#232530] hover:border-[#D4AF37]/30 rounded-2xl p-3.5 shadow-lg relative overflow-hidden transition-all">
            <div className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest mb-1">INVERSIÓN TOTAL</div>
            <div className="text-xl sm:text-2xl font-extrabold text-white font-mono tracking-wider">
              {formatUSD(productos.reduce((sum, p) => sum + (p.Costo * p.Stock_Actual), 0))}
            </div>
            <div className="text-[10px] text-gray-500 font-mono mt-0.5">Capital en inventario</div>
          </div>

          <div className="bg-[#111216] border border-[#232530] hover:border-[#D4AF37]/30 rounded-2xl p-3.5 shadow-lg relative overflow-hidden transition-all">
            <div className="text-[10px] font-black text-[#F5DA76] uppercase tracking-widest mb-1">VALOR EN VENTA</div>
            <div className="text-xl sm:text-2xl font-extrabold text-[#F5DA76] font-mono tracking-wider">
              {formatUSD(productos.reduce((sum, p) => sum + (p.Precio_Venta * p.Stock_Actual), 0))}
            </div>
            <div className="text-[10px] text-[#D4AF37]/80 font-mono mt-0.5 font-semibold">
              ≈ {formatLocal(productos.reduce((sum, p) => sum + (p.Precio_Venta * p.Stock_Actual), 0), config?.tasaCambioUSD || 1, config?.simboloMonedaLocal || 'Bs.')}
            </div>
          </div>

          <div className="bg-[#111216] border border-[#232530] hover:border-[#D4AF37]/30 rounded-2xl p-3.5 shadow-lg relative overflow-hidden transition-all">
            <div className="text-[10px] font-black text-[#00E676] uppercase tracking-widest mb-1">GANANCIA PROYECTADA</div>
            <div className="text-xl sm:text-2xl font-extrabold text-[#00E676] font-mono tracking-wider">
              {formatUSD(productos.reduce((sum, p) => sum + ((p.Precio_Venta - p.Costo) * p.Stock_Actual), 0))}
            </div>
            <div className="text-[10px] text-gray-400 font-mono mt-0.5">Retorno esperado</div>
          </div>

          <div className="bg-[#111216] border border-[#232530] hover:border-[#D4AF37]/30 rounded-2xl p-3.5 shadow-lg relative overflow-hidden transition-all">
            <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">PRODUCTOS / STOCK</div>
            <div className="text-xl sm:text-2xl font-extrabold text-white font-mono tracking-wider">
              {productos.length} <span className="text-xs font-normal text-gray-400 font-sans">ítems</span>
            </div>
            <div className="text-[10px] font-mono mt-0.5">
              <span className={lowStockCount > 0 ? "text-[#FF6B6B] font-bold" : "text-gray-400"}>
                {lowStockCount} con bajo stock
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 mb-3.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 text-gray-500" size={16} />
          <input
            id="input-buscar-inventario"
            type="text"
            placeholder="Buscar por nombre, referencia, color o código SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111216] border border-[#232530] focus:border-[#D4AF37] rounded-xl pl-10 pr-3 py-2 text-xs sm:text-sm text-white placeholder-gray-500 outline-none transition-colors font-mono"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedFilter('Todos')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              selectedFilter === 'Todos'
                ? 'gold-gradient-btn text-black shadow-[0_2px_8px_rgba(212,175,55,0.25)]'
                : 'bg-[#181A22] border border-[#232530] text-gray-400 hover:text-white hover:bg-[#222530]'
            }`}
          >
            <Package size={14} />
            <span>Todos</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
              selectedFilter === 'Todos' ? 'bg-black/25 text-black' : 'bg-white/10 text-white'
            }`}>
              {productos.length}
            </span>
          </button>

          <button
            onClick={() => setSelectedFilter(selectedFilter === 'Bajo Stock' ? 'Todos' : 'Bajo Stock')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              selectedFilter === 'Bajo Stock'
                ? 'bg-[#FF5252] text-white shadow-[0_2px_10px_rgba(255,82,82,0.35)]'
                : 'bg-[#181A22] border border-[#FF5252]/40 text-[#FF6B6B] hover:bg-[#FF5252]/10'
            }`}
          >
            <AlertTriangle size={14} />
            <span>Bajo Stock</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
              selectedFilter === 'Bajo Stock' ? 'bg-black/25 text-white' : 'bg-[#FF5252]/20 text-[#FF5252]'
            }`}>
              {lowStockCount}
            </span>
          </button>
        </div>
      </div>

      {/* DESKTOP TABLE VIEW (Visible on md: and larger screens) */}
      <div className="hidden md:flex flex-col flex-1 overflow-hidden border border-[#232530] rounded-2xl bg-[#111216] mb-4 shadow-xl">
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-[#0D0E12] text-gray-400 border-b border-[#232530] text-[10px] uppercase font-bold tracking-wider font-sans">
                <th className="p-3">Foto</th>
                <th className="p-3">SKU / Ref.</th>
                <th className="p-3">Producto</th>
                <th className="p-3">Categoría</th>
                <th className="p-3">Colores</th>
                {role === 'Administrador' && <th className="p-3 text-right">Costo USD</th>}
                <th className="p-3 text-right">Precio USD</th>
                <th className="p-3 text-right">Precio ({config?.simboloMonedaLocal || 'Bs.'})</th>
                {role === 'Administrador' && <th className="p-3 text-right">Margen</th>}
                <th className="p-3 text-center">Stock Actual</th>
                <th className="p-3 text-center">Estado</th>
                {role === 'Administrador' && <th className="p-3 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232530]/50">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={role === 'Administrador' ? 12 : 9} className="p-8 text-center text-gray-500 font-sans">
                    No se encontraron productos en el inventario.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const isLow = prod.Stock_Actual <= prod.Stock_Minimo;
                  const isOut = prod.Stock_Actual <= 0;
                  const ganancia = prod.Precio_Venta - prod.Costo;
                  const margenPct = prod.Precio_Venta > 0 ? ((ganancia / prod.Precio_Venta) * 100) : 0;

                  return (
                    <tr key={prod.ID_Producto} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3">
                        {prod.Imagen ? (
                          <img src={prod.Imagen} alt={prod.Nombre} className="w-12 h-12 rounded-lg object-cover border border-[#D4AF37]/30" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-[#181A22] border border-[#232530] flex items-center justify-center text-gray-600">
                            <ImagePlus size={16} />
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-gray-400 font-mono text-[11px]">
                        {prod.Referencia && <div className="text-[#F5DA76] font-bold">{prod.Referencia}</div>}
                        <div>{prod.Codigo_Barras || '-'}</div>
                      </td>
                      <td className="p-3 font-bold text-white font-sans text-xs">
                        {prod.Nombre}
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#181A22] text-[#F5DA76] border border-[#D4AF37]/30 font-bold">
                          {prod.Categoria}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1 max-w-[160px]">
                          {(prod.Colores || []).length === 0 ? (
                            <span className="text-gray-600">-</span>
                          ) : (
                            (prod.Colores || []).map((col) => (
                              <span
                                key={col.nombre}
                                title={col.nombre}
                                className="w-4 h-4 rounded-full border border-white/30 inline-block"
                                style={{ backgroundColor: col.hex }}
                              />
                            ))
                          )}
                        </div>
                      </td>
                      {role === 'Administrador' && (
                        <td className="p-3 text-right text-gray-400">
                          {formatUSD(prod.Costo)}
                        </td>
                      )}
                      <td className="p-3 text-right font-extrabold text-[#F5DA76]">
                        {formatUSD(prod.Precio_Venta)}
                      </td>
                      <td className="p-3 text-right text-gray-300">
                        {formatLocal(prod.Precio_Venta, config?.tasaCambioUSD || 1, config?.simboloMonedaLocal || 'Bs.')}
                      </td>
                      {role === 'Administrador' && (
                        <td className="p-3 text-right">
                          <span className={`text-[10px] font-bold ${ganancia >= 0 ? 'text-[#00E676]' : 'text-red-400'}`}>
                            {margenPct.toFixed(0)}%
                          </span>
                        </td>
                      )}
                      <td className="p-3 text-center">
                        <span className={`font-bold text-xs ${isOut ? 'text-[#FF6B6B]' : isLow ? 'text-amber-400' : 'text-white'}`}>
                          {prod.Stock_Actual}
                        </span>
                        <span className="text-[10px] text-gray-500 ml-1">/ mín {prod.Stock_Minimo}</span>
                      </td>
                      <td className="p-3 text-center">
                        {isOut ? (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
                            Agotado
                          </span>
                        ) : isLow ? (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            Bajo Stock
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Óptimo
                          </span>
                        )}
                      </td>
                      {role === 'Administrador' && (
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setAdjustingProduct(prod);
                                setCantidadAjusteInput('6');
                              }}
                              title="Ajuste rápido de inventario"
                              className="p-1.5 rounded-lg bg-[#181A22] hover:bg-[#222530] text-[#D4AF37] border border-[#232530] hover:border-[#D4AF37]/50 transition-colors cursor-pointer"
                            >
                              <Layers size={13} />
                            </button>
                            {onEliminarProducto && (
                              <button
                                onClick={() => {
                                  if (confirm(`¿Eliminar ${prod.Nombre}?`)) {
                                    onEliminarProducto(prod.ID_Producto);
                                  }
                                }}
                                title="Eliminar producto"
                                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MOBILE LIST VIEW (Visible on < md screens) */}
      <div className="md:hidden flex-1 overflow-y-auto space-y-2 pb-24">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm flex flex-col items-center gap-2">
            <Package size={32} className="opacity-40 text-[#D4AF37]" />
            <span>
              {selectedFilter === 'Bajo Stock' ? 'No hay productos con bajo stock.' : 'No se encontraron productos en el inventario.'}
            </span>
          </div>
        ) : (
          filteredProducts.map((prod) => (
            <div
              key={prod.ID_Producto}
              className="bg-[#111216] border border-[#232530] hover:border-[#D4AF37]/40 rounded-xl p-3 flex items-center justify-between transition-colors shadow-md group"
            >
              {prod.Imagen ? (
                <img src={prod.Imagen} alt={prod.Nombre} className="w-14 h-14 rounded-lg object-cover border border-[#D4AF37]/30 mr-2.5 shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-[#181A22] border border-[#232530] flex items-center justify-center text-gray-600 mr-2.5 shrink-0">
                  <ImagePlus size={18} />
                </div>
              )}
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm truncate group-hover:text-[#F5DA76] transition-colors">{prod.Nombre}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#181A22] text-[#F5DA76] border border-[#D4AF37]/30 shrink-0 font-bold">
                    {prod.Categoria}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 font-mono">
                  <Barcode size={12} className="text-gray-500" />
                  <span>{prod.Referencia ? `Ref. ${prod.Referencia}` : prod.Codigo_Barras}</span>
                  {(prod.Colores || []).length > 0 && (
                    <span className="flex items-center gap-1">
                      {(prod.Colores || []).map((col) => (
                        <span key={col.nombre} title={col.nombre} className="w-3.5 h-3.5 rounded-full border border-white/30 inline-block" style={{ backgroundColor: col.hex }} />
                      ))}
                    </span>
                  )}
                  {role === 'Administrador' && (
                    <>
                      <span>•</span>
                      <span>Costo: {formatUSD(prod.Costo)}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="w-20 text-center font-mono">
                <div className="text-sm font-extrabold text-[#F5DA76]">{formatUSD(prod.Precio_Venta)}</div>
                <div className="text-[10px] text-gray-400">{formatLocal(prod.Precio_Venta, config?.tasaCambioUSD || 1, config?.simboloMonedaLocal || 'Bs.')}</div>
              </div>

              <div className="w-20 text-right flex flex-col items-end">
                <div className="flex items-center gap-1">
                  <span className={`text-sm font-extrabold font-mono ${prod.Stock_Actual <= prod.Stock_Minimo ? 'text-[#FF6B6B]' : 'text-white'}`}>
                    {prod.Stock_Actual}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">{formatUnit(prod.Unidad_Medida)}</span>
                </div>
                
                {role === 'Administrador' && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <button
                      onClick={() => {
                        setAdjustingProduct(prod);
                        setCantidadAjusteInput('6');
                      }}
                      title="Ajuste rápido de inventario"
                      className="p-1.5 rounded-lg bg-[#181A22] hover:bg-[#222530] text-[#D4AF37] border border-[#232530] hover:border-[#D4AF37]/50 text-xs transition-colors"
                    >
                      <Layers size={13} />
                    </button>
                    {onEliminarProducto && (
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar ${prod.Nombre}?`)) {
                            onEliminarProducto(prod.ID_Producto);
                          }
                        }}
                        title="Eliminar producto"
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Ajuste Rápido de Stock */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 font-sans animate-in fade-in">
          <div className="bg-[#111216] border border-[#D4AF37]/50 rounded-2xl w-full max-w-sm p-5 shadow-[0_20px_60px_rgba(0,0,0,0.95)]">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Layers className="text-[#D4AF37]" size={16} /> Ajustar Stock: {adjustingProduct.Nombre}
            </h3>
            <p className="text-xs text-gray-400 mb-3">
              Stock actual: <strong className="text-white">{adjustingProduct.Stock_Actual} {adjustingProduct.Unidad_Medida}</strong>
            </p>
            <form onSubmit={handleExecuteStockAdjustment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Cantidad a sumar (negativo para restar):
                </label>
                <input
                  type="number"
                  step="any"
                  value={cantidadAjusteInput}
                  onChange={(e) => setCantidadAjusteInput(e.target.value)}
                  className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] rounded-xl p-2.5 text-white font-mono text-sm outline-none"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="flex-1 bg-[#181A22] hover:bg-[#222530] text-gray-300 py-2.5 rounded-xl text-xs font-bold border border-[#232530] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 gold-gradient-btn text-black py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-[0_4px_15px_rgba(212,175,55,0.25)]"
                >
                  Confirmar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nuevo Producto Específico con creación de Categoría y Unidad */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 font-sans animate-in fade-in duration-200">
          <div className="bg-[#111216] border border-[#D4AF37]/50 rounded-2xl w-full max-w-md p-5 shadow-[0_20px_60px_rgba(0,0,0,0.95)] max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#232530] mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 font-display uppercase tracking-wider">
                <Plus className="text-[#D4AF37]" size={16} /> Nuevo Producto para {rubroConfig.label}
              </h3>
              <button onClick={() => setShowAddProductModal(false)} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer">✕</button>
            </div>

            {/* Rubro Display in Modal */}
            <div className="bg-[#090A0D] border border-[#D4AF37]/30 rounded-xl p-3 flex items-center justify-between mb-4 shadow-[0_0_15px_rgba(212,175,55,0.08)]">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{rubroConfig.icon}</span>
                <div className="leading-tight">
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Rubro Comercial</div>
                  <div className="text-sm font-bold text-white font-display uppercase">{rubroConfig.label}</div>
                </div>
              </div>

              {isSuperAdmin ? (
                // SUPER ADMIN CAN SWITCH RUBRO
                <select
                  value={modalRubro}
                  onChange={(e) => {
                    const nuevoRubro = e.target.value;
                    setModalRubro(nuevoRubro);
                    if (onUpdateConfig) {
                      onUpdateConfig({ rubro: nuevoRubro });
                    }
                  }}
                  className="bg-[#111216] border border-[#D4AF37] text-[#D4AF37] text-xs font-bold px-2.5 py-1.5 rounded-xl outline-none cursor-pointer"
                >
                  <option value="Ropa Deportiva">👕 Ropa Deportiva</option><option value="Charcutería">🧀 Charcutería</option>
                  <option value="Papelería">✏️ Papelería</option>
                  <option value="Bodega">🏪 Bodega</option>
                  <option value="Panadería">🥖 Panadería</option>
                  <option value="Farmacia">💊 Farmacia</option>
                  <option value="Ferretería">🔧 Ferretería</option>
                </select>
              ) : (
                // CLIENT / STORE OWNER HAS LOCKED PROFILE
                <div className="px-2.5 py-1 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Lock size={10} />
                  <span>Sellado</span>
                </div>
              )}
            </div>

            <form onSubmit={handleCreateProductSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">Nombre Específico del Producto / Marca:</label>
                <ProductNameCombobox
                  value={newNombre}
                  onChange={setNewNombre}
                  onSelectProduct={(p) => {
                    setNewNombre(p.nombre);
                    setNewCategoria(p.categoria);
                  }}
                  options={productCatalogOptions}
                  placeholder={rubroConfig.placeholderProduct}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Código de Barras / SKU:</label>
                <input
                  type="text"
                  value={newCodigo}
                  onChange={(e) => setNewCodigo(e.target.value)}
                  placeholder="Auto-generado si lo dejas vacío"
                  className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] rounded-xl p-2.5 text-white text-xs outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Referencia / Modelo:</label>
                <input
                  type="text"
                  value={newReferencia}
                  onChange={(e) => setNewReferencia(e.target.value)}
                  placeholder="Ej. CAM-2045"
                  className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] rounded-xl p-2.5 text-white text-xs outline-none font-mono"
                />
              </div>

              {/* Foto de la prenda */}
              <div>
                <label className="block text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-1">Foto de la prenda:</label>
                {newImagen ? (
                  <div className="relative w-28 h-28">
                    <img src={newImagen} alt="Vista previa" className="w-28 h-28 rounded-xl object-cover border border-[#D4AF37]/50" />
                    <button
                      type="button"
                      onClick={() => setNewImagen('')}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 cursor-pointer"
                      title="Quitar foto"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-1 w-full py-4 rounded-xl border border-dashed border-[#D4AF37]/50 bg-[#090A0D] text-[#D4AF37] text-xs font-bold cursor-pointer hover:bg-[#D4AF37]/10 transition-colors">
                    <ImagePlus size={22} />
                    <span>Subir foto o tomar con la cámara</span>
                    <input type="file" accept="image/*" onChange={handleImagenChange} className="hidden" />
                  </label>
                )}
              </div>

              {/* Colores disponibles */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#D4AF37] uppercase tracking-wider">Colores disponibles:</label>
                <div className="flex flex-wrap gap-1.5">
                  {COLORES_RAPIDOS.map((col) => {
                    const activo = newColores.some((c) => c.nombre === col.nombre);
                    return (
                      <button
                        key={col.nombre}
                        type="button"
                        onClick={() =>
                          activo
                            ? setNewColores(newColores.filter((c) => c.nombre !== col.nombre))
                            : handleAddColor(col)
                        }
                        title={col.nombre}
                        className={`w-7 h-7 rounded-full border-2 cursor-pointer transition-transform ${activo ? 'border-[#D4AF37] scale-110 ring-2 ring-[#D4AF37]/40' : 'border-white/20'}`}
                        style={{ backgroundColor: col.hex }}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value)}
                    className="w-9 h-9 rounded-lg bg-transparent border border-[#232530] cursor-pointer"
                  />
                  <input
                    type="text"
                    value={colorNombre}
                    onChange={(e) => setColorNombre(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddColor();
                      }
                    }}
                    placeholder="Otro color (ej. Vino tinto)"
                    className="flex-1 bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] rounded-xl p-2 text-white text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddColor()}
                    disabled={!colorNombre.trim()}
                    className="gold-gradient-btn text-black font-extrabold px-3 py-2 rounded-lg text-xs disabled:opacity-50 cursor-pointer"
                  >
                    Añadir
                  </button>
                </div>
                {newColores.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {newColores.map((col) => (
                      <span key={col.nombre} className="inline-flex items-center gap-1.5 text-[11px] text-white bg-[#181A22] border border-[#232530] rounded-full pl-1.5 pr-2 py-0.5">
                        <span className="w-3.5 h-3.5 rounded-full border border-white/30" style={{ backgroundColor: col.hex }} />
                        {col.nombre}
                        <button type="button" onClick={() => setNewColores(newColores.filter((c) => c.nombre !== col.nombre))} className="text-gray-400 hover:text-red-400 cursor-pointer">
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Categoría con Menú y Búsqueda Inteligente */}
              <div className="space-y-1">
                <SearchableCategorySelect
                  value={newCategoria}
                  onChange={(selected) => setNewCategoria(selected)}
                  categories={allCategories}
                  onAddNewCategory={(newCat) => handleAddNewCategory(newCat)}
                  productCounts={categoryProductCounts}
                  placeholder="Buscar o seleccionar categoría..."
                  rubroName={config.rubro || 'Ropa Deportiva'}
                  searchPlaceholder={rubroConfig.categorySearchPlaceholder}
                />
              </div>

              {/* Unidad con opción de crear nueva */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#D4AF37] flex items-center gap-1 uppercase tracking-wider">
                    <Ruler size={12} /> Unidad de Medida:
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddUnitInput(!showAddUnitInput)}
                    className="text-[11px] text-[#F5DA76] hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus size={11} /> {showAddUnitInput ? 'Cancelar' : '+ Nueva Unidad'}
                  </button>
                </div>

                {showAddUnitInput ? (
                  <div className="flex items-center gap-1.5 p-2 bg-[#090A0D] border border-[#D4AF37] rounded-xl animate-in fade-in duration-150">
                    <input
                      type="text"
                      placeholder="Ej. Blíster x 4, Bolsa, Litro, Metro..."
                      value={newCustomUnitName}
                      onChange={(e) => setNewCustomUnitName(e.target.value)}
                      className="flex-1 bg-transparent text-white text-xs outline-none"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewUnit();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddNewUnit()}
                      disabled={!newCustomUnitName.trim()}
                      className="gold-gradient-btn text-black font-extrabold px-3 py-1 rounded-lg text-xs disabled:opacity-50 cursor-pointer"
                    >
                      Guardar
                    </button>
                  </div>
                ) : (
                  <select
                    value={newUnidad}
                    onChange={(e) => setNewUnidad(e.target.value)}
                    className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] rounded-xl p-2.5 text-white text-xs font-semibold outline-none"
                  >
                    {allUnits.map((u) => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Special notice for weighed products (Charcutería) */}
              {(newUnidad === 'Kilogramo' || newUnidad === 'Gramos') && (
                <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/40 rounded-xl p-2.5 text-[11px] text-[#D4AF37] flex items-center gap-2">
                  <span className="text-base">⚖️</span>
                  <span><strong>Modo Balanza:</strong> En el POS podrás vender fracciones (ej. <strong>0.250</strong> para 250g o <strong>0.500</strong> para medio kilo) y el sistema calculará el valor exacto en $ y Bs.</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Costo Unitario ($):</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newCosto}
                    onChange={(e) => setNewCosto(e.target.value)}
                    className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] rounded-xl p-2.5 text-white text-xs outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#F5DA76] uppercase tracking-wider mb-1">PVP ($ Venta):</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newPrecio}
                    onChange={(e) => setNewPrecio(e.target.value)}
                    className="w-full bg-[#090A0D] border border-[#D4AF37]/50 focus:border-[#D4AF37] rounded-xl p-2.5 text-white text-xs outline-none font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Stock Inicial ({newUnidad}):</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] rounded-xl p-2.5 text-white text-xs outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#FF6B6B] uppercase tracking-wider mb-1">Alerta Stock Mínimo:</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={newStockMin}
                    onChange={(e) => setNewStockMin(e.target.value)}
                    className="w-full bg-[#090A0D] border border-[#FF6B6B]/40 focus:border-[#FF6B6B] rounded-xl p-2.5 text-white text-xs outline-none font-mono text-[#FF6B6B]"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="flex-1 bg-[#181A22] hover:bg-[#222530] text-gray-300 py-3 rounded-xl text-xs font-bold uppercase tracking-wider border border-[#232530] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 gold-gradient-btn text-black py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-[0_4px_15px_rgba(212,175,55,0.25)] active:scale-95 transition-all cursor-pointer"
                >
                  Guardar Ítem
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Asistente IA */}
      {showAsistenteModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 font-sans animate-in fade-in">
          <div className="bg-[#111216] border border-[#D4AF37]/50 rounded-2xl w-full max-w-sm p-5 shadow-[0_20px_60px_rgba(0,0,0,0.95)] flex flex-col h-[80vh]">
            <div className="flex items-center justify-between pb-3 border-b border-[#232530] mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="text-xl">🤖</span>
                <span>Asistente de Inteligencia Artificial</span>
              </h3>
              <button onClick={() => setShowAsistenteModal(false)} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto mb-4 border border-[#232530] rounded-xl p-3 bg-[#090A0D] text-sm leading-relaxed whitespace-pre-wrap text-gray-300">
              {aiResponse || (
                <div className="text-center text-gray-500 mt-10">
                  Escribe tu consulta abajo.<br/><br/>Ejemplos:<br/>- "¿Qué productos debería comprar para el fin de semana en mi {rubroConfig.label}?"<br/>- "Analiza mis ventas y dime qué se vende más rápido"<br/>- "Hazme una lista de compras de lo que falta"
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Escribe tu pregunta sobre inventario..."
                className="flex-1 bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] rounded-xl p-2.5 text-white text-xs outline-none"
              />
              <button
                onClick={handleAskAI}
                disabled={isAiLoading || !aiPrompt.trim()}
                className="gold-gradient-btn disabled:opacity-50 text-black font-extrabold px-3 py-2 rounded-xl text-xs cursor-pointer shadow-[0_2px_8px_rgba(212,175,55,0.25)]"
              >
                {isAiLoading ? 'Pensando...' : 'Preguntar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
