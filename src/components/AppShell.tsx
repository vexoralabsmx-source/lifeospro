import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  LayoutDashboard, FileText, Bell, CreditCard, RefreshCw, 
  Car, Shield, Package, Home, CheckSquare, History, 
  Settings, DollarSign, Search, Sun, Moon, LogOut,
  Menu, X, Plus, User, Layers, ShieldCheck,
  Heart, KeyRound, Calendar as CalendarIcon, TrendingUp, Plane, Flame, Crown,
  Download, BookOpen, ShoppingBag, Dog, Calculator, QrCode
} from 'lucide-react';
import { Button } from './ui/Button';

interface AppShellProps {
  children: React.ReactNode;
  currentRoute: string;
  onNavigate: (route: string) => void;
  onOpenSearch: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  currentRoute,
  onNavigate,
  onOpenSearch
}) => {
  const { theme, toggleTheme, logout, activeModules, plan, user, accountEmail } = useApp();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Menu items for desktop sidebar
  const menuItems = [
    { name: 'Inicio', route: '#/dashboard', icon: LayoutDashboard, category: 'core' },
    { name: 'Calendario', route: '#/calendar', icon: CalendarIcon, category: 'core' },
    { name: 'Administración', route: '#/admin', icon: Crown, category: 'core' },
    { name: 'Documentos', route: '#/documents', icon: FileText, category: 'modules', key: 'documents' },
    { name: 'Salud', route: '#/health', icon: Heart, category: 'modules', key: 'health' },
    { name: 'Bóveda Claves', route: '#/passwords', icon: KeyRound, category: 'modules', key: 'passwords' },
    { name: 'Patrimonio & Metas', route: '#/networth', icon: TrendingUp, category: 'modules', key: 'networth' },
    { name: 'Viajes', route: '#/travel', icon: Plane, category: 'modules', key: 'travel' },
    { name: 'Hábitos & Notas', route: '#/habits', icon: Flame, category: 'modules', key: 'habits' },
    { name: 'Reportes & Backup', route: '#/export', icon: Download, category: 'modules', key: 'export' },
    { name: 'Diario & Ánimo', route: '#/journal', icon: BookOpen, category: 'modules', key: 'journal' },
    { name: 'Despensa & Súper', route: '#/pantry', icon: ShoppingBag, category: 'modules', key: 'pantry' },
    { name: 'Mascotas', route: '#/pets', icon: Dog, category: 'modules', key: 'pets' },
    { name: 'Calculadoras FIRE', route: '#/calculators', icon: Calculator, category: 'modules', key: 'calculators' },
    { name: 'Tarjeta QR ICE', route: '#/iceqr', icon: QrCode, category: 'modules', key: 'iceqr' },
    { name: 'Recordatorios', route: '#/reminders', icon: Bell, category: 'modules', key: 'tasks' },
    { name: 'Gastos', route: '#/expenses', icon: DollarSign, category: 'modules', key: 'expenses' },
    { name: 'Suscripciones', route: '#/subscriptions', icon: CreditCard, category: 'modules', key: 'subscriptions' },
    { name: 'Vehículos', route: '#/vehicles', icon: Car, category: 'modules', key: 'vehicles' },
    { name: 'Garantías', route: '#/warranties', icon: Shield, category: 'modules', key: 'warranties' },
    { name: 'Paquetes', route: '#/packages', icon: Package, category: 'modules', key: 'packages' },
    { name: 'Hogar', route: '#/home', icon: Home, category: 'modules', key: 'homes' },
    { name: 'Tareas', route: '#/tasks', icon: CheckSquare, category: 'modules', key: 'tasks' },
    { name: 'Actividad', route: '#/activity', icon: History, category: 'core' },
    { name: 'Precios', route: '#/pricing', icon: ShieldCheck, category: 'core' },
    { name: 'Configuración', route: '#/settings', icon: Settings, category: 'core' }
  ];

  // Filter items based on active modules configuration
  const filteredMenuItems = menuItems.filter(item => {
    if (item.route === '#/admin') {
      const activeEmail = accountEmail || localStorage.getItem('lifeos_user');
      return activeEmail?.toLowerCase() === 'mikeangdhz11@gmail.com';
    }
    if (item.category === 'core') return true;
    if (item.key && !activeModules.includes(item.key)) return false;
    return true;
  });

  const isActive = (route: string) => {
    if (route === '#/dashboard' && (currentRoute === '#/' || currentRoute === '')) return true;
    return currentRoute.startsWith(route);
  };

  const handleNav = (route: string) => {
    onNavigate(route);
    setIsMobileMenuOpen(false);
    setIsQuickAddOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary text-text-primary">
      
      {/* 1. DESKTOP SIDEBAR */}
      <aside 
        className={`
          hidden md:flex flex-col border-r border-border-primary/60 bg-surface transition-all duration-350 z-20
          ${isSidebarCollapsed ? 'w-20' : 'w-64'}
        `}
      >
        {/* Logo Section */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-primary/40 h-16 shrink-0">
          {!isSidebarCollapsed && (
            <div className="flex flex-col select-none">
              <div className="flex items-center gap-2">
                <img src="/favicon.png" className="w-7 h-7 object-contain rounded-lg" alt="Logo" />
                <span className="font-heading font-extrabold text-base tracking-tight bg-linear-to-r from-text-primary to-text-secondary bg-clip-text text-transparent">LifeOS <span className="text-brand font-bold text-xs">Pro</span></span>
              </div>
              <span className="text-[9px] text-brand/80 font-bold tracking-tight ml-9 -mt-0.5">by Vexora Labs</span>
            </div>
          )}
          {isSidebarCollapsed && (
            <img src="/favicon.png" className="w-7.5 h-7.5 object-contain rounded-lg mx-auto" alt="Logo" />
          )}
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="text-text-secondary hover:text-text-primary p-1.5 rounded-lg hover:bg-surface-secondary"
            aria-label="Toggle Sidebar"
          >
            <Menu className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.route);
            return (
              <a
                key={item.name}
                href={item.route}
                onClick={(e) => { e.preventDefault(); handleNav(item.route); }}
                className={`
                  flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold select-none transition-all duration-200
                  ${active 
                    ? 'bg-brand/10 text-brand' 
                    : 'text-text-secondary hover:bg-surface-secondary/70 hover:text-text-primary'
                  }
                  ${isSidebarCollapsed ? 'justify-center px-0' : ''}
                `}
                title={item.name}
              >
                <Icon className={`w-4.5 h-4.5 ${active ? 'text-brand' : 'text-text-secondary/80'}`} />
                {!isSidebarCollapsed && <span>{item.name}</span>}
              </a>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border-primary/40 shrink-0 flex flex-col gap-2">
          {!isSidebarCollapsed && (
            <div className="flex items-center justify-between px-2.5 py-2 bg-surface-secondary/50 rounded-xl border border-border-primary/20 mb-1 select-none">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-brand/20 text-brand flex items-center justify-center text-xs font-bold font-heading uppercase">
                  {user ? user[0] : 'U'}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold capitalize text-text-primary truncate max-w-[100px]">{user || 'Usuario'}</span>
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">{plan}</span>
                </div>
              </div>
              <button 
                onClick={logout}
                className="text-text-secondary hover:text-danger p-1 rounded-lg hover:bg-surface-secondary transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-border-primary text-xs font-semibold hover:bg-surface-secondary cursor-pointer"
          >
            {theme === 'light' ? (
              <>
                <Moon className="w-4 h-4 text-indigo-500" />
                {!isSidebarCollapsed && <span>Modo Oscuro</span>}
              </>
            ) : (
              <>
                <Sun className="w-4 h-4 text-amber-500" />
                {!isSidebarCollapsed && <span>Modo Claro</span>}
              </>
            )}
          </button>
        </div>
      </aside>

      {/* 2. MAIN CONTAINER */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Header bar */}
        <header className="flex items-center justify-between px-6 h-16 border-b border-border-primary/40 bg-surface shrink-0 z-10">
          <div className="flex items-center gap-3">
            {/* Mobile Menu button */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden text-text-secondary hover:text-text-primary p-1.5 rounded-lg hover:bg-surface-secondary"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Breadcrumbs/Module title */}
            <div className="flex items-center gap-1.5 select-none font-heading font-extrabold text-sm tracking-tight text-text-primary md:text-base">
              <span className="capitalize">{currentRoute.replace('#/', '').split('/')[0] || 'Dashboard'}</span>
              {plan === 'free' && (
                <span 
                  onClick={() => handleNav('#/pricing')}
                  className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wide cursor-pointer hover:bg-amber-500/20 active:scale-95"
                >
                  Free
                </span>
              )}
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Global Search Button */}
            <button 
              onClick={onOpenSearch}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-secondary text-xs text-text-secondary hover:text-text-primary border border-border-primary/45 select-none focus:outline-none transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-text-secondary/70" />
              <span className="hidden sm:inline">Buscar...</span>
              <kbd className="hidden sm:inline-block px-1 text-[9px] font-mono border border-border-primary bg-surface rounded">Ctrl K</kbd>
            </button>
            
            {/* Quick Mobile Theme toggle */}
            <button 
              onClick={toggleTheme}
              className="md:hidden p-2 text-text-secondary hover:text-text-primary rounded-xl bg-surface-secondary border border-border-primary/40"
            >
              {theme === 'light' ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 relative animate-fade-in bg-bg-primary">
          {children}
        </main>
      </div>

      {/* 3. MOBILE BOTTOM NAVIGATION */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-border-primary/50 flex items-center justify-around z-30 px-2 shadow-lg">
        <button 
          onClick={() => handleNav('#/dashboard')} 
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-colors ${isActive('#/dashboard') ? 'text-brand' : 'text-text-secondary'}`}
        >
          <LayoutDashboard className="w-5.5 h-5.5" />
          <span className="text-[9px] font-bold mt-1">Inicio</span>
        </button>

        <button 
          onClick={() => handleNav('#/documents')} // default launch module
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-colors ${isActive('#/documents') || isActive('#/warranties') || isActive('#/vehicles') || isActive('#/expenses') ? 'text-brand' : 'text-text-secondary'}`}
        >
          <Layers className="w-5.5 h-5.5" />
          <span className="text-[9px] font-bold mt-1">Organizar</span>
        </button>

        {/* High-visibility Action button */}
        <button 
          onClick={() => setIsQuickAddOpen(true)}
          className="flex items-center justify-center w-12 h-12 rounded-2xl bg-brand text-white shadow-md active:scale-90 transition-transform -translate-y-2 border-4 border-bg-primary cursor-pointer"
          aria-label="Quick Add"
        >
          <Plus className="w-6 h-6" />
        </button>

        <button 
          onClick={() => handleNav('#/activity')} 
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-colors ${isActive('#/activity') ? 'text-brand' : 'text-text-secondary'}`}
        >
          <History className="w-5.5 h-5.5" />
          <span className="text-[9px] font-bold mt-1">Actividad</span>
        </button>

        <button 
          onClick={() => handleNav('#/settings')} 
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-colors ${isActive('#/settings') ? 'text-brand' : 'text-text-secondary'}`}
        >
          <User className="w-5.5 h-5.5" />
          <span className="text-[9px] font-bold mt-1">Perfil</span>
        </button>
      </div>

      {/* 4. MOBILE SIDE NAV DRAWER OVERLAY */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
          
          {/* Drawer Box */}
          <div className="relative flex flex-col w-64 max-w-xs bg-surface border-r border-border-primary h-full z-50 p-4 animate-slide-up">
            <div className="flex items-center justify-between border-b border-border-primary/40 pb-4 mb-4 select-none">
              <div className="flex items-center gap-2">
                <img src="/favicon.png" className="w-6.5 h-6.5 object-contain rounded-lg" alt="Logo" />
                <span className="font-heading font-bold text-sm tracking-tight">LifeOS Pro</span>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-text-secondary p-1 rounded-lg hover:bg-surface-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <nav className="flex-1 overflow-y-auto flex flex-col gap-1.5">
              {filteredMenuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.route);
                return (
                  <a
                    key={item.name}
                    href={item.route}
                    onClick={(e) => { e.preventDefault(); handleNav(item.route); }}
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold
                      ${active ? 'bg-brand/10 text-brand' : 'text-text-secondary'}
                    `}
                  >
                    <Icon className="w-4.5 h-4.5" />
                    <span>{item.name}</span>
                  </a>
                );
              })}
            </nav>

            <div className="border-t border-border-primary/40 pt-4 mt-auto">
              <Button variant="danger" className="w-full text-xs font-bold" onClick={logout}>
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 5. QUICK ADD MENU BOTTOM SHEET */}
      {isQuickAddOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center animate-fade-in">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/60" onClick={() => setIsQuickAddOpen(false)} />
          
          {/* Menu Drawer */}
          <div className="relative w-full max-w-md bg-surface border-t border-border-primary rounded-t-2xl z-50 p-6 flex flex-col gap-4 animate-slide-up pb-8">
            <div className="flex items-center justify-between border-b border-border-primary/45 pb-3">
              <h4 className="font-heading font-bold text-base text-text-primary">Acciones Rápidas</h4>
              <button onClick={() => setIsQuickAddOpen(false)} className="text-text-secondary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <button 
                onClick={() => handleNav('#/documents/new')}
                className="flex flex-col items-center p-4 bg-surface-secondary/40 border border-border-primary/60 hover:bg-brand/5 hover:border-brand/30 rounded-2xl transition-colors gap-2 cursor-pointer select-none"
              >
                <FileText className="w-6 h-6 text-brand" />
                <span className="text-xs font-bold">Nuevo Documento</span>
              </button>
              
              <button 
                onClick={() => handleNav('#/expenses')}
                className="flex flex-col items-center p-4 bg-surface-secondary/40 border border-border-primary/60 hover:bg-brand/5 hover:border-brand/30 rounded-2xl transition-colors gap-2 cursor-pointer select-none"
              >
                <DollarSign className="w-6 h-6 text-success" />
                <span className="text-xs font-bold">Registrar Gasto</span>
              </button>

              <button 
                onClick={() => handleNav('#/tasks')}
                className="flex flex-col items-center p-4 bg-surface-secondary/40 border border-border-primary/60 hover:bg-brand/5 hover:border-brand/30 rounded-2xl transition-colors gap-2 cursor-pointer select-none"
              >
                <CheckSquare className="w-6 h-6 text-warning" />
                <span className="text-xs font-bold">Crear Tarea</span>
              </button>

              <button 
                onClick={() => handleNav('#/vehicles')}
                className="flex flex-col items-center p-4 bg-surface-secondary/40 border border-border-primary/60 hover:bg-brand/5 hover:border-brand/30 rounded-2xl transition-colors gap-2 cursor-pointer select-none"
              >
                <Car className="w-6 h-6 text-brand" />
                <span className="text-xs font-bold">Añadir Vehículo</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
