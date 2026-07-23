import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type PasswordRecord } from '../db/lifeDB';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Dialog } from '../components/ui/Dialog';
import { 
  KeyRound, ShieldCheck, Lock, Copy, Eye, EyeOff, 
  Sparkles, Plus, Trash2, Globe, CreditCard, Wifi, FileText, Check
} from 'lucide-react';
import { encryptData, decryptData } from '../utils/security';

export const Passwords: React.FC = () => {
  const { user, derivedKey, pinEnabled } = useApp();
  const [activeTab, setActiveTab] = useState<'all' | 'web' | 'card' | 'wifi' | 'note'>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Record<number, string>>({});
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<PasswordRecord['category']>('web');
  const [accountUsername, setAccountUsername] = useState('');
  const [rawSecret, setRawSecret] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');

  // Password Generator State
  const [passLength, setPassLength] = useState(16);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);

  // Query Passwords
  const passwordList = useLiveQuery(
    () => db.passwordRecords.where('userId').equals(user || 'local_user').toArray(),
    [user]
  );

  if (!passwordList) {
    return (
      <div className="flex flex-col gap-6 animate-pulse p-4">
        <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-1/4" />
        <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
      </div>
    );
  }

  const filteredPasswords = passwordList.filter(p => {
    if (activeTab !== 'all' && p.category !== activeTab) return false;
    return true;
  });

  // Generate Random Secure Password
  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nums = '0123456789';
    const syms = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let validChars = chars;
    if (includeNumbers) validChars += nums;
    if (includeSymbols) validChars += syms;

    let generated = '';
    const array = new Uint32Array(passLength);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < passLength; i++) {
      generated += validChars[array[i] % validChars.length];
    }
    setRawSecret(generated);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !rawSecret.trim()) return;

    let encryptedSecret = rawSecret;
    let secretIv = undefined;

    if (derivedKey) {
      try {
        const res = await encryptData(rawSecret, derivedKey);
        encryptedSecret = res.ciphertext;
        secretIv = res.iv;
      } catch (err) {
        console.error('Encryption failed', err);
      }
    }

    await db.passwordRecords.add({
      userId: user || 'local_user',
      title,
      category,
      accountUsername: accountUsername || undefined,
      encryptedSecret,
      secretIv,
      url: url || undefined,
      notes: notes || undefined,
      isFavorite: false,
      createdAt: new Date().toISOString()
    });

    // Reset Form
    setTitle('');
    setAccountUsername('');
    setRawSecret('');
    setUrl('');
    setNotes('');
    setIsAddOpen(false);
  };

  const toggleRevealSecret = async (rec: PasswordRecord) => {
    if (!rec.id) return;
    if (revealedIds[rec.id]) {
      const next = { ...revealedIds };
      delete next[rec.id];
      setRevealedIds(next);
      return;
    }

    let plain = rec.encryptedSecret;
    if (rec.secretIv && derivedKey) {
      try {
        plain = await decryptData(rec.encryptedSecret, rec.secretIv, derivedKey);
      } catch {
        plain = 'Error al descifrar (Clave inválida)';
      }
    }
    setRevealedIds({ ...revealedIds, [rec.id]: plain });
  };

  const copyToClipboard = async (rec: PasswordRecord) => {
    let plain = rec.encryptedSecret;
    if (rec.secretIv && derivedKey) {
      try {
        plain = await decryptData(rec.encryptedSecret, rec.secretIv, derivedKey);
      } catch {}
    }
    navigator.clipboard.writeText(plain);
    if (rec.id) {
      setCopiedId(rec.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Eliminar este elemento de la bóveda de contraseñas?')) {
      await db.passwordRecords.delete(id);
    }
  };

  const getCategoryIcon = (cat: PasswordRecord['category']) => {
    switch (cat) {
      case 'web': return <Globe className="w-4 h-4 text-blue-500" />;
      case 'card': return <CreditCard className="w-4 h-4 text-emerald-500" />;
      case 'wifi': return <Wifi className="w-4 h-4 text-amber-500" />;
      case 'note': return <FileText className="w-4 h-4 text-purple-500" />;
    }
  };

  return (
    <div className="flex flex-col gap-6 select-none animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-primary/40 pb-4">
        <div>
          <h2 className="font-heading font-black text-2xl text-text-primary tracking-tight flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-brand" /> Bóveda de Contraseñas & Claves
          </h2>
          <p className="text-xs text-text-secondary mt-0.5 font-medium">
            Almacenamiento seguro encriptado localmente (AES-GCM) para tus accesos.
          </p>
        </div>

        <Button 
          variant="primary" 
          size="sm" 
          onClick={() => setIsAddOpen(true)}
          className="gap-1.5 text-xs font-bold py-2.5 rounded-xl cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Agregar Registro
        </Button>
      </div>

      {/* Security Status Banner */}
      {!pinEnabled && (
        <Card variant="glass" className="p-4 border-amber-500/30 bg-amber-500/5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-xs text-text-secondary">
              <strong className="text-text-primary">Activa tu PIN de seguridad:</strong> Para cifrar de forma avanzada todas tus contraseñas con Web Crypto API.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => window.location.hash = '#/settings'} className="text-xs font-bold border-amber-500/30 text-amber-500 cursor-pointer">
            Ir a Ajustes
          </Button>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border-primary/40 text-xs font-bold gap-2 overflow-x-auto">
        {[
          { id: 'all', label: 'Todos' },
          { id: 'web', label: 'Servicios Web' },
          { id: 'card', label: 'Tarjetas & PINs' },
          { id: 'wifi', label: 'Redes Wi-Fi' },
          { id: 'note', label: 'Notas Secretas' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2.5 border-b-2 -mb-px whitespace-nowrap transition-colors cursor-pointer ${activeTab === t.id ? 'border-brand text-brand' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Passwords Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPasswords.length > 0 ? (
          filteredPasswords.map(rec => (
            <Card key={rec.id} className="p-5 flex flex-col justify-between gap-4 border-border-primary/60 hover:border-brand/30 transition-all">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
                    {getCategoryIcon(rec.category)}
                    <span className="capitalize">{rec.category}</span>
                  </span>
                  {rec.secretIv && (
                    <Badge variant="success" size="xs">AES-GCM Cifrado</Badge>
                  )}
                </div>

                <h4 className="font-heading font-black text-base text-text-primary mt-1">{rec.title}</h4>
                
                {rec.accountUsername && (
                  <p className="text-xs text-text-secondary font-medium">
                    Usuario: <strong className="text-text-primary">{rec.accountUsername}</strong>
                  </p>
                )}

                {/* Secret Value Row */}
                <div className="flex items-center justify-between bg-surface-secondary/60 border border-border-primary/45 p-2.5 rounded-xl text-xs font-mono mt-1">
                  <span className="truncate max-w-[180px]">
                    {rec.id && revealedIds[rec.id] ? revealedIds[rec.id] : '••••••••••••••••'}
                  </span>
                  
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => toggleRevealSecret(rec)}
                      className="p-1 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                      title={rec.id && revealedIds[rec.id] ? 'Ocultar' : 'Mostrar'}
                    >
                      {rec.id && revealedIds[rec.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button 
                      onClick={() => copyToClipboard(rec)}
                      className="p-1 text-text-secondary hover:text-brand transition-colors cursor-pointer"
                      title="Copiar contraseña"
                    >
                      {rec.id && copiedId === rec.id ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {rec.url && (
                  <a href={rec.url.startsWith('http') ? rec.url : `https://${rec.url}`} target="_blank" rel="noreferrer" className="text-[11px] text-brand hover:underline truncate mt-1">
                    {rec.url}
                  </a>
                )}
              </div>

              <div className="flex items-center justify-end border-t border-border-primary/30 pt-3">
                <button 
                  onClick={() => rec.id && handleDelete(rec.id)}
                  className="text-text-secondary hover:text-danger p-1 transition-colors cursor-pointer"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-text-secondary flex flex-col items-center">
            <KeyRound className="w-10 h-10 opacity-25 mb-2 text-brand" />
            <p className="text-xs font-bold text-text-primary">Bóveda vacía en esta categoría</p>
            <p className="text-[11px] text-text-secondary mt-1">Guarda tus contraseñas y accesos con cifrado local seguro.</p>
          </div>
        )}
      </div>

      {/* Modal Agregar Registro */}
      <Dialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Nuevo Registro en Bóveda"
        size="md"
      >
        <form onSubmit={handleSavePassword} className="flex flex-col gap-4 py-2 select-none">
          <Select 
            label="Categoría"
            value={category}
            onChange={e => setCategory(e.target.value as any)}
            options={[
              { value: 'web', label: 'Servicio Web / App' },
              { value: 'card', label: 'Tarjeta de Crédito / NIP' },
              { value: 'wifi', label: 'Red Wi-Fi' },
              { value: 'note', label: 'Nota Secreta Cifrada' }
            ]}
          />

          <Input 
            label="Título / Nombre del Servicio"
            placeholder="Ej. Netflix / Banco Santander / WiFi Casa"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />

          <Input 
            label="Usuario / Correo / Nombre de Red"
            placeholder="usuario@ejemplo.com"
            value={accountUsername}
            onChange={e => setAccountUsername(e.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text-secondary">Contraseña / Clave Secreta</label>
              <button 
                type="button" 
                onClick={generatePassword}
                className="text-[11px] font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-amber-500" /> Generar Clave Segura
              </button>
            </div>
            <Input 
              type="text"
              placeholder="••••••••••••"
              value={rawSecret}
              onChange={e => setRawSecret(e.target.value)}
            />
          </div>

          <Input 
            label="Sitio Web / URL (Opcional)"
            placeholder="https://app.com"
            value={url}
            onChange={e => setUrl(e.target.value)}
          />

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" type="button" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit">Guardar en Bóveda</Button>
          </div>
        </form>
      </Dialog>

    </div>
  );
};
