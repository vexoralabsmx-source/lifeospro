import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type HomeRecord, type HomeMaintenanceRecord } from '../db/lifeDB';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Dialog } from '../components/ui/Dialog';
import { EmptyState } from '../components/ui/EmptyState';
import { 
  Home, Plus, Trash2, Calendar, DollarSign, Wrench, 
  MapPin, HelpCircle, ArrowLeft, Layers, Sparkles
} from 'lucide-react';

export const HomeModule: React.FC = () => {
  const { user } = useApp();
  
  // Selection/State
  const [selectedHomeId, setSelectedHomeId] = useState<number | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isLogMaintOpen, setIsLogMaintOpen] = useState(false);

  // Form State - Add Home
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState<'apartment' | 'house' | 'office' | 'other'>('apartment');
  const [roomsInput, setRoomsInput] = useState('Recámara Principal, Cocina, Baño, Sala-Comedor');
  const [servicesInput, setServicesInput] = useState('Agua Cutzamala, Luz CFE, Internet Totalplay');

  // Form State - Log Maintenance
  const [maintTitle, setMaintTitle] = useState('');
  const [maintCost, setMaintCost] = useState('');
  const [maintDate, setMaintDate] = useState(new Date().toISOString().split('T')[0]);
  const [contractor, setContractor] = useState('');
  const [maintNotes, setMaintNotes] = useState('');

  // --- QUERY HOMES & MAINTENANCE ---
  const homes = useLiveQuery(() => db.homes.toArray(), []);
  const maintenances = useLiveQuery(() => db.homeMaintenance.toArray(), []);

  if (!homes || !maintenances) {
    return (
      <div className="flex flex-col gap-6 animate-pulse p-4">
        <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-1/4" />
        <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
      </div>
    );
  }

  const selectedHome = homes.find(h => h.id === selectedHomeId);
  const homeMaintenances = maintenances.filter(m => m.homeId === selectedHomeId);

  // --- SAVE HOME ---
  const handleSaveHome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const rooms = roomsInput.split(',').map(r => r.trim()).filter(r => r !== '');
    const services = servicesInput.split(',').map(s => s.trim()).filter(s => s !== '');

    const newHome: HomeRecord = {
      userId: user || 'local_user',
      name,
      address: address || undefined,
      type,
      rooms,
      services,
      createdAt: new Date().toISOString()
    };

    const id = await db.homes.add(newHome);
    setSelectedHomeId(id);

    // Log Activity
    await db.activities.add({
      userId: user || 'local_user',
      action: 'created',
      module: 'homes',
      details: `Se registró la vivienda "${name}".`,
      date: new Date().toISOString()
    });

    // Reset Form
    setName('');
    setAddress('');
    setType('apartment');
    setRoomsInput('Recámara Principal, Cocina, Baño, Sala-Comedor');
    setServicesInput('Agua Cutzamala, Luz CFE, Internet Totalplay');
    setIsAddOpen(false);
  };

  // --- DELETE HOME ---
  const handleDeleteHome = async (id: number) => {
    if (confirm('¿Estás seguro de eliminar esta vivienda? Se borrarán sus servicios e inventario.')) {
      // Delete dependent maintenance
      const depMaint = maintenances.filter(m => m.homeId === id);
      for (const m of depMaint) {
        await db.homeMaintenance.delete(m.id!);
      }

      await db.homes.delete(id);
      setSelectedHomeId(null);

      // Log Activity
      await db.activities.add({
        userId: user || 'local_user',
        action: 'deleted',
        module: 'homes',
        details: `Se eliminó un registro de vivienda.`,
        date: new Date().toISOString()
      });
    }
  };

  // --- LOG MAINTENANCE EVENT ---
  const handleLogMaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHomeId || !maintTitle.trim() || !maintCost || !maintDate) return;

    const costVal = Number(maintCost);

    // Add maintenance
    await db.homeMaintenance.add({
      homeId: selectedHomeId,
      title: maintTitle,
      date: maintDate,
      cost: costVal,
      contractor: contractor || undefined,
      notes: maintNotes || undefined
    });

    // Mirror to expenses module
    await db.expenses.add({
      userId: user || 'local_user',
      amount: costVal,
      date: maintDate,
      category: 'Hogar',
      paymentMethod: 'Tarjeta de Débito',
      merchant: contractor || `Mantenimiento Hogar`,
      description: `Mantenimiento registrado: ${maintTitle}. ${maintNotes || ''}`,
      tags: ['Hogar', 'Mantenimiento'],
      isRecurring: false,
      relatedModule: 'homes',
      relatedId: selectedHomeId,
      createdAt: new Date().toISOString()
    });

    // Reset Form
    setMaintTitle('');
    setMaintCost('');
    setMaintDate(new Date().toISOString().split('T')[0]);
    setContractor('');
    setMaintNotes('');
    setIsLogMaintOpen(false);
  };

  return (
    <div className="flex flex-col gap-5">
      
      {/* 1. LIST VIEW OF PROPERTIES */}
      {selectedHomeId === null ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-heading font-black text-2xl text-text-primary tracking-tight">Hogar & Viviendas</h2>
              <p className="text-xs text-text-secondary font-medium mt-0.5">Organiza el inventario, habitaciones, servicios públicos y bitácora de reparaciones de tus propiedades.</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setIsAddOpen(true)} className="gap-1.5 self-start sm:self-center rounded-xl">
              <Plus className="w-4 h-4" /> Agregar Propiedad
            </Button>
          </div>

          {homes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 select-none">
              {homes.map(h => (
                <Card 
                  key={h.id} 
                  hoverable 
                  onClick={() => setSelectedHomeId(h.id!)}
                  className="p-5 flex flex-col justify-between h-48 relative overflow-hidden group"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider capitalize">{h.type}</span>
                      <Badge variant="brand" size="xs">{h.rooms.length} Habitaciones</Badge>
                    </div>
                    
                    <h4 className="font-heading font-black text-lg text-text-primary mt-2 group-hover:text-brand transition-colors">
                      {h.name}
                    </h4>
                    {h.address && <p className="text-[10px] text-text-secondary mt-1 font-semibold truncate"><MapPin className="inline w-3 h-3 -mt-0.5 mr-0.5 text-text-secondary" /> {h.address}</p>}
                  </div>

                  <div className="border-t border-border-primary/20 pt-3 mt-4 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-text-secondary">Servicios activos: {h.services.length}</span>
                    <span className="text-brand font-bold text-xs flex items-center group-hover:translate-x-1 transition-transform">Ver ficha <Plus className="w-3.5 h-3.5 ml-0.5" /></span>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState 
              title="No tienes viviendas registradas"
              description="Añade tu departamento, casa u oficina para llevar una bitácora digital de sus servicios asociados, inventario de electrodomésticos y reparaciones."
              icon={<Home className="w-6 h-6" />}
              actionText="Registrar mi primera vivienda"
              onAction={() => setIsAddOpen(true)}
            />
          )}
        </div>
      ) : (
        /* 2. SPECIFIC HOME DETAILS SHEET */
        selectedHome && (
          <div className="flex flex-col gap-5 animate-slide-up">
            
            {/* Header toolbar */}
            <div className="flex items-center gap-3 select-none">
              <button 
                onClick={() => setSelectedHomeId(null)}
                className="text-text-secondary hover:text-text-primary p-1.5 rounded-lg hover:bg-surface-secondary transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading font-black text-xl text-text-primary tracking-tight">
                    {selectedHome.name}
                  </h2>
                  <Badge variant="neutral" size="xs" className="capitalize">{selectedHome.type}</Badge>
                </div>
                {selectedHome.address && <p className="text-[10px] text-text-secondary font-semibold mt-0.5">{selectedHome.address}</p>}
              </div>
            </div>

            {/* Split layout lists */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* MAINTENANCE & REPAIRS BITACORA (LEFT 2 COLUMNS) */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                
                {/* Rooms and services deck */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 select-none">
                  
                  {/* Rooms list */}
                  <Card className="p-4.5 bg-surface">
                    <h3 className="font-heading font-bold text-xs text-text-secondary uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-brand" /> Distribución
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedHome.rooms.map((rm, idx) => (
                        <span key={idx} className="text-xs font-semibold text-text-primary bg-surface-secondary border border-border-primary/50 px-2.5 py-1 rounded-xl">
                          {rm}
                        </span>
                      ))}
                    </div>
                  </Card>

                  {/* Services list */}
                  <Card className="p-4.5 bg-surface">
                    <h3 className="font-heading font-bold text-xs text-text-secondary uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
                      <Home className="w-4 h-4 text-cyan-500" /> Servicios Públicos
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedHome.services.map((s, idx) => (
                        <span key={idx} className="text-xs font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-xl">
                          {s}
                        </span>
                      ))}
                    </div>
                  </Card>
                </div>

                {/* Maintenance ledger */}
                <Card className="p-5">
                  <div className="flex items-center justify-between border-b border-border-primary/25 pb-3.5 mb-4 select-none">
                    <h3 className="font-heading font-bold text-sm text-text-primary flex items-center gap-2">
                      <Wrench className="w-4.5 h-4.5 text-indigo-500" /> Bitácora de Reparaciones y Mantenimiento
                    </h3>
                    <Button variant="primary" size="sm" onClick={() => setIsLogMaintOpen(true)} className="text-xs font-bold gap-1 rounded-xl">
                      <Plus className="w-3.5 h-3.5" /> Registrar Reporte
                    </Button>
                  </div>

                  {homeMaintenances.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {homeMaintenances.map(maint => (
                        <div key={maint.id} className="p-3.5 border border-border-primary/45 rounded-xl hover:bg-surface-secondary/15 flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg shrink-0 mt-0.5">
                              <Wrench className="w-4.5 h-4.5" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-text-primary">{maint.title}</h4>
                              <p className="text-[10px] text-text-secondary mt-0.5">{maint.date} {maint.contractor ? ` • Contratista: ${maint.contractor}` : ''}</p>
                              {maint.notes && <p className="text-[11px] text-text-secondary mt-2 bg-surface-secondary/40 p-2 rounded-lg border border-border-primary/20">{maint.notes}</p>}
                            </div>
                          </div>
                          <span className="text-xs font-black text-text-primary shrink-0">${maint.cost.toLocaleString('es-MX')} MXN</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-text-secondary select-none flex flex-col items-center">
                      <Wrench className="w-8 h-8 opacity-30 mb-2" />
                      <p className="text-xs font-bold">Sin mantenimientos registrados</p>
                      <p className="text-[10px] text-text-secondary/70 mt-0.5">Lleva aquí el registro de fumigación, pintura, plomería o reparaciones.</p>
                    </div>
                  )}
                </Card>
              </div>

              {/* VIVIENDAS SETTINGS DETAILS & DELETION (RIGHT COLUMN) */}
              <div className="flex flex-col gap-6 select-none">
                <Card className="p-5 flex flex-col gap-4">
                  <h3 className="font-heading font-bold text-xs text-text-secondary uppercase tracking-wider">
                    Acciones de Propiedad
                  </h3>
                  
                  <Button 
                    variant="danger" 
                    size="sm" 
                    onClick={() => handleDeleteHome(selectedHome.id!)}
                    className="w-full gap-1.5 font-bold text-xs py-3"
                  >
                    <Trash2 className="w-4 h-4" /> Eliminar Vivienda
                  </Button>
                </Card>
              </div>

            </div>

          </div>
        )
      )}

      {/* --- DIALOG MODALS --- */}

      {/* 1. ADD PROPERTY DIALOG */}
      <Dialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Registrar Propiedad"
      >
        <form onSubmit={handleSaveHome} className="flex flex-col gap-4">
          <Input 
            label="Nombre de la Propiedad *" 
            placeholder="Ej. Casa de Cuernavaca / Depto CDMX"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Dirección (Opcional)" 
              placeholder="Ej. Av. Paseo de la Reforma 123"
              value={address}
              onChange={e => setAddress(e.target.value)}
            />
            <Select 
              label="Tipo de Inmueble"
              value={type}
              onChange={e => setType(e.target.value as any)}
              options={[
                { value: 'apartment', label: 'Departamento' },
                { value: 'house', label: 'Casa Residencial' },
                { value: 'office', label: 'Oficina / Local' },
                { value: 'other', label: 'Otros' }
              ]}
            />
          </div>

          <Input 
            label="Habitaciones (Separadas por comas)" 
            placeholder="Ej. Recámara, Baño, Cocina, Sala"
            value={roomsInput}
            onChange={e => setRoomsInput(e.target.value)}
          />

          <Input 
            label="Servicios Públicos (Separados por comas)" 
            placeholder="Ej. CFE Luz, Agua potable, Internet Fibra"
            value={servicesInput}
            onChange={e => setServicesInput(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2.5 mt-3 pt-3 border-t border-border-primary/30">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary" size="sm">Registrar Propiedad</Button>
          </div>
        </form>
      </Dialog>

      {/* 2. LOG MAINTENANCE EVENT DIALOG */}
      <Dialog
        isOpen={isLogMaintOpen}
        onClose={() => setIsLogMaintOpen(false)}
        title="Registrar Mantenimiento / Gasto de Hogar"
      >
        <form onSubmit={handleLogMaint} className="flex flex-col gap-4">
          <Input 
            label="Título / Concepto del Mantenimiento *" 
            placeholder="Ej. Pintura de Fachada / Plomero fuga"
            value={maintTitle}
            onChange={e => setMaintTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Costo del Trabajo ($) *" 
              type="number"
              placeholder="Ej. 1200"
              value={maintCost}
              onChange={e => setMaintCost(e.target.value)}
              required
            />
            <Input 
              label="Fecha *" 
              type="date"
              value={maintDate}
              onChange={e => setMaintDate(e.target.value)}
              required
            />
          </div>

          <Input 
            label="Proveedor / Contratista (Opcional)" 
            placeholder="Ej. FumiFast / Gas Natural"
            value={contractor}
            onChange={e => setContractor(e.target.value)}
          />

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-text-secondary font-heading">Notas</label>
            <textarea 
              rows={3}
              placeholder="Detalles sobre el trabajo..."
              value={maintNotes}
              onChange={e => setMaintNotes(e.target.value)}
              className="w-full rounded-xl border border-border-primary bg-surface p-3 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 mt-3 pt-3 border-t border-border-primary/30">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsLogMaintOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary" size="sm">Registrar Reporte</Button>
          </div>
        </form>
      </Dialog>

    </div>
  );
};
