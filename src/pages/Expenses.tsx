import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ExpenseRecord } from '../db/lifeDB';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Dialog } from '../components/ui/Dialog';
import { EmptyState } from '../components/ui/EmptyState';
import { 
  DollarSign, Plus, Search, Calendar, Tag, Trash2, 
  Download, ArrowUpRight, TrendingUp, Filter, AlertCircle
} from 'lucide-react';

export const Expenses: React.FC = () => {
  const { user } = useApp();
  
  // States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [monthlyBudgetLimit, setMonthlyBudgetLimit] = useState<number>(() => {
    return Number(localStorage.getItem('lifeos_budget_limit') || '8000');
  });
  const [isBudgetEditing, setIsBudgetEditing] = useState(false);
  const [newBudgetVal, setNewBudgetVal] = useState(monthlyBudgetLimit.toString());

  // Form State - Add Expense
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Comida');
  const [paymentMethod, setPaymentMethod] = useState('Tarjeta de Débito');
  const [merchant, setMerchant] = useState('');
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);

  // --- QUERY EXPENSES ---
  const expenses = useLiveQuery(() => db.expenses.toArray(), []);

  if (!expenses) {
    return (
      <div className="flex flex-col gap-6 animate-pulse p-4">
        <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-1/4" />
        <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
      </div>
    );
  }

  // --- STATS & CALCULATIONS ---
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Current month's ledger
  const currentMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const currentMonthTotal = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Last month's ledger
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const lastMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
  });
  const lastMonthTotal = lastMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Compare rates
  const diffPercent = lastMonthTotal > 0 
    ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 
    : 0;

  // Filter list matching search query and categories
  const filteredExpenses = expenses.filter(e => {
    if (selectedCategory !== 'All' && e.category !== selectedCategory) return false;
    
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchMerchant = e.merchant.toLowerCase().includes(q);
      const matchDesc = e.description && e.description.toLowerCase().includes(q);
      const matchTags = e.tags && e.tags.some(t => t.toLowerCase().includes(q));
      return matchMerchant || matchDesc || matchTags;
    }
    return true;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Category Colors Definition
  const categoryColors: Record<string, string> = {
    Comida: '#EF4444',
    Transporte: '#3B82F6',
    Hogar: '#10B981',
    Servicios: '#F59E0B',
    Educación: '#8B5CF6',
    Salud: '#EC4899',
    Vehículo: '#6366F1',
    Entretenimiento: '#F43F5E',
    Compras: '#06B6D4',
    Suscripciones: '#14B8A6',
    Otros: '#6B7280'
  };

  // Group by category for SVG chart
  const categorySpendGroup = currentMonthExpenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  const categorySegments = Object.entries(categorySpendGroup)
    .map(([cat, total]) => ({
      name: cat,
      amount: total,
      color: categoryColors[cat] || '#6B7280',
      percent: currentMonthTotal > 0 ? (total / currentMonthTotal) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  // --- SAVE EXPENSE ---
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !date || !merchant.trim()) return;

    const tags = tagInput.split(',').map(t => t.trim()).filter(t => t !== '');

    const newExpense: ExpenseRecord = {
      userId: user || 'local_user',
      amount: Number(amount),
      date,
      category,
      paymentMethod,
      merchant,
      description: description || undefined,
      tags,
      isRecurring,
      createdAt: new Date().toISOString()
    };

    await db.expenses.add(newExpense);

    // Log Activity
    await db.activities.add({
      userId: user || 'local_user',
      action: 'created',
      module: 'expenses',
      details: `Se registró un gasto de $${Number(amount)} MXN en "${merchant}" (${category}).`,
      date: new Date().toISOString()
    });

    // Reset Form & Close
    resetForm();
    setIsAddOpen(false);
  };

  const resetForm = () => {
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setCategory('Comida');
    setPaymentMethod('Tarjeta de Débito');
    setMerchant('');
    setDescription('');
    setTagInput('');
    setIsRecurring(false);
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Estás seguro de eliminar este gasto?')) {
      await db.expenses.delete(id);
      
      // Log Activity
      await db.activities.add({
        userId: user || 'local_user',
        action: 'deleted',
        module: 'expenses',
        details: `Se eliminó un registro de gasto.`,
        date: new Date().toISOString()
      });
    }
  };

  // --- CSV DATA EXPORT ---
  const handleExportCSV = () => {
    const headers = ['ID', 'Fecha', 'Establecimiento', 'Monto (MXN)', 'Categoría', 'Método Pago', 'Frecuencia', 'Descripción'];
    const rows = filteredExpenses.map(e => [
      e.id,
      e.date,
      `"${e.merchant.replace(/"/g, '""')}"`,
      e.amount,
      e.category,
      e.paymentMethod,
      e.isRecurring ? 'Recurrente' : 'Único',
      `"${(e.description || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `LifeOS_Gastos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- BUDGET UPDATE ---
  const handleSaveBudget = () => {
    const val = Number(newBudgetVal);
    if (isNaN(val) || val <= 0) return;
    setMonthlyBudgetLimit(val);
    localStorage.setItem('lifeos_budget_limit', val.toString());
    setIsBudgetEditing(false);
  };

  const isBudgetExceeded = currentMonthTotal > monthlyBudgetLimit;

  return (
    <div className="flex flex-col gap-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading font-black text-2xl text-text-primary tracking-tight">Registro de Gastos</h2>
          <p className="text-xs text-text-secondary font-medium mt-0.5">Controla tu presupuesto personal agregando consumos y compras cotidianas.</p>
        </div>
        <div className="flex gap-2 self-start sm:self-center">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="text-xs font-bold gap-1 rounded-xl">
            <Download className="w-4 h-4" /> Exportar CSV
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsAddOpen(true)} className="gap-1.5 text-xs font-bold rounded-xl">
            <Plus className="w-4 h-4" /> Registrar Gasto
          </Button>
        </div>
      </div>

      {/* Finance totals & budget tracking widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 select-none">
        
        {/* Total current month */}
        <Card className="p-5 flex flex-col justify-between min-h-[120px]">
          <div>
            <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Monto Total del Mes</span>
            <span className="font-heading font-black text-2xl text-text-primary mt-1 block">
              ${currentMonthTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
            </span>
          </div>
          <p className="text-[10px] text-text-secondary flex items-center gap-1 mt-2">
            <TrendingUp className="w-3.5 h-3.5" /> 
            {diffPercent > 0 
              ? `Un ${diffPercent.toFixed(0)}% más que el mes pasado ($${lastMonthTotal.toLocaleString()})`
              : diffPercent < 0 
                ? `Un ${Math.abs(diffPercent).toFixed(0)}% menos que el mes pasado ($${lastMonthTotal.toLocaleString()})`
                : 'Igual que el mes pasado.'
            }
          </p>
        </Card>

        {/* Budget Limit Tracker */}
        <Card className={`p-5 flex flex-col justify-between min-h-[120px] ${isBudgetExceeded ? 'border-danger/30 bg-danger-light/10' : ''}`}>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Presupuesto Mensual</span>
              {isBudgetEditing ? (
                <div className="flex gap-1.5 mt-1">
                  <Input 
                    type="number" 
                    value={newBudgetVal} 
                    onChange={e => setNewBudgetVal(e.target.value)} 
                    className="py-1 text-xs w-[100px]"
                  />
                  <Button size="sm" className="px-2.5 py-1" onClick={handleSaveBudget}>Ok</Button>
                </div>
              ) : (
                <span 
                  onClick={() => setIsBudgetEditing(true)}
                  className="font-heading font-black text-2xl text-text-primary mt-1 block cursor-pointer hover:text-brand transition-colors"
                >
                  ${monthlyBudgetLimit.toLocaleString()} MXN
                </span>
              )}
            </div>
            
            {isBudgetExceeded && (
              <Badge variant="danger" size="xs">Límite excedido</Badge>
            )}
          </div>
          
          <div className="mt-2.5">
            <div className="w-full bg-border-primary/50 h-1.5 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${isBudgetExceeded ? 'bg-danger' : 'bg-brand'}`} 
                style={{ width: `${Math.min(100, (currentMonthTotal / monthlyBudgetLimit) * 100)}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Category count */}
        <Card className="p-5 flex flex-col justify-between min-h-[120px]">
          <div>
            <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Transacciones del Mes</span>
            <span className="font-heading font-black text-2xl text-text-primary mt-1 block">
              {currentMonthExpenses.length} <span className="text-xs text-text-secondary font-bold">movimientos</span>
            </span>
          </div>
          <span className="text-[10px] text-text-secondary mt-2">Promedio diario: ${(currentMonthTotal / 30).toFixed(0)} MXN</span>
        </Card>

      </div>

      {/* Segmented Horizontal SVG Category chart */}
      {currentMonthExpenses.length > 0 && (
        <Card className="p-5 select-none">
          <h3 className="font-heading font-bold text-xs text-text-secondary uppercase tracking-wider mb-4.5">
            Distribución de Gastos por Categoría
          </h3>
          
          {/* Custom SVG Horizontal Multi-segmented Bar */}
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-6 rounded-xl overflow-hidden flex mb-6">
            {categorySegments.map((segment) => (
              <div 
                key={segment.name}
                className="h-full hover:brightness-110 active:brightness-95 transition-all"
                style={{
                  width: `${segment.percent}%`,
                  backgroundColor: segment.color
                }}
                title={`${segment.name}: $${segment.amount.toLocaleString()} MXN (${segment.percent.toFixed(1)}%)`}
              />
            ))}
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {categorySegments.map((segment) => (
              <div key={segment.name} className="flex items-start gap-2 p-2 rounded-xl bg-surface-secondary/20 border border-border-primary/20">
                <div className="w-3.5 h-3.5 rounded-md mt-0.5 shrink-0" style={{ backgroundColor: segment.color }} />
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-text-primary block truncate">{segment.name}</span>
                  <span className="text-[11px] font-black text-text-secondary block mt-0.5">
                    ${segment.amount.toLocaleString()} <span className="text-[9px] font-normal">({segment.percent.toFixed(0)}%)</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Ledger lists & Filters actions */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-b border-border-primary/20 pb-4 mb-4 select-none">
          <h3 className="font-heading font-bold text-sm text-text-primary flex items-center gap-2">
            Historial de Movimientos
          </h3>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="flex-1 sm:flex-initial relative flex items-center">
              <Search className="absolute left-3 w-3.5 h-3.5 text-text-secondary" />
              <Input 
                placeholder="Buscar movimiento..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 py-1.5 text-xs placeholder:text-text-secondary/50 w-full sm:w-[180px]" 
              />
            </div>
            
            <Select 
              value={selectedCategory} 
              onChange={e => setSelectedCategory(e.target.value)}
              options={[
                { value: 'All', label: 'Categorías' },
                { value: 'Comida', label: 'Comida' },
                { value: 'Transporte', label: 'Transporte' },
                { value: 'Hogar', label: 'Hogar' },
                { value: 'Servicios', label: 'Servicios' },
                { value: 'Educación', label: 'Educación' },
                { value: 'Salud', label: 'Salud' },
                { value: 'Vehículo', label: 'Vehículos' },
                { value: 'Entretenimiento', label: 'Entretenimiento' },
                { value: 'Compras', label: 'Compras' },
                { value: 'Suscripciones', label: 'Suscripciones' },
                { value: 'Otros', label: 'Otros' }
              ]}
              className="py-1 text-xs w-[120px]"
            />
          </div>
        </div>

        {/* Ledger logs loop */}
        {filteredExpenses.length > 0 ? (
          <div className="flex flex-col divide-y divide-border-primary/45 select-none">
            {filteredExpenses.map(exp => (
              <div key={exp.id} className="flex items-center justify-between py-3.5 hover:bg-surface-secondary/10 transition-colors rounded-xl px-2">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold text-xs uppercase text-white mt-0.5" style={{ backgroundColor: categoryColors[exp.category] || '#6B7280' }}>
                    {exp.category[0]}
                  </div>
                  
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-text-primary truncate">{exp.merchant}</h4>
                    <p className="text-[10px] text-text-secondary font-semibold mt-0.5">
                      {exp.date} • {exp.paymentMethod} {exp.isRecurring && ' • Recurrente'}
                    </p>
                    {exp.description && <p className="text-[11px] text-text-secondary mt-1 max-w-sm italic leading-tight break-words">{exp.description}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-black text-text-primary">${exp.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  <button 
                    onClick={() => handleDelete(exp.id!)}
                    className="text-text-secondary hover:text-danger p-1 rounded hover:bg-surface-secondary"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-text-secondary select-none flex flex-col items-center">
            <DollarSign className="w-8 h-8 opacity-30 mb-2" />
            <p className="text-xs font-bold">No se encontraron movimientos</p>
            <p className="text-[10px] text-text-secondary/70 mt-0.5">Registra compras o selecciona otros filtros.</p>
          </div>
        )}
      </Card>

      {/* --- ADD EXPENSE DIALOG --- */}
      <Dialog 
        isOpen={isAddOpen} 
        onClose={() => { setIsAddOpen(false); resetForm(); }}
        title="Registrar Gasto Manual"
      >
        <form onSubmit={handleSaveExpense} className="flex flex-col gap-4">
          <Input 
            label="Monto del Gasto ($) *" 
            type="number"
            step="0.01"
            placeholder="Ej. 199.50"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Comercio / Establecimiento *" 
              placeholder="Ej. Walmart / Spotify"
              value={merchant}
              onChange={e => setMerchant(e.target.value)}
              required
            />
            <Input 
              label="Fecha *" 
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select 
              label="Categoría"
              value={category}
              onChange={e => setCategory(e.target.value)}
              options={[
                { value: 'Comida', label: 'Comida' },
                { value: 'Transporte', label: 'Transporte' },
                { value: 'Hogar', label: 'Hogar' },
                { value: 'Servicios', label: 'Servicios' },
                { value: 'Educación', label: 'Educación' },
                { value: 'Salud', label: 'Salud' },
                { value: 'Vehículo', label: 'Vehículos' },
                { value: 'Entretenimiento', label: 'Entretenimiento' },
                { value: 'Compras', label: 'Compras' },
                { value: 'Suscripciones', label: 'Suscripciones' },
                { value: 'Otros', label: 'Otros' }
              ]}
            />
            <Select 
              label="Método de Pago"
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              options={[
                { value: 'Tarjeta de Débito', label: 'Tarjeta de Débito' },
                { value: 'Tarjeta de Crédito', label: 'Tarjeta de Crédito' },
                { value: 'Efectivo', label: 'Efectivo' },
                { value: 'Transferencia bancaria', label: 'Transferencia SPEI' },
                { value: 'PayPal', label: 'PayPal' }
              ]}
            />
          </div>

          <Input 
            label="Etiquetas (Separadas por comas)" 
            placeholder="Ej. despensa, quincena, oficina"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
          />

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-text-secondary font-heading">Notas / Descripción</label>
            <textarea 
              rows={2.5}
              placeholder="Detalles sobre el consumo..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full rounded-xl border border-border-primary bg-surface p-3 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div className="flex items-center gap-2 mt-1 select-none">
            <input 
              type="checkbox" 
              id="is-recurring-check" 
              checked={isRecurring}
              onChange={e => setIsRecurring(e.target.checked)}
              className="w-4 h-4 rounded text-brand border-border-primary accent-brand"
            />
            <label htmlFor="is-recurring-check" className="text-xs text-text-secondary font-bold">Marcar como gasto recurrente (mensual)</label>
          </div>

          <div className="flex items-center justify-end gap-2.5 mt-3 pt-3 border-t border-border-primary/30">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary" size="sm">Registrar Gasto</Button>
          </div>
        </form>
      </Dialog>

    </div>
  );
};
