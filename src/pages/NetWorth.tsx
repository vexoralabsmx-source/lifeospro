import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type FinancialGoalRecord } from '../db/lifeDB';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Dialog } from '../components/ui/Dialog';
import { 
  TrendingUp, DollarSign, Target, Plus, Trash2, 
  Sparkles, ShieldCheck, ArrowUpRight, ArrowDownRight, Award
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const NetWorth: React.FC = () => {
  const { user } = useApp();
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<FinancialGoalRecord | null>(null);
  const [fundAmount, setFundAmount] = useState('');

  // Goal Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<FinancialGoalRecord['category']>('savings');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [notes, setNotes] = useState('');

  // Live Query
  const goals = useLiveQuery(
    () => db.financialGoals.where('userId').equals(user || 'local_user').toArray(),
    [user]
  );
  const expenses = useLiveQuery(
    () => db.expenses.where('userId').equals(user || 'local_user').toArray(),
    [user]
  );
  const vehicles = useLiveQuery(
    () => db.vehicles.where('userId').equals(user || 'local_user').toArray(),
    [user]
  );
  const homes = useLiveQuery(
    () => db.homes.where('userId').equals(user || 'local_user').toArray(),
    [user]
  );

  if (!goals || !expenses || !vehicles || !homes) {
    return (
      <div className="flex flex-col gap-6 animate-pulse p-4">
        <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-1/4" />
        <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
      </div>
    );
  }

  // Calculate Asset and Liability values
  const assetGoals = goals.filter(g => g.category === 'savings' || g.category === 'investment' || g.category === 'asset');
  const debtGoals = goals.filter(g => g.category === 'debt' || g.category === 'liability');

  const totalSavingsAssets = assetGoals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalDebts = debtGoals.reduce((sum, g) => sum + g.currentAmount, 0);
  const netWorthTotal = totalSavingsAssets - totalDebts;

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !targetAmount) return;

    await db.financialGoals.add({
      userId: user || 'local_user',
      title,
      category,
      targetAmount: Number(targetAmount),
      currentAmount: Number(currentAmount) || 0,
      targetDate: targetDate || undefined,
      status: 'active',
      notes: notes || undefined,
      createdAt: new Date().toISOString()
    });

    setTitle('');
    setTargetAmount('');
    setCurrentAmount('');
    setNotes('');
    setIsAddGoalOpen(false);
  };

  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal || !selectedGoal.id || !fundAmount) return;

    const added = Number(fundAmount);
    const newCurrent = selectedGoal.currentAmount + added;
    const isAchieved = newCurrent >= selectedGoal.targetAmount;

    await db.financialGoals.update(selectedGoal.id, {
      currentAmount: newCurrent,
      status: isAchieved ? 'achieved' : selectedGoal.status
    });

    if (isAchieved) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
    }

    setFundAmount('');
    setIsAddFundsOpen(false);
    setSelectedGoal(null);
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Eliminar esta meta financiera?')) {
      await db.financialGoals.delete(id);
    }
  };

  return (
    <div className="flex flex-col gap-6 select-none animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-primary/40 pb-4">
        <div>
          <h2 className="font-heading font-black text-2xl text-text-primary tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-500" /> Patrimonio Neto & Metas de Ahorro
          </h2>
          <p className="text-xs text-text-secondary mt-0.5 font-medium">
            Calculadora de activos, deudas y seguimiento de objetivos de ahorro personal.
          </p>
        </div>

        <Button 
          variant="primary" 
          size="sm" 
          onClick={() => setIsAddGoalOpen(true)}
          className="gap-1.5 text-xs font-bold py-2.5 rounded-xl cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Crear Meta Financiera
        </Button>
      </div>

      {/* Net Worth Summary Widget */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="glass" className="p-5 border-emerald-500/30 bg-emerald-500/5 flex flex-col justify-between">
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Patrimonio Neto Estimado</span>
          <h3 className="font-heading font-black text-3xl text-emerald-500 mt-2">
            ${netWorthTotal.toLocaleString('es-MX')} MXN
          </h3>
          <p className="text-[11px] text-text-secondary mt-2 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" /> Balance positivo acumulado
          </p>
        </Card>

        <Card className="p-5 flex flex-col justify-between border-border-primary/50">
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Total Ahorros y Activos</span>
          <h3 className="font-heading font-black text-2xl text-text-primary mt-2">
            ${totalSavingsAssets.toLocaleString('es-MX')} MXN
          </h3>
          <p className="text-[11px] text-text-secondary mt-2">Fondo de reserva y metas activas</p>
        </Card>

        <Card className="p-5 flex flex-col justify-between border-border-primary/50">
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Deudas y Créditos</span>
          <h3 className="font-heading font-black text-2xl text-rose-500 mt-2">
            ${totalDebts.toLocaleString('es-MX')} MXN
          </h3>
          <p className="text-[11px] text-text-secondary mt-2">Pasivos pendientes de liquidar</p>
        </Card>
      </div>

      {/* Financial Goals Grid */}
      <h3 className="font-heading font-black text-lg text-text-primary mt-2">Metas Financieras Activas</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {goals.length > 0 ? (
          goals.map(g => {
            const percent = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
            const isAchieved = g.status === 'achieved' || percent >= 100;

            return (
              <Card key={g.id} className="p-5 flex flex-col justify-between gap-4 border-border-primary/60 hover:border-emerald-500/30 transition-all">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={isAchieved ? 'success' : 'neutral'} size="xs">
                      {isAchieved ? '🎉 Meta Alcanzada' : g.category}
                    </Badge>
                    <span className="text-xs font-black text-emerald-500">{percent}%</span>
                  </div>

                  <h4 className="font-heading font-black text-base text-text-primary mt-1">{g.title}</h4>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-surface-secondary h-2.5 rounded-full overflow-hidden border border-border-primary/30 my-1">
                    <div 
                      className={`h-full transition-all duration-500 ${isAchieved ? 'bg-linear-to-r from-emerald-500 to-teal-400' : 'bg-brand'}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary font-semibold">
                      Acumulado: <strong className="text-text-primary">${g.currentAmount.toLocaleString()}</strong>
                    </span>
                    <span className="text-text-secondary font-semibold">
                      Meta: <strong className="text-text-primary">${g.targetAmount.toLocaleString()}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border-primary/30 pt-3">
                  <button 
                    onClick={() => g.id && handleDelete(g.id)}
                    className="text-text-secondary hover:text-danger p-1 transition-colors cursor-pointer"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => { setSelectedGoal(g); setIsAddFundsOpen(true); }}
                    className="text-xs font-bold border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 cursor-pointer"
                  >
                    + Aportar Fondos
                  </Button>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center text-text-secondary flex flex-col items-center">
            <Target className="w-10 h-10 opacity-25 mb-2 text-emerald-500" />
            <p className="text-xs font-bold text-text-primary">No tienes metas financieras activas</p>
            <p className="text-[11px] text-text-secondary mt-1">Crea tu primera meta de ahorro o inversión para medir tu progreso.</p>
          </div>
        )}
      </div>

      {/* Modal Crear Meta */}
      <Dialog
        isOpen={isAddGoalOpen}
        onClose={() => setIsAddGoalOpen(false)}
        title="Crear Meta Financiera"
        size="md"
      >
        <form onSubmit={handleSaveGoal} className="flex flex-col gap-4 py-2 select-none">
          <Input 
            label="Nombre de la Meta"
            placeholder="Ej. Fondo de Emergencia / Viaje a Japón"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />

          <Select 
            label="Categoría"
            value={category}
            onChange={e => setCategory(e.target.value as any)}
            options={[
              { value: 'savings', label: 'Meta de Ahorro' },
              { value: 'investment', label: 'Inversión' },
              { value: 'debt', label: 'Pago de Deuda' },
              { value: 'asset', label: 'Compra de Activo (Auto/Propiedad)' }
            ]}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input 
              label="Monto Objetivo ($ MXN)"
              type="number"
              placeholder="50000"
              value={targetAmount}
              onChange={e => setTargetAmount(e.target.value)}
            />
            <Input 
              label="Monto Inicial ($ MXN)"
              type="number"
              placeholder="5000"
              value={currentAmount}
              onChange={e => setCurrentAmount(e.target.value)}
            />
          </div>

          <Input 
            label="Fecha Límite Estimada (Opcional)"
            type="date"
            value={targetDate}
            onChange={e => setTargetDate(e.target.value)}
          />

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" type="button" onClick={() => setIsAddGoalOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit">Guardar Meta</Button>
          </div>
        </form>
      </Dialog>

      {/* Modal Aportar Fondos */}
      <Dialog
        isOpen={isAddFundsOpen}
        onClose={() => setIsAddFundsOpen(false)}
        title={`Aportar Fondos a "${selectedGoal?.title}"`}
        size="sm"
      >
        <form onSubmit={handleAddFunds} className="flex flex-col gap-4 py-2 select-none">
          <Input 
            label="Monto a Aportar ($ MXN)"
            type="number"
            placeholder="1000"
            value={fundAmount}
            onChange={e => setFundAmount(e.target.value)}
            autoFocus
          />

          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" type="button" onClick={() => setIsAddFundsOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit">Confirmar Aportación</Button>
          </div>
        </form>
      </Dialog>

    </div>
  );
};
