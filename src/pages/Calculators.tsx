import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { 
  Calculator, TrendingUp, Clock, DollarSign, 
  Sparkles, Award, ArrowUpRight
} from 'lucide-react';

export const Calculators: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'fire' | 'hourly'>('fire');

  // FIRE Calculator State
  const [currentAge, setCurrentAge] = useState(28);
  const [targetRetireAge, setTargetRetireAge] = useState(55);
  const [monthlyExpense, setMonthlyExpense] = useState(25000);
  const [currentSavings, setCurrentSavings] = useState(100000);
  const [monthlyContribution, setMonthlyContribution] = useState(5000);
  const [expectedReturn, setExpectedReturn] = useState(8); // %

  // Hourly Rate Calculator State
  const [monthlySalary, setMonthlySalary] = useState(30000);
  const [hoursPerWeek, setHoursPerWeek] = useState(40);
  const [commuteHoursPerWeek, setCommuteHoursPerWeek] = useState(5);
  const [monthlyWorkExpenses, setMonthlyWorkExpenses] = useState(2500); // transporte, ropa, comidas

  // FIRE Calculation
  const annualExpenses = monthlyExpense * 12;
  const fireNumber = annualExpenses * 25; // 4% rule
  const yearsToRetire = Math.max(1, targetRetireAge - currentAge);
  const monthsToRetire = yearsToRetire * 12;
  const monthlyRate = expectedReturn / 100 / 12;

  // Compound Interest Formula: Future Value = PV*(1+r)^n + PMT*(((1+r)^n - 1)/r)
  const futureValue = currentSavings * Math.pow(1 + monthlyRate, monthsToRetire) +
    monthlyContribution * ((Math.pow(1 + monthlyRate, monthsToRetire) - 1) / monthlyRate);

  const fireProgress = Math.min(100, Math.round((futureValue / fireNumber) * 100));

  // Hourly Rate Calculation
  const totalWorkHoursMonth = (hoursPerWeek + commuteHoursPerWeek) * 4.33;
  const netMonthlyIncome = Math.max(0, monthlySalary - monthlyWorkExpenses);
  const realHourlyRate = totalWorkHoursMonth > 0 ? (netMonthlyIncome / totalWorkHoursMonth) : 0;
  const grossHourlyRate = (hoursPerWeek * 4.33) > 0 ? (monthlySalary / (hoursPerWeek * 4.33)) : 0;

  return (
    <div className="flex flex-col gap-6 select-none animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-primary/40 pb-4">
        <div>
          <h2 className="font-heading font-black text-2xl text-text-primary tracking-tight flex items-center gap-2">
            <Calculator className="w-6 h-6 text-brand" /> Calculadoras Inteligentes de Vida
          </h2>
          <p className="text-xs text-text-secondary mt-0.5 font-medium">
            Proyecciones de Libertad Financiera (FIRE) y costo real de tu tiempo de trabajo.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-primary/40 text-xs font-bold gap-2">
        <button
          onClick={() => setActiveTab('fire')}
          className={`px-4 py-2.5 border-b-2 -mb-px transition-colors cursor-pointer ${activeTab === 'fire' ? 'border-brand text-brand' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
        >
          🚀 Libertad Financiera (FIRE)
        </button>
        <button
          onClick={() => setActiveTab('hourly')}
          className={`px-4 py-2.5 border-b-2 -mb-px transition-colors cursor-pointer ${activeTab === 'hourly' ? 'border-brand text-brand' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
        >
          ⏱️ Valor Real de tu Tiempo por Hora
        </button>
      </div>

      {/* 1. FIRE CALCULATOR */}
      {activeTab === 'fire' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6 lg:col-span-1 flex flex-col gap-4">
            <h3 className="font-heading font-bold text-sm text-text-primary">Parámetros Financieros</h3>

            <div className="grid grid-cols-2 gap-3">
              <Input 
                label="Edad Actual"
                type="number"
                value={currentAge.toString()}
                onChange={e => setCurrentAge(Number(e.target.value))}
              />
              <Input 
                label="Edad Retiro Meta"
                type="number"
                value={targetRetireAge.toString()}
                onChange={e => setTargetRetireAge(Number(e.target.value))}
              />
            </div>

            <Input 
              label="Gasto Mensual Deseado ($ MXN)"
              type="number"
              value={monthlyExpense.toString()}
              onChange={e => setMonthlyExpense(Number(e.target.value))}
            />

            <Input 
              label="Ahorro / Inversión Actual ($ MXN)"
              type="number"
              value={currentSavings.toString()}
              onChange={e => setCurrentSavings(Number(e.target.value))}
            />

            <Input 
              label="Aportación Mensual ($ MXN)"
              type="number"
              value={monthlyContribution.toString()}
              onChange={e => setMonthlyContribution(Number(e.target.value))}
            />

            <Input 
              label="Rendimiento Anual Estimado (%)"
              type="number"
              value={expectedReturn.toString()}
              onChange={e => setExpectedReturn(Number(e.target.value))}
            />
          </Card>

          <Card variant="glass" className="p-6 lg:col-span-2 border-brand/30 bg-brand/5 flex flex-col justify-between gap-6">
            <div className="flex flex-col gap-4">
              <span className="text-xs font-bold text-brand uppercase tracking-wider">Resultado de la Proyección FIRE</span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-surface/80 rounded-2xl border border-border-primary/40">
                  <span className="text-xs text-text-secondary font-semibold">Monto Meta FIRE (Regla del 4%)</span>
                  <h4 className="font-heading font-black text-2xl text-emerald-400 mt-1">
                    ${fireNumber.toLocaleString('es-MX')} MXN
                  </h4>
                  <p className="text-[10px] text-text-secondary mt-1">Fondo acumulado necesario para retirarte.</p>
                </div>

                <div className="p-4 bg-surface/80 rounded-2xl border border-border-primary/40">
                  <span className="text-xs text-text-secondary font-semibold">Capital Proyectado a los {targetRetireAge} años</span>
                  <h4 className="font-heading font-black text-2xl text-brand mt-1">
                    ${Math.round(futureValue).toLocaleString('es-MX')} MXN
                  </h4>
                  <p className="text-[10px] text-text-secondary mt-1">Con interés compuesto a {yearsToRetire} años.</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 bg-surface/80 p-4 rounded-2xl border border-border-primary/40">
                <div className="flex items-center justify-between text-xs font-bold text-text-primary">
                  <span>Progreso hacia la Libertad Financiera</span>
                  <span className="text-brand font-black">{fireProgress}%</span>
                </div>
                <div className="w-full bg-surface-secondary h-3 rounded-full overflow-hidden border border-border-primary/30">
                  <div className="h-full bg-linear-to-r from-brand to-emerald-400" style={{ width: `${fireProgress}%` }} />
                </div>
              </div>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed bg-surface/60 p-3 rounded-xl">
              💡 <strong className="text-text-primary">Tip de Libertad Financiera:</strong> Si incrementas tu aportación mensual a <strong className="text-emerald-400">${(monthlyContribution + 2000).toLocaleString()} MXN</strong>, podrías alcanzar tu meta {Math.round(yearsToRetire * 0.2)} años antes.
            </p>
          </Card>
        </div>
      )}

      {/* 2. HOURLY RATE CALCULATOR */}
      {activeTab === 'hourly' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6 lg:col-span-1 flex flex-col gap-4">
            <h3 className="font-heading font-bold text-sm text-text-primary">Tus Ingresos y Horarios</h3>

            <Input 
              label="Sueldo / Ingreso Neto Mensual ($ MXN)"
              type="number"
              value={monthlySalary.toString()}
              onChange={e => setMonthlySalary(Number(e.target.value))}
            />

            <Input 
              label="Horas de Trabajo a la Semana"
              type="number"
              value={hoursPerWeek.toString()}
              onChange={e => setHoursPerWeek(Number(e.target.value))}
            />

            <Input 
              label="Horas de Trayecto / Traslado por Semana"
              type="number"
              value={commuteHoursPerWeek.toString()}
              onChange={e => setCommuteHoursPerWeek(Number(e.target.value))}
            />

            <Input 
              label="Gastos Mensuales de Trabajo (Pasajes/Comida)"
              type="number"
              value={monthlyWorkExpenses.toString()}
              onChange={e => setMonthlyWorkExpenses(Number(e.target.value))}
            />
          </Card>

          <Card variant="glass" className="p-6 lg:col-span-2 border-emerald-500/30 bg-emerald-500/5 flex flex-col justify-between gap-6">
            <div className="flex flex-col gap-4">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Cálculo del Valor Real de tu Tiempo</span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-surface/80 rounded-2xl border border-border-primary/40">
                  <span className="text-xs text-text-secondary font-semibold">Tarifa Nominal por Hora</span>
                  <h4 className="font-heading font-black text-2xl text-text-primary mt-1">
                    ${Math.round(grossHourlyRate)} MXN / hr
                  </h4>
                  <p className="text-[10px] text-text-secondary mt-1">Calculado sobre tu salario bruto oficial.</p>
                </div>

                <div className="p-4 bg-surface/80 rounded-2xl border border-border-primary/40 border-emerald-500/30">
                  <span className="text-xs text-emerald-400 font-bold">Valor Real Neto por Hora Libre</span>
                  <h4 className="font-heading font-black text-3xl text-emerald-400 mt-1">
                    ${Math.round(realHourlyRate)} MXN / hr
                  </h4>
                  <p className="text-[10px] text-text-secondary mt-1">Descontando pasajes, comidas y horas de traslado.</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-surface/80 rounded-2xl border border-border-primary/40">
              <h4 className="font-bold text-xs text-text-primary mb-1">¿Qué significa este número?</h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                Cada vez que compras algo de <strong className="text-text-primary">$1,000 MXN</strong>, estás pagando con aproximadamente <strong className="text-emerald-400">{Math.round(1000 / (realHourlyRate || 1))} horas</strong> de tu tiempo de vida real acumulado.
              </p>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
};
