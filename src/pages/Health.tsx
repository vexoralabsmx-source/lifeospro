import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type HealthRecord } from '../db/lifeDB';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Dialog } from '../components/ui/Dialog';
import { 
  Heart, Activity, Pill, Stethoscope, PhoneCall, 
  FileText, Plus, ShieldAlert, Calendar, User, Trash2
} from 'lucide-react';

export const Health: React.FC = () => {
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState<'all' | 'ice' | 'prescriptions' | 'appointments' | 'medications'>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [recordType, setRecordType] = useState<HealthRecord['recordType']>('prescription');
  const [doctorName, setDoctorName] = useState('');
  const [doctorPhone, setDoctorPhone] = useState('');
  const [bloodType, setBloodType] = useState('O+');
  const [allergies, setAllergies] = useState('');
  const [medications, setMedications] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequencyTime, setFrequencyTime] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Live Query
  const records = useLiveQuery(
    () => db.healthRecords.where('userId').equals(user || 'local_user').toArray(),
    [user]
  );

  if (!records) {
    return (
      <div className="flex flex-col gap-6 animate-pulse p-4">
        <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-1/4" />
        <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
      </div>
    );
  }

  // Find or compute ICE Card details
  const iceRecord = records.find(r => r.recordType === 'ice');

  const filteredRecords = records.filter(r => {
    if (activeTab === 'ice') return r.recordType === 'ice';
    if (activeTab === 'prescriptions') return r.recordType === 'prescription';
    if (activeTab === 'appointments') return r.recordType === 'appointment';
    if (activeTab === 'medications') return r.recordType === 'medication';
    return true;
  });

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && recordType !== 'ice') return;

    await db.healthRecords.add({
      userId: user || 'local_user',
      recordType,
      title: title || (recordType === 'ice' ? 'Ficha de Emergencia ICE' : 'Registro Médico'),
      doctorName: doctorName || undefined,
      doctorPhone: doctorPhone || undefined,
      bloodType: bloodType || undefined,
      allergies: allergies || undefined,
      medications: medications || undefined,
      dosage: dosage || undefined,
      frequencyTime: frequencyTime || undefined,
      date: date || undefined,
      notes: notes || undefined,
      createdAt: new Date().toISOString()
    });

    // Reset Form
    setTitle('');
    setDoctorName('');
    setDoctorPhone('');
    setAllergies('');
    setMedications('');
    setDosage('');
    setNotes('');
    setIsAddOpen(false);
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Deseas eliminar este registro médico?')) {
      await db.healthRecords.delete(id);
    }
  };

  return (
    <div className="flex flex-col gap-6 select-none animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-primary/40 pb-4">
        <div>
          <h2 className="font-heading font-black text-2xl text-text-primary tracking-tight flex items-center gap-2">
            <Heart className="w-6 h-6 text-rose-500 fill-rose-500/20" /> Salud & Expediente Médico
          </h2>
          <p className="text-xs text-text-secondary mt-0.5 font-medium">
            Ficha médica de emergencia, recetas, consultas y recordatorio de medicamentos.
          </p>
        </div>

        <Button 
          variant="primary" 
          size="sm" 
          onClick={() => setIsAddOpen(true)}
          className="gap-1.5 text-xs font-bold py-2.5 rounded-xl cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Agregar Registro Médico
        </Button>
      </div>

      {/* Emergency ICE Card Banner */}
      <Card variant="glass" className="p-6 border-rose-500/30 bg-rose-500/5 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-rose-500/15 text-rose-500 rounded-2xl shrink-0">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded">Perfil ICE Emergencia</span>
                <Badge variant="neutral" size="xs">Sangre: {iceRecord?.bloodType || bloodType}</Badge>
              </div>
              <h3 className="font-heading font-black text-lg text-text-primary mt-1">
                Contacto e Información de Urgencia
              </h3>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed max-w-xl">
                Alergias: <strong className="text-text-primary">{iceRecord?.allergies || allergies || 'Ninguna registrada'}</strong> • 
                Médico: <strong className="text-text-primary">{iceRecord?.doctorName || doctorName || 'No asignado'}</strong> {iceRecord?.doctorPhone && `(${iceRecord.doctorPhone})`}
              </p>
            </div>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => { setRecordType('ice'); setIsAddOpen(true); }}
            className="text-xs font-bold border-rose-500/30 text-rose-500 hover:bg-rose-500/10 cursor-pointer shrink-0"
          >
            Actualizar Ficha ICE
          </Button>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex border-b border-border-primary/40 text-xs font-bold gap-2 overflow-x-auto">
        {[
          { id: 'all', label: 'Todos' },
          { id: 'prescriptions', label: 'Recetas & Fichas' },
          { id: 'appointments', label: 'Citas Médicas' },
          { id: 'medications', label: 'Medicamentos' },
          { id: 'ice', label: 'Perfil Emergencia' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2.5 border-b-2 -mb-px whitespace-nowrap transition-colors cursor-pointer ${activeTab === t.id ? 'border-rose-500 text-rose-500' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Grid of Records */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRecords.length > 0 ? (
          filteredRecords.map(rec => (
            <Card key={rec.id} className="p-5 flex flex-col justify-between gap-4 border-border-primary/60 hover:border-rose-500/30 transition-all">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded">
                    {rec.recordType}
                  </span>
                  {rec.date && (
                    <span className="text-[10px] text-text-secondary font-semibold flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {rec.date}
                    </span>
                  )}
                </div>

                <h4 className="font-heading font-bold text-sm text-text-primary">{rec.title}</h4>
                
                {rec.doctorName && (
                  <p className="text-xs text-text-secondary flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-rose-400" /> Dr. {rec.doctorName} {rec.doctorPhone && `(${rec.doctorPhone})`}
                  </p>
                )}

                {rec.dosage && (
                  <p className="text-xs text-text-secondary flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5 text-amber-500" /> Dosis: {rec.dosage} {rec.frequencyTime && `(${rec.frequencyTime})`}
                  </p>
                )}

                {rec.notes && (
                  <p className="text-xs text-text-secondary/90 bg-surface-secondary/40 p-2.5 rounded-lg leading-relaxed mt-1">
                    {rec.notes}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end border-t border-border-primary/30 pt-3">
                <button 
                  onClick={() => rec.id && handleDelete(rec.id)}
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
            <Heart className="w-10 h-10 opacity-25 mb-2 text-rose-500" />
            <p className="text-xs font-bold text-text-primary">No hay registros médicos en esta sección</p>
            <p className="text-[11px] text-text-secondary mt-1">Agrega recetas, citas o datos de emergencia para tener tu expediente listo.</p>
          </div>
        )}
      </div>

      {/* Modal Agregar Registro */}
      <Dialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Nuevo Registro de Salud"
        size="md"
      >
        <form onSubmit={handleSaveRecord} className="flex flex-col gap-4 py-2 select-none">
          <Select 
            label="Tipo de Registro"
            value={recordType}
            onChange={e => setRecordType(e.target.value as any)}
            options={[
              { value: 'prescription', label: 'Receta / Consulta Médica' },
              { value: 'appointment', label: 'Cita con Especialista' },
              { value: 'medication', label: 'Medicamento / Dosis' },
              { value: 'ice', label: 'Ficha de Emergencia (ICE)' },
              { value: 'lab', label: 'Análisis de Laboratorio' }
            ]}
          />

          <Input 
            label="Título / Diagnóstico"
            placeholder="Ej. Checkup Anual / Receta Antibiótico"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />

          {recordType === 'ice' && (
            <div className="grid grid-cols-2 gap-3">
              <Select 
                label="Tipo de Sangre"
                value={bloodType}
                onChange={e => setBloodType(e.target.value)}
                options={[
                  { value: 'O+', label: 'O Positivo (O+)' },
                  { value: 'O-', label: 'O Negativo (O-)' },
                  { value: 'A+', label: 'A Positivo (A+)' },
                  { value: 'A-', label: 'A Negativo (A-)' },
                  { value: 'B+', label: 'B Positivo (B+)' },
                  { value: 'B-', label: 'B Negativo (B-)' },
                  { value: 'AB+', label: 'AB Positivo (AB+)' },
                  { value: 'AB-', label: 'AB Negativo (AB-)' }
                ]}
              />
              <Input 
                label="Alergias o Condiciones"
                placeholder="Ej. Penicilina, Mariscos"
                value={allergies}
                onChange={e => setAllergies(e.target.value)}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input 
              label="Nombre del Doctor"
              placeholder="Dr. Carlos Pérez"
              value={doctorName}
              onChange={e => setDoctorName(e.target.value)}
            />
            <Input 
              label="Teléfono del Doctor"
              placeholder="55-1234-5678"
              value={doctorPhone}
              onChange={e => setDoctorPhone(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input 
              label="Dosis / Indicación"
              placeholder="Ej. 500mg cada 8 hrs"
              value={dosage}
              onChange={e => setDosage(e.target.value)}
            />
            <Input 
              label="Fecha"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-text-secondary">Notas Adicionales</label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Indicaciones del tratamiento, laboratorio o instrucciones médicas..."
              className="w-full bg-surface border border-border-primary rounded-xl p-3 text-xs text-text-primary focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" type="button" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit">Guardar Registro</Button>
          </div>
        </form>
      </Dialog>

    </div>
  );
};
