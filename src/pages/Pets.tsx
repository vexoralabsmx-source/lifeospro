import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type PetRecord } from '../db/lifeDB';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Dialog } from '../components/ui/Dialog';
import { 
  Heart, Dog, Cat, Syringe, Plus, Trash2, Calendar, FileText
} from 'lucide-react';

export const Pets: React.FC = () => {
  const { user } = useApp();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newVacName, setNewVacName] = useState('');
  const [newVacDate, setNewVacDate] = useState('');
  const [selectedPet, setSelectedPet] = useState<PetRecord | null>(null);

  // Form State
  const [petName, setPetName] = useState('');
  const [species, setSpecies] = useState<PetRecord['species']>('dog');
  const [breed, setBreed] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [weight, setWeight] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');

  // Live Query
  const petList = useLiveQuery(
    () => db.petRecords.where('userId').equals(user || 'local_user').toArray(),
    [user]
  );

  if (!petList) {
    return (
      <div className="flex flex-col gap-6 animate-pulse p-4">
        <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-1/4" />
        <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
      </div>
    );
  }

  const handleSavePet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!petName.trim()) return;

    await db.petRecords.add({
      userId: user || 'local_user',
      petName: petName.trim(),
      species,
      breed: breed || undefined,
      birthDate: birthDate || undefined,
      weight: Number(weight) || undefined,
      medicalNotes: medicalNotes || undefined,
      vaccinations: [],
      createdAt: new Date().toISOString()
    });

    setPetName('');
    setBreed('');
    setWeight('');
    setMedicalNotes('');
    setIsAddOpen(false);
  };

  const addVaccination = async (petId: number) => {
    if (!newVacName.trim() || !newVacDate) return;
    const pet = petList.find(p => p.id === petId);
    if (!pet) return;

    const updated = [
      ...pet.vaccinations,
      { name: newVacName.trim(), date: newVacDate }
    ];

    await db.petRecords.update(petId, { vaccinations: updated });
    setNewVacName('');
    setNewVacDate('');
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Deseas eliminar la ficha de esta mascota?')) {
      await db.petRecords.delete(id);
    }
  };

  return (
    <div className="flex flex-col gap-6 select-none animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-primary/40 pb-4">
        <div>
          <h2 className="font-heading font-black text-2xl text-text-primary tracking-tight flex items-center gap-2">
            <Dog className="w-6 h-6 text-amber-500" /> Ficha de Mascotas & Carnet Veterinario
          </h2>
          <p className="text-xs text-text-secondary mt-0.5 font-medium">
            Carnet de vacunas, peso, desparasitaciones e historial médico veterinario.
          </p>
        </div>

        <Button 
          variant="primary" 
          size="sm" 
          onClick={() => setIsAddOpen(true)}
          className="gap-1.5 text-xs font-bold py-2.5 rounded-xl cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Agregar Mascota
        </Button>
      </div>

      {/* Grid of Pets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {petList.length > 0 ? (
          petList.map(pet => (
            <Card key={pet.id} className="p-6 flex flex-col justify-between gap-4 border-border-primary/60 hover:border-amber-500/30 transition-all">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full">
                    {pet.species === 'dog' ? '🐶 Perro' : pet.species === 'cat' ? '🐱 Gato' : '🦜 Mascota'}
                  </span>
                  {pet.weight && (
                    <Badge variant="neutral" size="xs">Peso: {pet.weight} kg</Badge>
                  )}
                </div>

                <h3 className="font-heading font-black text-xl text-text-primary mt-1">
                  {pet.petName} {pet.breed && <span className="text-xs text-text-secondary font-semibold">({pet.breed})</span>}
                </h3>

                {pet.medicalNotes && (
                  <p className="text-xs text-text-secondary bg-surface-secondary/40 p-3 rounded-xl">
                    Notas Médicas: {pet.medicalNotes}
                  </p>
                )}

                {/* Vaccinations List */}
                <div className="mt-2 flex flex-col gap-2">
                  <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                    <Syringe className="w-4 h-4 text-emerald-500" /> Carnet de Vacunas & Controles ({pet.vaccinations.length})
                  </span>

                  <div className="flex flex-col gap-1.5 max-h-[120px] overflow-y-auto">
                    {pet.vaccinations.map((vac, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-surface-secondary/60 p-2 rounded-lg text-xs">
                        <span className="font-bold text-text-primary">{vac.name}</span>
                        <span className="text-[10px] text-text-secondary font-semibold">{vac.date}</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <input 
                      type="text"
                      placeholder="Vacuna / Desparasitación"
                      value={selectedPet?.id === pet.id ? newVacName : ''}
                      onFocus={() => setSelectedPet(pet)}
                      onChange={e => setNewVacName(e.target.value)}
                      className="bg-surface-secondary/60 border border-border-primary/40 rounded-lg px-2.5 py-1 text-xs text-text-primary"
                    />
                    <div className="flex items-center gap-1">
                      <input 
                        type="date"
                        value={selectedPet?.id === pet.id ? newVacDate : ''}
                        onFocus={() => setSelectedPet(pet)}
                        onChange={e => setNewVacDate(e.target.value)}
                        className="w-full bg-surface-secondary/60 border border-border-primary/40 rounded-lg px-2 py-1 text-xs text-text-primary"
                      />
                      <Button 
                        size="sm" 
                        variant="primary"
                        onClick={() => pet.id && addVaccination(pet.id)}
                        className="py-1 px-2 text-xs font-bold shrink-0 cursor-pointer"
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end border-t border-border-primary/30 pt-3">
                <button 
                  onClick={() => pet.id && handleDelete(pet.id)}
                  className="text-text-secondary hover:text-danger p-1 transition-colors cursor-pointer"
                  title="Eliminar Mascota"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-text-secondary flex flex-col items-center">
            <Dog className="w-10 h-10 opacity-25 mb-2 text-amber-500" />
            <p className="text-xs font-bold text-text-primary">No tienes mascotas registradas</p>
            <p className="text-[11px] text-text-secondary mt-1">Crea el carnet de vacunas y control de tus mascotas.</p>
          </div>
        )}
      </div>

      {/* Modal Registrar Mascota */}
      <Dialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Registrar Nueva Mascota"
        size="md"
      >
        <form onSubmit={handleSavePet} className="flex flex-col gap-4 py-2 select-none">
          <Input 
            label="Nombre de la Mascota"
            placeholder="Ej. Max / Luna"
            value={petName}
            onChange={e => setPetName(e.target.value)}
          />

          <Select 
            label="Especie"
            value={species}
            onChange={e => setSpecies(e.target.value as any)}
            options={[
              { value: 'dog', label: '🐶 Perro' },
              { value: 'cat', label: '🐱 Gato' },
              { value: 'bird', label: '🦜 Ave' },
              { value: 'other', label: '🐾 Otra Mascota' }
            ]}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input 
              label="Raza (Opcional)"
              placeholder="Golden Retriever / Siamés"
              value={breed}
              onChange={e => setBreed(e.target.value)}
            />
            <Input 
              label="Peso (kg)"
              type="number"
              placeholder="12.5"
              value={weight}
              onChange={e => setWeight(e.target.value)}
            />
          </div>

          <Input 
            label="Fecha de Nacimiento / Adopción"
            type="date"
            value={birthDate}
            onChange={e => setBirthDate(e.target.value)}
          />

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-text-secondary">Notas Médicas / Alimento Especial</label>
            <textarea 
              rows={3}
              value={medicalNotes}
              onChange={e => setMedicalNotes(e.target.value)}
              placeholder="Alergias, veterinario de cabecera o alimento recomendado..."
              className="w-full bg-surface border border-border-primary rounded-xl p-3 text-xs text-text-primary focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" type="button" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit">Guardar Ficha</Button>
          </div>
        </form>
      </Dialog>

    </div>
  );
};
