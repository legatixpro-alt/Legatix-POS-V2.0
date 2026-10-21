import React, { useState, useRef, useEffect, useMemo } from 'react';
import { smartMatch } from '../utils/smartSearch';
import { Search, Check, Plus, Tag, ChevronDown, X, Sparkles, Layers } from 'lucide-react';

interface SearchableCategorySelectProps {
  value: string;
  onChange: (category: string) => void;
  categories: string[];
  onAddNewCategory?: (newCategory: string) => void;
  productCounts?: Record<string, number>;
  placeholder?: string;
  searchPlaceholder?: string;
  rubroName?: string;
}

export const SearchableCategorySelect: React.FC<SearchableCategorySelectProps> = ({
  value,
  onChange,
  categories,
  onAddNewCategory,
  productCounts = {},
  placeholder = 'Buscar o seleccionar categoría...',
  searchPlaceholder,
  rubroName,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
      setHighlightedIndex(0);
    }
  }, [isOpen]);

  // Normalize string for accent-insensitive search (e.g., 'platano' matches 'Plátanos', 'aji' matches 'Ajíes')
  const normalize = (str: string) =>
    (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  const normalizedQuery = normalize(searchQuery);

  // Filtro inteligente (sin�nimos, plurales, errores de escritura)
  const filteredCategories = useMemo(() => {
    if (!normalizedQuery) return categories;
    return categories.filter((cat) => smartMatch(normalizedQuery, cat));
  }, [categories, normalizedQuery]);

  // Reset highlighted index when filter changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredCategories.length, searchQuery]);

  const exactMatchExists = useMemo(() => {
    if (!normalizedQuery) return true;
    return categories.some((cat) => normalize(cat) === normalizedQuery);
  }, [categories, normalizedQuery]);

  const handleSelect = (category: string) => {
    onChange(category);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleCreateNew = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    if (onAddNewCategory) {
      onAddNewCategory(trimmed);
    }
    onChange(trimmed);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Derive dynamic search placeholder based on selected rubro
  const resolvedSearchPlaceholder = useMemo(() => {
    if (searchPlaceholder) return searchPlaceholder;
    switch (rubroName) {
      case 'Ropa Deportiva':
        return 'Escribe para buscar (ej. Leggings, Franelas Dry-Fit, Zapatos Deportivos, Uniformes...)';
      case 'Frutería':
        return 'Escribe para buscar (ej. Tomates, Cebollas, Plátanos, Limones, Aguacates...)';
      case 'Charcutería':
        return 'Escribe para buscar (ej. Jamón de Pierna, Queso Blanco, Tocineta...)';
      case 'Bodega':
        return 'Escribe para buscar (ej. Harinas, Arroces, Lácteos, Enlatados...)';
      case 'Papelería':
        return 'Escribe para buscar (ej. Cuadernos, Bolígrafos, Resmas, Foami...)';
      case 'Panadería':
        return 'Escribe para buscar (ej. Canilla, Pan Dulce, Hojaldre, Tortas...)';
      case 'Farmacia':
        return 'Escribe para buscar (ej. Analgésicos, Vitaminas, Cuidado Facial...)';
      case 'Ferretería':
        return 'Escribe para buscar (ej. Tornillos, Herramientas, Bombillos, PVC...)';
      default:
        return 'Escribe para buscar categoría detallada...';
    }
  }, [searchPlaceholder, rubroName]);

  // Helper to highlight matching text in category name
  const renderCategoryName = (name: string, query: string) => {
    if (!query.trim()) return name;
    const cleanTokens = query
      .trim()
      .split(/\s+/)
      .map((t) => normalize(t))
      .filter((t) => t.length > 0);

    if (cleanTokens.length === 0) return name;

    // Build regex to match any of the tokens
    try {
      const escaped = cleanTokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      const regex = new RegExp(`(${escaped})`, 'gi');
      const parts = name.split(regex);

      return parts.map((part, i) => {
        const matches = cleanTokens.some((tok) => normalize(part) === tok);
        return matches ? (
          <mark
            key={i}
            className="bg-[#D4AF37]/35 text-[#F2D660] font-black rounded-xs px-0.5 not-italic"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        );
      });
    } catch {
      return name;
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[#121214] border border-[#D4AF37]/50 hover:border-[#D4AF37] focus:border-[#D4AF37] rounded-xl px-3 py-2.5 text-left flex items-center justify-between transition-all cursor-pointer shadow-sm group active:scale-[0.99]"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-6 h-6 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shrink-0">
            <Tag size={13} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider leading-none">
              Categoría Asignada
            </span>
            <span className="text-white text-xs font-bold truncate mt-0.5 group-hover:text-[#D4AF37] transition-colors">
              {value || placeholder}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-gray-400 group-hover:text-[#D4AF37] transition-colors shrink-0 ml-2">
          <span className="text-[10px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono hidden xs:inline">
            Buscar
          </span>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#D4AF37]' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown Menu with Smart Search */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-[#121214] border border-[#D4AF37]/70 rounded-xl shadow-[0_14px_45px_rgba(0,0,0,0.95)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          
          {/* Smart Search Bar */}
          <div className="p-2.5 border-b border-white/10 bg-black/75 sticky top-0 z-10 backdrop-blur-md">
            <div className="relative flex items-center">
              <Search size={14} className="absolute left-2.5 text-[#D4AF37]" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setHighlightedIndex((prev) => Math.min(prev + 1, filteredCategories.length - 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setHighlightedIndex((prev) => Math.max(prev - 1, 0));
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filteredCategories.length > 0) {
                      const idx = highlightedIndex >= 0 && highlightedIndex < filteredCategories.length ? highlightedIndex : 0;
                      handleSelect(filteredCategories[idx]);
                    } else if (!exactMatchExists && searchQuery.trim()) {
                      handleCreateNew();
                    }
                  } else if (e.key === 'Escape') {
                    setIsOpen(false);
                  }
                }}
                placeholder={resolvedSearchPlaceholder}
                className="w-full bg-black/80 border border-[#D4AF37]/40 focus:border-[#D4AF37] rounded-lg pl-8 pr-7 py-2 text-xs text-white placeholder-gray-500 outline-none font-medium shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-gray-400 hover:text-white p-0.5 rounded cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Match Counter / Helper */}
            <div className="flex items-center justify-between text-[10px] text-gray-400 mt-2 px-1 font-mono">
              <div className="flex items-center gap-1.5">
                <Layers size={11} className="text-[#D4AF37]" />
                <span className="text-gray-300">
                  {searchQuery.trim() ? (
                    <>
                      <strong className="text-white">{filteredCategories.length}</strong>{' '}
                      {filteredCategories.length === 1 ? 'coincidencia' : 'coincidencias'}
                    </>
                  ) : (
                    <>
                      <strong className="text-[#00E676]">{filteredCategories.length}</strong> categorías detalladas{' '}
                      {rubroName ? `(${rubroName})` : ''}
                    </>
                  )}
                </span>
              </div>
              <span className="text-[#D4AF37]/90 font-medium">↵ Enter para seleccionar</span>
            </div>
          </div>

          {/* List of Detailed Categories */}
          <div ref={listRef} className="max-h-72 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
            
            {/* Quick Option to Create Category if Search Query Doesn't Exist */}
            {!exactMatchExists && searchQuery.trim() && (
              <button
                type="button"
                onClick={handleCreateNew}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-[#00E676]/15 hover:bg-[#00E676]/25 border border-[#00E676]/50 text-[#00E676] text-xs font-bold transition-all text-left mb-1.5 cursor-pointer group shadow-[0_0_10px_rgba(0,230,118,0.2)]"
              >
                <div className="flex items-center gap-2 truncate">
                  <Sparkles size={13} className="shrink-0 animate-pulse text-[#00E676]" />
                  <span className="truncate">
                    Crear nueva categoría: <strong>"{searchQuery.trim()}"</strong>
                  </span>
                </div>
                <span className="text-[10px] bg-[#00E676] text-black px-2 py-0.5 rounded font-bold uppercase shrink-0 ml-2">
                  + Agregar
                </span>
              </button>
            )}

            {filteredCategories.length === 0 && (
              <div className="py-8 text-center text-gray-400 text-xs flex flex-col items-center justify-center gap-2">
                <span>No se encontró ninguna categoría con ese término.</span>
                <span className="text-[11px] text-gray-500">
                  Presiona Enter o el botón superior para agregarla como categoría personalizada.
                </span>
              </div>
            )}

            {filteredCategories.map((cat, idx) => {
              const isSelected = value === cat;
              const isHighlighted = idx === highlightedIndex;
              const count = productCounts[cat];

              return (
                <button
                  type="button"
                  key={cat}
                  onClick={() => handleSelect(cat)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all text-left cursor-pointer group ${
                    isSelected
                      ? 'bg-[#D4AF37]/25 text-[#D4AF37] font-bold border border-[#D4AF37]/60 shadow-[0_0_12px_rgba(212,175,55,0.2)]'
                      : isHighlighted
                      ? 'bg-white/10 text-white border border-white/10'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 transition-transform ${
                        isSelected
                          ? 'bg-[#D4AF37] scale-110 shadow-[0_0_6px_#D4AF37]'
                          : isHighlighted
                          ? 'bg-[#D4AF37]/80'
                          : 'bg-gray-600 group-hover:bg-[#D4AF37]'
                      }`}
                    />
                    <span className="truncate">
                      {renderCategoryName(cat, searchQuery)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {count !== undefined && count > 0 && (
                      <span className="text-[10px] text-gray-400 font-mono px-1.5 py-0.5 rounded bg-black/40 border border-white/5">
                        {count} {count === 1 ? 'ítem' : 'ítems'}
                      </span>
                    )}
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-[#D4AF37] text-black flex items-center justify-center shrink-0">
                        <Check size={10} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Create Custom Category Footer Button */}
          {onAddNewCategory && (
            <div className="p-2 border-t border-white/10 bg-black/50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const name = prompt('Nombre de la nueva categoría personalizada:');
                  if (name && name.trim()) {
                    onAddNewCategory(name.trim());
                    onChange(name.trim());
                    setIsOpen(false);
                  }
                }}
                className="text-[11px] text-[#00E676] hover:text-[#69f0ae] flex items-center gap-1 font-bold transition-colors cursor-pointer px-1 py-0.5"
              >
                <Plus size={12} />
                <span>+ Crear categoría personalizada</span>
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[11px] text-gray-400 hover:text-white px-2 py-0.5 rounded hover:bg-white/5 cursor-pointer font-mono"
              >
                Cerrar
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
