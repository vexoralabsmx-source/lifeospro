import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/lifeDB';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import { 
  Bell, Calendar, ShieldAlert, FileText, Car, 
  Shield, Clock, AlertTriangle, ArrowRight
} from 'lucide-react';

interface ReminderItem {
  id: string;
  title: string;
  category: string; // 'document' | 'vehicle' | 'warranty'
  date: string;
  daysRemaining: number;
  urgency: 'high' | 'medium' | 'low';
}

export const Reminders: React.FC = () => {
  const [selectedUrgency, setSelectedUrgency] = useState('All');

  // --- QUERY DATAS ---
  const documents = useLiveQuery(() => db.documents.toArray(), []);
  const vehicles = useLiveQuery(() => db.vehicles.toArray(), []);
  const warranties = useLiveQuery(() => db.warranties.toArray(), []);

  if (!documents || !vehicles || !warranties) {
    return (
      <div className="flex flex-col gap-6 animate-pulse p-4">
        <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-1/4" />
        <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
      </div>
    );
  }

  // --- COMPUTE EXPY DATES ---
  const list: ReminderItem[] = [];
  const now = new Date();

  // Helper to calculate days remaining
  const getDaysLeft = (dateStr: string) => {
    const d = new Date(dateStr);
    const diff = d.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Helper to determine urgency
  const getUrgency = (days: number): 'high' | 'medium' | 'low' => {
    if (days <= 7) return 'high';
    if (days <= 30) return 'medium';
    return 'low';
  };

  // 1. Documents
  documents.forEach(doc => {
    if (doc.expiryDate && !doc.archived && !doc.deleted) {
      const days = getDaysLeft(doc.expiryDate);
      list.push({
        id: `doc-${doc.id}`,
        title: `Vencimiento de Documento: ${doc.name}`,
        category: 'document',
        date: doc.expiryDate,
        daysRemaining: days,
        urgency: getUrgency(days)
      });
    }
  });

  // 2. Vehicles
  vehicles.forEach(v => {
    if (v.insuranceExpiry) {
      const days = getDaysLeft(v.insuranceExpiry);
      list.push({
        id: `veh-ins-${v.id}`,
        title: `Seguro del Vehículo: ${v.brand} ${v.model} (${v.plates})`,
        category: 'vehicle',
        date: v.insuranceExpiry,
        daysRemaining: days,
        urgency: getUrgency(days)
      });
    }
  });

  // 3. Warranties
  warranties.forEach(w => {
    if (w.expiryDate && w.status === 'active') {
      const days = getDaysLeft(w.expiryDate);
      list.push({
        id: `war-${w.id}`,
        title: `Garantía de Artículo: ${w.productName} (${w.brand})`,
        category: 'warranty',
        date: w.expiryDate,
        daysRemaining: days,
        urgency: getUrgency(days)
      });
    }
  });

  // Filter and sort list: soonest first
  const filteredReminders = list.filter(rem => {
    if (selectedUrgency !== 'All' && rem.urgency !== selectedUrgency) return false;
    return true;
  }).sort((a, b) => a.daysRemaining - b.daysRemaining);

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'document': return <FileText className="w-4 h-4 text-blue-500" />;
      case 'vehicle': return <Car className="w-4 h-4 text-indigo-500" />;
      case 'warranty': return <Shield className="w-4 h-4 text-amber-500" />;
      default: return <Bell className="w-4 h-4 text-zinc-500" />;
    }
  };

  const getUrgencyBadge = (urg: ReminderItem['urgency']) => {
    switch (urg) {
      case 'high': return <Badge variant="danger" size="xs">Urgente</Badge>;
      case 'medium': return <Badge variant="warning" size="xs">Próximo</Badge>;
      case 'low': return <Badge variant="neutral" size="xs">Controlado</Badge>;
      default: return <Badge variant="neutral" size="xs">{urg}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-5 select-none">
      
      {/* Header */}
      <div>
        <h2 className="font-heading font-black text-2xl text-text-primary tracking-tight">Recordatorios Generales</h2>
        <p className="text-xs text-text-secondary font-medium mt-0.5">Controla todos los vencimientos importantes agrupados en una sola bandeja de advertencia.</p>
      </div>

      {/* Filter Action */}
      <div className="flex select-none">
        <Select 
          value={selectedUrgency} 
          onChange={e => setSelectedUrgency(e.target.value)}
          options={[
            { value: 'All', label: 'Cualquier urgencia' },
            { value: 'high', label: 'Urgente (Menos de 7 días)' },
            { value: 'medium', label: 'Próximo (Menos de 30 días)' },
            { value: 'low', label: 'Controlado (Más de 30 días)' }
          ]}
          className="py-2 text-xs w-full sm:w-[260px]"
        />
      </div>

      {/* Expirations Loop */}
      <Card className="p-6">
        {filteredReminders.length > 0 ? (
          <div className="flex flex-col gap-3.5 animate-slide-up">
            {filteredReminders.map(rem => {
              const isOverdue = rem.daysRemaining < 0;
              return (
                <div 
                  key={rem.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border-primary/55 rounded-2xl hover:bg-surface-secondary/20 transition-all gap-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-lg bg-surface-secondary border border-border-primary/50 flex items-center justify-center shrink-0">
                      {getCategoryIcon(rem.category)}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-text-primary leading-snug">{rem.title}</h4>
                      <p className="text-[10px] text-text-secondary font-semibold mt-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> Expiración: {rem.date}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    {getUrgencyBadge(rem.urgency)}
                    <span className={`text-xs font-black ${isOverdue ? 'text-danger' : rem.daysRemaining <= 30 ? 'text-warning' : 'text-success'}`}>
                      {isOverdue 
                        ? 'Expirado' 
                        : `${rem.daysRemaining} días restantes`
                      }
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-text-secondary flex flex-col items-center">
            <Bell className="w-8 h-8 opacity-30 mb-2" />
            <p className="text-xs font-bold">No tienes recordatorios próximos</p>
            <p className="text-[10px] text-text-secondary/70 mt-0.5">Los vencimientos de tus documentos, garantías y seguros aparecerán aquí.</p>
          </div>
        )}
      </Card>

    </div>
  );
};
