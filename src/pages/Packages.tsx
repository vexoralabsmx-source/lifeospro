import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type PackageRecord } from '../db/lifeDB';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Dialog } from '../components/ui/Dialog';
import { EmptyState } from '../components/ui/EmptyState';
import { 
  Package, Search, Plus, Calendar, Tag, Trash2, 
  ExternalLink, Clock, Truck, ChevronRight
} from 'lucide-react';

export const Packages: React.FC = () => {
  const { user } = useApp();
  
  // States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form State - Add Package
  const [name, setName] = useState('');
  const [store, setStore] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courier, setCourier] = useState('DHL');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [eta, setEta] = useState('');
  const [price, setPrice] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<PackageRecord['status']>('ordered');

  // --- QUERY PACKAGES ---
  const packages = useLiveQuery(() => db.packages.toArray(), []);

  if (!packages) {
    return (
      <div className="flex flex-col gap-6 animate-pulse p-4">
        <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-1/4" />
        <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
      </div>
    );
  }

  // --- FILTER LOGIC ---
  const filteredPackages = packages.filter(pkg => {
    // 1. Status Filter
    if (selectedStatus !== 'All' && pkg.status !== selectedStatus) return false;

    // 2. Search query filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = pkg.name.toLowerCase().includes(q);
      const matchStore = pkg.store ? pkg.store.toLowerCase().includes(q) : false;
      const matchTracking = pkg.trackingNumber && pkg.trackingNumber.toLowerCase().includes(q);
      return matchName || matchStore || matchTracking;
    }

    return true;
  });

  // --- SAVE PACKAGE ---
  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !store.trim()) return;

    const newPkg: PackageRecord = {
      userId: user || 'local_user',
      name,
      store,
      trackingNumber: trackingNumber || undefined,
      courier: courier || undefined,
      purchaseDate,
      eta: eta || undefined,
      status,
      price: price ? Number(price) : undefined,
      trackingUrl: trackingUrl || undefined,
      notes: notes || undefined,
      createdAt: new Date().toISOString()
    };

    await db.packages.add(newPkg);

    // Log Activity
    await db.activities.add({
      userId: user || 'local_user',
      action: 'created',
      module: 'packages',
      details: `Se registró el pedido "${name}" de ${store}.`,
      date: new Date().toISOString()
    });

    // Reset Form & Close
    resetForm();
    setIsAddOpen(false);
  };

  const resetForm = () => {
    setName('');
    setStore('');
    setTrackingNumber('');
    setCourier('DHL');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setEta('');
    setPrice('');
    setTrackingUrl('');
    setNotes('');
    setStatus('ordered');
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Estás seguro de eliminar este paquete?')) {
      await db.packages.delete(id);
      
      // Log activity
      await db.activities.add({
        userId: user || 'local_user',
        action: 'deleted',
        module: 'packages',
        details: `Se eliminó un registro de paquete.`,
        date: new Date().toISOString()
      });
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: PackageRecord['status']) => {
    await db.packages.update(id, { status: newStatus });
    
    // Log Activity
    await db.activities.add({
      userId: user || 'local_user',
      action: 'updated',
      module: 'packages',
      details: `Se actualizó el estado del paquete a: ${newStatus}`,
      date: new Date().toISOString()
    });
  };

  const getStatusBadge = (s: PackageRecord['status']) => {
    switch (s) {
      case 'ordered': return <Badge variant="neutral" size="xs">Pedido</Badge>;
      case 'preparing': return <Badge variant="warning" size="xs">Preparando</Badge>;
      case 'shipped': return <Badge variant="brand" size="xs">Enviado</Badge>;
      case 'transit': return <Badge variant="brand" size="xs">En Tránsito</Badge>;
      case 'delivery': return <Badge variant="success" size="xs">En Reparto</Badge>;
      case 'delivered': return <Badge variant="success" size="xs">Entregado</Badge>;
      case 'delayed': return <Badge variant="danger" size="xs">Retrasado</Badge>;
      case 'returned': return <Badge variant="warning" size="xs">Devuelto</Badge>;
      case 'cancelled': return <Badge variant="danger" size="xs">Cancelado</Badge>;
      default: return <Badge variant="neutral" size="xs">{s}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading font-black text-2xl text-text-primary tracking-tight">Rastreo de Paquetes</h2>
          <p className="text-xs text-text-secondary font-medium mt-0.5">Controla de forma manual tus envíos y entregas de compras en línea.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsAddOpen(true)} className="gap-1.5 self-start sm:self-center rounded-xl">
          <Plus className="w-4 h-4" /> Agregar Pedido
        </Button>
      </div>

      {/* Filter and Search Actions */}
      <div className="flex flex-col sm:flex-row gap-3 select-none animate-slide-up">
        <div className="flex-1 relative flex items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-text-secondary" />
          <Input 
            placeholder="Buscar por nombre de pedido, tienda, número de guía..." 
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
            { value: 'ordered', label: 'Pedidos' },
            { value: 'preparing', label: 'Preparación' },
            { value: 'transit', label: 'En tránsito' },
            { value: 'delivery', label: 'En reparto' },
            { value: 'delivered', label: 'Entregados' }
          ]}
          className="py-2 text-xs w-[180px]"
        />
      </div>

      {/* Grid Cards lists */}
      {filteredPackages.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-slide-up select-none">
          {filteredPackages.map(pkg => (
            <Card key={pkg.id} className="p-5 flex flex-col justify-between h-48 relative overflow-hidden group">
              <div>
                <div className="flex items-start justify-between">
                  <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">{pkg.courier || 'Envío'} • {pkg.store}</span>
                  {getStatusBadge(pkg.status)}
                </div>
                
                <h4 className="font-heading font-bold text-sm text-text-primary mt-2 line-clamp-1 group-hover:text-brand transition-colors">{pkg.name}</h4>
                <p className="text-[10px] text-text-secondary mt-1 font-semibold">
                  {pkg.trackingNumber ? `Guía: ${pkg.trackingNumber}` : 'Sin guía registrada'}
                </p>
              </div>

              {/* Package Details Info */}
              <div className="border-t border-border-primary/20 pt-3 mt-4 flex items-center justify-between text-xs">
                <div>
                  <span className="text-text-secondary block text-[10px]">Fecha de Compra</span>
                  <span className="font-bold text-text-primary mt-0.5 block">{pkg.purchaseDate}</span>
                </div>

                <div className="text-right">
                  <span className="text-text-secondary block text-[10px]">Entrega Estimada</span>
                  <span className="font-bold text-text-primary mt-0.5 block">{pkg.eta || 'Pendiente'}</span>
                </div>
              </div>

              {/* Drawer actions button */}
              <div className="absolute right-4 bottom-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-surface dark:bg-surface pl-2">
                {pkg.trackingUrl && (
                  <a 
                    href={pkg.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg border border-border-primary/50 text-brand hover:bg-surface-secondary text-xs flex items-center gap-1 font-bold"
                  >
                    Rastrear <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                
                {/* State quick switcher */}
                <select 
                  value={pkg.status}
                  onChange={e => handleUpdateStatus(pkg.id!, e.target.value as any)}
                  className="py-1 px-2 text-[10px] font-bold border border-border-primary/60 rounded-lg bg-surface text-text-primary outline-none focus:ring-1 focus:ring-brand"
                >
                  <option value="preparing">Preparando</option>
                  <option value="transit">Tránsito</option>
                  <option value="delivery">Reparto</option>
                  <option value="delivered">Entregado</option>
                  <option value="delayed">Retrasado</option>
                </select>

                <button 
                  onClick={() => handleDelete(pkg.id!)}
                  className="text-text-secondary hover:text-danger p-1.5 rounded hover:bg-surface-secondary"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState 
          title="Aún no tienes paquetes en rastreo"
          description="Añade tus compras en línea y mantén un ojo en las fechas estimadas de entrega, transportistas e información de tus guías de forma manual."
          icon={<Package className="w-6 h-6" />}
          actionText="Agregar mi primer pedido"
          onAction={() => setIsAddOpen(true)}
        />
      )}

      {/* --- ADD PACKAGE DIALOG --- */}
      <Dialog
        isOpen={isAddOpen}
        onClose={() => { setIsAddOpen(false); resetForm(); }}
        title="Registrar Paquete / Pedido"
      >
        <form onSubmit={handleSavePackage} className="flex flex-col gap-4">
          <Input 
            label="Nombre del Pedido *" 
            placeholder="Ej. Tenis Nike Air / Suéter lana"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Tienda / Establecimiento *" 
              placeholder="Ej. Amazon MX / Zara"
              value={store}
              onChange={e => setStore(e.target.value)}
              required
            />
            <Input 
              label="Fecha de Compra *" 
              type="date"
              value={purchaseDate}
              onChange={e => setPurchaseDate(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input 
              label="Número de Guía" 
              placeholder="Ej. DHL998812A"
              value={trackingNumber}
              onChange={e => setTrackingNumber(e.target.value)}
            />
            <Select 
              label="Paquetería"
              value={courier}
              onChange={e => setCourier(e.target.value)}
              options={[
                { value: 'DHL', label: 'DHL' },
                { value: 'FedEx', label: 'FedEx' },
                { value: 'Estafeta', label: 'Estafeta' },
                { value: 'Amazon Envíos', label: 'Amazon Envíos' },
                { value: 'Mercado Envíos', label: 'Mercado Envíos' },
                { value: 'RedPack', label: 'RedPack' },
                { value: 'UPS', label: 'UPS' }
              ]}
            />
            <Input 
              label="Precio (Opcional)" 
              type="number"
              placeholder="Ej. 1299"
              value={price}
              onChange={e => setPrice(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Entrega Estimada (ETA)" 
              type="date"
              value={eta}
              onChange={e => setEta(e.target.value)}
            />
            <Select 
              label="Estado Actual"
              value={status}
              onChange={e => setStatus(e.target.value as any)}
              options={[
                { value: 'ordered', label: 'Pedido Realizado' },
                { value: 'preparing', label: 'Preparación' },
                { value: 'transit', label: 'En tránsito / Camino' },
                { value: 'delivery', label: 'En reparto hoy' }
              ]}
            />
          </div>

          <Input 
            label="Enlace de Seguimiento Oficial (URL)" 
            placeholder="Ej. https://www.dhl.com/track?num=..."
            value={trackingUrl}
            onChange={e => setTrackingUrl(e.target.value)}
          />

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-text-secondary font-heading">Notas</label>
            <textarea 
              rows={3}
              placeholder="Añade detalles del contenido, lugar de recolección..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full rounded-xl border border-border-primary bg-surface p-3 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 mt-3 pt-3 border-t border-border-primary/30">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary" size="sm">Registrar Pedido</Button>
          </div>
        </form>
      </Dialog>

    </div>
  );
};
