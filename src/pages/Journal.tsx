import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type JournalRecord } from '../db/lifeDB';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Dialog } from '../components/ui/Dialog';
import { 
  BookOpen, Smile, Frown, Meh, Sparkles, Plus, 
  Trash2, Lock, Heart, Flame, Calendar
} from 'lucide-react';

export const Journal: React.FC = () => {
  const { user } = useApp();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string>('all');

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<JournalRecord['mood']>('great');
  const [tags, setTags] = useState('');

  // Live Query
  const entries = useLiveQuery(
    () => db.journalRecords.where('userId').equals(user || 'local_user').toArray(),
    [user]
  );

  if (!entries) {
    return (
      <div className="flex flex-col gap-6 animate-pulse p-4">
        <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-1/4" />
        <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
      </div>
    );
  }

  const filteredEntries = entries.filter(e => {
    if (selectedMoodFilter !== 'all' && e.mood !== selectedMoodFilter) return false;
    return true;
  });

  const getMoodEmoji = (m: JournalRecord['mood']) => {
    switch (m) {
      case 'great': return '😄 Excelente';
      case 'good': return '🙂 Bueno';
      case 'neutral': return '😐 Normal';
      case 'bad': return '😔 Complicado';
      case 'terrible': return '😫 Difícil';
    }
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    await db.journalRecords.add({
      userId: user || 'local_user',
      date: new Date().toISOString().split('T')[0],
      mood,
      title: title.trim() || 'Entrada del Diario',
      content: content.trim(),
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      createdAt: new Date().toISOString()
    });

    setTitle('');
    setContent('');
    setTags('');
    setIsAddOpen(false);
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Eliminar esta entrada del diario?')) {
      await db.journalRecords.delete(id);
    }
  };

  return (
    <div className="flex flex-col gap-6 select-none animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-primary/40 pb-4">
        <div>
          <h2 className="font-heading font-black text-2xl text-text-primary tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-purple-500" /> Diario de Vida & Monitor de Ánimo
          </h2>
          <p className="text-xs text-text-secondary mt-0.5 font-medium">
            Reflexiones personales, diario cifrado y seguimiento de emociones cotidianas.
          </p>
        </div>

        <Button 
          variant="primary" 
          size="sm" 
          onClick={() => setIsAddOpen(true)}
          className="gap-1.5 text-xs font-bold py-2.5 rounded-xl cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Nueva Reflexión
        </Button>
      </div>

      {/* Mood Filter Pills */}
      <div className="flex border-b border-border-primary/40 text-xs font-bold gap-2 overflow-x-auto">
        {[
          { id: 'all', label: 'Todas las entradas' },
          { id: 'great', label: '😄 Excelente' },
          { id: 'good', label: '🙂 Bueno' },
          { id: 'neutral', label: '😐 Normal' },
          { id: 'bad', label: '😔 Complicado' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setSelectedMoodFilter(t.id)}
            className={`px-4 py-2.5 border-b-2 -mb-px whitespace-nowrap transition-colors cursor-pointer ${selectedMoodFilter === t.id ? 'border-purple-500 text-purple-400' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Entries List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredEntries.length > 0 ? (
          filteredEntries.map(e => (
            <Card key={e.id} className="p-5 flex flex-col justify-between gap-4 border-border-primary/60 hover:border-purple-500/30 transition-all">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full">
                    {getMoodEmoji(e.mood)}
                  </span>
                  <span className="text-xs text-text-secondary font-semibold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> {e.date}
                  </span>
                </div>

                <h4 className="font-heading font-black text-base text-text-primary mt-1">{e.title}</h4>

                <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap bg-surface-secondary/30 p-3 rounded-xl">
                  {e.content}
                </p>

                {e.tags && e.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {e.tags.map((t, idx) => (
                      <span key={idx} className="text-[10px] text-text-secondary bg-surface-secondary px-2 py-0.5 rounded-md">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end border-t border-border-primary/30 pt-3">
                <button 
                  onClick={() => e.id && handleDelete(e.id)}
                  className="text-text-secondary hover:text-danger p-1 transition-colors cursor-pointer"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-text-secondary flex flex-col items-center">
            <BookOpen className="w-10 h-10 opacity-25 mb-2 text-purple-500" />
            <p className="text-xs font-bold text-text-primary">No hay entradas grabadas en tu diario</p>
            <p className="text-[11px] text-text-secondary mt-1">Escribe tu primera reflexión personal de hoy.</p>
          </div>
        )}
      </div>

      {/* Modal Nueva Entrada */}
      <Dialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Nueva Entrada del Diario"
        size="md"
      >
        <form onSubmit={handleSaveEntry} className="flex flex-col gap-4 py-2 select-none">
          <Input 
            label="Título de la Reflexión"
            placeholder="Ej. Reflexión de la tarde / Mis metas de hoy"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-text-secondary">¿Cómo estuvo tu día hoy?</label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { id: 'great', emoji: '😄', label: 'Excelente' },
                { id: 'good', emoji: '🙂', label: 'Bueno' },
                { id: 'neutral', emoji: '😐', label: 'Normal' },
                { id: 'bad', emoji: '😔', label: 'Complicado' },
                { id: 'terrible', emoji: '😫', label: 'Difícil' }
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMood(m.id as any)}
                  className={`flex flex-col items-center p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    mood === m.id ? 'border-purple-500 bg-purple-500/10 text-purple-300' : 'border-border-primary/40 bg-surface-secondary/40 text-text-secondary'
                  }`}
                >
                  <span className="text-xl mb-1">{m.emoji}</span>
                  <span className="text-[10px]">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-text-secondary">Contenido de la Reflexión</label>
            <textarea 
              rows={5}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Escribe lo que sientas o lo que aprendiste el día de hoy..."
              className="w-full bg-surface border border-border-primary rounded-xl p-3 text-xs text-text-primary focus:outline-none focus:border-purple-500"
            />
          </div>

          <Input 
            label="Etiquetas (Separadas por coma)"
            placeholder="gratitud, trabajo, metas"
            value={tags}
            onChange={e => setTags(e.target.value)}
          />

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" type="button" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit">Guardar Reflexión</Button>
          </div>
        </form>
      </Dialog>

    </div>
  );
};
