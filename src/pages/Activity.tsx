import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/lifeDB';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { 
  History, Calendar, Filter, FileText, Car, 
  DollarSign, CreditCard, Shield, Package, Home, CheckSquare
} from 'lucide-react';

export const Activity: React.FC = () => {
  const [selectedModule, setSelectedModule] = useState('All');
  const [startDate, setStartDate] = useState('');

  // --- QUERY ACTIVITIES ---
  const activities = useLiveQuery(() => db.activities.toArray(), []);

  if (!activities) {
    return (
      <div className="flex flex-col gap-6 animate-pulse p-4">
        <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-1/4" />
        <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
      </div>
    );
  }

  // --- FILTER LOGIC ---
  const filteredActivities = activities.filter(act => {
    // 1. Module filter
    if (selectedModule !== 'All' && act.module !== selectedModule) return false;

    // 2. Date filter
    if (startDate) {
      const actDate = new Date(act.date).toISOString().split('T')[0];
      if (actDate < startDate) return false;
    }

    return true;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Icon selector based on module
  const getModuleIcon = (mod: string) => {
    switch (mod) {
      case 'documents': return <FileText className="w-4 h-4 text-blue-500" />;
      case 'vehicles': return <Car className="w-4 h-4 text-indigo-500" />;
      case 'expenses': return <DollarSign className="w-4 h-4 text-emerald-500" />;
      case 'subscriptions': return <CreditCard className="w-4 h-4 text-violet-500" />;
      case 'warranties': return <Shield className="w-4 h-4 text-amber-500" />;
      case 'packages': return <Package className="w-4 h-4 text-rose-500" />;
      case 'homes': return <Home className="w-4 h-4 text-cyan-500" />;
      case 'tasks': return <CheckSquare className="w-4 h-4 text-orange-500" />;
      default: return <History className="w-4 h-4 text-zinc-500" />;
    }
  };

  return (
    <div className="flex flex-col gap-5 select-none">
      
      {/* Header */}
      <div>
        <h2 className="font-heading font-black text-2xl text-text-primary tracking-tight">Historial de Actividad</h2>
        <p className="text-xs text-text-secondary font-medium mt-0.5">Consulta la bitácora cronológica de los cambios realizados en tu centro de control.</p>
      </div>

      {/* Filter and Date actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <Select 
          value={selectedModule} 
          onChange={e => setSelectedModule(e.target.value)}
          options={[
            { value: 'All', label: 'Todos los módulos' },
            { value: 'documents', label: 'Documentos' },
            { value: 'vehicles', label: 'Vehículos' },
            { value: 'expenses', label: 'Gastos' },
            { value: 'subscriptions', label: 'Suscripciones' },
            { value: 'warranties', label: 'Garantías' },
            { value: 'packages', label: 'Paquetes' },
            { value: 'homes', label: 'Hogar' },
            { value: 'tasks', label: 'Tareas' }
          ]}
          className="py-2 text-xs w-full sm:w-[200px]"
        />

        <div className="relative flex items-center w-full sm:w-[200px]">
          <Calendar className="absolute left-3 w-4 h-4 text-text-secondary" />
          <Input 
            type="date" 
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="pl-10 py-2.5 text-xs" 
          />
        </div>
        
        {startDate && (
          <button 
            onClick={() => setStartDate('')} 
            className="text-xs font-bold text-brand hover:underline"
          >
            Limpiar fecha
          </button>
        )}
      </div>

      {/* Chronological timeline layout */}
      <Card className="p-6">
        {filteredActivities.length > 0 ? (
          <div className="relative border-l-2 border-border-primary/50 ml-4.5 pl-6 flex flex-col gap-6 animate-slide-up">
            {filteredActivities.map((act) => {
              const formattedDate = new Date(act.date).toLocaleString('es-MX', {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
              });
              
              return (
                <div key={act.id} className="relative group">
                  {/* Timeline Bullet node */}
                  <span className="absolute -left-[35px] top-0 w-6 h-6 rounded-full bg-surface border-2 border-border-primary/80 flex items-center justify-center shadow-xs">
                    {getModuleIcon(act.module)}
                  </span>
                  
                  <div>
                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">{formattedDate}</span>
                    <p className="text-xs font-semibold text-text-primary mt-1 pr-4">{act.details}</p>
                    <span className="inline-block text-[9px] font-bold text-text-secondary bg-surface-secondary border border-border-primary/50 px-1.5 py-0.5 rounded mt-1.5 uppercase tracking-wide">
                      {act.module}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-text-secondary flex flex-col items-center">
            <History className="w-8 h-8 opacity-30 mb-2" />
            <p className="text-xs font-bold">Sin logs de actividad</p>
            <p className="text-[10px] text-text-secondary/70 mt-0.5">Las acciones que realices en la app se registrarán aquí.</p>
          </div>
        )}
      </Card>

    </div>
  );
};
