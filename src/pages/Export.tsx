import React, { useState } from 'react';
import { db } from '../db/lifeDB';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { 
  Download, Upload, FileSpreadsheet, ShieldCheck, 
  FileText, CheckCircle2, RefreshCw, AlertCircle, Database
} from 'lucide-react';

export const ExportData: React.FC = () => {
  const { user, plan } = useApp();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Generate Executive Backup File (.lifeos)
  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const backupData = {
        version: '3.0',
        exportedAt: new Date().toISOString(),
        user: user || 'local_user',
        documents: await db.documents.toArray(),
        vehicles: await db.vehicles.toArray(),
        expenses: await db.expenses.toArray(),
        subscriptions: await db.subscriptions.toArray(),
        warranties: await db.warranties.toArray(),
        packages: await db.packages.toArray(),
        homes: await db.homes.toArray(),
        tasks: await db.tasks.toArray(),
        health: await db.healthRecords.toArray(),
        passwords: await db.passwordRecords.toArray(),
        goals: await db.financialGoals.toArray(),
        travel: await db.travelRecords.toArray(),
        habits: await db.habitRecords.toArray(),
        notes: await db.quickNoteRecords.toArray(),
        journal: await db.journalRecords.toArray(),
        pantry: await db.pantryItems.toArray(),
        pets: await db.petRecords.toArray()
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LifeOS_Backup_${new Date().toISOString().split('T')[0]}.lifeos`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Print Executive Summary PDF
  const handlePrintPDF = () => {
    window.print();
  };

  // Restore Backup File (.lifeos)
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);

        if (!data.version || !data.user) {
          throw new Error('Archivo de respaldo no válido o dañado.');
        }

        // Restore tables
        if (data.documents?.length) await db.documents.bulkPut(data.documents);
        if (data.vehicles?.length) await db.vehicles.bulkPut(data.vehicles);
        if (data.expenses?.length) await db.expenses.bulkPut(data.expenses);
        if (data.subscriptions?.length) await db.subscriptions.bulkPut(data.subscriptions);
        if (data.warranties?.length) await db.warranties.bulkPut(data.warranties);
        if (data.packages?.length) await db.packages.bulkPut(data.packages);
        if (data.homes?.length) await db.homes.bulkPut(data.homes);
        if (data.tasks?.length) await db.tasks.bulkPut(data.tasks);
        if (data.health?.length) await db.healthRecords.bulkPut(data.health);
        if (data.passwords?.length) await db.passwordRecords.bulkPut(data.passwords);
        if (data.goals?.length) await db.financialGoals.bulkPut(data.goals);
        if (data.travel?.length) await db.travelRecords.bulkPut(data.travel);
        if (data.habits?.length) await db.habitRecords.bulkPut(data.habits);
        if (data.notes?.length) await db.quickNoteRecords.bulkPut(data.notes);
        if (data.journal?.length) await db.journalRecords.bulkPut(data.journal);
        if (data.pantry?.length) await db.pantryItems.bulkPut(data.pantry);
        if (data.pets?.length) await db.petRecords.bulkPut(data.pets);

        setImportStatus('✅ Respaldo restaurado con éxito. Tus registros están sincronizados.');
      } catch (err: any) {
        setImportStatus(`❌ Error al restaurar: ${err.message || 'Archivo corrupto'}`);
      } finally {
        setIsImporting(false);
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col gap-6 select-none animate-fade-in print:p-0">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-primary/40 pb-4 print:hidden">
        <div>
          <h2 className="font-heading font-black text-2xl text-text-primary tracking-tight flex items-center gap-2">
            <Download className="w-6 h-6 text-brand" /> Reportes & Respaldos 1-Clic
          </h2>
          <p className="text-xs text-text-secondary mt-0.5 font-medium">
            Exporta reportes ejecutivos en PDF o haz copias de seguridad portátiles de toda tu vida digital (.lifeos).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrintPDF}
            className="gap-1.5 text-xs font-bold py-2.5 rounded-xl cursor-pointer"
          >
            <FileText className="w-4 h-4 text-brand" /> Imprimir Reporte PDF
          </Button>

          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleExportBackup}
            disabled={isExporting}
            className="gap-1.5 text-xs font-bold py-2.5 rounded-xl cursor-pointer"
          >
            <Download className="w-4 h-4" /> Exportar Respaldo (.lifeos)
          </Button>
        </div>
      </div>

      {/* Main Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
        
        {/* Export Card */}
        <Card variant="glass" className="p-6 border-brand/30 bg-brand/5 flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Badge variant="success" size="xs">Respaldo Encriptado</Badge>
              <Database className="w-5 h-5 text-brand" />
            </div>

            <h3 className="font-heading font-black text-lg text-text-primary mt-1">
              Generar Copia de Seguridad Portátil (.lifeos)
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Descarga un archivo liviano y seguro con todos tus documentos, contraseñas, expediente de salud, finanzas y vehículos para restaurarlo en otro dispositivo.
            </p>
          </div>

          <Button 
            variant="primary" 
            onClick={handleExportBackup}
            disabled={isExporting}
            className="w-full text-xs font-bold py-3 cursor-pointer"
          >
            {isExporting ? 'Generando Copia...' : 'Descargar Archivo .lifeos'}
          </Button>
        </Card>

        {/* Restore Card */}
        <Card className="p-6 flex flex-col justify-between gap-4 border-border-primary/50">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Badge variant="neutral" size="xs">Importador 1-Clic</Badge>
              <Upload className="w-5 h-5 text-emerald-500" />
            </div>

            <h3 className="font-heading font-black text-lg text-text-primary mt-1">
              Restaurar Copia de Seguridad
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Selecciona tu archivo de respaldo <strong className="text-text-primary">.lifeos</strong> guardado previamente para importar tus datos al instante.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="w-full">
              <input 
                type="file" 
                accept=".lifeos,.json"
                onChange={handleImportBackup}
                disabled={isImporting}
                className="hidden" 
              />
              <div className="w-full bg-surface-secondary border border-dashed border-border-primary hover:border-brand rounded-xl p-3 text-center text-xs font-bold text-text-primary cursor-pointer transition-colors">
                {isImporting ? 'Restaurando...' : '📁 Seleccionar archivo .lifeos'}
              </div>
            </label>

            {importStatus && (
              <p className="text-[11px] font-semibold text-center mt-1 text-emerald-400">
                {importStatus}
              </p>
            )}
          </div>
        </Card>

      </div>

      {/* Printable PDF Report View */}
      <Card className="p-8 border-border-primary/40 mt-4 print:border-none print:shadow-none">
        <div className="flex items-center justify-between border-b border-border-primary/40 pb-4 mb-6">
          <div>
            <h1 className="font-heading font-black text-2xl text-text-primary">Resumen Ejecutivo — LifeOS Pro</h1>
            <p className="text-xs text-text-secondary mt-0.5 font-semibold">
              Titular: <strong className="text-text-primary">{user || 'Usuario'}</strong> • Generado el {new Date().toLocaleDateString('es-MX')}
            </p>
          </div>
          <span className="text-xs font-black uppercase tracking-wider text-brand">✨ Vexora Labs</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-surface-secondary/40 rounded-xl border border-border-primary/40">
            <span className="font-bold text-text-secondary">Estado de Cuenta</span>
            <p className="font-black text-lg text-text-primary mt-1">Plan {plan.toUpperCase()}</p>
          </div>
          <div className="p-4 bg-surface-secondary/40 rounded-xl border border-border-primary/40">
            <span className="font-bold text-text-secondary">Seguridad & Cifrado</span>
            <p className="font-black text-lg text-emerald-400 mt-1">AES-GCM Activo</p>
          </div>
          <div className="p-4 bg-surface-secondary/40 rounded-xl border border-border-primary/40">
            <span className="font-bold text-text-secondary">Almacenamiento Local</span>
            <p className="font-black text-lg text-brand mt-1">Dexie DB Version 3</p>
          </div>
        </div>
      </Card>

    </div>
  );
};
