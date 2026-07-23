import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type WarrantyRecord } from '../db/lifeDB';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Dialog } from '../components/ui/Dialog';
import { EmptyState } from '../components/ui/EmptyState';
import { 
  Shield, Search, Plus, Calendar, DollarSign, Tag, 
  Trash2, ShieldCheck, ShieldAlert, PhoneCall, HelpCircle, 
  ExternalLink, Clock, AlertTriangle
} from 'lucide-react';

export const Warranties: React.FC = () => {
  const { user } = useApp();
  
  // States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<WarrantyRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Form State
  const [productName, setProductName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [store, setStore] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [price, setPrice] = useState('');
  const [durationMonths, setDurationMonths] = useState('12');
  const [supportContact, setSupportContact] = useState('');
  const [notes, setNotes] = useState('');

  // --- QUERY WARRANTIES ---
  const warranties = useLiveQuery(() => db.warranties.toArray(), []);

  if (!warranties) {
    return (
      <div className="flex flex-col gap-6 animate-pulse p-4">
        <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-1/4" />
        <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
      </div>
    );
  }

  // --- FILTER LOGIC ---
  const filteredWarranties = warranties.filter(war => {
    // 1. Status Filter
    if (selectedStatus !== 'All' && war.status !== selectedStatus) return false;

    // 2. Search query filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = war.productName.toLowerCase().includes(q);
      const matchBrand = war.brand.toLowerCase().includes(q);
      const matchStore = war.store.toLowerCase().includes(q);
      return matchName || matchBrand || matchStore;
    }

    return true;
  });

  // --- DURATION HELPER ---
  const calculateExpiry = (dateStr: string, months: number): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    date.setMonth(date.getMonth() + Number(months));
    return date.toISOString().split('T')[0];
  };

  // --- SAVE WARRANTY ---
  const handleSaveWarranty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() || !purchaseDate || !price) return;

    const months = Number(durationMonths);
    const calculatedExpiryDate = calculateExpiry(purchaseDate, months);
    
    // Determine status initially
    const now = new Date();
    const expiry = new Date(calculatedExpiryDate);
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    let initialStatus: WarrantyRecord['status'] = 'active';
    if (expiry < now) {
      initialStatus = 'expired';
    } else if (expiry <= thirtyDaysFromNow) {
      initialStatus = 'expiring';
    }

    const newWarranty: WarrantyRecord = {
      userId: user || 'local_user',
      productName,
      brand,
      model: model || undefined,
      serialNumber: serialNumber || undefined,
      store,
      purchaseDate,
      price: Number(price),
      durationMonths: months,
      expiryDate: calculatedExpiryDate,
      supportContact: supportContact || undefined,
      notes: notes || undefined,
      status: initialStatus,
      createdAt: new Date().toISOString()
    };

    await db.warranties.add(newWarranty);

    // Log Activity
    await db.activities.add({
      userId: user || 'local_user',
      action: 'created',
      module: 'warranties',
      details: `Se registró la garantía de "${productName}" (${brand}) por ${durationMonths} meses.`,
      date: new Date().toISOString()
    });

    // Reset Form & Close
    resetForm();
    setIsAddOpen(false);
  };

  const resetForm = () => {
    setProductName('');
    setBrand('');
    setModel('');
    setSerialNumber('');
    setStore('');
    setPurchaseDate('');
    setPrice('');
    setDurationMonths('12');
    setSupportContact('');
    setNotes('');
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Estás seguro de eliminar esta garantía?')) {
      await db.warranties.delete(id);
      setIsDetailOpen(false);
      
      // Log activity
      await db.activities.add({
        userId: user || 'local_user',
        action: 'deleted',
        module: 'warranties',
        details: `Se eliminó un registro de garantía.`,
        date: new Date().toISOString()
      });
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: WarrantyRecord['status']) => {
    await db.warranties.update(id, { status: newStatus });
    if (selectedWarranty) {
      setSelectedWarranty({ ...selectedWarranty, status: newStatus });
    }
  };

  const getStatusBadge = (status: WarrantyRecord['status']) => {
    switch (status) {
      case 'active': return <Badge variant="success" size="xs">Activa</Badge>;
      case 'expiring': return <Badge variant="warning" size="xs">Próxima a vencer</Badge>;
      case 'expired': return <Badge variant="danger" size="xs">Vencida</Badge>;
      case 'claim': return <Badge variant="brand" size="xs">En reclamación</Badge>;
      case 'replaced': return <Badge variant="success" size="xs">Reemplazada</Badge>;
      case 'closed': return <Badge variant="neutral" size="xs">Cerrada</Badge>;
      default: return <Badge variant="neutral" size="xs">{status}</Badge>;
    }
  };

  const getDaysRemaining = (expiryDateStr: string) => {
    const expiry = new Date(expiryDateStr);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="flex flex-col gap-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading font-black text-2xl text-text-primary tracking-tight">Garantías de Productos</h2>
          <p className="text-xs text-text-secondary font-medium mt-0.5">Controla la protección de tus electrodomésticos, equipos de tecnología y compras.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsAddOpen(true)} className="gap-1.5 self-start sm:self-center rounded-xl">
          <Plus className="w-4 h-4" /> Registrar Compra
        </Button>
      </div>

      {/* Filter and Search Actions */}
      <div className="flex flex-col sm:flex-row gap-3 select-none">
        <div className="flex-1 relative flex items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-text-secondary" />
          <Input 
            placeholder="Buscar por producto, marca, tienda..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 py-2.5 text-xs" 
          />
        </div>

        <Select 
          value={selectedStatus} 
          onChange={e => setSelectedStatus(e.target.value)}
          options={[
            { value: 'All', label: 'Todos los estados' },
            { value: 'active', label: 'Activas' },
            { value: 'expiring', label: 'Próximas a vencer' },
            { value: 'expired', label: 'Vencidas' },
            { value: 'claim', label: 'En reclamación' }
          ]}
          className="py-2 text-xs w-[180px]"
        />
      </div>

      {/* Grid List */}
      {filteredWarranties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredWarranties.map(war => {
            const daysLeft = getDaysRemaining(war.expiryDate);
            return (
              <Card 
                key={war.id} 
                hoverable 
                onClick={() => { setSelectedWarranty(war); setIsDetailOpen(true); }}
                className="p-5 flex flex-col justify-between h-48 relative overflow-hidden group"
              >
                <div>
                  <div className="flex items-start justify-between select-none">
                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">{war.brand}</span>
                    {getStatusBadge(war.status)}
                  </div>
                  <h4 className="font-heading font-bold text-sm text-text-primary mt-1.5 line-clamp-1 group-hover:text-brand transition-colors">{war.productName}</h4>
                  <p className="text-[10px] text-text-secondary mt-1 font-medium">{war.store} • Adquirido el {war.purchaseDate}</p>
                </div>

                <div className="border-t border-border-primary/20 pt-3 mt-4 flex items-center justify-between text-xs select-none">
                  <div>
                    <span className="text-text-secondary block text-[10px]">Costo de compra</span>
                    <span className="font-bold text-text-primary mt-0.5 block">${war.price.toLocaleString('es-MX')} MXN</span>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-text-secondary block text-[10px]">Límite de póliza</span>
                    {war.status === 'expired' ? (
                      <span className="font-bold text-danger mt-0.5 block">Expiró</span>
                    ) : (
                      <span className={`font-bold mt-0.5 block ${daysLeft <= 30 ? 'text-warning' : 'text-success'}`}>
                        {daysLeft} días restantes
                      </span>
                    )}
                  </div>
                </div>

              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState 
          title="Aún no tienes garantías registradas"
          description="Añade tus dispositivos, teléfonos, laptops o electrodomésticos para saber con precisión cuándo vence su póliza de soporte oficial."
          icon={<Shield className="w-6 h-6" />}
          actionText="Registrar mi primera garantía"
          onAction={() => setIsAddOpen(true)}
        />
      )}

      {/* --- MODAL DIALOGS --- */}

      {/* 1. ADD WARRANTY DIALOG */}
      <Dialog 
        isOpen={isAddOpen} 
        onClose={() => { setIsAddOpen(false); resetForm(); }}
        title="Registrar Garantía de Producto"
      >
        <form onSubmit={handleSaveWarranty} className="flex flex-col gap-4">
          <Input 
            label="Nombre del Producto *" 
            placeholder="Ej. Smart TV LG 55"
            value={productName}
            onChange={e => setProductName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Marca *" 
              placeholder="Ej. LG"
              value={brand}
              onChange={e => setBrand(e.target.value)}
              required
            />
            <Input 
              label="Modelo" 
              placeholder="Ej. OLED-55CX"
              value={model}
              onChange={e => setModel(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input 
              label="Precio de Compra *" 
              type="number"
              placeholder="Ej. 12999"
              value={price}
              onChange={e => setPrice(e.target.value)}
              required
            />
            <Input 
              label="Fecha de Compra *" 
              type="date"
              value={purchaseDate}
              onChange={e => setPurchaseDate(e.target.value)}
              required
            />
            <Select 
              label="Duración (Meses)"
              value={durationMonths}
              onChange={e => setDurationMonths(e.target.value)}
              options={[
                { value: '3', label: '3 Meses' },
                { value: '6', label: '6 Meses' },
                { value: '12', label: '1 Año' },
                { value: '24', label: '2 Años' },
                { value: '36', label: '3 Años' },
                { value: '60', label: '5 Años' }
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Establecimiento / Tienda" 
              placeholder="Ej. Liverpool / Amazon"
              value={store}
              onChange={e => setStore(e.target.value)}
            />
            <Input 
              label="Número de Serie" 
              placeholder="Ej. S/N 87123A"
              value={serialNumber}
              onChange={e => setSerialNumber(e.target.value)}
            />
          </div>

          <Input 
            label="Contacto Soporte / Reclamos" 
            placeholder="Ej. 01 800 123 4567 / soporte@lg.com"
            value={supportContact}
            onChange={e => setSupportContact(e.target.value)}
          />

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-text-secondary font-heading">Notas o Condiciones especiales</label>
            <textarea 
              rows={3}
              placeholder="Ej. No cubre daños por derrame de líquidos..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full rounded-xl border border-border-primary bg-surface p-3 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 mt-3 pt-3 border-t border-border-primary/30">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary" size="sm">Registrar Garantía</Button>
          </div>
        </form>
      </Dialog>

      {/* 2. WARRANTY DETAIL DIALOG */}
      <Dialog
        isOpen={isDetailOpen}
        onClose={() => { setIsDetailOpen(false); setSelectedWarranty(null); }}
        title={selectedWarranty?.productName || ''}
      >
        {selectedWarranty && (
          <div className="flex flex-col gap-5">
            {/* Status alerts */}
            {selectedWarranty.status === 'expired' && (
              <div className="p-3 bg-danger-light border border-danger/10 text-danger rounded-xl flex items-center gap-2 text-xs font-bold">
                <ShieldAlert className="w-4.5 h-4.5" /> Póliza Expirada. Este artículo ya no cuenta con soporte técnico oficial.
              </div>
            )}
            
            {selectedWarranty.status === 'expiring' && (
              <div className="p-3 bg-warning-light border border-warning/10 text-warning rounded-xl flex items-center gap-2 text-xs font-bold animate-pulse-slow">
                <ShieldCheck className="w-4.5 h-4.5" /> ¡Garantía por vencer! Quedan menos de 30 días para reportar fallas de fábrica.
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-xs select-none">
              <div className="bg-surface-secondary/40 p-3 rounded-xl border border-border-primary/30">
                <span className="text-text-secondary font-semibold block">Marca y Modelo</span>
                <span className="font-bold text-text-primary mt-1 block">{selectedWarranty.brand} {selectedWarranty.model || ''}</span>
              </div>
              <div className="bg-surface-secondary/40 p-3 rounded-xl border border-border-primary/30">
                <span className="text-text-secondary font-semibold block">Lugar de Compra</span>
                <span className="font-bold text-text-primary mt-1 block">{selectedWarranty.store}</span>
              </div>
              <div className="bg-surface-secondary/40 p-3 rounded-xl border border-border-primary/30">
                <span className="text-text-secondary font-semibold block">Número de Serie</span>
                <span className="font-bold text-text-primary mt-1 block select-all">{selectedWarranty.serialNumber || 'No registrado'}</span>
              </div>
              <div className="bg-surface-secondary/40 p-3 rounded-xl border border-border-primary/30">
                <span className="text-text-secondary font-semibold block">Monto Compra</span>
                <span className="font-bold text-text-primary mt-1 block">${selectedWarranty.price.toLocaleString('es-MX')} MXN</span>
              </div>
              <div className="bg-surface-secondary/40 p-3 rounded-xl border border-border-primary/30">
                <span className="text-text-secondary font-semibold block">Fecha de Compra</span>
                <span className="font-bold text-text-primary mt-1 block">{selectedWarranty.purchaseDate}</span>
              </div>
              <div className="bg-surface-secondary/40 p-3 rounded-xl border border-border-primary/30">
                <span className="text-text-secondary font-semibold block">Expiración Oficial</span>
                <span className="font-bold text-text-primary mt-1 block">{selectedWarranty.expiryDate} ({selectedWarranty.durationMonths} meses)</span>
              </div>
            </div>

            {selectedWarranty.notes && (
              <div className="bg-surface-secondary/25 p-4 border border-border-primary/45 rounded-xl text-xs leading-relaxed select-none">
                <span className="font-bold text-text-secondary block mb-1">Notas de Cobertura</span>
                <p className="text-text-primary">{selectedWarranty.notes}</p>
              </div>
            )}

            {/* Claims workflow timeline simulator */}
            <div className="border border-border-primary/60 rounded-xl p-4.5 select-none bg-surface-secondary/10">
              <span className="text-xs font-bold text-text-secondary block mb-3">Línea de Tiempo de Soporte</span>
              
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">Estatus de Reclamaciones</span>
                  {getStatusBadge(selectedWarranty.status)}
                </div>
                
                {/* State action triggers */}
                <div className="flex flex-wrap gap-2.5 mt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleUpdateStatus(selectedWarranty.id!, 'claim')}
                    disabled={selectedWarranty.status === 'claim'}
                    className="text-[10px] font-bold py-1.5 rounded-lg"
                  >
                    Iniciar Reclamación / Reportar Falla
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleUpdateStatus(selectedWarranty.id!, 'replaced')}
                    disabled={selectedWarranty.status === 'replaced'}
                    className="text-[10px] font-bold py-1.5 rounded-lg border-success/35 text-success hover:bg-success-light"
                  >
                    Artículo Reemplazado
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleUpdateStatus(selectedWarranty.id!, 'active')}
                    disabled={selectedWarranty.status === 'active'}
                    className="text-[10px] font-bold py-1.5 rounded-lg"
                  >
                    Marcar Activa
                  </Button>
                </div>
              </div>
            </div>

            {/* Contact details */}
            {selectedWarranty.supportContact && (
              <div className="flex items-center justify-between p-3.5 border border-border-primary/60 rounded-xl bg-surface select-none">
                <div className="flex items-center gap-2.5">
                  <div className="w-8.5 h-8.5 bg-brand-light text-brand rounded-lg flex items-center justify-center">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-text-secondary block font-semibold">Contacto de Soporte</span>
                    <span className="text-xs font-bold text-text-primary select-all">{selectedWarranty.supportContact}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Actions toolbar */}
            <div className="flex items-center justify-between border-t border-border-primary/30 pt-4 mt-2">
              <Button 
                variant="danger" 
                size="sm" 
                onClick={() => handleDelete(selectedWarranty.id!)}
                className="gap-1.5 text-xs font-bold"
              >
                <Trash2 className="w-4.5 h-4.5" /> Eliminar Garantía
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsDetailOpen(false)}>Cerrar</Button>
            </div>

          </div>
        )}
      </Dialog>

    </div>
  );
};
