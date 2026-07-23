import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type UserSettingRecord } from '../db/lifeDB';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Dialog } from '../components/ui/Dialog';
import { Select } from '../components/ui/Select';
import { 
  ShieldAlert, UserCheck, Crown, Search, Sparkles, 
  KeyRound, RefreshCw, CheckCircle2, Award, Users, Trash2, Plus, Database, Cloud
} from 'lucide-react';
import { syncUserSettingToCloud, saveSupabaseCredentials, isSupabaseConfigured, fetchAllCloudUsers } from '../utils/supabase';

export const AdminPanel: React.FC = () => {
  const { accountEmail, user, setPlan } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isCloudConfigOpen, setIsCloudConfigOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSettingRecord | null>(null);

  // Supabase Credentials Form
  const [supaUrl, setSupaUrl] = useState(localStorage.getItem('supabase_url') || import.meta.env.VITE_SUPABASE_URL || '');
  const [supaKey, setSupaKey] = useState(localStorage.getItem('supabase_anon_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '');

  // New User Form State
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPlan, setNewUserPlan] = useState<'free' | 'premium' | 'lifetime'>('premium');

  // Query all registered users/settings
  const localUsers = useLiveQuery(() => db.settings.toArray(), []) || [];
  const [cloudUsers, setCloudUsers] = useState<UserSettingRecord[]>([]);
  const [loadingCloud, setLoadingCloud] = useState(false);

  const loadCloudUsers = async () => {
    setLoadingCloud(true);
    try {
      const users = await fetchAllCloudUsers();
      setCloudUsers(users);

      // Sincronizar usuarios de la nube en la base de datos local
      for (const u of users) {
        const existing = await db.settings.get(u.userId);
        if (!existing) {
          await db.settings.put(u);
        } else if (existing.plan !== u.plan || existing.displayName !== u.displayName) {
          await db.settings.put({
            ...existing,
            plan: u.plan,
            displayName: u.displayName || existing.displayName
          });
        }
      }
    } catch (err) {
      console.warn('Error loading cloud users in admin:', err);
    } finally {
      setLoadingCloud(false);
    }
  };

  React.useEffect(() => {
    loadCloudUsers();
  }, []);

  // Admin Security Check: EXCLUSIVO PARA mikeangdhz11@gmail.com
  const activeEmail = accountEmail || localStorage.getItem('lifeos_user');
  const isAdmin = activeEmail?.toLowerCase() === 'mikeangdhz11@gmail.com';

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 select-none animate-fade-in">
        <div className="p-4 bg-rose-500/10 text-rose-500 rounded-full mb-4 border border-rose-500/20">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h2 className="font-heading font-black text-2xl text-text-primary">Acceso Denegado</h2>
        <p className="text-xs text-text-secondary mt-1.5 max-w-md">
          Este Panel de Administración es strictly exclusivo para el superadministrador (<strong className="text-rose-400">mikeangdhz11@gmail.com</strong>).
        </p>
      </div>
    );
  }

  // Combine local and cloud users by userId (unique email)
  const mergedUsersMap = new Map<string, UserSettingRecord>();
  localUsers.forEach(u => mergedUsersMap.set(u.userId.toLowerCase(), u));
  cloudUsers.forEach(u => {
    const key = u.userId.toLowerCase();
    const existing = mergedUsersMap.get(key);
    mergedUsersMap.set(key, {
      ...existing,
      ...u,
      displayName: u.displayName || existing?.displayName || u.userId.split('@')[0],
      plan: u.plan || existing?.plan || 'free'
    });
  });

  const allUsersCombined = Array.from(mergedUsersMap.values());

  const filteredUsers = allUsersCombined.filter(u => {
    const term = searchTerm.toLowerCase();
    return u.userId.toLowerCase().includes(term) || (u.displayName && u.displayName.toLowerCase().includes(term));
  });

  const handleUpdatePlan = async (userRecord: UserSettingRecord, newPlan: 'free' | 'premium' | 'lifetime') => {
    const updatedRecord = {
      ...userRecord,
      plan: newPlan
    };

    await db.settings.put(updatedRecord);
    await syncUserSettingToCloud(updatedRecord);

    // If the updated user is currently logged in, sync context state
    if (userRecord.userId.toLowerCase() === accountEmail?.toLowerCase()) {
      await setPlan(newPlan);
    }

    await loadCloudUsers();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim()) return;

    const email = newUserEmail.trim().toLowerCase();
    const existing = await db.settings.get(email);

    if (existing) {
      alert('Esta cuenta ya existe.');
      return;
    }

    const newUserRecord: UserSettingRecord = {
      userId: email,
      displayName: newUserName.trim() || email.split('@')[0],
      plan: newUserPlan,
      pinEnabled: false,
      theme: 'dark',
      activeModules: ['documents', 'health', 'passwords', 'networth', 'travel', 'habits', 'vehicles', 'expenses', 'subscriptions', 'warranties', 'packages', 'homes', 'tasks'],
      notificationsEnabled: true
    };

    await db.settings.put(newUserRecord);
    await syncUserSettingToCloud(newUserRecord);

    setNewUserEmail('');
    setNewUserName('');
    setIsAddUserOpen(false);

    await loadCloudUsers();
  };

  const handleSaveSupaCloud = async (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseCredentials(supaUrl, supaKey);
    setIsCloudConfigOpen(false);
    await loadCloudUsers();
    alert('✅ Credenciales de Supabase guardadas. Usuarios sincronizados.');
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm(`¿Estás seguro de eliminar la cuenta local de "${userId}"?`)) {
      await db.settings.delete(userId);
      await loadCloudUsers();
    }
  };

  return (
    <div className="flex flex-col gap-6 select-none animate-fade-in">
      
      {/* Admin Header Banner */}
      <Card variant="glass" className="p-6 border-amber-500/40 bg-linear-to-r from-amber-500/10 via-zinc-900/40 to-yellow-500/5 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/20 text-amber-500 rounded-2xl shrink-0">
              <Crown className="w-8 h-8 fill-amber-500/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  Panel Administrador SuperUser
                </span>
                <Badge variant={isSupabaseConfigured() ? 'success' : 'neutral'} size="xs">
                  {isSupabaseConfigured() ? '☁️ Supabase Conectado' : 'Local (Sin Supabase)'}
                </Badge>
              </div>
              <h2 className="font-heading font-black text-2xl text-text-primary mt-1">
                Gestión de Usuarios y Planes Manuales
              </h2>
              <p className="text-xs text-text-secondary mt-0.5 font-medium">
                Asigna o modifica planes de pago (Premium / Vitalicio) manualmente con sincronización en tiempo real.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadCloudUsers}
              disabled={loadingCloud}
              className="gap-1.5 text-xs font-bold py-2.5 rounded-xl border-border-primary text-text-secondary hover:text-text-primary cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loadingCloud ? 'animate-spin' : ''}`} /> {loadingCloud ? 'Cargando...' : 'Sincronizar Nube'}
            </Button>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsCloudConfigOpen(true)}
              className="gap-1.5 text-xs font-bold py-2.5 rounded-xl border-amber-500/30 text-amber-500 hover:bg-amber-500/10 cursor-pointer"
            >
              <Cloud className="w-4 h-4" /> Configurar Supabase
            </Button>
            <Button 
              variant="primary" 
              size="sm" 
              onClick={() => setIsAddUserOpen(true)}
              className="gap-1.5 text-xs font-bold py-2.5 rounded-xl bg-linear-to-r from-amber-500 to-yellow-600 text-white cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Alta Manual
            </Button>
          </div>
        </div>
      </Card>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-secondary/40 p-4 rounded-2xl border border-border-primary/40">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-text-secondary absolute left-3 top-2.5" />
          <input 
            type="text"
            placeholder="Buscar usuario o correo..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-surface border border-border-primary rounded-xl pl-9 pr-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-3 text-xs font-bold text-text-secondary">
          <Users className="w-4 h-4 text-amber-500" />
          <span>Total Cuentas Registradas: <strong className="text-text-primary">{allUsersCombined.length}</strong></span>
        </div>
      </div>

      {/* Users Table / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.length > 0 ? (
          filteredUsers.map(u => (
            <Card key={u.userId} className="p-5 flex flex-col justify-between gap-4 border-border-primary/60 hover:border-amber-500/40 transition-all">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-text-secondary truncate max-w-[170px]">
                    {u.userId}
                  </span>
                  <Badge 
                    variant={u.plan === 'lifetime' ? 'warning' : u.plan === 'premium' ? 'success' : 'neutral'} 
                    size="xs"
                    className="capitalize font-bold"
                  >
                    {u.plan === 'lifetime' ? '⭐ Vitalicio' : u.plan === 'premium' ? '⚡ Premium' : 'Free'}
                  </Badge>
                </div>

                <h4 className="font-heading font-black text-base text-text-primary mt-1">
                  {u.displayName || u.userId.split('@')[0]}
                </h4>

                <p className="text-xs text-text-secondary">
                  Módulos Activos: <strong className="text-text-primary">{u.activeModules?.length || 0} de 13</strong>
                </p>
              </div>

              {/* Quick Action Plan Setter */}
              <div className="flex flex-col gap-2 border-t border-border-primary/30 pt-3">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Cambiar Plan Manualmente:</span>
                
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => handleUpdatePlan(u, 'free')}
                    className={`py-1 px-2 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      u.plan === 'free' ? 'bg-zinc-700 text-white font-extrabold' : 'bg-surface-secondary text-text-secondary hover:bg-zinc-800'
                    }`}
                  >
                    Gratis
                  </button>

                  <button
                    onClick={() => handleUpdatePlan(u, 'premium')}
                    className={`py-1 px-2 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      u.plan === 'premium' ? 'bg-emerald-500 text-white font-extrabold' : 'bg-surface-secondary text-emerald-400 hover:bg-emerald-500/20'
                    }`}
                  >
                    ⚡ Premium
                  </button>

                  <button
                    onClick={() => handleUpdatePlan(u, 'lifetime')}
                    className={`py-1 px-2 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      u.plan === 'lifetime' ? 'bg-amber-500 text-zinc-950 font-extrabold' : 'bg-surface-secondary text-amber-400 hover:bg-amber-500/20'
                    }`}
                  >
                    ⭐ Vitalicio
                  </button>
                </div>

                <div className="flex items-center justify-end mt-1">
                  <button 
                    onClick={() => handleDeleteUser(u.userId)}
                    className="text-[11px] text-danger/80 hover:text-danger flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar Cuenta
                  </button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-text-secondary flex flex-col items-center">
            <Users className="w-10 h-10 opacity-25 mb-2 text-amber-500" />
            <p className="text-xs font-bold text-text-primary">No se encontraron usuarios</p>
          </div>
        )}
      </div>

      {/* Modal Alta Manual de Usuario */}
      <Dialog
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        title="Alta Manual de Usuario / Suscripción"
        size="md"
      >
        <form onSubmit={handleCreateUser} className="flex flex-col gap-4 py-2 select-none">
          <Input 
            label="Correo Electrónico de la Cuenta"
            placeholder="cliente@ejemplo.com"
            type="email"
            value={newUserEmail}
            onChange={e => setNewUserEmail(e.target.value)}
          />

          <Input 
            label="Nombre de Usuario (Opcional)"
            placeholder="Ej. Juan Pérez"
            value={newUserName}
            onChange={e => setNewUserName(e.target.value)}
          />

          <Select 
            label="Plan a Asignar Directamente"
            value={newUserPlan}
            onChange={e => setNewUserPlan(e.target.value as any)}
            options={[
              { value: 'premium', label: '⚡ Plan Premium ($59 MXN/mes)' },
              { value: 'lifetime', label: '⭐ Plan Vitalicio ($1,299 MXN pago único)' },
              { value: 'free', label: 'Plan Gratuito' }
            ]}
          />

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" type="button" onClick={() => setIsAddUserOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit" className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold">
              Crear y Asignar Plan
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal Configuración Supabase */}
      <Dialog
        isOpen={isCloudConfigOpen}
        onClose={() => setIsCloudConfigOpen(false)}
        title="Conexión Nube Supabase"
        size="md"
      >
        <form onSubmit={handleSaveSupaCloud} className="flex flex-col gap-4 py-2 select-none">
          <p className="text-xs text-text-secondary">
            Ingresa tus credenciales de proyecto de Supabase para sincronizar automáticamente los planes de los usuarios en la nube.
          </p>

          <Input 
            label="Supabase Project URL"
            placeholder="https://xyz.supabase.co"
            value={supaUrl}
            onChange={e => setSupaUrl(e.target.value)}
          />

          <Input 
            label="Supabase Anon / Public API Key"
            placeholder="eyJhbGciOiJIUzI1NiIsIn..."
            value={supaKey}
            onChange={e => setSupaKey(e.target.value)}
          />

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" type="button" onClick={() => setIsCloudConfigOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit" className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold">
              Guardar Credenciales
            </Button>
          </div>
        </form>
      </Dialog>

    </div>
  );
};
