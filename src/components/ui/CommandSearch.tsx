import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../db/lifeDB';
import { useApp } from '../../context/AppContext';

interface SearchResult {
  id: number | string;
  title: string;
  subtitle?: string;
  category: string; // 'document', 'vehicle', 'warranty', 'expense', 'subscription', 'task', 'action'
  action?: () => void;
  url?: string;
}

interface CommandSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export const CommandSearch: React.FC<CommandSearchProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  const { toggleTheme, logout } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut listener for Cmd/Ctrl+K and ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Perform search query in database + local actions
  useEffect(() => {
    if (!isOpen) return;

    const performSearch = async () => {
      if (!query.trim()) {
        // Show default quick actions when query is empty
        setResults(getDefaultActions());
        return;
      }

      const q = query.toLowerCase();
      const list: SearchResult[] = [];

      // 1. Search Documents
      const docs = await db.documents
        .filter(d => !d.deleted && (d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q) || (d.tags && d.tags.some(t => t.toLowerCase().includes(q)))))
        .limit(5)
        .toArray();
      docs.forEach(d => {
        list.push({
          id: `doc-${d.id}`,
          title: d.name,
          subtitle: `Documento • ${d.category}`,
          category: 'document',
          url: `/documents/${d.id}`
        });
      });

      // 2. Search Vehicles
      const vehicles = await db.vehicles
        .filter(v => v.brand.toLowerCase().includes(q) || v.model.toLowerCase().includes(q) || v.plates.toLowerCase().includes(q))
        .limit(3)
        .toArray();
      vehicles.forEach(v => {
        list.push({
          id: `veh-${v.id}`,
          title: `${v.brand} ${v.model}`,
          subtitle: `Vehículo • Placas: ${v.plates}`,
          category: 'vehicle',
          url: `/vehicles/${v.id}`
        });
      });

      // 3. Search Warranties
      const warranties = await db.warranties
        .filter(w => w.productName.toLowerCase().includes(q) || w.brand.toLowerCase().includes(q) || w.store.toLowerCase().includes(q))
        .limit(3)
        .toArray();
      warranties.forEach(w => {
        list.push({
          id: `war-${w.id}`,
          title: w.productName,
          subtitle: `Garantía • Vence: ${w.expiryDate}`,
          category: 'warranty',
          url: `/warranties`
        });
      });

      // 4. Search Subscriptions
      const subs = await db.subscriptions
        .filter(s => s.name.toLowerCase().includes(q) || s.plan.toLowerCase().includes(q))
        .limit(3)
        .toArray();
      subs.forEach(s => {
        list.push({
          id: `sub-${s.id}`,
          title: s.name,
          subtitle: `Suscripción • $${s.price} MXN al mes`,
          category: 'subscription',
          url: `/subscriptions`
        });
      });

      // 5. Search Tasks
      const tasks = await db.tasks
        .filter(t => !t.isCompleted && (t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)))
        .limit(4)
        .toArray();
      tasks.forEach(t => {
        list.push({
          id: `tsk-${t.id}`,
          title: t.title,
          subtitle: `Tarea • Prioridad: ${t.priority}`,
          category: 'task',
          url: `/tasks`
        });
      });

      // 6. Include matching settings actions
      const actions = getDefaultActions().filter(a => a.title.toLowerCase().includes(q));
      list.push(...actions);

      setResults(list);
      setSelectedIndex(0);
    };

    const delayDebounce = setTimeout(performSearch, 150);
    return () => clearTimeout(delayDebounce);
  }, [query, isOpen]);

  const getDefaultActions = (): SearchResult[] => [
    {
      id: 'act-new-doc',
      title: 'Agregar nuevo documento',
      subtitle: 'Crear o escanear un documento nuevo',
      category: 'action',
      url: '/documents/new'
    },
    {
      id: 'act-new-exp',
      title: 'Registrar un gasto manual',
      subtitle: 'Registrar compra, gasolina, comida, etc.',
      category: 'action',
      url: '/expenses'
    },
    {
      id: 'act-new-task',
      title: 'Crear nueva tarea',
      subtitle: 'Añadir un pendiente al día de hoy',
      category: 'action',
      url: '/tasks'
    },
    {
      id: 'act-toggle-theme',
      title: 'Cambiar de tema (Claro / Oscuro)',
      subtitle: 'Alternar los colores de la aplicación',
      category: 'action',
      action: () => { toggleTheme(); onClose(); }
    },
    {
      id: 'act-settings',
      title: 'Configuración general',
      subtitle: 'Perfil, PIN de seguridad y facturación',
      category: 'action',
      url: '/settings'
    },
    {
      id: 'act-logout',
      title: 'Cerrar sesión',
      subtitle: 'Salir del usuario actual',
      category: 'action',
      action: () => { logout(); onClose(); }
    }
  ];

  // Keyboard navigation inside list
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        triggerResult(results[selectedIndex]);
      }
    }
  };

  const triggerResult = (res: SearchResult) => {
    if (res.action) {
      res.action();
    } else if (res.url) {
      onNavigate(res.url);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 animate-fade-in">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 dark:bg-black/75 backdrop-blur-xs" onClick={onClose} />

      {/* Box */}
      <div 
        className="relative w-full max-w-xl bg-surface dark:bg-surface border border-border-primary/60 rounded-2xl shadow-premium overflow-hidden flex flex-col max-h-[60vh]"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input bar */}
        <div className="flex items-center px-4.5 border-b border-border-primary/40 gap-3">
          <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Escribe un comando o busca documentos, gastos, vehículos..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full py-4 text-sm text-text-primary placeholder:text-text-secondary/60 bg-transparent border-none outline-none focus:ring-0"
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-text-secondary bg-surface-secondary border border-border-primary/55 rounded-md">ESC</kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 min-h-[150px]">
          {results.length > 0 ? (
            <div className="flex flex-col gap-1">
              {results.map((res, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <div
                    key={res.id}
                    onClick={() => triggerResult(res)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`
                      flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer select-none transition-colors
                      ${isSelected 
                        ? 'bg-brand/10 text-brand' 
                        : 'text-text-primary hover:bg-surface-secondary/50'
                      }
                    `}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold">{res.title}</span>
                      <span className={`text-[11px] ${isSelected ? 'text-brand/80' : 'text-text-secondary'}`}>
                        {res.subtitle}
                      </span>
                    </div>

                    {/* Category Icons / indicators */}
                    <div className="flex items-center gap-2">
                      <span className={`
                        text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border
                        ${isSelected
                          ? 'bg-brand/20 border-brand/25 text-brand'
                          : 'bg-surface-secondary border-border-primary/50 text-text-secondary'
                        }
                      `}>
                        {res.category}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-text-secondary">
              <svg className="w-8 h-8 opacity-40 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs font-medium">No se encontraron resultados para tu búsqueda</p>
            </div>
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4.5 py-3 border-t border-border-primary/40 bg-surface-secondary/15 flex items-center justify-between text-[10px] text-text-secondary select-none">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="px-1 bg-surface border border-border-primary rounded">↑↓</kbd> Navegar</span>
            <span className="flex items-center gap-1"><kbd className="px-1 bg-surface border border-border-primary rounded">Enter</kbd> Seleccionar</span>
          </div>
          <span>Búsqueda Inteligente Offline</span>
        </div>

      </div>
    </div>
  );
};
