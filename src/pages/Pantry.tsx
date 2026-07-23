import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type PantryItemRecord } from '../db/lifeDB';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Dialog } from '../components/ui/Dialog';
import { 
  ShoppingBag, ShoppingCart, AlertTriangle, Plus, 
  Trash2, Check, Package, Utensils, RefreshCw
} from 'lucide-react';

export const Pantry: React.FC = () => {
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState<'inventory' | 'shopping'>('inventory');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Despensa');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('piezas');
  const [expiryDate, setExpiryDate] = useState('');
  const [isLow, setIsLow] = useState(false);

  // Live Query
  const items = useLiveQuery(
    () => db.pantryItems.where('userId').equals(user || 'local_user').toArray(),
    [user]
  );

  if (!items) {
    return (
      <div className="flex flex-col gap-6 animate-pulse p-4">
        <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-1/4" />
        <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
      </div>
    );
  }

  const shoppingList = items.filter(i => i.isLow || i.quantity === 0);

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await db.pantryItems.add({
      userId: user || 'local_user',
      name: name.trim(),
      category,
      quantity: Number(quantity) || 1,
      unit,
      expiryDate: expiryDate || undefined,
      isLow,
      createdAt: new Date().toISOString()
    });

    setName('');
    setQuantity('1');
    setExpiryDate('');
    setIsLow(false);
    setIsAddOpen(false);
  };

  const toggleIsLow = async (item: PantryItemRecord) => {
    if (!item.id) return;
    await db.pantryItems.update(item.id, { isLow: !item.isLow });
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Eliminar este producto?')) {
      await db.pantryItems.delete(id);
    }
  };

  return (
    <div className="flex flex-col gap-6 select-none animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-primary/40 pb-4">
        <div>
          <h2 className="font-heading font-black text-2xl text-text-primary tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-emerald-500" /> Despensa & Lista de Supermercado
          </h2>
          <p className="text-xs text-text-secondary mt-0.5 font-medium">
            Control de insumos del hogar, caducidades y lista de compras interactiva.
          </p>
        </div>

        <Button 
          variant="primary" 
          size="sm" 
          onClick={() => setIsAddOpen(true)}
          className="gap-1.5 text-xs font-bold py-2.5 rounded-xl cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Agregar Producto
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-primary/40 text-xs font-bold gap-2">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2.5 border-b-2 -mb-px transition-colors cursor-pointer ${activeTab === 'inventory' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
        >
          📦 Inventario en Casa ({items.length})
        </button>
        <button
          onClick={() => setActiveTab('shopping')}
          className={`px-4 py-2.5 border-b-2 -mb-px transition-colors cursor-pointer ${activeTab === 'shopping' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
        >
          🛒 Lista para Comprar ({shoppingList.length})
        </button>
      </div>

      {/* 1. INVENTORY TAB */}
      {activeTab === 'inventory' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.length > 0 ? (
            items.map(item => (
              <Card key={item.id} className="p-5 flex flex-col justify-between gap-4 border-border-primary/60 hover:border-emerald-500/30 transition-all">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      {item.category}
                    </span>
                    {item.isLow && (
                      <Badge variant="warning" size="xs">Falta en Súper</Badge>
                    )}
                  </div>

                  <h4 className="font-heading font-black text-base text-text-primary mt-1">{item.name}</h4>
                  
                  <p className="text-xs text-text-secondary font-semibold">
                    Cantidad: <strong className="text-text-primary">{item.quantity} {item.unit}</strong>
                  </p>

                  {item.expiryDate && (
                    <p className="text-xs text-amber-400 font-medium flex items-center gap-1 mt-0.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Caduca: {item.expiryDate}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-border-primary/30 pt-3">
                  <button 
                    onClick={() => item.id && handleDelete(item.id)}
                    className="text-text-secondary hover:text-danger p-1 transition-colors cursor-pointer"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <Button 
                    size="sm" 
                    variant={item.isLow ? 'secondary' : 'outline'}
                    onClick={() => toggleIsLow(item)}
                    className="text-xs font-bold cursor-pointer"
                  >
                    {item.isLow ? 'Quitar del Súper' : '+ Agregar al Súper'}
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-text-secondary flex flex-col items-center">
              <ShoppingBag className="w-10 h-10 opacity-25 mb-2 text-emerald-500" />
              <p className="text-xs font-bold text-text-primary">Tu despensa está vacía</p>
              <p className="text-[11px] text-text-secondary mt-1">Registra productos para monitorear faltantes y caducidades.</p>
            </div>
          )}
        </div>
      )}

      {/* 2. SHOPPING LIST TAB */}
      {activeTab === 'shopping' && (
        <Card className="p-6 flex flex-col gap-4">
          <h3 className="font-heading font-black text-lg text-text-primary flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-500" /> Artículos Faltantes para el Súper
          </h3>

          {shoppingList.length > 0 ? (
            <div className="flex flex-col gap-2">
              {shoppingList.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-surface-secondary/40 p-3 rounded-xl border border-border-primary/30">
                  <span className="text-xs font-bold text-text-primary flex items-center gap-2">
                    <input 
                      type="checkbox"
                      checked={!item.isLow}
                      onChange={() => toggleIsLow(item)}
                      className="rounded accent-emerald-500 border-border-primary w-4 h-4"
                    />
                    {item.name} ({item.quantity} {item.unit})
                  </span>
                  <span className="text-[10px] text-text-secondary uppercase bg-surface-secondary px-2 py-0.5 rounded">
                    {item.category}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-text-secondary">
              <p className="text-xs font-bold text-text-primary">🎉 No tienes ningún producto marcado como faltante.</p>
            </div>
          )}
        </Card>
      )}

      {/* Modal Agregar Producto */}
      <Dialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Agregar Producto a la Despensa"
        size="md"
      >
        <form onSubmit={handleSaveItem} className="flex flex-col gap-4 py-2 select-none">
          <Input 
            label="Nombre del Producto"
            placeholder="Ej. Leche / Café / Detergente"
            value={name}
            onChange={e => setName(e.target.value)}
          />

          <Select 
            label="Categoría"
            value={category}
            onChange={e => setCategory(e.target.value)}
            options={[
              { value: 'Despensa', label: 'Despensa & Alimentos' },
              { value: 'Refrigerador', label: 'Refrigerador & Frescos' },
              { value: 'Limpieza', label: 'Limpieza del Hogar' },
              { value: 'Higiene', label: 'Higiene Personal' }
            ]}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input 
              label="Cantidad"
              type="number"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
            />
            <Input 
              label="Unidad"
              placeholder="piezas, kg, litros"
              value={unit}
              onChange={e => setUnit(e.target.value)}
            />
          </div>

          <Input 
            label="Fecha de Caducidad (Opcional)"
            type="date"
            value={expiryDate}
            onChange={e => setExpiryDate(e.target.value)}
          />

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" type="button" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit">Guardar Producto</Button>
          </div>
        </form>
      </Dialog>

    </div>
  );
};
