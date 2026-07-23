import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type CalendarEventRecord } from '../db/lifeDB';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Dialog } from '../components/ui/Dialog';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
  FileText, Car, Shield, CreditCard, Package, CheckSquare, Heart,
  Cake, PartyPopper, Bell, Briefcase, Plus, Trash2, Clock, Sparkles, Filter
} from 'lucide-react';
import { syncCalendarEventToCloud, fetchCalendarEventsFromCloud, deleteCalendarEventFromCloud } from '../utils/supabase';

export interface CalendarEventItem {
  id: string;
  dbId?: number;
  title: string;
  category: 'birthday' | 'anniversary' | 'event' | 'reminder' | 'meeting' | 'document' | 'vehicle' | 'warranty' | 'subscription' | 'package' | 'task' | 'health' | 'pet';
  date: string; // YYYY-MM-DD
  dayNumber: number;
  time?: string;
  notes?: string;
  isCustom?: boolean;
}

export const CalendarView: React.FC = () => {
  const { accountEmail, user } = useApp();
  const activeUserId = accountEmail || localStorage.getItem('lifeos_user') || 'local_user';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ day: number; dateStr: string; events: CalendarEventItem[] } | null>(null);

  // Form State for New Event / Birthday
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventTime, setEventTime] = useState('');
  const [eventCategory, setEventCategory] = useState<'birthday' | 'anniversary' | 'event' | 'reminder' | 'meeting' | 'other'>('birthday');
  const [eventNotes, setEventNotes] = useState('');

  // Sincronizar eventos de la nube en segundo plano al cargar
  useEffect(() => {
    const loadCloudCalendarEvents = async () => {
      if (!activeUserId || activeUserId === 'local_user') return;
      try {
        const cloudEvents = await fetchCalendarEventsFromCloud(activeUserId);
        for (const ev of cloudEvents) {
          const existing = await db.calendarEvents
            .where({ userId: activeUserId, title: ev.title, date: ev.date })
            .first();
          if (!existing) {
            await db.calendarEvents.add(ev);
          }
        }
      } catch (err) {
        console.warn('Error sincronizando calendario desde Supabase Nube:', err);
      }
    };
    loadCloudCalendarEvents();
  }, [activeUserId]);

  // Dexie Queries
  const customEvents = useLiveQuery(() => db.calendarEvents.toArray(), []) || [];
  const documents = useLiveQuery(() => db.documents.toArray(), []) || [];
  const vehicles = useLiveQuery(() => db.vehicles.toArray(), []) || [];
  const warranties = useLiveQuery(() => db.warranties.toArray(), []) || [];
  const subscriptions = useLiveQuery(() => db.subscriptions.toArray(), []) || [];
  const packages = useLiveQuery(() => db.packages.toArray(), []) || [];
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) || [];
  const health = useLiveQuery(() => db.healthRecords.toArray(), []) || [];
  const pets = useLiveQuery(() => db.petRecords.toArray(), []) || [];

  // Current Month & Year
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-11
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Calculate Days in Month
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Sun) - 6 (Sat)
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Helper date parser
  const formatDateKey = (dStr: string) => {
    if (!dStr) return null;
    const parts = dStr.split('-');
    if (parts.length === 3) {
      const y = Number(parts[0]);
      const m = Number(parts[1]) - 1;
      const d = Number(parts[2]);
      return { y, m, d, iso: dStr };
    }
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return null;
    return {
      y: d.getFullYear(),
      m: d.getMonth(),
      d: d.getDate(),
      iso: d.toISOString().split('T')[0]
    };
  };

  const isMatchUser = (recordUserId?: string) => {
    if (!recordUserId) return true;
    const recId = recordUserId.trim().toLowerCase();
    const cleanUserId = activeUserId.trim().toLowerCase();
    return recId === cleanUserId || recId === 'local_user' || cleanUserId === 'local_user';
  };

  // Consolidate Events
  const events: CalendarEventItem[] = [];

  // 1. Custom Calendar Events (Birthdays, Anniversaries, Reminders, Meetings)
  customEvents.forEach(evt => {
    if (isMatchUser(evt.userId) && evt.date) {
      const f = formatDateKey(evt.date);
      if (f && f.y === year && f.m === month) {
        events.push({
          id: `custom-${evt.id}`,
          dbId: evt.id,
          title: evt.title,
          category: evt.category as any,
          date: f.iso,
          dayNumber: f.d,
          time: evt.time,
          notes: evt.notes,
          isCustom: true
        });
      }
    }
  });

  // 2. Documents Expirations
  documents.forEach(doc => {
    if (isMatchUser(doc.userId) && doc.expiryDate && !doc.archived && !doc.deleted) {
      const f = formatDateKey(doc.expiryDate);
      if (f && f.y === year && f.m === month) {
        events.push({
          id: `doc-${doc.id}`,
          title: `Vence Documento: ${doc.name}`,
          category: 'document',
          date: f.iso,
          dayNumber: f.d
        });
      }
    }
  });

  // 3. Vehicles Insurance
  vehicles.forEach(v => {
    if (isMatchUser(v.userId) && v.insuranceExpiry) {
      const f = formatDateKey(v.insuranceExpiry);
      if (f && f.y === year && f.m === month) {
        events.push({
          id: `veh-${v.id}`,
          title: `Seguro Auto: ${v.brand} ${v.model}`,
          category: 'vehicle',
          date: f.iso,
          dayNumber: f.d
        });
      }
    }
  });

  // 4. Warranties
  warranties.forEach(w => {
    if (isMatchUser(w.userId) && w.expiryDate && w.status === 'active') {
      const f = formatDateKey(w.expiryDate);
      if (f && f.y === year && f.m === month) {
        events.push({
          id: `war-${w.id}`,
          title: `Garantía: ${w.productName}`,
          category: 'warranty',
          date: f.iso,
          dayNumber: f.d
        });
      }
    }
  });

  // 5. Subscriptions Billing
  subscriptions.forEach(sub => {
    if (isMatchUser(sub.userId) && sub.status === 'active') {
      const dayNum = Math.min(sub.billDate, daysInMonth);
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      events.push({
        id: `sub-${sub.id}`,
        title: `Cobro: ${sub.name} ($${sub.price})`,
        category: 'subscription',
        date: iso,
        dayNumber: dayNum
      });
    }
  });

  // 6. Packages ETA
  packages.forEach(pkg => {
    if (isMatchUser(pkg.userId) && pkg.eta && pkg.status !== 'delivered') {
      const f = formatDateKey(pkg.eta);
      if (f && f.y === year && f.m === month) {
        events.push({
          id: `pkg-${pkg.id}`,
          title: `Entrega Paquete: ${pkg.name}`,
          category: 'package',
          date: f.iso,
          dayNumber: f.d
        });
      }
    }
  });

  // 7. Tasks Due Date
  tasks.forEach(t => {
    if (isMatchUser(t.userId) && t.dueDate && !t.isCompleted) {
      const f = formatDateKey(t.dueDate);
      if (f && f.y === year && f.m === month) {
        events.push({
          id: `task-${t.id}`,
          title: `Tarea: ${t.title}`,
          category: 'task',
          date: f.iso,
          dayNumber: f.d
        });
      }
    }
  });

  // 8. Health Appointments
  health.forEach(h => {
    if (isMatchUser(h.userId) && h.date) {
      const f = formatDateKey(h.date);
      if (f && f.y === year && f.m === month) {
        events.push({
          id: `health-${h.id}`,
          title: `Cita Médica: ${h.title}`,
          category: 'health',
          date: f.iso,
          dayNumber: f.d
        });
      }
    }
  });

  // 9. Pet Birthdays
  pets.forEach(p => {
    if (isMatchUser(p.userId) && p.birthDate) {
      const f = formatDateKey(p.birthDate);
      if (f && f.m === month) {
        const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(f.d).padStart(2, '0')}`;
        events.push({
          id: `pet-bday-${p.id}`,
          title: `🎂 Cumpleaños Mascota: ${p.petName}`,
          category: 'pet',
          date: iso,
          dayNumber: f.d
        });
      }
    }
  });

  // Filter events based on active category filter
  const filteredEvents = events.filter(e => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'birthday') return e.category === 'birthday' || e.category === 'pet';
    if (selectedFilter === 'documents') return e.category === 'document' || e.category === 'warranty';
    if (selectedFilter === 'payments') return e.category === 'subscription';
    if (selectedFilter === 'tasks') return e.category === 'task';
    return e.category === selectedFilter;
  });

  // Month navigation handlers
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = () => setCurrentDate(new Date());

  const handleOpenAddEvent = (presetDate?: string) => {
    if (presetDate) {
      setEventDate(presetDate);
    } else {
      setEventDate(new Date().toISOString().split('T')[0]);
    }
    setEventTitle('');
    setEventTime('');
    setEventCategory('birthday');
    setEventNotes('');
    setIsAddEventOpen(true);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || !eventDate) return;

    const newRecord: CalendarEventRecord = {
      userId: activeUserId,
      title: eventTitle.trim(),
      date: eventDate,
      time: eventTime.trim() || undefined,
      category: eventCategory,
      notes: eventNotes.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    await db.calendarEvents.add(newRecord);
    syncCalendarEventToCloud(newRecord);

    // Log Activity
    await db.activities.add({
      userId: activeUserId,
      action: 'created',
      module: 'calendar',
      details: `Agregó el evento "${eventTitle}" (${eventCategory}) para la fecha ${eventDate}.`,
      date: new Date().toISOString()
    });

    setIsAddEventOpen(false);
  };

  const handleDeleteCustomEvent = async (dbId: number) => {
    if (confirm('¿Deseas eliminar este evento del calendario?')) {
      const record = await db.calendarEvents.get(dbId);
      if (record) {
        deleteCalendarEventFromCloud(record.title, record.date, activeUserId);
      }
      await db.calendarEvents.delete(dbId);
      if (selectedDayEvents) {
        setSelectedDayEvents({
          ...selectedDayEvents,
          events: selectedDayEvents.events.filter(e => e.dbId !== dbId)
        });
      }
    }
  };

  const getCategoryBadge = (cat: CalendarEventItem['category']) => {
    switch (cat) {
      case 'birthday':
      case 'pet':
        return { icon: <Cake className="w-3 h-3 text-amber-400" />, label: 'Cumpleaños', style: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
      case 'anniversary':
        return { icon: <PartyPopper className="w-3 h-3 text-purple-400" />, label: 'Aniversario', style: 'bg-purple-500/15 text-purple-300 border-purple-500/30' };
      case 'reminder':
        return { icon: <Bell className="w-3 h-3 text-yellow-400" />, label: 'Recordatorio', style: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' };
      case 'meeting':
        return { icon: <Briefcase className="w-3 h-3 text-indigo-400" />, label: 'Reunión', style: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' };
      case 'document':
        return { icon: <FileText className="w-3 h-3 text-blue-400" />, label: 'Documento', style: 'bg-blue-500/15 text-blue-300 border-blue-500/30' };
      case 'vehicle':
        return { icon: <Car className="w-3 h-3 text-cyan-400" />, label: 'Vehículo', style: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' };
      case 'warranty':
        return { icon: <Shield className="w-3 h-3 text-orange-400" />, label: 'Garantía', style: 'bg-orange-500/15 text-orange-300 border-orange-500/30' };
      case 'subscription':
        return { icon: <CreditCard className="w-3 h-3 text-purple-400" />, label: 'Cobro', style: 'bg-purple-500/15 text-purple-300 border-purple-500/30' };
      case 'package':
        return { icon: <Package className="w-3 h-3 text-rose-400" />, label: 'Paquete', style: 'bg-rose-500/15 text-rose-300 border-rose-500/30' };
      case 'task':
        return { icon: <CheckSquare className="w-3 h-3 text-emerald-400" />, label: 'Tarea', style: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
      case 'health':
        return { icon: <Heart className="w-3 h-3 text-pink-400" />, label: 'Salud', style: 'bg-pink-500/15 text-pink-300 border-pink-500/30' };
      default:
        return { icon: <CalendarIcon className="w-3 h-3 text-brand" />, label: 'Evento', style: 'bg-brand/15 text-brand border-brand/30' };
    }
  };

  const bdaysCount = events.filter(e => e.category === 'birthday' || e.category === 'pet').length;

  return (
    <div className="flex flex-col gap-6 select-none animate-fade-in">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-primary/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-heading font-black text-2xl text-text-primary tracking-tight flex items-center gap-2">
              <CalendarIcon className="w-7 h-7 text-brand" /> Calendario Unificado de Vida
            </h2>
            <Badge variant="warning" size="xs" className="gap-1 font-bold">
              <Cake className="w-3 h-3" /> {bdaysCount} Cumpleaños este mes
            </Badge>
          </div>
          <p className="text-xs text-text-secondary mt-1 font-medium">
            Agrega cumpleaños, aniversarios, citas y visualiza automáticamente tus vencimientos y tareas.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            variant="primary" 
            size="sm" 
            onClick={() => handleOpenAddEvent()}
            className="gap-1.5 text-xs font-bold py-2.5 rounded-xl bg-linear-to-r from-amber-500 to-yellow-600 text-white cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Agregar Cumpleaños / Evento
          </Button>

          {/* Month Navigation */}
          <div className="flex items-center gap-1 bg-surface-secondary/40 p-1 rounded-xl border border-border-primary/40">
            <Button variant="outline" size="sm" onClick={prevMonth} className="p-1.5 cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-heading font-black text-xs text-text-primary min-w-[130px] text-center">
              {monthNames[month]} {year}
            </span>
            <Button variant="outline" size="sm" onClick={nextMonth} className="p-1.5 cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={today} className="text-xs font-bold px-2.5 cursor-pointer text-brand">
              Hoy
            </Button>
          </div>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none">
        <Filter className="w-4 h-4 text-text-secondary shrink-0" />
        {[
          { key: 'all', label: 'Todos los Eventos', count: events.length },
          { key: 'birthday', label: '🎂 Cumpleaños', count: bdaysCount },
          { key: 'documents', label: '📄 Documentos / Garantías', count: events.filter(e => e.category === 'document' || e.category === 'warranty').length },
          { key: 'payments', label: '💳 Cobros / Suscripciones', count: events.filter(e => e.category === 'subscription').length },
          { key: 'tasks', label: '✅ Tareas', count: events.filter(e => e.category === 'task').length },
          { key: 'meeting', label: '💼 Reuniones', count: events.filter(e => e.category === 'meeting').length },
          { key: 'reminder', label: '🔔 Recordatorios', count: events.filter(e => e.category === 'reminder').length }
        ].map(cat => (
          <button
            key={cat.key}
            onClick={() => setSelectedFilter(cat.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border ${
              selectedFilter === cat.key
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-sm'
                : 'bg-surface-secondary/40 border-border-primary/40 text-text-secondary hover:text-text-primary'
            }`}
          >
            {cat.label} ({cat.count})
          </button>
        ))}
      </div>

      {/* Calendar Grid */}
      <Card className="p-3 md:p-5 overflow-hidden border-border-primary/60">
        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 text-center font-extrabold text-xs text-text-secondary border-b border-border-primary/40 pb-3 mb-2 uppercase tracking-wider">
          <span>Dom</span><span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span>
        </div>

        {/* Grid Cells */}
        <div className="grid grid-cols-7 gap-1.5 auto-rows-fr">
          {/* Empty cells before 1st day */}
          {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
            <div key={`empty-${idx}`} className="min-h-[110px] p-2 bg-surface-secondary/10 rounded-xl border border-border-primary/10 opacity-20" />
          ))}

          {/* Days of month */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const isToday = dayNum === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
            const dayEvents = filteredEvents.filter(e => e.dayNumber === dayNum);

            return (
              <div 
                key={`day-${dayNum}`}
                onClick={() => {
                  if (dayEvents.length > 0) {
                    setSelectedDayEvents({ day: dayNum, dateStr: isoDate, events: dayEvents });
                  } else {
                    handleOpenAddEvent(isoDate);
                  }
                }}
                className={`min-h-[115px] p-2 rounded-2xl border flex flex-col justify-between transition-all cursor-pointer group ${
                  isToday 
                    ? 'border-amber-500/80 ring-1 ring-amber-500/30 bg-amber-500/5' 
                    : dayEvents.length > 0 
                      ? 'border-border-primary/70 bg-surface-secondary/40 hover:bg-surface-secondary/70 hover:border-amber-500/40' 
                      : 'border-border-primary/30 bg-surface-secondary/20 hover:bg-surface-secondary/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black rounded-full w-6 h-6 flex items-center justify-center ${
                    isToday ? 'bg-amber-500 text-zinc-950 font-black' : 'text-text-primary group-hover:text-amber-400'
                  }`}>
                    {dayNum}
                  </span>

                  <div className="flex items-center gap-1">
                    {dayEvents.some(e => e.category === 'birthday' || e.category === 'pet') && (
                      <Cake className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                    )}
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-extrabold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>
                </div>

                {/* Event Pills */}
                <div className="flex flex-col gap-1 mt-1.5 overflow-y-auto max-h-[80px] custom-scrollbar">
                  {dayEvents.slice(0, 3).map(e => {
                    const badge = getCategoryBadge(e.category);
                    return (
                      <div 
                        key={e.id}
                        className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-lg border flex items-center gap-1 truncate ${badge.style}`}
                        title={e.title}
                      >
                        {badge.icon}
                        <span className="truncate">{e.title}</span>
                      </div>
                    );
                  })}

                  {dayEvents.length > 3 && (
                    <span className="text-[9px] font-bold text-text-secondary pl-1">
                      +{dayEvents.length - 3} más...
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Modal Alta de Evento / Cumpleaños */}
      <Dialog
        isOpen={isAddEventOpen}
        onClose={() => setIsAddEventOpen(false)}
        title="Agregar Cumpleaños o Evento al Calendario"
        size="md"
      >
        <form onSubmit={handleCreateEvent} className="flex flex-col gap-4 py-2 select-none">
          <Input 
            label="Título del Evento o Cumpleaños"
            placeholder="Ej. Cumpleaños de María 🎂 / Aniversario de Bodas 🥂"
            value={eventTitle}
            onChange={e => setEventTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select 
              label="Categoría"
              value={eventCategory}
              onChange={e => setEventCategory(e.target.value as any)}
              options={[
                { value: 'birthday', label: '🎂 Cumpleaños' },
                { value: 'anniversary', label: '🥂 Aniversario' },
                { value: 'event', label: '📅 Evento / Cita' },
                { value: 'reminder', label: '🔔 Recordatorio Especial' },
                { value: 'meeting', label: '💼 Reunión / Compromiso' },
                { value: 'other', label: '📍 Otro' }
              ]}
            />

            <Input 
              label="Fecha"
              type="date"
              value={eventDate}
              onChange={e => setEventDate(e.target.value)}
              required
            />
          </div>

          <Input 
            label="Hora (Opcional)"
            type="time"
            value={eventTime}
            onChange={e => setEventTime(e.target.value)}
          />

          <Input 
            label="Notas Adicionales (Opcional)"
            placeholder="Ej. Comprar regalo, llevar pastel o reservar restaurante."
            value={eventNotes}
            onChange={e => setEventNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" type="button" onClick={() => setIsAddEventOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit" className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold">
              Guardar en Calendario
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal Detalle de Eventos del Día */}
      <Dialog
        isOpen={Boolean(selectedDayEvents)}
        onClose={() => setSelectedDayEvents(null)}
        title={`Eventos del Día ${selectedDayEvents?.day} de ${monthNames[month]} ${year}`}
        size="md"
      >
        <div className="flex flex-col gap-3 py-2 select-none">
          <div className="flex items-center justify-between border-b border-border-primary/40 pb-2">
            <span className="text-xs text-text-secondary font-medium">
              Total de compromisos y recordatorios: <strong className="text-text-primary">{selectedDayEvents?.events.length}</strong>
            </span>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                const date = selectedDayEvents?.dateStr;
                setSelectedDayEvents(null);
                handleOpenAddEvent(date);
              }}
              className="gap-1 text-xs py-1 border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar Evento
            </Button>
          </div>

          <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
            {selectedDayEvents?.events.map(evt => {
              const badge = getCategoryBadge(evt.category);
              return (
                <div key={evt.id} className="p-3 bg-surface-secondary/50 rounded-xl border border-border-primary/50 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-surface rounded-lg shrink-0 mt-0.5">
                      {badge.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${badge.style}`}>
                          {badge.label}
                        </span>
                        {evt.time && (
                          <span className="text-[10px] font-mono text-text-secondary flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {evt.time}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-sm text-text-primary mt-1">
                        {evt.title}
                      </h4>
                      {evt.notes && (
                        <p className="text-xs text-text-secondary mt-0.5">
                          {evt.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {evt.isCustom && evt.dbId && (
                    <button 
                      onClick={() => handleDeleteCustomEvent(evt.dbId!)}
                      className="p-1.5 text-danger/70 hover:text-danger hover:bg-danger/10 rounded-lg cursor-pointer transition-all"
                      title="Eliminar evento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Dialog>

    </div>
  );
};
