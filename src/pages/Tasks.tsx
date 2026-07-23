import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type TaskRecord } from '../db/lifeDB';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Dialog } from '../components/ui/Dialog';
import { EmptyState } from '../components/ui/EmptyState';
import { 
  CheckSquare, Plus, Calendar, Tag, Trash2, 
  Check, Clock, AlertTriangle, Sparkles, Star, Search
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const Tasks: React.FC = () => {
  const { user } = useApp();
  
  // States
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('All');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form State - Add Task
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [category, setCategory] = useState('Personal');
  const [notes, setNotes] = useState('');
  const [tagInput, setTagInput] = useState('');

  // --- QUERY TASKS ---
  const tasks = useLiveQuery(() => db.tasks.toArray(), []);

  if (!tasks) {
    return (
      <div className="flex flex-col gap-6 animate-pulse p-4">
        <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-1/4" />
        <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
      </div>
    );
  }

  // --- FILTER LOGIC ---
  const filteredTasks = tasks.filter(t => {
    // 1. Status Filter
    if (activeTab === 'pending' && t.isCompleted) return false;
    if (activeTab === 'completed' && !t.isCompleted) return false;

    // 2. Priority Filter
    if (selectedPriority !== 'All' && t.priority !== selectedPriority) return false;

    // 3. Search query filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchCat = t.category.toLowerCase().includes(q);
      const matchTags = t.tags && t.tags.some(tg => tg.toLowerCase().includes(q));
      return matchTitle || matchCat || matchTags;
    }

    return true;
  }).sort((a, b) => {
    // Overdue or soonest due dates first
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  // --- SAVE TASK ---
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagInput.split(',').map(t => t.trim()).filter(t => t !== '');

    const newTask: TaskRecord = {
      userId: user || 'local_user',
      title,
      dueDate: dueDate || undefined,
      dueTime: dueTime || undefined,
      priority,
      category,
      notes: notes || undefined,
      tags,
      isCompleted: false,
      createdAt: new Date().toISOString()
    };

    await db.tasks.add(newTask);

    // Log Activity
    await db.activities.add({
      userId: user || 'local_user',
      action: 'created',
      module: 'tasks',
      details: `Se creó la tarea: "${title}" (${category}).`,
      date: new Date().toISOString()
    });

    // Reset Form & Close
    resetForm();
    setIsAddOpen(false);
  };

  const resetForm = () => {
    setTitle('');
    setDueDate('');
    setDueTime('');
    setPriority('medium');
    setCategory('Personal');
    setNotes('');
    setTagInput('');
  };

  const handleToggleTask = async (task: TaskRecord) => {
    const newStatus = !task.isCompleted;
    await db.tasks.update(task.id!, { isCompleted: newStatus });
    
    // Log Activity
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

  const handleDelete = async (id: number) => {
    if (confirm('¿Estás seguro de eliminar esta tarea?')) {
      await db.tasks.delete(id);
      
      // Log activity
      await db.activities.add({
        userId: user || 'local_user',
        action: 'deleted',
        module: 'tasks',
        details: `Se eliminó un registro de tarea.`,
        date: new Date().toISOString()
      });
    }
  };

  const getPriorityBadge = (p: TaskRecord['priority']) => {
    switch (p) {
      case 'high': return <Badge variant="danger" size="xs">Alta</Badge>;
      case 'medium': return <Badge variant="warning" size="xs">Media</Badge>;
      case 'low': return <Badge variant="neutral" size="xs">Baja</Badge>;
      default: return <Badge variant="neutral" size="xs">{p}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading font-black text-2xl text-text-primary tracking-tight">Tareas Personales</h2>
          <p className="text-xs text-text-secondary font-medium mt-0.5">Organiza tu lista de pendientes cotidianos, compras y recordatorios personales.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsAddOpen(true)} className="gap-1.5 self-start sm:self-center rounded-xl">
          <Plus className="w-4 h-4" /> Nueva Tarea
        </Button>
      </div>

      {/* Tabs list selector */}
      <div className="flex border-b border-border-primary/45 overflow-x-auto gap-1 select-none">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4.5 py-3 text-xs font-bold whitespace-nowrap border-b-2 -mb-px transition-all duration-200 cursor-pointer ${activeTab === 'pending' ? 'border-brand text-brand' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
        >
          Pendientes ({tasks.filter(t => !t.isCompleted).length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4.5 py-3 text-xs font-bold whitespace-nowrap border-b-2 -mb-px transition-all duration-200 cursor-pointer ${activeTab === 'completed' ? 'border-brand text-brand' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
        >
          Completadas ({tasks.filter(t => t.isCompleted).length})
        </button>
      </div>

      {/* Filter and Search Actions */}
      <div className="flex flex-col sm:flex-row gap-3 select-none">
        <div className="flex-1 relative flex items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-text-secondary" />
          <Input 
            placeholder="Buscar por título, etiquetas..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 py-2.5 text-xs" 
          />
        </div>

        <Select 
          value={selectedPriority} 
          onChange={e => setSelectedPriority(e.target.value)}
          options={[
            { value: 'All', label: 'Prioridades' },
            { value: 'high', label: 'Alta' },
            { value: 'medium', label: 'Media' },
            { value: 'low', label: 'Baja' }
          ]}
          className="py-2 text-xs w-[150px]"
        />
      </div>

      {/* Checklist Grid */}
      <Card className="p-5 select-none animate-slide-up">
        {filteredTasks.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {filteredTasks.map(task => {
              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.isCompleted;
              return (
                <div 
                  key={task.id}
                  className={`
                    flex items-start justify-between p-3.5 border border-border-primary/45 rounded-2xl hover:bg-surface-secondary/20 transition-all gap-4
                    ${task.isCompleted ? 'opacity-65' : ''}
                  `}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <button
                      onClick={() => handleToggleTask(task)}
                      className={`
                        w-5.5 h-5.5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer
                        ${task.isCompleted 
                          ? 'bg-success border-success text-white' 
                          : 'border-border-primary hover:border-brand bg-surface'
                        }
                      `}
                    >
                      {task.isCompleted && <Check className="w-4.5 h-4.5 stroke-[3]" />}
                    </button>
                    
                    <div className="min-w-0">
                      <h4 className={`text-xs font-bold text-text-primary leading-snug break-words ${task.isCompleted ? 'line-through text-text-secondary font-medium' : ''}`}>
                        {task.title}
                      </h4>
                      {task.notes && <p className="text-[11px] text-text-secondary mt-1 max-w-md break-words">{task.notes}</p>}
                      
                      <div className="flex flex-wrap gap-1.5 mt-2.5 items-center">
                        <Badge variant="neutral" size="xs">{task.category}</Badge>
                        {getPriorityBadge(task.priority)}
                        {task.dueDate && (
                          <span className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded border gap-0.5 ${isOverdue ? 'bg-danger-light text-danger border-danger/10 animate-pulse-slow' : 'bg-surface-secondary text-text-secondary border-border-primary/50'}`}>
                            <Calendar className="w-3 h-3" /> {task.dueDate} {task.dueTime ? `a las ${task.dueTime}` : ''} {isOverdue && ' (Atrasado)'}
                          </span>
                        )}
                        {task.tags.map((t, idx) => (
                          <span key={idx} className="text-[9px] font-semibold text-text-secondary bg-surface-secondary/50 border border-border-primary/20 px-2.5 py-0.5 rounded-full">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleDelete(task.id!)}
                    className="text-text-secondary hover:text-danger p-1 rounded hover:bg-surface-secondary"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState 
            title={activeTab === 'pending' ? "No tienes tareas pendientes" : "Aún no has completado tareas"}
            description={activeTab === 'pending' ? "Disfruta de tu día libre o agrega una tarea pendiente para organizar tu jornada." : "Marca tus pendientes como listos para ver tu progreso aquí."}
            icon={<CheckSquare className="w-6 h-6" />}
            actionText={activeTab === 'pending' ? "Crear una tarea" : undefined}
            onAction={activeTab === 'pending' ? () => setIsAddOpen(true) : undefined}
          />
        )}
      </Card>

      {/* --- ADD TASK DIALOG --- */}
      <Dialog
        isOpen={isAddOpen}
        onClose={() => { setIsAddOpen(false); resetForm(); }}
        title="Crear Nueva Tarea / Pendiente"
      >
        <form onSubmit={handleSaveTask} className="flex flex-col gap-4">
          <Input 
            label="Título de la Tarea *" 
            placeholder="Ej. Comprar despensa / Pagar seguro auto"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Fecha Límite" 
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
            <Input 
              label="Hora Límite" 
              type="time"
              value={dueTime}
              onChange={e => setDueTime(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select 
              label="Prioridad"
              value={priority}
              onChange={e => setPriority(e.target.value as any)}
              options={[
                { value: 'high', label: 'Alta' },
                { value: 'medium', label: 'Media' },
                { value: 'low', label: 'Baja' }
              ]}
            />
            <Select 
              label="Categoría"
              value={category}
              onChange={e => setCategory(e.target.value)}
              options={[
                { value: 'Personal', label: 'Personal' },
                { value: 'Vehículo', label: 'Vehículos' },
                { value: 'Hogar', label: 'Hogar' },
                { value: 'Gastos', label: 'Gastos' },
                { value: 'Trabajo', label: 'Trabajo' },
                { value: 'Estudios', label: 'Estudios' }
              ]}
            />
          </div>

          <Input 
            label="Etiquetas (Separadas por comas)" 
            placeholder="Ej. super, auto, urgente"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
          />

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-text-secondary font-heading">Notas</label>
            <textarea 
              rows={3}
              placeholder="Detalles sobre el pendiente..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full rounded-xl border border-border-primary bg-surface p-3 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 mt-3 pt-3 border-t border-border-primary/30">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary" size="sm">Crear Tarea</Button>
          </div>
        </form>
      </Dialog>

    </div>
  );
};
