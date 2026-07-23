import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { db } from '../db/lifeDB';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Dialog } from '../components/ui/Dialog';
import { 
  Settings as SettingsIcon, Shield, CreditCard, RefreshCw, 
  Trash2, Download, Upload, Check, X, ShieldCheck, KeyRound,
  Bell, Sparkles, Smartphone
} from 'lucide-react';
import { getNotificationPermission, requestNotificationPermission, sendTestNotification } from '../utils/notifications';

export const Settings: React.FC = () => {
  const { 
    user, accountEmail, plan, activeModules, pinEnabled, enablePin, disablePin, 
    updateModules, updateDisplayName, logout 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'general' | 'modules' | 'security' | 'data'>('general');
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user || '');
  const [isPinSetupOpen, setIsPinSetupOpen] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // General Modules List
  const modulesList = [
    { id: 'documents', name: 'Documentos', description: 'INE, Pasaporte, Licencia de conducir' },
    { id: 'health', name: 'Salud & Expediente', description: 'Ficha médica ICE, recetas, citas y fármacos' },
    { id: 'passwords', name: 'Bóveda de Contraseñas', description: 'Almacenamiento seguro cifrado con PIN local' },
    { id: 'networth', name: 'Patrimonio & Metas', description: 'Activos, deudas y metas de ahorro' },
    { id: 'travel', name: 'Viajes e Itinerarios', description: 'Destinos, reservaciones y maleta' },
    { id: 'habits', name: 'Hábitos & Notas', description: 'Rachas diarias y notas adhesivas' },
    { id: 'export', name: 'Reportes & Respaldos', description: 'Exportador PDF y backup .lifeos en 1 clic' },
    { id: 'journal', name: 'Diario & Mood Tracker', description: 'Reflexiones escritas y monitor de emociones' },
    { id: 'pantry', name: 'Despensa & Supermercado', description: 'Inventario de insumos y lista de compras' },
    { id: 'pets', name: 'Mascotas & Veterinaria', description: 'Carnet de vacunas, peso y cuidados' },
    { id: 'calculators', name: 'Calculadoras FIRE', description: 'Libertad financiera y valor real de tu tiempo' },
    { id: 'iceqr', name: 'Tarjeta QR Emergencia', description: 'Ficha médica imprimible con código QR' },
    { id: 'vehicles', name: 'Vehículos', description: 'Bitácora de mantenimientos y combustible' },
    { id: 'expenses', name: 'Gastos', description: 'Registro manual de presupuestos y egresos' },
    { id: 'subscriptions', name: 'Suscripciones', description: 'SaaS, streaming, renovación mensual' },
    { id: 'warranties', name: 'Garantías', description: 'Fechas límite de pólizas de compra' },
    { id: 'packages', name: 'Paquetes', description: 'Rastreo manual de envíos' },
    { id: 'homes', name: 'Hogar', description: 'Viviendas, servicios públicos y mantenimientos' },
    { id: 'tasks', name: 'Tareas', description: 'To-do listas de pendientes cotidianos' }
  ];

  // --- TOGGLE MODULE ACTION ---
  const handleToggleModule = async (moduleId: string) => {
    let list = [...activeModules];
    if (list.includes(moduleId)) {
      list = list.filter(id => id !== moduleId);
    } else {
      list.push(moduleId);
    }
    await updateModules(list);
  };

  // --- EXPORT DATABASE FULL DATA AS JSON ---
  const handleExportJSON = async () => {
    try {
      const data: Record<string, any[]> = {};
      const tables = ['documents', 'vehicles', 'vehicleServices', 'expenses', 'subscriptions', 'warranties', 'packages', 'homes', 'homeMaintenance', 'tasks', 'activities'];
      
      for (const t of tables) {
        data[t] = await (db as any)[t].toArray();
      }

      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `LifeOS_Backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error exportando los datos.');
    }
  };

  // --- IMPORT DATABASE FULL DATA FROM JSON ---
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('¿Estás seguro de restaurar esta copia de seguridad? Esto reemplazará todos tus datos guardados actuales.')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result as string);
        const tables = ['documents', 'vehicles', 'vehicleServices', 'expenses', 'subscriptions', 'warranties', 'packages', 'homes', 'homeMaintenance', 'tasks', 'activities'];

        // Clear existing tables and populate
        for (const t of tables) {
          if (data[t]) {
            await (db as any)[t].clear();
            await (db as any)[t].bulkAdd(data[t]);
          }
        }

        alert('Restauración completada con éxito. Recarga la página para aplicar los cambios.');
        window.location.reload();
      } catch (err) {
        alert('Fallo en el formato del archivo de respaldo JSON.');
      }
    };
    reader.readAsText(file);
  };

  // --- ERASE ALL LOCAL DATABASE DATA ---
  const handleClearAllData = async () => {
    if (confirm('¿ATENCIÓN: Estás seguro de eliminar permanentemente todos tus datos? Esta acción vaciará toda tu base de datos y no se puede deshacer.')) {
      await db.delete();
      logout();
      window.location.reload();
    }
  };

  // --- SET SECURITY PIN FLOW ---
  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);

    if (newPin.length < 4) {
      setPinError('El PIN debe tener al menos 4 dígitos.');
      return;
    }

    if (newPin !== confirmPin) {
      setPinError('Los PIN no coinciden.');
      return;
    }

    await enablePin(newPin);
    setIsPinSetupOpen(false);
    setNewPin('');
    setConfirmPin('');
    alert('PIN de seguridad configurado y activado.');
  };

  return (
    <div className="flex flex-col gap-5">
      
      {/* Header */}
      <div className="select-none">
        <h2 className="font-heading font-black text-2xl text-text-primary tracking-tight">Panel de Configuración</h2>
        <p className="text-xs text-text-secondary font-medium mt-0.5">Controla las preferencias de tu aplicación, PIN de seguridad y tus datos locales.</p>
      </div>

      {/* Tabs configuration list */}
      <div className="flex border-b border-border-primary/45 overflow-x-auto gap-1 select-none">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4.5 py-3 text-xs font-bold border-b-2 -mb-px whitespace-nowrap transition-colors cursor-pointer ${activeTab === 'general' ? 'border-brand text-brand' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
        >
          General
        </button>
        <button
          onClick={() => setActiveTab('modules')}
          className={`px-4.5 py-3 text-xs font-bold border-b-2 -mb-px whitespace-nowrap transition-colors cursor-pointer ${activeTab === 'modules' ? 'border-brand text-brand' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
        >
          Módulos Activos
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-4.5 py-3 text-xs font-bold border-b-2 -mb-px whitespace-nowrap transition-colors cursor-pointer ${activeTab === 'security' ? 'border-brand text-brand' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
        >
          PIN de Seguridad
        </button>
        <button
          onClick={() => setActiveTab('data')}
          className={`px-4.5 py-3 text-xs font-bold border-b-2 -mb-px whitespace-nowrap transition-colors cursor-pointer ${activeTab === 'data' ? 'border-brand text-brand' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
        >
          Administrar Datos
        </button>
      </div>

      {/* --- CONTENT TABS FLOW --- */}

      {/* 1. GENERAL TAB */}
      {activeTab === 'general' && (
        <Card className="p-6 flex flex-col gap-5 animate-slide-up select-none">
          <div>
            <h3 className="font-heading font-bold text-sm text-text-primary mb-1">Información de Cuenta</h3>
            <p className="text-xs text-text-secondary">Estatus actual de tu membresía y credenciales.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-surface-secondary/40 p-4 border border-border-primary/45 rounded-xl flex flex-col justify-between">
              <div>
                <span className="text-text-secondary font-semibold block">Nombre de Usuario</span>
                {!isEditingName ? (
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-bold text-text-primary capitalize text-sm">{user}</span>
                    <button 
                      onClick={() => { setNameInput(user || ''); setIsEditingName(true); }}
                      className="text-[10px] font-bold text-brand hover:underline cursor-pointer"
                    >
                      Editar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <input 
                      type="text" 
                      value={nameInput} 
                      onChange={e => setNameInput(e.target.value)}
                      className="w-full bg-surface border border-border-primary rounded px-2 py-1 text-xs text-text-primary"
                      placeholder="Tu nombre"
                      autoFocus
                    />
                    <Button 
                      size="sm" 
                      className="text-[10px] py-1 px-2 font-bold cursor-pointer"
                      onClick={async () => {
                        await updateDisplayName(nameInput);
                        setIsEditingName(false);
                      }}
                    >
                      Guardar
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-surface-secondary/40 p-4 border border-border-primary/45 rounded-xl">
              <span className="text-text-secondary font-semibold block">Correo Electrónico</span>
              <span className="font-bold text-text-primary mt-1 block truncate">{accountEmail || 'Sin registrar'}</span>
            </div>

            <div className="bg-surface-secondary/40 p-4 border border-border-primary/45 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-text-secondary font-semibold block">Plan Contratado</span>
                <span className="font-bold text-amber-500 mt-1 block uppercase tracking-wide">{plan}</span>
              </div>
              
              {plan === 'free' && (
                <Button 
                  size="sm" 
                  onClick={() => window.location.hash = '#/pricing'}
                  className="text-[10px] font-bold py-1.5 cursor-pointer"
                >
                  Mejorar
                </Button>
              )}
            </div>
          </div>

          <div className="h-px bg-border-primary/45 my-2" />

          {/* Notificaciones para el celular / navegador */}
          <div className="bg-surface-secondary/40 p-4 border border-border-primary/45 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-brand/10 text-brand rounded-xl shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-text-primary text-xs flex items-center gap-1.5">
                  Notificaciones Móviles & Navegador
                  <Badge variant={getNotificationPermission() === 'granted' ? 'success' : 'warning'} size="xs">
                    {getNotificationPermission() === 'granted' ? 'Activadas' : 'Desactivadas'}
                  </Badge>
                </h4>
                <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
                  Recibe alertas nativas en tu celular o computadora sobre vencimientos de documentos, seguros de auto y garantías.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              {getNotificationPermission() !== 'granted' ? (
                <Button 
                  size="sm" 
                  onClick={async () => {
                    await requestNotificationPermission();
                    window.location.reload();
                  }}
                  className="text-xs font-bold py-2 gap-1.5 cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" /> Activar en Celular
                </Button>
              ) : (
                <Button 
                  variant="outline"
                  size="sm" 
                  onClick={async () => {
                    const ok = await sendTestNotification();
                    if (!ok) alert('No se pudo enviar la notificación. Verifica los permisos de tu dispositivo.');
                  }}
                  className="text-xs font-bold py-2 gap-1.5 border-brand/30 text-brand hover:bg-brand/10 cursor-pointer"
                >
                  <Bell className="w-4 h-4 text-amber-500" /> Probar Notificación
                </Button>
              )}
            </div>
          </div>

          <div className="h-px bg-border-primary/45 my-2" />

          {/* Vexora Labs Branding */}
          <div className="bg-linear-to-r from-brand/10 to-purple-500/10 p-4 border border-brand/20 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-text-primary">LifeOS Pro — Creado por <strong className="text-brand font-black">Vexora Labs</strong></span>
            </div>
            <span className="text-[10px] font-semibold text-text-secondary bg-surface px-2 py-1 rounded-md border border-border-primary/50">v1.2.0</span>
          </div>

          <div className="pt-2">
            <Button variant="danger" size="sm" onClick={logout} className="gap-1.5 font-bold text-xs cursor-pointer">
              Cerrar Sesión Activa
            </Button>
          </div>
        </Card>
      )}

      {/* 2. MODULES TAB */}
      {activeTab === 'modules' && (
        <Card className="p-6 flex flex-col gap-4 animate-slide-up select-none">
          <div>
            <h3 className="font-heading font-bold text-sm text-text-primary mb-1">Configurar Módulos del Dashboard</h3>
            <p className="text-xs text-text-secondary">Selecciona las secciones de la vida personal que te interesa llevar organizadas en tu pantalla de inicio.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-2">
            {modulesList.map((m) => {
              const active = activeModules.includes(m.id);
              return (
                <div 
                  key={m.id}
                  onClick={() => handleToggleModule(m.id)}
                  className={`
                    p-4.5 rounded-2xl border cursor-pointer transition-all duration-200 flex items-start justify-between gap-4
                    ${active 
                      ? 'border-brand/40 bg-brand/5 shadow-xs' 
                      : 'border-border-primary/60 hover:bg-surface-secondary/40'
                    }
                  `}
                >
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-text-primary">{m.name}</h4>
                    <p className="text-[10px] text-text-secondary mt-0.5 leading-snug">{m.description}</p>
                  </div>
                  
                  <div className={`
                    w-5.5 h-5.5 rounded-lg border flex items-center justify-center shrink-0 transition-all
                    ${active 
                      ? 'bg-brand border-brand text-white' 
                      : 'border-border-primary bg-surface'
                    }
                  `}>
                    {active && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 3. SECURITY TAB */}
      {activeTab === 'security' && (
        <Card className="p-6 flex flex-col gap-5 animate-slide-up select-none">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl shrink-0">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm text-text-primary">PIN de Bloqueo Local</h3>
              <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                Establece un código numérico para encriptar tu información más delicada directamente en tu dispositivo y bloquear accesos ajenos a la app.
              </p>
            </div>
          </div>

          <div className="h-px bg-border-primary/45 my-1" />

          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-text-primary block">Estatus del PIN</span>
              <span className="text-text-secondary block mt-0.5">
                {pinEnabled 
                  ? 'PIN activo. El bloqueo está activado para expedientes sensibles.' 
                  : 'Sin configurar. Los datos sensibles no están encriptados.'
                }
              </span>
            </div>
            
            {pinEnabled ? (
              <Button variant="danger" size="sm" onClick={disablePin} className="text-xs font-bold">
                Desactivar PIN
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={() => setIsPinSetupOpen(true)} className="text-xs font-bold">
                Establecer PIN
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* 4. DATA TAB */}
      {activeTab === 'data' && (
        <Card className="p-6 flex flex-col gap-5 animate-slide-up select-none">
          <div>
            <h3 className="font-heading font-bold text-sm text-text-primary mb-1">Portabilidad & Respaldos</h3>
            <p className="text-xs text-text-secondary font-medium">Tus datos te pertenecen. Descarga copias completas de tu base de datos local en formato JSON.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Export full JSON */}
            <div className="p-4.5 border border-border-primary/60 rounded-2xl flex flex-col justify-between items-start gap-4 hover:bg-surface-secondary/25 transition-colors">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-brand" /> Exportar Base de Datos
                </span>
                <p className="text-[10px] text-text-secondary leading-relaxed mt-1">
                  Descarga un archivo JSON completo que contiene todos tus registros, servicios y logs para tenerlos como respaldo seguro.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportJSON} className="text-[10px] font-bold rounded-xl w-full">
                Descargar JSON
              </Button>
            </div>

            {/* Import JSON */}
            <div className="p-4.5 border border-border-primary/60 rounded-2xl flex flex-col justify-between items-start gap-4 hover:bg-surface-secondary/25 transition-colors">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-brand" /> Importar / Restaurar Copia
                </span>
                <p className="text-[10px] text-text-secondary leading-relaxed mt-1">
                  Restaura tu base de datos a partir de una copia JSON descargada previamente. Esto reemplazará tus registros actuales.
                </p>
              </div>
              <label className="inline-flex items-center justify-center font-bold rounded-xl transition-all duration-200 cursor-pointer text-[10px] border border-border-primary bg-transparent text-text-primary hover:bg-surface-secondary px-3 py-2 w-full text-center select-none">
                Subir Respaldo JSON
                <input type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
              </label>
            </div>
          </div>

          <div className="h-px bg-border-primary/45 my-2" />

          {/* Delete database data */}
          <div className="p-4.5 border border-dashed border-danger/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-danger-light/10">
            <div>
              <span className="text-xs font-bold text-danger">Eliminación Total de Datos</span>
              <p className="text-[10px] text-text-secondary leading-relaxed mt-0.5">
                Borra definitivamente toda la base de datos local en este navegador y cierra la sesión. Esta acción no se puede deshacer.
              </p>
            </div>
            
            <Button variant="danger" size="sm" onClick={handleClearAllData} className="text-[10px] font-bold rounded-xl">
              Borrar Todo de Local
            </Button>
          </div>
        </Card>
      )}

      {/* --- PIN SETUP DIALOG MODAL --- */}
      <Dialog
        isOpen={isPinSetupOpen}
        onClose={() => setIsPinSetupOpen(false)}
        title="Configurar PIN de Seguridad"
      >
        <form onSubmit={handleSavePin} className="flex flex-col gap-4">
          <Input 
            label="Escribe un PIN de 4 a 6 dígitos *" 
            type="password"
            maxLength={6}
            placeholder="Ej. 1234"
            value={newPin}
            onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
            required
            className="text-center font-mono tracking-widest text-lg"
          />

          <Input 
            label="Confirma tu PIN de seguridad *" 
            type="password"
            maxLength={6}
            placeholder="Ej. 1234"
            value={confirmPin}
            onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
            required
            className="text-center font-mono tracking-widest text-lg"
          />

          {pinError && <p className="text-[11px] text-danger font-medium">{pinError}</p>}

          <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/15 p-3 rounded-xl select-none mt-1">
            <ShieldCheck className="w-5.5 h-5.5 text-indigo-500 shrink-0" />
            <p className="text-[10px] text-text-secondary leading-snug">
              Este PIN es confidencial y local. Si lo olvidas, no podrás recuperar la información sensible cifrada bajo esta contraseña.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 mt-3 pt-3 border-t border-border-primary/30">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsPinSetupOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary" size="sm">
              Activar PIN
            </Button>
          </div>
        </form>
      </Dialog>

    </div>
  );
};
