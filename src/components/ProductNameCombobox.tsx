import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Tag } from 'lucide-react';
import { smartMatch } from '../utils/smartSearch';

export interface ProductOption {
  nombre: string;
  categoria: string;
}

interface ProductNameComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onSelectProduct: (product: ProductOption) => void;
  options: ProductOption[];
  placeholder?: string;
}

/** Campo de nombre con menú desplegable de productos y búsqueda inteligente. Permite también escribir un nombre libre. */
export const ProductNameCombobox: React.FC<ProductNameComboboxProps> = ({
  value,
  onChange,
  onSelectProduct,
  options,
  placeholder,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(
    () => options.filter((o) => smartMatch(value, `${o.nombre} ${o.categoria}`)).slice(0, 60),
    [options, value]
  );

  useEffect(() => setHighlighted(0), [value]);

  const select = (p: ProductOption) => {
    onSelectProduct(p);
    setIsOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && isOpen && filtered[highlighted]) {
      e.preventDefault();
      select(filtered[highlighted]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#D4AF37]" />
        <input
          type="text"
          required
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full bg-[#090A0D] border border-[#232530] focus:border-[#D4AF37] rounded-xl p-2.5 pl-9 pr-9 text-white text-xs outline-none"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setIsOpen((o) => !o)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
        >
          <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto bg-[#111215] border border-[#D4AF37]/40 rounded-xl shadow-2xl">
          {filtered.length === 0 ? (
            <div className="p-3 text-[11px] text-gray-400">
              Sin coincidencias. Se usará "<span className="text-white">{value}</span>" como nombre nuevo.
            </div>
          ) : (
            <>
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-500 border-b border-[#232530]">
                {filtered.length} producto(s) sugeridos — o escribe uno propio
              </div>
              {filtered.map((o, i) => (
                <button
                  type="button"
                  key={`${o.categoria}-${o.nombre}`}
                  onMouseEnter={() => setHighlighted(i)}
                  onClick={() => select(o)}
                  className={`w-full text-left px-3 py-2 flex flex-col gap-0.5 cursor-pointer ${
                    i === highlighted ? 'bg-[#D4AF37]/15' : 'hover:bg-[#1a1c22]'
                  }`}
                >
                  <span className="text-xs text-white font-semibold">{o.nombre}</span>
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Tag size={9} /> {o.categoria}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};