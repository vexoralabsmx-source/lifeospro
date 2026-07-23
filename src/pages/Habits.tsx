import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type HabitRecord, type QuickNoteRecord } from '../db/lifeDB';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Dialog } from '../components/ui/Dialog';
import { 
  Flame, CheckSquare, StickyNote, Plus, Trash2, 
  Sparkles, Check, Pin
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const Habits: React.FC = () => {
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState<'habits' | 'notes'>('habits');
  const [isAddHabitOpen, setIsAddHabitOpen] = useState(false);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);

  // Habit Form State
  const [habitTitle, setHabitTitle] = useState('');
  const [habitCategory, setHabitCategory] = useState('Salud');

  // Sticky Note Form State
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteColor, setNoteColor] = useState('bg-amber-500/10 border-amber-500/30 text-amber-300');

  // Dexie Queries
  const habits = useLiveQuery(
    () => db.habitRecords.where('userId').equals(user || 'local_user').toArray(),
    [user]
  );
  const notes = useLiveQuery(
    () => db.quickNoteRecords.where('userId').equals(user || 'local_user').toArray(),
    [user]
  );

  if (!habits || !notes) {
    return (
      <div className="flex flex-col gap-6 animate-pulse p-4">
        <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-1/4" />
        <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];

  const handleSaveHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitTitle.trim()) return;

    await db.habitRecords.add({
      userId: user || 'local_user',
      title: habitTitle,
      category: habitCategory,
      frequencyDays: 7,
      completedDates: [],
      streak: 0,
      createdAt: new Date().toISOString()
    });

    setHabitTitle('');
    setIsAddHabitOpen(false);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    await db.quickNoteRecords.add({
      userId: user || 'local_user',
      title: noteTitle || undefined,
      content: noteContent,
      color: noteColor,
      pinned: false,
      createdAt: new Date().toISOString()
    });

    setNoteTitle('');
    setNoteContent('');
    setIsAddNoteOpen(false);
  };

  const toggleHabitToday = async (habit: HabitRecord) => {
    if (!habit.id) return;
    const hasDoneToday = habit.completedDates.includes(todayStr);
    let updatedDates = [...habit.completedDates];

    if (hasDoneToday) {
      updatedDates = updatedDates.filter(d => d !== todayStr);
    } else {
      updatedDates.push(todayStr);
      confetti({
        particleCount: 70,
        spread: 50,
        origin: { y: 0.8 }
      });
    }

    await db.habitRecords.update(habit.id, {
      completedDates: updatedDates,
      streak: updatedDates.length
    });
  };

  const handleDeleteHabit = async (id: number) => {
    if (confirm('¿Eliminar este hábito?')) {
      await db.habitRecords.delete(id);
    }
  };

  const handleDeleteNote = async (id: number) => {
    if (confirm('¿Eliminar esta nota rápida?')) {
      await db.quickNoteRecords.delete(id);
    }
  };

  return (
    <div className="flex flex-col gap-6 select-none animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-primary/40 pb-4">
        <div>
          <h2 className="font-heading font-black text-2xl text-text-primary tracking-tight flex items-center gap-2">
            <Flame className="w-6 h-6 text-amber-500" /> Hábitos & Notas Rápidas
          </h2>
          <p className="text-xs text-text-secondary mt-0.5 font-medium">
            Rastreador de rachas diarias y tablero de notas adhesivas locales.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'habits' ? (
            <Button 
              variant="primary" 
              size="sm" 
              onClick={() => setIsAddHabitOpen(true)}
              className="gap-1.5 text-xs font-bold py-2.5 rounded-xl cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Nuevo Hábito
            </Button>
          ) : (
            <Button 
              variant="primary" 
              size="sm" 
              onClick={() => setIsAddNoteOpen(true)}
              className="gap-1.5 text-xs font-bold py-2.5 rounded-xl cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Nueva Nota Rápidas
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-primary/40 text-xs font-bold gap-2">
        <button
          onClick={() => setActiveTab('habits')}
          className={`px-4 py-2.5 border-b-2 -mb-px transition-colors cursor-pointer ${activeTab === 'habits' ? 'border-amber-500 text-amber-500' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
        >
          🔥 Hábitos Diarios
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`px-4 py-2.5 border-b-2 -mb-px transition-colors cursor-pointer ${activeTab === 'notes' ? 'border-amber-500 text-amber-500' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
        >
          📌 Notas Adhesivas (Sticky Notes)
        </button>
      </div>

      {/* 1. HABITS TAB */}
      {activeTab === 'habits' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {habits.length > 0 ? (
            habits.map(h => {
              const isDoneToday = h.completedDates.includes(todayStr);

              return (
                <Card key={h.id} className="p-5 flex flex-col justify-between gap-4 border-border-primary/60 hover:border-amber-500/30 transition-all">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                        {h.category}
                      </span>
                      <span className="text-xs font-black text-amber-500 flex items-center gap-1">
                        <Flame className="w-4 h-4 fill-amber-500/20" /> {h.streak} días racha
                      </span>
                    </div>

                    <h4 className="font-heading font-black text-base text-text-primary mt-1">{h.title}</h4>
                    
                    <p className="text-xs text-text-secondary">
                      Cumplido <strong className="text-text-primary">{h.completedDates.length} veces</strong> en total.
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-border-primary/30 pt-3">
                    <button 
                      onClick={() => h.id && handleDeleteHabit(h.id)}
                      className="text-text-secondary hover:text-danger p-1 transition-colors cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <Button 
                      size="sm" 
                      variant={isDoneToday ? 'secondary' : 'primary'}
                      onClick={() => toggleHabitToday(h)}
                      className={`text-xs font-bold gap-1.5 cursor-pointer ${isDoneToday ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : ''}`}
                    >
                      {isDoneToday ? <Check className="w-4 h-4 text-emerald-500" /> : null}
                      {isDoneToday ? '¡Completado Hoy!' : 'Marcar Completado'}
                    </Button>
                  </div>
                </Card>
              );
            })
          ) : (
            <div className="col-span-full py-12 text-center text-text-secondary flex flex-col items-center">
              <Flame className="w-10 h-10 opacity-25 mb-2 text-amber-500" />
              <p className="text-xs font-bold text-text-primary">No tienes hábitos en seguimiento</p>
              <p className="text-[11px] text-text-secondary mt-1">Crea hábitos diarios como ejercicio, lectura o agua para mantener tus rachas.</p>
            </div>
          )}
        </div>
      )}

      {/* 2. STICKY NOTES TAB */}
      {activeTab === 'notes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.length > 0 ? (
            notes.map(n => (
              <Card key={n.id} className={`p-5 flex flex-col justify-between gap-4 border transition-all ${n.color}`}>
                <div className="flex flex-col gap-2">
                  {n.title && (
                    <h4 className="font-heading font-black text-sm text-text-primary">{n.title}</h4>
                  )}
                  <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">
                    {n.content}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-border-primary/20 pt-2.5">
                  <span className="text-[10px] text-text-secondary">
                    {n.createdAt.split('T')[0]}
                  </span>

                  <button 
                    onClick={() => n.id && handleDeleteNote(n.id)}
                    className="text-text-secondary hover:text-danger p-1 transition-colors cursor-pointer"
                    title="Eliminar Nota"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-text-secondary flex flex-col items-center">
              <StickyNote className="w-10 h-10 opacity-25 mb-2 text-amber-500" />
              <p className="text-xs font-bold text-text-primary">No hay notas rápidas pegadas</p>
              <p className="text-[11px] text-text-secondary mt-1">Escribe recordatorios al instante tipo Sticky Notes.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal Crear Hábito */}
      <Dialog
        isOpen={isAddHabitOpen}
        onClose={() => setIsAddHabitOpen(false)}
        title="Nuevo Hábito Diario"
        size="sm"
      >
        <form onSubmit={handleSaveHabit} className="flex flex-col gap-4 py-2 select-none">
          <Input 
            label="Nombre del Hábito"
            placeholder="Ej. Leer 15 min / Tomar 2L de agua"
            value={habitTitle}
            onChange={e => setHabitTitle(e.target.value)}
          />

          <Select 
            label="Categoría"
            value={habitCategory}
            onChange={e => setHabitCategory(e.target.value)}
            options={[
              { value: 'Salud', label: 'Salud & Deporte' },
              { value: 'Estudio', label: 'Estudio & Lectura' },
              { value: 'Productividad', label: 'Productividad' },
              { value: 'Bienestar', label: 'Bienestar & Mente' }
            ]}
          />

          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" type="button" onClick={() => setIsAddHabitOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit">Guardar Hábito</Button>
          </div>
        </form>
      </Dialog>

      {/* Modal Crear Nota Rápidas */}
      <Dialog
        isOpen={isAddNoteOpen}
        onClose={() => setIsAddNoteOpen(false)}
        title="Nueva Nota Adhesiva (Sticky Note)"
        size="sm"
      >
        <form onSubmit={handleSaveNote} className="flex flex-col gap-4 py-2 select-none">
          <Input 
            label="Título (Opcional)"
            placeholder="Ej. Lista de compras de paso"
            value={noteTitle}
            onChange={e => setNoteTitle(e.target.value)}
          />

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-text-secondary">Contenido de la Nota</label>
            <textarea 
              rows={4}
              value={noteContent}
              onChange={e => setNoteContent(e.target.value)}
              placeholder="Escribe aquí tu nota rápida..."
              className="w-full bg-surface border border-border-primary rounded-xl p-3 text-xs text-text-primary focus:outline-none focus:border-amber-500"
            />
          </div>

          <Select 
            label="Color de la Nota"
            value={noteColor}
            onChange={e => setNoteColor(e.target.value)}
            options={[
              { value: 'bg-amber-500/10 border-amber-500/30 text-amber-300', label: '🟡 Amarillo Cálido' },
              { value: 'bg-sky-500/10 border-sky-500/30 text-sky-300', label: '🔵 Azul Menta' },
              { value: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300', label: '🟢 Verde Esmeralda' },
              { value: 'bg-purple-500/10 border-purple-500/30 text-purple-300', label: '🟣 Púrpura Neón' }
            ]}
          />

          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" type="button" onClick={() => setIsAddNoteOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit">Pegar Nota</Button>
          </div>
        </form>
      </Dialog>

    </div>
  );
};
