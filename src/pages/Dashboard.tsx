import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type TaskRecord } from '../db/lifeDB';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  FileText, Car, DollarSign, Shield, CreditCard, 
  Package, Home, CheckSquare, Bell, Calendar, Eye, 
  EyeOff, Plus, ChevronRight, AlertCircle, ArrowUpRight, 
  MapPin, Check, Camera, Sparkles, Sliders
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DashboardProps {
  onNavigate: (route: string) => void;
  onOpenScanner: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigate,
  onOpenScanner
}) => {
  const { user, activeModules, plan } = useApp();
  const [greeting, setGreeting] = useState('Buenas tardes');
  const [hideFinancials, setHideFinancials] = useState(false);
  const [isEditLayoutOpen, setIsEditLayoutOpen] = useState(false);
  
  // Custom user layout configurations stored in localStorage
  const [widgetOrder, setWidgetOrder] = useState<string[]>([
    'warranties', 'vehicles', 'expenses', 'subscriptions', 'packages', 'homes', 'tasks'
  ]);
  
  // Set greeting according to current hour
  useEffect(() => {
    const hrs = new Date().getHours();
    if (hrs < 12) setGreeting('Buenos días');
    else if (hrs < 19) setGreeting('Buenas tardes');
    else setGreeting('Buenas noches');
  }, []);

  // --- DATABASE QUERIES (REAL-TIME UPDATES VIA DEXIE) ---

  const documents = useLiveQuery(() => db.documents.toArray(), []);
  const vehicles = useLiveQuery(() => db.vehicles.toArray(), []);
  const expenses = useLiveQuery(() => db.expenses.toArray(), []);
  const subscriptions = useLiveQuery(() => db.subscriptions.toArray(), []);
  const warranties = useLiveQuery(() => db.warranties.toArray(), []);
  const packages = useLiveQuery(() => db.packages.toArray(), []);
  const homes = useLiveQuery(() => db.homes.toArray(), []);
  const tasks = useLiveQuery(() => db.tasks.toArray(), []);

  if (!documents || !vehicles || !expenses || !subscriptions || !warranties || !packages || !homes || !tasks) {
    return (
      <div className="flex flex-col gap-6 animate-pulse p-4">
        <div className="h-12 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-44 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
          <div className="h-44 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
          <div className="h-44 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  // --- STATS & COMPUTATIONS ---

  // Filter out archived/deleted documents
  const activeDocs = documents.filter(d => !d.archived && !d.deleted);
  
  // Find expirations in the next 30 days
  const now = new Date();
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  
  const expiringDocs = activeDocs.filter(d => {
    if (!d.expiryDate) return false;
    const exp = new Date(d.expiryDate);
    return exp >= now && exp <= thirtyDaysFromNow;
  });

  const expiringWarranties = warranties.filter(w => {
    const exp = new Date(w.expiryDate);
    return exp >= now && exp <= thirtyDaysFromNow;
  });

  const expiringVehiclesInsurance = vehicles.filter(v => {
    const exp = new Date(v.insuranceExpiry);
    return exp >= now && exp <= thirtyDaysFromNow;
  });

  const totalActionNeeded = expiringDocs.length + expiringWarranties.length + expiringVehiclesInsurance.length;

  // Expenses calculations (current month)
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const monthlyExpensesTotal = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Subscriptions calculations
  const activeSubs = subscriptions.filter(s => s.status === 'active');
  const subsMonthlyTotal = activeSubs.reduce((sum, s) => {
    return sum + (s.frequency === 'monthly' ? s.price : s.price / 12);
  }, 0);

  // Packages states
  const inTransitPkgs = packages.filter(p => ['transit', 'delivery', 'shipped'].includes(p.status));
  
  // Tasks summaries (incomplete only)
  const pendingTasks = tasks.filter(t => !t.isCompleted);
  const todaysTasks = pendingTasks.filter(t => {
    if (!t.dueDate) return false;
    const d = new Date(t.dueDate);
    return d.toDateString() === now.toDateString();
  });

  // Toggle tasks completion with micro-celebration animation
  const handleToggleTask = async (task: TaskRecord) => {
    const newStatus = !task.isCompleted;
    await db.tasks.update(task.id!, { isCompleted: newStatus });
    
    // Log activity
    await db.activities.add({
      userId: user || 'local_user',
      action: 'updated',
      module: 'tasks',
      details: `Se marcó como ${newStatus ? 'completada' : 'pendiente'} la tarea: ${task.title}`,
      date: new Date().toISOString()
    });

    if (newStatus) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.85 }
      });
    }
  };

  // Trigger quick task add
  const handleQuickAddTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const title = data.get('taskTitle') as string;
    if (!title.trim()) return;

    await db.tasks.add({
      userId: user || 'local_user',
      title,
      priority: 'medium',
      category: 'Personal',
      tags: ['Personal'],
      isCompleted: false,
      createdAt: new Date().toISOString()
    });

    e.currentTarget.reset();
  };

  // Check if a specific module is loaded in the layout
  const isModuleActive = (key: string) => activeModules.includes(key);

  return (
    <div className="flex flex-col gap-6">
      
      {/* 1. GREETINGS & WELCOME BANNER WITH VEXORA LABS BRANDING */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-brand/15 via-purple-500/10 to-brand/5 border border-brand/20 p-6 md:p-7 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 select-none">
          <div className="flex flex-col items-start gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-[10px] font-bold tracking-wide uppercase">
              <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500/20" /> Creado por Vexora Labs
            </div>
            <h1 className="font-heading font-black text-2xl md:text-3xl text-text-primary tracking-tight">
              {greeting}, <span className="capitalize">{user === 'mike_demo' ? 'Mike' : user}</span> 👋
            </h1>
            <p className="text-xs text-text-secondary font-medium max-w-xl leading-relaxed">
              {totalActionNeeded > 0 
                ? `Tienes ${totalActionNeeded} elementos que requieren atención esta semana en tu centro de control personal 100% offline y seguro.` 
                : 'Todo bajo control. Tu información se almacena localmente y con cifrado privado en tu dispositivo.'
              }
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button variant="outline" size="sm" onClick={onOpenScanner} className="text-xs font-bold gap-1.5 rounded-xl bg-surface/80 backdrop-blur-xs">
              <Camera className="w-4 h-4 text-brand" /> Escanear
            </Button>
            <Button variant="primary" size="sm" onClick={() => onNavigate('#/documents')} className="text-xs font-bold gap-1.5 rounded-xl">
              <Plus className="w-4 h-4" /> Agregar Elemento
            </Button>
          </div>
        </div>
      </div>

      {/* 2. URGENT EXPIRATIONS ALERTS WIDGET */}
      {totalActionNeeded > 0 && (
        <Card variant="glass" className="border-warning/35 bg-warning-light/35 p-5 animate-slide-up select-none">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-warning-light border border-warning/10 text-warning">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-heading font-bold text-sm text-text-primary mb-2">
                Acciones urgentes recomendadas
              </h3>
              
              <div className="flex flex-col gap-2">
                {/* Expiring Docs */}
                {expiringDocs.map(d => (
                  <div key={d.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border-primary/10 last:border-none">
                    <span className="font-semibold text-text-primary flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-brand" /> {d.name}
                    </span>
                    <div className="flex items-center gap-2.5">
                      <Badge variant="danger" size="xs">Vence el {d.expiryDate}</Badge>
                      <button onClick={() => onNavigate(`#/documents`)} className="text-brand hover:underline">Ver</button>
                    </div>
                  </div>
                ))}

                {/* Expiring Warranties */}
                {expiringWarranties.map(w => (
                  <div key={w.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border-primary/10 last:border-none">
                    <span className="font-semibold text-text-primary flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-amber-500" /> Garantía: {w.productName}
                    </span>
                    <div className="flex items-center gap-2.5">
                      <Badge variant="warning" size="xs">Vence el {w.expiryDate}</Badge>
                      <button onClick={() => onNavigate(`#/warranties`)} className="text-brand hover:underline">Ver</button>
                    </div>
                  </div>
                ))}

                {/* Expiring Vehicle Insurance */}
                {expiringVehiclesInsurance.map(v => (
                  <div key={v.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border-primary/10 last:border-none">
                    <span className="font-semibold text-text-primary flex items-center gap-2">
                      <Car className="w-3.5 h-3.5 text-indigo-500" /> Seguro: {v.brand} {v.model}
                    </span>
                    <div className="flex items-center gap-2.5">
                      <Badge variant="danger" size="xs">Vence el {v.insuranceExpiry}</Badge>
                      <button onClick={() => onNavigate(`#/vehicles`)} className="text-brand hover:underline">Ver</button>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </Card>
      )}

      {/* 3. DYNAMIC METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 select-none">
        
        {/* Document Tracker Summary */}
        {isModuleActive('documents') && (
          <Card hoverable onClick={() => onNavigate('#/documents')} className="p-5 flex flex-col justify-between min-h-[140px]">
            <div className="flex items-start justify-between">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                <FileText className="w-5 h-5" />
              </div>
              <Badge variant="brand" size="xs">{activeDocs.length} Registrados</Badge>
            </div>
            <div className="mt-4">
              <h4 className="text-xs text-text-secondary font-semibold">Documentación Personal</h4>
              <span className="font-heading font-black text-2xl text-text-primary mt-1 block">
                {activeDocs.length} <span className="text-xs text-text-secondary font-bold">archivos</span>
              </span>
            </div>
          </Card>
        )}

        {/* Expenses and subscriptions metrics */}
        {isModuleActive('expenses') && (
          <Card className="p-5 flex flex-col justify-between min-h-[140px] relative">
            <div className="flex items-start justify-between">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                <DollarSign className="w-5 h-5" />
              </div>
              <button 
                onClick={() => setHideFinancials(!hideFinancials)} 
                className="text-text-secondary hover:text-text-primary"
              >
                {hideFinancials ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
            <div className="mt-4" onClick={() => onNavigate('#/expenses')}>
              <h4 className="text-xs text-text-secondary font-semibold">Consumo del Mes (Julio)</h4>
              <span className="font-heading font-black text-2xl text-text-primary mt-1 block cursor-pointer hover:text-brand transition-colors">
                {hideFinancials ? '••••••' : `$${monthlyExpensesTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`}
              </span>
            </div>
          </Card>
        )}

        {/* Subscriptions Metrics */}
        {isModuleActive('subscriptions') && (
          <Card hoverable onClick={() => onNavigate('#/subscriptions')} className="p-5 flex flex-col justify-between min-h-[140px]">
            <div className="flex items-start justify-between">
              <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-500">
                <CreditCard className="w-5 h-5" />
              </div>
              <Badge variant="success" size="xs">{activeSubs.length} Activas</Badge>
            </div>
            <div className="mt-4">
              <h4 className="text-xs text-text-secondary font-semibold">Costo Suscripciones</h4>
              <span className="font-heading font-black text-2xl text-text-primary mt-1 block">
                {hideFinancials ? '••••' : `$${subsMonthlyTotal.toLocaleString('es-MX', { maximumFractionDigits: 0 })} MXN`}
                <span className="text-[11px] text-text-secondary font-bold ml-1">/ mes</span>
              </span>
            </div>
          </Card>
        )}

      </div>

      {/* 4. MODULAR MODULE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT TWO COLUMNS FOR WIDGETS */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* VEHICLES WIDGET */}
          {isModuleActive('vehicles') && vehicles.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center justify-between border-b border-border-primary/30 pb-3.5 mb-4">
                <h3 className="font-heading font-bold text-sm text-text-primary flex items-center gap-2 select-none">
                  <Car className="w-4 h-4 text-indigo-500" /> Vehículos
                </h3>
                <button onClick={() => onNavigate('#/vehicles')} className="text-xs font-bold text-brand hover:underline flex items-center select-none">
                  Ir al módulo <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {vehicles.map(v => (
                <div key={v.id} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Visual card badge */}
                  <div className="bg-surface-secondary/40 border border-border-primary/60 rounded-xl p-4.5 text-center flex flex-col items-center justify-center select-none">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-sm mb-2 uppercase">
                      {v.brand[0]}{v.model[0]}
                    </div>
                    <span className="text-xs font-extrabold text-text-primary">{v.brand} {v.model}</span>
                    <span className="text-[10px] text-text-secondary font-semibold mt-1">{v.plates}</span>
                  </div>

                  {/* Mileage tracker metrics */}
                  <div className="flex flex-col justify-center gap-3 py-1">
                    <div className="flex flex-col gap-0.5 select-none">
                      <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Kilometraje Actual</span>
                      <span className="text-base font-black text-text-primary">{v.mileage.toLocaleString()} km</span>
                    </div>
                    <div className="flex flex-col gap-0.5 select-none">
                      <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Próximo Servicio</span>
                      <span className="text-xs font-bold text-text-secondary">{v.nextServiceMileage.toLocaleString()} km</span>
                    </div>
                  </div>

                  {/* Oil, verification status */}
                  <div className="flex flex-col justify-center gap-3.5 select-none">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-secondary font-medium">Seguro Vence</span>
                      <span className="font-bold text-text-primary">{v.insuranceExpiry}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-secondary font-medium">Combustible</span>
                      <span className="font-bold text-text-primary">{v.fuelType}</span>
                    </div>
                    {/* Mileage status bar */}
                    <div className="w-full bg-border-primary/50 h-1.5 rounded-full overflow-hidden mt-1">
                      <div 
                        className="bg-brand h-full transition-all" 
                        style={{ width: `${Math.min(100, (v.mileage / v.nextServiceMileage) * 100)}%` }}
                      />
                    </div>
                  </div>

                </div>
              ))}
            </Card>
          )}

          {/* PACKAGES IN TRANSIT */}
          {isModuleActive('packages') && inTransitPkgs.length > 0 && (
            <Card className="p-5 select-none">
              <div className="flex items-center justify-between border-b border-border-primary/30 pb-3.5 mb-4">
                <h3 className="font-heading font-bold text-sm text-text-primary flex items-center gap-2">
                  <Package className="w-4 h-4 text-rose-500" /> Paquetes en camino ({inTransitPkgs.length})
                </h3>
                <button onClick={() => onNavigate('#/packages')} className="text-xs font-bold text-brand hover:underline flex items-center">
                  Ver todos <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {inTransitPkgs.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-3.5 border border-border-primary/50 rounded-xl bg-surface-secondary/15 hover:bg-surface-secondary/40 transition-colors">
                    <div className="w-9 h-9 bg-rose-500/10 text-rose-500 rounded-lg flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-extrabold text-text-primary truncate">{p.name}</h4>
                      <p className="text-[10px] text-text-secondary font-semibold truncate mt-0.5">{p.store} • {p.courier || 'Envío local'}</p>
                    </div>
                    <Badge variant={p.status === 'delivery' ? 'success' : 'brand'} size="xs" className="capitalize">
                      {p.status === 'delivery' ? 'Reparto' : 'Tránsito'}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* HOMES SUMMARY */}
          {isModuleActive('homes') && homes.length > 0 && (
            <Card className="p-5 select-none">
              <div className="flex items-center justify-between border-b border-border-primary/30 pb-3.5 mb-4">
                <h3 className="font-heading font-bold text-sm text-text-primary flex items-center gap-2">
                  <Home className="w-4 h-4 text-cyan-500" /> Hogar & Servicios
                </h3>
                <button onClick={() => onNavigate('#/home')} className="text-xs font-bold text-brand hover:underline flex items-center">
                  Administrar Vivienda <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {homes.map(h => (
                <div key={h.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-black text-text-primary">{h.name}</h4>
                    <p className="text-[10px] text-text-secondary font-semibold mt-0.5">{h.address}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {h.services.slice(0, 3).map((s, idx) => (
                      <span key={idx} className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border border-cyan-500/15 rounded-md px-2 py-0.5">
                        {s}
                      </span>
                    ))}
                    {h.services.length > 3 && (
                      <span className="text-[10px] font-bold text-text-secondary bg-surface-secondary border border-border-primary/50 rounded-md px-2 py-0.5">
                        +{h.services.length - 3} más
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </Card>
          )}

        </div>

        {/* RIGHT COLUMN - TODAY'S TASKS / TO-DO */}
        <div>
          {isModuleActive('tasks') && (
            <Card className="p-5 h-full flex flex-col justify-between">
              
              <div>
                <div className="flex items-center justify-between border-b border-border-primary/30 pb-3.5 mb-4 select-none">
                  <h3 className="font-heading font-bold text-sm text-text-primary flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-warning" /> Pendientes
                  </h3>
                  <button onClick={() => onNavigate('#/tasks')} className="text-xs font-bold text-brand hover:underline flex items-center">
                    Ver todas <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Task quick-add form */}
                <form onSubmit={handleQuickAddTask} className="flex gap-2 mb-4 select-none">
                  <Input 
                    name="taskTitle"
                    placeholder="Agregar pendiente rápido..." 
                    className="flex-1 py-1.5 text-xs placeholder:text-text-secondary/50" 
                  />
                  <Button type="submit" size="sm" className="px-3 rounded-xl"><Plus className="w-4 h-4" /></Button>
                </form>

                {/* Active items list */}
                {pendingTasks.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {pendingTasks.slice(0, 5).map(task => (
                      <div 
                        key={task.id} 
                        className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-surface-secondary/40 border border-border-primary/20 transition-all select-none"
                      >
                        <button
                          onClick={() => handleToggleTask(task)}
                          className={`
                            w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer
                            ${task.isCompleted 
                              ? 'bg-success border-success text-white' 
                              : 'border-border-primary hover:border-brand bg-surface'
                            }
                          `}
                        >
                          {task.isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-text-primary leading-tight break-words">
                            {task.title}
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-1.5 items-center">
                            {task.dueDate && (
                              <span className="inline-flex items-center text-[9px] font-bold text-text-secondary bg-surface-secondary px-1.5 py-0.5 rounded border border-border-primary/50 gap-0.5">
                                <Calendar className="w-2.5 h-2.5" /> {task.dueDate}
                              </span>
                            )}
                            <Badge variant={task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'neutral'} size="xs" className="capitalize">
                              {task.priority}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                    {pendingTasks.length > 5 && (
                      <p className="text-center text-[10px] text-text-secondary font-bold select-none mt-1">
                        Hay {pendingTasks.length - 5} tareas adicionales pendientes.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center text-text-secondary select-none flex flex-col items-center">
                    <Sparkles className="w-6 h-6 text-brand/30 animate-pulse-slow mb-2" />
                    <p className="text-xs font-bold">¡Estás al día!</p>
                    <p className="text-[10px] text-text-secondary/70 mt-0.5">No tienes tareas pendientes.</p>
                  </div>
                )}
              </div>

              {/* Stats complete indicator */}
              {tasks.length > 0 && (
                <div className="border-t border-border-primary/30 pt-4 mt-6 select-none">
                  <div className="flex items-center justify-between text-xs mb-1.5 font-bold text-text-secondary">
                    <span>Tareas Completadas</span>
                    <span>{tasks.filter(t => t.isCompleted).length} / {tasks.length}</span>
                  </div>
                  <div className="w-full bg-border-primary/50 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-success h-full transition-all" 
                      style={{ width: `${(tasks.filter(t => t.isCompleted).length / tasks.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}

            </Card>
          )}
        </div>

      </div>

    </div>
  );
};
