import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type SubscriptionRecord } from '../db/lifeDB';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Dialog } from '../components/ui/Dialog';
import { EmptyState } from '../components/ui/EmptyState';
import { 
  CreditCard, Plus, Calendar, DollarSign, RefreshCw, 
  Trash2, ShieldCheck, HelpCircle, Star, Play, Pause, XCircle
} from 'lucide-react';

export const Subscriptions: React.FC = () => {
  const { user } = useApp();
  
  // States
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form State - Add Subscription
  const [name, setName] = useState('');
  const [plan, setPlan] = useState('');
  const [price, setPrice] = useState('');
  const [billDate, setBillDate] = useState('5');
  const [frequency, setFrequency] = useState<'monthly' | 'yearly'>('monthly');
  const [paymentMethod, setPaymentMethod] = useState('Tarjeta de Crédito');
  const [status, setStatus] = useState<'active' | 'paused' | 'cancelled' | 'trial'>('active');
  const [notes, setNotes] = useState('');

  // --- QUERY SUBSCRIPTIONS ---
  const subscriptions = useLiveQuery(() => db.subscriptions.toArray(), []);

  if (!subscriptions) {
    return (
      <div className="flex flex-col gap-6 animate-pulse p-4">
        <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-1/4" />
        <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
      </div>
    );
  }

  // --- STATS & COMPUTATIONS ---
  const activeSubs = subscriptions.filter(s => s.status === 'active');
  const pausedSubs = subscriptions.filter(s => s.status === 'paused');
  const cancelledSubs = subscriptions.filter(s => s.status === 'cancelled');

  // Sum monthly costs (normalized to monthly value)
  const monthlyCostTotal = activeSubs.reduce((sum, s) => {
    return sum + (s.frequency === 'monthly' ? s.price : s.price / 12);
  }, 0);

  const yearlyCostTotal = monthlyCostTotal * 12;

  // Potential savings (paused & cancelled monthly value)
  const monthlySavingsTotal = [...pausedSubs, ...cancelledSubs].reduce((sum, s) => {
    return sum + (s.frequency === 'monthly' ? s.price : s.price / 12);
  }, 0);

  // Sorting: most expensive active subscriptions first
  const sortedActiveSubs = [...activeSubs].sort((a, b) => {
    const aVal = a.frequency === 'monthly' ? a.price : a.price / 12;
    const bVal = b.frequency === 'monthly' ? b.price : b.price / 12;
    return bVal - aVal;
  });

  // --- SAVE SUBSCRIPTION ---
  const handleSaveSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price || !billDate) return;

    const newSub: SubscriptionRecord = {
      userId: user || 'local_user',
      name,
      plan: plan || 'Básico',
      price: Number(price),
      billDate: Number(billDate),
      frequency,
      paymentMethod,
      status,
      notes: notes || undefined,
      createdAt: new Date().toISOString()
    };

    await db.subscriptions.add(newSub);

    // Log Activity
    await db.activities.add({
      userId: user || 'local_user',
      action: 'created',
      module: 'subscriptions',
      details: `Se registró la suscripción de "${name}" (${plan || 'Básico'}) por $${price} al mes/año.`,
      date: new Date().toISOString()
    });

    // Reset Form & Close
    resetForm();
    setIsAddOpen(false);
  };

  const resetForm = () => {
    setName('');
    setPlan('');
    setPrice('');
    setBillDate('5');
    setFrequency('monthly');
    setPaymentMethod('Tarjeta de Crédito');
    setStatus('active');
    setNotes('');
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Estás seguro de eliminar esta suscripción?')) {
      await db.subscriptions.delete(id);
      
      // Log activity
      await db.activities.add({
        userId: user || 'local_user',
        action: 'deleted',
        module: 'subscriptions',
        details: `Se eliminó un registro de suscripción.`,
        date: new Date().toISOString()
      });
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: SubscriptionRecord['status']) => {
    await db.subscriptions.update(id, { status: newStatus });
    
    // Log Activity
    await db.activities.add({
      userId: user || 'local_user',
      action: 'updated',
      module: 'subscriptions',
      details: `Se cambió el estado de la suscripción a: ${newStatus}`,
      date: new Date().toISOString()
    });
  };

  const getStatusBadge = (s: SubscriptionRecord['status']) => {
    switch (s) {
      case 'active': return <Badge variant="success" size="xs">Activa</Badge>;
      case 'paused': return <Badge variant="warning" size="xs">Pausada</Badge>;
      case 'cancelled': return <Badge variant="danger" size="xs">Cancelada</Badge>;
      case 'trial': return <Badge variant="brand" size="xs">Prueba Gratuita</Badge>;
      default: return <Badge variant="neutral" size="xs">{s}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading font-black text-2xl text-text-primary tracking-tight">Suscripciones Recurrentes</h2>
          <p className="text-xs text-text-secondary font-medium mt-0.5">Administra tus contratos digitales y optimiza tus cobros mensuales de servicios streaming, SaaS o licencias.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsAddOpen(true)} className="gap-1.5 self-start sm:self-center rounded-xl">
          <Plus className="w-4 h-4" /> Agregar Suscripción
        </Button>
      </div>

      {/* Stats summaries cards widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 select-none animate-slide-up">
        {/* Total Monthly */}
        <Card className="p-5 flex flex-col justify-between min-h-[110px]">
          <div>
            <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Costo Mensual Consolidado</span>
            <span className="font-heading font-black text-2xl text-text-primary mt-1 block">
              ${monthlyCostTotal.toLocaleString('es-MX', { minimumFractionDigits: 0 })} MXN
            </span>
          </div>
          <span className="text-[9px] text-text-secondary">Corresponde a {activeSubs.length} cobros activos.</span>
        </Card>

        {/* Total Yearly */}
        <Card className="p-5 flex flex-col justify-between min-h-[110px]">
          <div>
            <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Proyección de Costo Anual</span>
            <span className="font-heading font-black text-2xl text-text-primary mt-1 block">
              ${yearlyCostTotal.toLocaleString('es-MX', { minimumFractionDigits: 0 })} MXN
            </span>
          </div>
          <span className="text-[9px] text-text-secondary">Sin considerar cargos variables o aumentos.</span>
        </Card>

        {/* Total savings from cancellations */}
        <Card className="p-5 flex flex-col justify-between min-h-[110px] bg-emerald-500/5 border-emerald-500/20">
          <div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Ahorro Mensual Logrado</span>
            <span className="font-heading font-black text-2xl text-emerald-500 mt-1 block">
              +${monthlySavingsTotal.toLocaleString('es-MX', { minimumFractionDigits: 0 })} MXN
            </span>
          </div>
          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">Por suscripciones pausadas o canceladas.</span>
        </Card>
      </div>

      {/* Main Split Grid layouts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LIST OF ALL SUBSCRIPTIONS (LEFT COLUMN) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Card className="p-5">
            <h3 className="font-heading font-bold text-sm text-text-primary mb-4 border-b border-border-primary/25 pb-3.5 select-none">
              Historial de Servicios Registrados ({subscriptions.length})
            </h3>

            {subscriptions.length > 0 ? (
              <div className="flex flex-col divide-y divide-border-primary/45 select-none">
                {subscriptions.map(sub => (
                  <div key={sub.id} className="flex items-center justify-between py-4 hover:bg-surface-secondary/10 rounded-xl px-2">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-9.5 h-9.5 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0 mt-0.5 border border-violet-500/15">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-text-primary truncate">{sub.name}</h4>
                          {getStatusBadge(sub.status)}
                        </div>
                        <p className="text-[10px] text-text-secondary font-semibold mt-0.5 truncate">
                          Plan: {sub.plan} • Cobra el día {sub.billDate} de cada mes ({sub.paymentMethod})
                        </p>
                        {sub.notes && <p className="text-[11px] text-text-secondary mt-1 max-w-sm italic leading-tight break-words">{sub.notes}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-xs font-black text-text-primary block">${sub.price.toLocaleString('es-MX')} MXN</span>
                        <span className="text-[9px] text-text-secondary font-semibold capitalize block mt-0.5">{sub.frequency === 'monthly' ? 'Mensual' : 'Anual'}</span>
                      </div>
                      
                      {/* State actions togglers */}
                      <div className="flex items-center gap-1 ml-1.5">
                        {sub.status === 'active' ? (
                          <button 
                            onClick={() => handleUpdateStatus(sub.id!, 'paused')}
                            className="text-text-secondary hover:text-warning p-1.5 rounded hover:bg-surface-secondary"
                            title="Pausar suscripción"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleUpdateStatus(sub.id!, 'active')}
                            className="text-text-secondary hover:text-success p-1.5 rounded hover:bg-surface-secondary"
                            title="Reactivar / Marcar Activa"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(sub.id!)}
                          className="text-text-secondary hover:text-danger p-1.5 rounded hover:bg-surface-secondary"
                          title="Eliminar registro"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState 
                title="Aún no registras suscripciones"
                description="Lleva una bitácora de tus servicios streaming (Spotify, Netflix, Prime), software o membresías para alertarte antes de tus fechas de cobro."
                icon={<CreditCard className="w-6 h-6" />}
                actionText="Registrar mi primera suscripción"
                onAction={() => setIsAddOpen(true)}
              />
            )}
          </Card>
        </div>

        {/* MOST EXPENSIVE SUBSCRIPTIONS (RIGHT COLUMN) */}
        <div>
          <Card className="p-5 select-none h-full">
            <h3 className="font-heading font-bold text-sm text-text-primary mb-4 border-b border-border-primary/25 pb-3">
              Servicios más costosos (Activos)
            </h3>

            {sortedActiveSubs.length > 0 ? (
              <div className="flex flex-col gap-3">
                {sortedActiveSubs.slice(0, 5).map((sub, idx) => (
                  <div key={sub.id} className="flex items-center justify-between p-3 border border-border-primary/45 rounded-xl hover:bg-surface-secondary/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-text-secondary bg-surface-secondary border border-border-primary/60 w-5.5 h-5.5 rounded-full flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-text-primary">{sub.name}</h4>
                        <span className="text-[10px] text-text-secondary font-semibold">{sub.plan}</span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-text-primary">
                      ${sub.price.toLocaleString('es-MX')} MXN
                      <span className="text-[10px] font-normal text-text-secondary ml-0.5">{sub.frequency === 'monthly' ? '/m' : '/a'}</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-text-secondary flex flex-col items-center">
                <Star className="w-8 h-8 opacity-30 mb-2" />
                <p className="text-xs font-bold">Sin suscripciones activas</p>
                <p className="text-[10px] text-text-secondary/70 mt-0.5">Las suscripciones más caras aparecerán aquí.</p>
              </div>
            )}
          </Card>
        </div>

      </div>

      {/* --- ADD SUBSCRIPTION DIALOG --- */}
      <Dialog
        isOpen={isAddOpen}
        onClose={() => { setIsAddOpen(false); resetForm(); }}
        title="Registrar Cobro de Suscripción"
      >
        <form onSubmit={handleSaveSub} className="flex flex-col gap-4">
          <Input 
            label="Nombre del Servicio *" 
            placeholder="Ej. Netflix / iCloud / Gimnasio"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Nombre del Plan" 
              placeholder="Ej. Premium UHD / 200 GB"
              value={plan}
              onChange={e => setPlan(e.target.value)}
            />
            <Input 
              label="Costo / Tarifa *" 
              type="number"
              placeholder="Ej. 219"
              value={price}
              onChange={e => setPrice(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Select 
              label="Frecuencia"
              value={frequency}
              onChange={e => setFrequency(e.target.value as 'monthly' | 'yearly')}
              options={[
                { value: 'monthly', label: 'Mensual' },
                { value: 'yearly', label: 'Anual' }
              ]}
            />
            <Input 
              label="Día de Cobro (1-31) *" 
              type="number"
              min="1"
              max="31"
              value={billDate}
              onChange={e => setBillDate(e.target.value)}
              required
            />
            <Select 
              label="Estatus"
              value={status}
              onChange={e => setStatus(e.target.value as any)}
              options={[
                { value: 'active', label: 'Activa' },
                { value: 'paused', label: 'Pausada' },
                { value: 'trial', label: 'Prueba Gratuita' }
              ]}
            />
          </div>

          <Select 
            label="Método de Pago"
            value={paymentMethod}
            onChange={e => setPaymentMethod(e.target.value)}
            options={[
              { value: 'Tarjeta de Crédito BBVA', label: 'T. Crédito BBVA' },
              { value: 'Tarjeta de Débito BBVA', label: 'T. Débito BBVA' },
              { value: 'PayPal', label: 'PayPal' },
              { value: 'Apple Pay', label: 'Apple Pay' },
              { value: 'Efectivo', label: 'Efectivo' },
              { value: 'Otros', label: 'Otros' }
            ]}
          />

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-text-secondary font-heading">Notas</label>
            <textarea 
              rows={3}
              placeholder="Ej. Compartido con familiares, cobro automático a tarjeta..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full rounded-xl border border-border-primary bg-surface p-3 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 mt-3 pt-3 border-t border-border-primary/30">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary" size="sm">Registrar Suscripción</Button>
          </div>
        </form>
      </Dialog>

    </div>
  );
};
