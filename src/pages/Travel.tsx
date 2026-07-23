import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type TravelRecord } from '../db/lifeDB';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Dialog } from '../components/ui/Dialog';
import { 
  Plane, Compass, MapPin, Calendar, CheckSquare, 
  Plus, Trash2, Hotel, Ticket, Briefcase
} from 'lucide-react';

export const Travel: React.FC = () => {
  const { user } = useApp();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newPackingItem, setNewPackingItem] = useState('');
  const [selectedTravel, setSelectedTravel] = useState<TravelRecord | null>(null);

  // Form State
  const [destination, setDestination] = useState('');
  const [country, setCountry] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [flights, setFlights] = useState('');
  const [lodging, setLodging] = useState('');
  const [notes, setNotes] = useState('');

  // Live Query
  const travelList = useLiveQuery(
    () => db.travelRecords.where('userId').equals(user || 'local_user').toArray(),
    [user]
  );

  if (!travelList) {
    return (
      <div className="flex flex-col gap-6 animate-pulse p-4">
        <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-1/4" />
        <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
      </div>
    );
  }

  const handleSaveTravel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim() || !startDate) return;

    // Default basic packing list template
    const defaultPacking = [
      { id: '1', item: 'Pasaporte / INE', packed: true },
      { id: '2', item: 'Cargadores de celular / laptop', packed: false },
      { id: '3', item: 'Ropa interior y calcetines', packed: false },
      { id: '4', item: 'Artículos de higiene personal', packed: false },
      { id: '5', item: 'Boletos de transporte / Reservaciones', packed: true }
    ];

    await db.travelRecords.add({
      userId: user || 'local_user',
      destination,
      country: country || undefined,
      startDate,
      endDate: endDate || startDate,
      budget: Number(budget) || undefined,
      status: 'planned',
      flights: flights || undefined,
      lodging: lodging || undefined,
      packingList: defaultPacking,
      notes: notes || undefined,
      createdAt: new Date().toISOString()
    });

    setDestination('');
    setCountry('');
    setStartDate('');
    setEndDate('');
    setBudget('');
    setFlights('');
    setLodging('');
    setNotes('');
    setIsAddOpen(false);
  };

  const togglePackingItem = async (travelId: number, itemId: string) => {
    const travel = travelList.find(t => t.id === travelId);
    if (!travel) return;

    const updatedList = travel.packingList.map(p => 
      p.id === itemId ? { ...p, packed: !p.packed } : p
    );

    await db.travelRecords.update(travelId, { packingList: updatedList });
  };

  const addPackingItem = async (travelId: number) => {
    if (!newPackingItem.trim()) return;
    const travel = travelList.find(t => t.id === travelId);
    if (!travel) return;

    const updatedList = [
      ...travel.packingList,
      { id: Date.now().toString(), item: newPackingItem.trim(), packed: false }
    ];

    await db.travelRecords.update(travelId, { packingList: updatedList });
    setNewPackingItem('');
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Deseas eliminar este registro de viaje?')) {
      await db.travelRecords.delete(id);
    }
  };

  return (
    <div className="flex flex-col gap-6 select-none animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-primary/40 pb-4">
        <div>
          <h2 className="font-heading font-black text-2xl text-text-primary tracking-tight flex items-center gap-2">
            <Plane className="w-6 h-6 text-sky-500" /> Módulo de Viajes e Itinerarios
          </h2>
          <p className="text-xs text-text-secondary mt-0.5 font-medium">
            Planifica tus viajes, guarda tus itinerarios, reservaciones de hotel y maletas.
          </p>
        </div>

        <Button 
          variant="primary" 
          size="sm" 
          onClick={() => setIsAddOpen(true)}
          className="gap-1.5 text-xs font-bold py-2.5 rounded-xl cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Planificar Viaje
        </Button>
      </div>

      {/* Travel Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {travelList.length > 0 ? (
          travelList.map(t => {
            const totalItems = t.packingList.length;
            const packedCount = t.packingList.filter(p => p.packed).length;
            const packingPercent = totalItems > 0 ? Math.round((packedCount / totalItems) * 100) : 0;

            return (
              <Card key={t.id} className="p-6 flex flex-col justify-between gap-5 border-border-primary/60 hover:border-sky-500/30 transition-all">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-sky-500 bg-sky-500/10 px-2.5 py-0.5 rounded-full">
                      <MapPin className="w-3.5 h-3.5" /> {t.country || 'Destino'}
                    </span>
                    <Badge variant="neutral" size="xs">
                      {t.startDate} al {t.endDate}
                    </Badge>
                  </div>

                  <h3 className="font-heading font-black text-xl text-text-primary mt-1 flex items-center gap-2">
                    🌍 {t.destination}
                  </h3>

                  {t.flights && (
                    <p className="text-xs text-text-secondary flex items-center gap-1.5 bg-surface-secondary/40 p-2.5 rounded-xl">
                      <Ticket className="w-4 h-4 text-sky-400 shrink-0" /> Vuelo / Transporte: {t.flights}
                    </p>
                  )}

                  {t.lodging && (
                    <p className="text-xs text-text-secondary flex items-center gap-1.5 bg-surface-secondary/40 p-2.5 rounded-xl">
                      <Hotel className="w-4 h-4 text-amber-400 shrink-0" /> Hospedaje: {t.lodging}
                    </p>
                  )}

                  {/* Packing List Checklist Widget */}
                  <div className="mt-2 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs font-bold text-text-primary">
                      <span className="flex items-center gap-1.5">
                        <Briefcase className="w-4 h-4 text-emerald-500" /> Maleta / Equipaje ({packedCount}/{totalItems})
                      </span>
                      <span className="text-emerald-500">{packingPercent}%</span>
                    </div>

                    <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                      {t.packingList.map(item => (
                        <label 
                          key={item.id}
                          className="flex items-center gap-2 text-xs text-text-secondary hover:text-text-primary cursor-pointer select-none"
                        >
                          <input 
                            type="checkbox"
                            checked={item.packed}
                            onChange={() => t.id && togglePackingItem(t.id, item.id)}
                            className="rounded accent-sky-500 border-border-primary w-3.5 h-3.5"
                          />
                          <span className={item.packed ? 'line-through opacity-60' : ''}>{item.item}</span>
                        </label>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 mt-1">
                      <input 
                        type="text"
                        placeholder="+ Agregar artículo a la maleta"
                        value={selectedTravel?.id === t.id ? newPackingItem : ''}
                        onFocus={() => setSelectedTravel(t)}
                        onChange={e => setNewPackingItem(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            t.id && addPackingItem(t.id);
                          }
                        }}
                        className="w-full bg-surface-secondary/60 border border-border-primary/40 rounded-lg px-2.5 py-1 text-xs text-text-primary focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border-primary/30 pt-3 mt-2">
                  {t.budget ? (
                    <span className="text-xs text-text-secondary">Presupuesto: <strong className="text-text-primary">${t.budget.toLocaleString()} MXN</strong></span>
                  ) : <span />}

                  <button 
                    onClick={() => t.id && handleDelete(t.id)}
                    className="text-text-secondary hover:text-danger p-1 transition-colors cursor-pointer"
                    title="Eliminar Viaje"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center text-text-secondary flex flex-col items-center">
            <Compass className="w-10 h-10 opacity-25 mb-2 text-sky-500" />
            <p className="text-xs font-bold text-text-primary">No tienes viajes registrados</p>
            <p className="text-[11px] text-text-secondary mt-1">Planifica tu próxima escapada o vacaciones y guarda tus boletos y maleta.</p>
          </div>
        )}
      </div>

      {/* Modal Planificar Viaje */}
      <Dialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Planificar Nuevo Viaje"
        size="md"
      >
        <form onSubmit={handleSaveTravel} className="flex flex-col gap-4 py-2 select-none">
          <div className="grid grid-cols-2 gap-3">
            <Input 
              label="Destino / Ciudad"
              placeholder="Ej. Cancún / Tokio"
              value={destination}
              onChange={e => setDestination(e.target.value)}
            />
            <Input 
              label="País"
              placeholder="Ej. México / Japón"
              value={country}
              onChange={e => setCountry(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input 
              label="Fecha de Salida"
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
            <Input 
              label="Fecha de Regreso"
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>

          <Input 
            label="Presupuesto Estimado ($ MXN)"
            type="number"
            placeholder="15000"
            value={budget}
            onChange={e => setBudget(e.target.value)}
          />

          <Input 
            label="Vuelo / Transporte (Opcional)"
            placeholder="Ej. Aeroméxico AM123 - Salida 08:00 AM"
            value={flights}
            onChange={e => setFlights(e.target.value)}
          />

          <Input 
            label="Hospedaje / Hotel (Opcional)"
            placeholder="Ej. Hotel Grand Oasis - Reserva #98765"
            value={lodging}
            onChange={e => setLodging(e.target.value)}
          />

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" type="button" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit">Guardar Viaje</Button>
          </div>
        </form>
      </Dialog>

    </div>
  );
};
