import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type VehicleRecord, type VehicleServiceRecord, type ExpenseRecord } from '../db/lifeDB';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Dialog } from '../components/ui/Dialog';
import { EmptyState } from '../components/ui/EmptyState';
import { 
  Car, Plus, Settings, DollarSign, Calendar, RefreshCw, 
  Trash2, ShieldCheck, Wrench, Fuel, AlertTriangle, 
  ArrowLeft, Clipboard, MapPin, Gauge
} from 'lucide-react';

export const Vehicles: React.FC = () => {
  const { user, plan } = useApp();
  
  // Selection/State
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  // Log Modal Dialogs
  const [isServiceLogOpen, setIsServiceLogOpen] = useState(false);
  const [isFuelLogOpen, setIsFuelLogOpen] = useState(false);
  const [isMileageUpdateOpen, setIsMileageUpdateOpen] = useState(false);

  // Form State - Add Vehicle
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('2022');
  const [plates, setPlates] = useState('');
  const [color, setColor] = useState('');
  const [mileage, setMileage] = useState('');
  const [fuelType, setFuelType] = useState('Gasolina');
  const [nextServiceMileage, setNextServiceMileage] = useState('');
  const [insuranceExpiry, setInsuranceExpiry] = useState('');
  const [notes, setNotes] = useState('');

  // Form State - Service Log
  const [serviceType, setServiceType] = useState('Cambio de Aceite');
  const [serviceCost, setServiceCost] = useState('');
  const [serviceDate, setServiceDate] = useState('');
  const [serviceMileage, setServiceMileage] = useState('');
  const [serviceDetails, setServiceDetails] = useState('');

  // Form State - Fuel Log
  const [fuelCost, setFuelCost] = useState('');
  const [fuelDate, setFuelDate] = useState('');
  const [fuelVolume, setFuelVolume] = useState(''); // optional notes

  // Form State - Mileage Update
  const [newMileage, setNewMileage] = useState('');

  // --- QUERY VEHICLES & DEPENDENTS ---
  const vehicles = useLiveQuery(() => db.vehicles.toArray(), []);
  const services = useLiveQuery(() => db.vehicleServices.toArray(), []);
  const expenses = useLiveQuery(() => db.expenses.toArray(), []);

  if (!vehicles || !services || !expenses) {
    return (
      <div className="flex flex-col gap-6 animate-pulse p-4">
        <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-1/4" />
        <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
      </div>
    );
  }

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const vehicleServices = services.filter(s => s.vehicleId === selectedVehicleId);
  const vehicleExpenses = expenses.filter(e => e.relatedModule === 'vehicles' && e.relatedId === selectedVehicleId);
  const fuelExpenses = vehicleExpenses.filter(e => e.tags.includes('Gasolina'));

  // Fuel Total Spend
  const fuelSpendTotal = fuelExpenses.reduce((sum, e) => sum + e.amount, 0);
  // Service Total Spend
  const serviceSpendTotal = vehicleServices.reduce((sum, s) => sum + s.cost, 0);

  // --- SAVE VEHICLE ---
  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand.trim() || !model.trim() || !plates.trim() || !mileage) return;

    // Plan check
    if (plan === 'free' && vehicles.length >= 3) {
      alert('El plan gratuito está limitado a 3 vehículos. Por favor actualiza a Premium para añadir vehículos ilimitados.');
      return;
    }

    const newVehicle: VehicleRecord = {
      userId: user || 'local_user',
      brand,
      model,
      year: Number(year),
      plates: plates.toUpperCase(),
      color,
      mileage: Number(mileage),
      fuelType,
      nextServiceMileage: Number(nextServiceMileage) || (Number(mileage) + 10000),
      insuranceExpiry,
      notes: notes || undefined,
      createdAt: new Date().toISOString()
    };

    const id = await db.vehicles.add(newVehicle);
    setSelectedVehicleId(id);

    // Log Activity
    await db.activities.add({
      userId: user || 'local_user',
      action: 'created',
      module: 'vehicles',
      details: `Se registró el vehículo "${brand} ${model}" (${plates.toUpperCase()}).`,
      date: new Date().toISOString()
    });

    // Reset Form
    resetAddForm();
    setIsAddOpen(false);
  };

  const resetAddForm = () => {
    setBrand('');
    setModel('');
    setYear('2022');
    setPlates('');
    setColor('');
    setMileage('');
    setFuelType('Gasolina');
    setNextServiceMileage('');
    setInsuranceExpiry('');
    setNotes('');
  };

  // --- DELETE VEHICLE ---
  const handleDeleteVehicle = async (id: number) => {
    if (confirm('¿Estás seguro de eliminar este vehículo? Se borrará su historial de servicios y gasolina.')) {
      // 1. Delete dependent services
      const depServices = services.filter(s => s.vehicleId === id);
      for (const s of depServices) {
        await db.vehicleServices.delete(s.id!);
      }
      
      // 2. Delete vehicle
      await db.vehicles.delete(id);
      setSelectedVehicleId(null);

      // Log Activity
      await db.activities.add({
        userId: user || 'local_user',
        action: 'deleted',
        module: 'vehicles',
        details: `Se eliminó un vehículo de la flota.`,
        date: new Date().toISOString()
      });
    }
  };

  // --- LOG SERVICE ---
  const handleLogService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId || !serviceCost || !serviceDate || !serviceMileage) return;

    const costVal = Number(serviceCost);
    const mileageVal = Number(serviceMileage);

    // Add service record
    await db.vehicleServices.add({
      vehicleId: selectedVehicleId,
      type: serviceType,
      cost: costVal,
      date: serviceDate,
      mileage: mileageVal,
      details: serviceDetails || undefined,
      createdAt: new Date().toISOString()
    });

    // Mirror to expenses
    await db.expenses.add({
      userId: user || 'local_user',
      amount: costVal,
      date: serviceDate,
      category: 'Vehículo',
      paymentMethod: 'Tarjeta de Débito',
      merchant: `Servicio Mecánico (${serviceType})`,
      description: serviceDetails || `Servicio de mantenimiento registrado a los ${mileageVal} km.`,
      tags: ['Vehículo', 'Mantenimiento'],
      isRecurring: false,
      relatedModule: 'vehicles',
      relatedId: selectedVehicleId,
      createdAt: new Date().toISOString()
    });

    // Update vehicle mileage if higher
    if (selectedVehicle && mileageVal > selectedVehicle.mileage) {
      await db.vehicles.update(selectedVehicleId, { mileage: mileageVal });
    }

    // Reset Service form
    setServiceCost('');
    setServiceDate('');
    setServiceMileage('');
    setServiceDetails('');
    setIsServiceLogOpen(false);
  };

  // --- LOG FUEL (GASOLINE) ---
  const handleLogFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId || !fuelCost || !fuelDate) return;

    const amountVal = Number(fuelCost);

    // Add to expenses
    await db.expenses.add({
      userId: user || 'local_user',
      amount: amountVal,
      date: fuelDate,
      category: 'Vehículo',
      paymentMethod: 'Efectivo',
      merchant: 'Gasolinera / Carga Combustible',
      description: fuelVolume ? `Litros cargados: ${fuelVolume} L` : 'Carga de gasolina.',
      tags: ['Vehículo', 'Gasolina'],
      isRecurring: false,
      relatedModule: 'vehicles',
      relatedId: selectedVehicleId,
      createdAt: new Date().toISOString()
    });

    // Reset Fuel form
    setFuelCost('');
    setFuelDate('');
    setFuelVolume('');
    setIsFuelLogOpen(false);
  };

  // --- UPDATE MILEAGE ---
  const handleUpdateMileage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId || !newMileage) return;

    const milesVal = Number(newMileage);

    if (selectedVehicle && milesVal < selectedVehicle.mileage) {
      alert('El nuevo kilometraje no puede ser menor al kilometraje registrado actualmente.');
      return;
    }

    await db.vehicles.update(selectedVehicleId, { mileage: milesVal });

    // Log Activity
    await db.activities.add({
      userId: user || 'local_user',
      action: 'updated',
      module: 'vehicles',
      details: `Se actualizó el kilometraje del vehículo a ${milesVal.toLocaleString()} km.`,
      date: new Date().toISOString()
    });

    setNewMileage('');
    setIsMileageUpdateOpen(false);
  };

  return (
    <div className="flex flex-col gap-5">
      
      {/* 1. LIST VIEW OF VEHICLES */}
      {selectedVehicleId === null ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-heading font-black text-2xl text-text-primary tracking-tight">Mis Vehículos</h2>
              <p className="text-xs text-text-secondary font-medium mt-0.5">Lleva el control de los servicios, recargas de gasolina y vencimientos de tu auto o moto.</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setIsAddOpen(true)} className="gap-1.5 self-start sm:self-center rounded-xl">
              <Plus className="w-4 h-4" /> Agregar Vehículo
            </Button>
          </div>

          {vehicles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 select-none">
              {vehicles.map(v => {
                const isInsExpiring = new Date(v.insuranceExpiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                return (
                  <Card 
                    key={v.id} 
                    hoverable 
                    onClick={() => setSelectedVehicleId(v.id!)}
                    className="p-5 flex flex-col justify-between h-48 relative overflow-hidden group"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">{v.year} • {v.fuelType}</span>
                        {isInsExpiring ? (
                          <Badge variant="warning" size="xs">Seguro por Vencer</Badge>
                        ) : (
                          <Badge variant="brand" size="xs">Estatus OK</Badge>
                        )}
                      </div>
                      
                      <h4 className="font-heading font-black text-lg text-text-primary mt-2 group-hover:text-brand transition-colors">
                        {v.brand} {v.model}
                      </h4>
                      <p className="text-[10px] text-text-secondary mt-1 font-semibold">Placas: {v.plates} • Color: {v.color}</p>
                    </div>

                    <div className="border-t border-border-primary/20 pt-3 mt-4 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-text-secondary block text-[10px]">Kilometraje actual</span>
                        <span className="font-extrabold text-text-primary mt-0.5 block">{v.mileage.toLocaleString()} km</span>
                      </div>
                      
                      <div className="text-right">
                        <span className="text-text-secondary block text-[10px]">Próximo Servicio</span>
                        <span className="font-extrabold text-text-primary mt-0.5 block">{v.nextServiceMileage.toLocaleString()} km</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState 
              title="No tienes vehículos registrados"
              description="Añade tu auto o motocicleta para llevar una bitácora digital de sus mantenimientos mecánicos, cambios de aceite y consumo mensual de combustible."
              icon={<Car className="w-6 h-6" />}
              actionText="Registrar mi primer vehículo"
              onAction={() => setIsAddOpen(true)}
            />
          )}
        </div>
      ) : (
        /* 2. INDIVIDUAL VEHICLE DETAILS SHEET */
        selectedVehicle && (
          <div className="flex flex-col gap-5 animate-slide-up">
            
            {/* Back button and title */}
            <div className="flex items-center gap-3 select-none">
              <button 
                onClick={() => setSelectedVehicleId(null)}
                className="text-text-secondary hover:text-text-primary p-1.5 rounded-lg hover:bg-surface-secondary transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading font-black text-xl text-text-primary tracking-tight">
                    {selectedVehicle.brand} {selectedVehicle.model}
                  </h2>
                  <Badge variant="neutral" size="xs">{selectedVehicle.plates}</Badge>
                </div>
                <p className="text-[10px] text-text-secondary font-semibold mt-0.5">{selectedVehicle.year} • {selectedVehicle.color}</p>
              </div>
            </div>

            {/* Quick stats board */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center select-none">
              <Card className="p-4 flex flex-col justify-center gap-1.5 bg-surface-secondary/25 border-border-primary/40">
                <span className="text-[9px] text-text-secondary font-bold uppercase tracking-wider">Kilometraje</span>
                <span className="text-base font-black text-text-primary">{selectedVehicle.mileage.toLocaleString()} km</span>
              </Card>
              <Card className="p-4 flex flex-col justify-center gap-1.5 bg-surface-secondary/25 border-border-primary/40">
                <span className="text-[9px] text-text-secondary font-bold uppercase tracking-wider">Próximo Servicio</span>
                <span className="text-base font-black text-text-primary">{selectedVehicle.nextServiceMileage.toLocaleString()} km</span>
              </Card>
              <Card className="p-4 flex flex-col justify-center gap-1.5 bg-surface-secondary/25 border-border-primary/40">
                <span className="text-[9px] text-text-secondary font-bold uppercase tracking-wider">Mantenimientos</span>
                <span className="text-base font-black text-text-primary">${serviceSpendTotal.toLocaleString('es-MX')} MXN</span>
              </Card>
              <Card className="p-4 flex flex-col justify-center gap-1.5 bg-surface-secondary/25 border-border-primary/40">
                <span className="text-[9px] text-text-secondary font-bold uppercase tracking-wider">Combustible Total</span>
                <span className="text-base font-black text-text-primary">${fuelSpendTotal.toLocaleString('es-MX')} MXN</span>
              </Card>
            </div>

            {/* Service & Action panel buttons */}
            <div className="flex flex-wrap gap-2.5 select-none">
              <Button variant="primary" size="sm" onClick={() => setIsServiceLogOpen(true)} className="gap-1.5 text-xs font-bold rounded-xl">
                <Wrench className="w-4 h-4" /> Registrar Mantenimiento
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsFuelLogOpen(true)} className="gap-1.5 text-xs font-bold rounded-xl border-emerald-500/25 text-emerald-600 hover:bg-emerald-500/5">
                <Fuel className="w-4 h-4" /> Cargar Gasolina
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsMileageUpdateOpen(true)} className="gap-1.5 text-xs font-bold rounded-xl">
                <Gauge className="w-4 h-4" /> Actualizar Odómetro
              </Button>
              <Button variant="danger" size="sm" onClick={() => handleDeleteVehicle(selectedVehicle.id!)} className="gap-1.5 text-xs font-bold ml-auto rounded-xl">
                <Trash2 className="w-4 h-4" /> Eliminar Ficha
              </Button>
            </div>

            {/* Split layout: Services on Left, fuel on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* SERVICE HISTORY (LEFT COLUMN) */}
              <div className="lg:col-span-2">
                <Card className="p-5 h-full">
                  <h3 className="font-heading font-bold text-sm text-text-primary mb-4 border-b border-border-primary/25 pb-3 flex items-center gap-2 select-none">
                    <Clipboard className="w-4.5 h-4.5 text-indigo-500" /> Bitácora de Mantenimientos
                  </h3>

                  {vehicleServices.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {vehicleServices.map(srv => (
                        <div key={srv.id} className="p-3.5 border border-border-primary/45 rounded-xl hover:bg-surface-secondary/10 flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg shrink-0 mt-0.5">
                              <Wrench className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-text-primary">{srv.type}</h4>
                              <p className="text-[10px] text-text-secondary mt-0.5">{srv.date} • {srv.mileage.toLocaleString()} km</p>
                              {srv.details && <p className="text-[11px] text-text-secondary/85 mt-2 bg-surface-secondary/40 p-2 rounded-lg border border-border-primary/20">{srv.details}</p>}
                            </div>
                          </div>
                          <span className="text-xs font-black text-text-primary shrink-0">${srv.cost.toLocaleString('es-MX')} MXN</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-text-secondary select-none flex flex-col items-center">
                      <Wrench className="w-8 h-8 opacity-30 mb-2" />
                      <p className="text-xs font-bold">Sin mantenimientos registrados</p>
                      <p className="text-[10px] text-text-secondary/70 mt-0.5">Registra cambios de aceite, frenos o llantas para iniciar tu historial.</p>
                    </div>
                  )}
                </Card>
              </div>

              {/* FUEL LOGS & EXPIRY REMINDERS (RIGHT COLUMN) */}
              <div className="flex flex-col gap-6">
                
                {/* Reminders box */}
                <Card className="p-5 select-none bg-surface-secondary/15">
                  <h3 className="font-heading font-bold text-xs text-text-secondary uppercase tracking-wider mb-3">
                    Fechas y Vencimientos
                  </h3>
                  
                  <div className="flex flex-col gap-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary font-medium">Seguro de Auto</span>
                      <span className="font-bold text-text-primary">{selectedVehicle.insuranceExpiry}</span>
                    </div>
                    {selectedVehicle.verificationExpiry && (
                      <div className="flex items-center justify-between">
                        <span className="text-text-secondary font-medium">Verificación Ambiental</span>
                        <span className="font-bold text-text-primary">{selectedVehicle.verificationExpiry}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary font-medium">Tarjeta de Circulación</span>
                      <span className="font-bold text-text-primary">{selectedVehicle.circulationCard || 'N/A'}</span>
                    </div>
                  </div>
                </Card>

                {/* Fuel Spent summary */}
                <Card className="p-5">
                  <h3 className="font-heading font-bold text-sm text-text-primary mb-3 flex items-center gap-2 select-none">
                    <Fuel className="w-4.5 h-4.5 text-emerald-500" /> Cargas de Gasolina
                  </h3>

                  {fuelExpenses.length > 0 ? (
                    <div className="flex flex-col gap-2.5">
                      {fuelExpenses.slice(0, 4).map(exp => (
                        <div key={exp.id} className="flex items-center justify-between text-xs py-2 border-b border-border-primary/10 last:border-none">
                          <div className="select-none">
                            <span className="font-bold text-text-primary block">{exp.description || 'Carga Gasolina'}</span>
                            <span className="text-[9px] text-text-secondary font-semibold mt-0.5 block">{exp.date}</span>
                          </div>
                          <span className="font-extrabold text-text-primary">${exp.amount.toLocaleString('es-MX')} MXN</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-text-secondary select-none flex flex-col items-center">
                      <Fuel className="w-6 h-6 opacity-30 mb-1.5" />
                      <p className="text-[11px] font-bold">Sin cargas de combustible</p>
                      <p className="text-[9px] text-text-secondary/70 mt-0.5">Registra tus visitas a la gasolinera.</p>
                    </div>
                  )}
                </Card>

              </div>
            </div>

          </div>
        )
      )}

      {/* --- MODAL DIALOG FLOWS --- */}

      {/* 1. ADD VEHICLE DIALOG */}
      <Dialog
        isOpen={isAddOpen}
        onClose={() => { setIsAddOpen(false); resetAddForm(); }}
        title="Registrar Vehículo"
      >
        <form onSubmit={handleSaveVehicle} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Marca *" 
              placeholder="Ej. Toyota"
              value={brand}
              onChange={e => setBrand(e.target.value)}
              required
            />
            <Input 
              label="Modelo *" 
              placeholder="Ej. Prius"
              value={model}
              onChange={e => setModel(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input 
              label="Año" 
              type="number"
              value={year}
              onChange={e => setYear(e.target.value)}
            />
            <Input 
              label="Placas *" 
              placeholder="Ej. PR552OS"
              value={plates}
              onChange={e => setPlates(e.target.value)}
              required
            />
            <Input 
              label="Color" 
              placeholder="Ej. Gris"
              value={color}
              onChange={e => setColor(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Kilometraje Actual *" 
              type="number"
              placeholder="Ej. 52400"
              value={mileage}
              onChange={e => setMileage(e.target.value)}
              required
            />
            <Input 
              label="Kilometraje Próximo Servicio" 
              type="number"
              placeholder="Ej. 55000"
              value={nextServiceMileage}
              onChange={e => setNextServiceMileage(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select 
              label="Tipo de Combustible"
              value={fuelType}
              onChange={e => setFuelType(e.target.value)}
              options={[
                { value: 'Gasolina', label: 'Gasolina' },
                { value: 'Diesel', label: 'Diesel' },
                { value: 'Híbrido', label: 'Híbrido' },
                { value: 'Eléctrico', label: 'Eléctrico' }
              ]}
            />
            <Input 
              label="Vencimiento de Seguro *" 
              type="date"
              value={insuranceExpiry}
              onChange={e => setInsuranceExpiry(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-text-secondary font-heading">Notas</label>
            <textarea 
              rows={3}
              placeholder="Detalles adicionales como número de póliza, cobertura..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full rounded-xl border border-border-primary bg-surface p-3 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 mt-3 pt-3 border-t border-border-primary/30">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary" size="sm">Registrar Vehículo</Button>
          </div>
        </form>
      </Dialog>

      {/* 2. LOG SERVICE DIALOG */}
      <Dialog
        isOpen={isServiceLogOpen}
        onClose={() => setIsServiceLogOpen(false)}
        title="Registrar Mantenimiento Mecánico"
      >
        <form onSubmit={handleLogService} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Select 
              label="Tipo de Mantenimiento"
              value={serviceType}
              onChange={e => setServiceType(e.target.value)}
              options={[
                { value: 'Cambio de Aceite', label: 'Cambio de Aceite' },
                { value: 'Alineación y Balanceo', label: 'Alineación y Balanceo' },
                { value: 'Reemplazo de Balatas / Frenos', label: 'Reemplazo de Balatas / Frenos' },
                { value: 'Reemplazo de Llantas', label: 'Reemplazo de Llantas' },
                { value: 'Cambio de Batería', label: 'Cambio de Batería' },
                { value: 'Servicio Afinación Mayor', label: 'Servicio Afinación Mayor' },
                { value: 'Reparación de Motor / Eléctrico', label: 'Reparación de Motor / Eléctrico' },
                { value: 'Otros Servicios', label: 'Otros' }
              ]}
            />
            <Input 
              label="Costo del Servicio *" 
              type="number"
              placeholder="Ej. 1800"
              value={serviceCost}
              onChange={e => setServiceCost(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Kilometraje al momento *" 
              type="number"
              placeholder="Ej. 52400"
              value={serviceMileage}
              onChange={e => setServiceMileage(e.target.value)}
              required
            />
            <Input 
              label="Fecha del Servicio *" 
              type="date"
              value={serviceDate}
              onChange={e => setServiceDate(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-text-secondary font-heading">Detalles del Servicio</label>
            <textarea 
              rows={3}
              placeholder="Especifica el taller, piezas cambiadas o marcas de repuesto..."
              value={serviceDetails}
              onChange={e => setServiceDetails(e.target.value)}
              className="w-full rounded-xl border border-border-primary bg-surface p-3 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 mt-3 pt-3 border-t border-border-primary/30">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsServiceLogOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary" size="sm">Registrar en Bitácora</Button>
          </div>
        </form>
      </Dialog>

      {/* 3. CARGA GASOLINA DIALOG */}
      <Dialog
        isOpen={isFuelLogOpen}
        onClose={() => setIsFuelLogOpen(false)}
        title="Registrar Carga de Gasolina"
      >
        <form onSubmit={handleLogFuel} className="flex flex-col gap-4">
          <Input 
            label="Monto de la Carga ($) *" 
            type="number"
            placeholder="Ej. 650"
            value={fuelCost}
            onChange={e => setFuelCost(e.target.value)}
            required
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Fecha *" 
              type="date"
              value={fuelDate}
              onChange={e => setFuelDate(e.target.value)}
              required
            />
            <Input 
              label="Litros cargados (Opcional)" 
              placeholder="Ej. 32.5 L"
              value={fuelVolume}
              onChange={e => setFuelVolume(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 mt-3 pt-3 border-t border-border-primary/30">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsFuelLogOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary" size="sm">Registrar Gasto Gasolina</Button>
          </div>
        </form>
      </Dialog>

      {/* 4. UPDATE MILEAGE DIALOG */}
      <Dialog
        isOpen={isMileageUpdateOpen}
        onClose={() => setIsMileageUpdateOpen(false)}
        title="Actualizar Odómetro"
      >
        <form onSubmit={handleUpdateMileage} className="flex flex-col gap-4">
          <Input 
            label="Nuevo Kilometraje *" 
            type="number"
            placeholder={`Kilometraje actual: ${selectedVehicle?.mileage.toLocaleString()} km`}
            value={newMileage}
            onChange={e => setNewMileage(e.target.value)}
            required
          />

          <div className="flex items-center justify-end gap-2.5 mt-3 pt-3 border-t border-border-primary/30">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsMileageUpdateOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary" size="sm">Actualizar</Button>
          </div>
        </form>
      </Dialog>

    </div>
  );
};
