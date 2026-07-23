import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type DocumentRecord } from '../db/lifeDB';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Dialog } from '../components/ui/Dialog';
import { EmptyState } from '../components/ui/EmptyState';
import { 
  FileText, Search, Plus, Grid, List, Heart, Archive, 
  Trash2, ShieldAlert, KeyRound, Download, Upload, 
  Eye, Calendar, Tag, AlertCircle, FileUp
} from 'lucide-react';
import { encryptData, decryptData } from '../utils/security';

export const Documents: React.FC = () => {
  const { user, derivedKey, pinEnabled, enablePin, unlockApp, plan } = useApp();
  
  // States
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'archived' | 'trash' | 'sensitive'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isGridView, setIsGridView] = useState(true);
  
  // PIN Vault Verification State
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  
  // Dialog Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);
  const [decryptedNotes, setDecryptedNotes] = useState<string | null>(null);
  const [decryptedNumber, setDecryptedNumber] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Form State
  const [docName, setDocName] = useState('');
  const [docCategory, setDocCategory] = useState('Personal');
  const [docNumber, setDocNumber] = useState('');
  const [issuer, setIssuer] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [isSensitive, setIsSensitive] = useState(false);
  const [attachmentBase64, setAttachmentBase64] = useState<string>('');
  const [attachmentName, setAttachmentName] = useState('');

  // --- QUERY DOCUMENTS ---
  const now = new Date();
  const documents = useLiveQuery(() => db.documents.toArray(), []);

  if (!documents) {
    return (
      <div className="flex flex-col gap-6 animate-pulse p-4">
        <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-1/4" />
        <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
      </div>
    );
  }

  // --- FILTER LOGIC ---
  const filteredDocs = documents.filter(doc => {
    // 1. Tab filters
    if (activeTab === 'favorites') {
      if (!doc.favorite || doc.deleted) return false;
    } else if (activeTab === 'archived') {
      if (!doc.archived || doc.deleted) return false;
    } else if (activeTab === 'trash') {
      if (!doc.deleted) return false;
    } else if (activeTab === 'sensitive') {
      if (!doc.isSensitive || doc.deleted) return false;
    } else {
      // 'all'
      if (doc.archived || doc.deleted || doc.isSensitive) return false;
    }

    // 2. Category filter
    if (selectedCategory !== 'All' && doc.category !== selectedCategory) return false;

    // 3. Search query filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = doc.name.toLowerCase().includes(q);
      const matchCategory = doc.category.toLowerCase().includes(q);
      const matchTags = doc.tags && doc.tags.some(t => t.toLowerCase().includes(q));
      return matchName || matchCategory || matchTags;
    }

    return true;
  });

  // --- VAULT PIN UNLOCK ---
  const handleUnlockVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    if (!pinInput.trim()) return;

    const success = await unlockApp(pinInput);
    if (success) {
      setVaultUnlocked(true);
      setPinInput('');
    } else {
      setPinError('PIN incorrecto. Intenta de nuevo.');
    }
  };

  // --- FILE ATTACHMENT UPLOAD ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachmentName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachmentBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // --- SAVE DOCUMENT (CREATE/EDIT) ---
  const handleSaveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) return;

    if (plan === 'free' && (!selectedDoc && (documents?.length || 0) >= 10)) {
      alert('El plan gratuito está limitado a 10 documentos. Por favor actualiza a Premium para guardar documentos ilimitados.');
      return;
    }

    let finalNotes = notes;
    let finalNumber = docNumber;
    let encryptionData = null;

    // If sensitive, encrypt fields locally
    if (isSensitive) {
      if (!derivedKey) {
        alert('Debes tener tu bóveda de PIN desbloqueada para crear documentos sensibles.');
        return;
      }
      try {
        const encryptedNotesResult = await encryptData(notes, derivedKey);
        const encryptedNumberResult = await encryptData(docNumber, derivedKey);
        finalNotes = encryptedNotesResult.ciphertext;
        finalNumber = encryptedNumberResult.ciphertext;
        // Keep tracking IVs in document details
        encryptionData = {
          notesIv: encryptedNotesResult.iv,
          numberIv: encryptedNumberResult.iv
        };
      } catch (err) {
        console.error('Encryption failed', err);
        alert('Fallo en la encriptación de datos.');
        return;
      }
    }

    const tags = tagInput.split(',').map(t => t.trim()).filter(t => t !== '');

    const newDoc: DocumentRecord = {
      userId: user || 'local_user',
      name: docName,
      category: docCategory,
      documentNumber: finalNumber,
      issuer: issuer || undefined,
      expiryDate: expiryDate || undefined,
      notes: finalNotes,
      tags,
      isSensitive,
      attachment: attachmentBase64 || undefined,
      fileName: attachmentName || undefined,
      archived: false,
      deleted: false,
      favorite: false,
      createdAt: new Date().toISOString(),
      // Store IV metadata inside the document object structure dynamically if encrypted
      ...((isSensitive && encryptionData) ? { _security: encryptionData } : {})
    };

    const docId = await db.documents.add(newDoc);

    // Add activity log
    await db.activities.add({
      userId: user || 'local_user',
      action: 'created',
      module: 'documents',
      details: `Se agregó el documento "${docName}" (${docCategory}).`,
      date: new Date().toISOString()
    });

    // Reset Form & Close
    resetForm();
    setIsAddOpen(false);
  };

  const resetForm = () => {
    setDocName('');
    setDocCategory('Personal');
    setDocNumber('');
    setIssuer('');
    setExpiryDate('');
    setNotes('');
    setTagInput('');
    setIsSensitive(false);
    setAttachmentBase64('');
    setAttachmentName('');
  };

  // --- ACTIONS (FAVORITE, ARCHIVE, DELETE, RESTORE) ---
  const handleToggleFavorite = async (doc: DocumentRecord) => {
    await db.documents.update(doc.id!, { favorite: !doc.favorite });
  };

  const handleToggleArchive = async (doc: DocumentRecord) => {
    await db.documents.update(doc.id!, { archived: !doc.archived });
    setIsDetailOpen(false);
  };

  const handleDelete = async (doc: DocumentRecord) => {
    if (doc.deleted) {
      // Permanent delete
      if (confirm(`¿Estás seguro de eliminar permanentemente "${doc.name}"? Esta acción no se puede deshacer.`)) {
        await db.documents.delete(doc.id!);
        setIsDetailOpen(false);
      }
    } else {
      // Move to trash
      await db.documents.update(doc.id!, { deleted: true });
      setIsDetailOpen(false);
      
      // Log activity
      await db.activities.add({
        userId: user || 'local_user',
        action: 'deleted',
        module: 'documents',
        details: `Se movió a la papelera el documento: ${doc.name}`,
        date: new Date().toISOString()
      });
    }
  };

  const handleRestore = async (doc: DocumentRecord) => {
    await db.documents.update(doc.id!, { deleted: false });
    setIsDetailOpen(false);
  };

  // --- VIEW DETAILS & DECRYPT ---
  const handleViewDetails = async (doc: DocumentRecord) => {
    setSelectedDoc(doc);
    setDecryptedNotes(null);
    setDecryptedNumber(null);
    setIsDetailOpen(true);

    if (doc.isSensitive) {
      setIsDecrypting(true);
      if (derivedKey) {
        try {
          // Access metadata casted dynamically
          const meta = (doc as any)._security;
          if (meta) {
            const decNotes = doc.notes ? await decryptData(doc.notes, meta.notesIv, derivedKey) : '';
            const decNum = doc.documentNumber ? await decryptData(doc.documentNumber, meta.numberIv, derivedKey) : '';
            setDecryptedNotes(decNotes);
            setDecryptedNumber(decNum);
          } else {
            // legacy or unencrypted metadata fallback
            setDecryptedNotes(doc.notes || '');
            setDecryptedNumber(doc.documentNumber || '');
          }
        } catch (err) {
          console.error('Decryption failed', err);
        }
      }
      setIsDecrypting(false);
    } else {
      setDecryptedNotes(doc.notes || null);
      setDecryptedNumber(doc.documentNumber || null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading font-black text-2xl text-text-primary tracking-tight">Gestor de Documentos</h2>
          <p className="text-xs text-text-secondary font-medium mt-0.5">Guarda, organiza y protege tu documentación importante de forma offline.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsAddOpen(true)} className="gap-1.5 self-start sm:self-center rounded-xl">
          <Plus className="w-4 h-4" /> Nuevo Documento
        </Button>
      </div>

      {/* Tabs list selector */}
      <div className="flex border-b border-border-primary/45 overflow-x-auto gap-1 select-none">
        {(['all', 'sensitive', 'favorites', 'archived', 'trash'] as const).map((tab) => {
          const tabLabels = {
            all: 'Bandeja Principal',
            sensitive: 'Expedientes Sensibles',
            favorites: 'Favoritos',
            archived: 'Archivados',
            trash: 'Papelera'
          };
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                if (tab !== 'sensitive') setVaultUnlocked(false);
              }}
              className={`
                px-4.5 py-3.5 text-xs font-bold whitespace-nowrap border-b-2 -mb-px transition-all duration-200 cursor-pointer
                ${active 
                  ? 'border-brand text-brand' 
                  : 'border-transparent text-text-secondary hover:text-text-primary'
                }
              `}
            >
              {tabLabels[tab]}
            </button>
          );
        })}
      </div>

      {/* Filter and Search actions */}
      <div className="flex flex-col sm:flex-row gap-3 select-none">
        <div className="flex-1 relative flex items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-text-secondary" />
          <Input 
            placeholder="Buscar por nombre, categoría o etiquetas..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 py-2.5 text-xs" 
          />
        </div>
        
        <div className="flex gap-2">
          <Select 
            value={selectedCategory} 
            onChange={e => setSelectedCategory(e.target.value)}
            options={[
              { value: 'All', label: 'Categorías' },
              { value: 'Personal', label: 'Personal' },
              { value: 'Licencia', label: 'Licencia' },
              { value: 'Pasaporte', label: 'Pasaporte' },
              { value: 'Seguros', label: 'Seguros' },
              { value: 'Facturas', label: 'Facturas' },
              { value: 'Vehículo', label: 'Vehículos' },
              { value: 'Hogar', label: 'Hogar' },
              { value: 'Otros', label: 'Otros' }
            ]}
            className="py-2 text-xs w-[140px]"
          />
          
          <button 
            onClick={() => setIsGridView(!isGridView)}
            className="px-3 border border-border-primary rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-secondary/40 transition-colors"
          >
            {isGridView ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* --- RENDER DOCUMENTS GRID/LIST --- */}
      {activeTab === 'sensitive' && !vaultUnlocked && pinEnabled && !derivedKey ? (
        /* VAULT LOCK SCREEN */
        <Card className="p-8 py-16 flex flex-col items-center justify-center text-center max-w-md mx-auto mt-6 animate-scale-in">
          <div className="w-14 h-14 rounded-2xl bg-danger-light text-danger flex items-center justify-center mb-4">
            <KeyRound className="w-6 h-6" />
          </div>
          <h3 className="font-heading font-bold text-base text-text-primary">Bóveda Encriptada</h3>
          <p className="text-xs text-text-secondary mt-1.5 max-w-xs leading-relaxed mb-6">
            Escribe tu PIN de seguridad para acceder a los expedientes encriptados del lado del cliente.
          </p>
          <form onSubmit={handleUnlockVault} className="w-full flex flex-col gap-3">
            <Input 
              type="password" 
              maxLength={6} 
              placeholder="Introduce tu PIN" 
              value={pinInput}
              onChange={e => setPinInput(e.target.value.replace(/\D/g, ''))}
              className="text-center font-mono tracking-widest text-lg py-3.5"
            />
            {pinError && <p className="text-[11px] text-danger font-medium">{pinError}</p>}
            <Button type="submit" variant="primary" className="w-full text-xs font-bold py-3.5">
              Desbloquear Bóveda
            </Button>
          </form>
        </Card>
      ) : activeTab === 'sensitive' && !pinEnabled ? (
        /* VAULT NOT CONFIGURED YET WARNING */
        <Card className="p-8 py-16 flex flex-col items-center justify-center text-center max-w-md mx-auto mt-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="font-heading font-bold text-base text-text-primary">PIN No Configurado</h3>
          <p className="text-xs text-text-secondary mt-1.5 max-w-xs leading-relaxed mb-6">
            Para guardar expedientes sensibles encriptados en local, necesitas establecer un PIN en la configuración de seguridad.
          </p>
          <button 
            onClick={() => window.location.hash = '#/settings'} 
            className="text-xs font-bold text-brand hover:underline"
          >
            Configurar PIN de Seguridad
          </button>
        </Card>
      ) : filteredDocs.length > 0 ? (
        isGridView ? (
          /* GRID VIEW */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredDocs.map(doc => (
              <Card 
                key={doc.id} 
                hoverable 
                onClick={() => handleViewDetails(doc)} 
                className="p-4 flex flex-col justify-between h-44 group relative"
              >
                <div className="flex items-start justify-between select-none">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${doc.isSensitive ? 'bg-danger-light text-danger' : 'bg-blue-500/10 text-blue-500'}`}>
                      <FileText className="w-4.5 h-4.5" />
                    </div>
                    <Badge variant="neutral" size="xs">{doc.category}</Badge>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    {doc.favorite && <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />}
                    {doc.isSensitive && <KeyRound className="w-3.5 h-3.5 text-danger" />}
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="font-heading font-bold text-sm text-text-primary line-clamp-1 group-hover:text-brand transition-colors">{doc.name}</h4>
                  <p className="text-[10px] text-text-secondary font-semibold mt-1">
                    {doc.expiryDate ? `Vence: ${doc.expiryDate}` : 'Sin fecha de vencimiento'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1 mt-3 border-t border-border-primary/20 pt-3">
                  {doc.tags.slice(0, 2).map((t, idx) => (
                    <Badge key={idx} variant="neutral" size="xs">{t}</Badge>
                  ))}
                  {doc.tags.length > 2 && <span className="text-[9px] font-bold text-text-secondary select-none">+{doc.tags.length - 2}</span>}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          /* LIST VIEW */
          <Card className="divide-y divide-border-primary/40 select-none">
            {filteredDocs.map(doc => (
              <div 
                key={doc.id}
                onClick={() => handleViewDetails(doc)}
                className="flex items-center justify-between p-4 hover:bg-surface-secondary/20 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${doc.isSensitive ? 'bg-danger-light text-danger' : 'bg-blue-500/10 text-blue-500'}`}>
                    <FileText className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-text-primary">{doc.name}</h4>
                    <p className="text-[10px] text-text-secondary mt-0.5">{doc.category} • {doc.expiryDate ? `Vence el ${doc.expiryDate}` : 'Sin fecha de vencimiento'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {doc.tags.slice(0, 2).map((t, idx) => (
                      <Badge key={idx} variant="neutral" size="xs">{t}</Badge>
                    ))}
                  </div>
                  {doc.favorite && <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />}
                </div>
              </div>
            ))}
          </Card>
        )
      ) : (
        /* EMPTY STATE */
        <EmptyState 
          title="Aún no tienes documentos registrados"
          description="Sube copias de tus credenciales o escanea comprobantes físicos con tu cámara para tenerlos listos cuando los necesites."
          icon={<FileText className="w-6 h-6" />}
          actionText="Agregar mi primer documento"
          onAction={() => setIsAddOpen(true)}
        />
      )}

      {/* --- DIALOG MODALS --- */}

      {/* 1. ADD DOCUMENT DIALOG */}
      <Dialog 
        isOpen={isAddOpen} 
        onClose={() => { setIsAddOpen(false); resetForm(); }} 
        title="Subir Nuevo Documento"
        size="md"
      >
        <form onSubmit={handleSaveDoc} className="flex flex-col gap-4">
          <Input 
            label="Nombre del Documento *" 
            placeholder="Ej. Pasaporte Mike" 
            value={docName}
            onChange={e => setDocName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select 
              label="Categoría"
              value={docCategory}
              onChange={e => setDocCategory(e.target.value)}
              options={[
                { value: 'Personal', label: 'Personal' },
                { value: 'Licencia', label: 'Licencia' },
                { value: 'Pasaporte', label: 'Pasaporte' },
                { value: 'Seguros', label: 'Seguros' },
                { value: 'Facturas', label: 'Facturas' },
                { value: 'Vehículo', label: 'Vehículos' },
                { value: 'Hogar', label: 'Hogar' },
                { value: 'Otros', label: 'Otros' }
              ]}
            />
            <Input 
              label="Fecha de Vencimiento" 
              type="date"
              value={expiryDate}
              onChange={e => setExpiryDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Número de Documento" 
              placeholder="Ej. PAS-MX-12345" 
              value={docNumber}
              onChange={e => setDocNumber(e.target.value)}
            />
            <Input 
              label="Institución Emisora" 
              placeholder="Ej. SRE / INE" 
              value={issuer}
              onChange={e => setIssuer(e.target.value)}
            />
          </div>

          <Input 
            label="Etiquetas (Separadas por comas)" 
            placeholder="Ej. auto, urgente, personal" 
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
          />

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-text-secondary">Notas / Información Adicional</label>
            <textarea
              rows={3}
              placeholder="Detalles sobre el documento..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full rounded-xl border border-border-primary bg-surface p-3 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          {/* Attachment upload */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-text-secondary">Adjuntar Archivo (PDF, Imagen)</label>
            <label className="flex items-center justify-center gap-2 border border-dashed border-border-primary/80 hover:bg-surface-secondary/40 rounded-xl p-4 cursor-pointer text-xs transition-colors">
              <FileUp className="w-5 h-5 text-text-secondary" />
              <span>{attachmentName || 'Haz clic para seleccionar o arrastra un archivo'}</span>
              <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileChange} />
            </label>
          </div>

          {/* Sensitive Check */}
          {pinEnabled && (
            <div className="flex items-center gap-2 p-3 bg-danger-light/20 border border-danger/10 rounded-xl mt-1 select-none">
              <input 
                type="checkbox" 
                id="is-sensitive-check" 
                checked={isSensitive}
                onChange={e => setIsSensitive(e.target.checked)}
                className="w-4 h-4 rounded text-danger border-border-primary accent-danger"
              />
              <div className="flex flex-col gap-0.5">
                <label htmlFor="is-sensitive-check" className="text-xs font-bold text-danger flex items-center gap-1">
                  Guardar como expediente sensible
                </label>
                <p className="text-[10px] text-text-secondary">Se guardará encriptado localmente y requerirá PIN para abrirse.</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 mt-3 pt-3 border-t border-border-primary/30">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary" size="sm">Guardar Documento</Button>
          </div>
        </form>
      </Dialog>

      {/* 2. DOCUMENT DETAIL VIEW DIALOG */}
      <Dialog
        isOpen={isDetailOpen}
        onClose={() => { setIsDetailOpen(false); setSelectedDoc(null); }}
        title={selectedDoc?.name || ''}
        size="md"
      >
        {selectedDoc && (
          <div className="flex flex-col gap-5">
            {/* Urgency warnings */}
            {selectedDoc.expiryDate && new Date(selectedDoc.expiryDate) < now && (
              <div className="p-3 bg-danger-light border border-danger/10 text-danger rounded-xl flex items-center gap-2 text-xs font-bold animate-pulse-slow">
                <AlertCircle className="w-4.5 h-4.5" /> Este documento ha vencido.
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-xs select-none">
              <div className="bg-surface-secondary/40 p-3 rounded-xl border border-border-primary/30">
                <span className="text-text-secondary block font-semibold">Categoría</span>
                <span className="font-bold text-text-primary mt-1 block">{selectedDoc.category}</span>
              </div>
              <div className="bg-surface-secondary/40 p-3 rounded-xl border border-border-primary/30">
                <span className="text-text-secondary block font-semibold">Número de Documento</span>
                <span className="font-bold text-text-primary mt-1 block select-all">
                  {selectedDoc.isSensitive 
                    ? (isDecrypting ? 'Descifrando...' : (decryptedNumber || '••••••••••')) 
                    : (selectedDoc.documentNumber || 'N/A')
                  }
                </span>
              </div>
              <div className="bg-surface-secondary/40 p-3 rounded-xl border border-border-primary/30">
                <span className="text-text-secondary block font-semibold">Institución Emisora</span>
                <span className="font-bold text-text-primary mt-1 block">{selectedDoc.issuer || 'N/A'}</span>
              </div>
              <div className="bg-surface-secondary/40 p-3 rounded-xl border border-border-primary/30">
                <span className="text-text-secondary block font-semibold">Fecha de Vencimiento</span>
                <span className="font-bold text-text-primary mt-1 block">{selectedDoc.expiryDate || 'Sin vencimiento'}</span>
              </div>
            </div>

            {/* Decrypted Notes */}
            <div className="bg-surface-secondary/25 p-4.5 border border-border-primary/40 rounded-xl select-none">
              <span className="text-xs font-bold text-text-secondary block mb-1">Notas</span>
              <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap select-all">
                {selectedDoc.isSensitive
                  ? (isDecrypting ? 'Descifrando...' : (decryptedNotes || 'Contenido cifrado con PIN.'))
                  : (selectedDoc.notes || 'Sin anotaciones.')
                }
              </p>
            </div>

            {/* Tags badges */}
            {selectedDoc.tags && selectedDoc.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 select-none">
                {selectedDoc.tags.map((t, idx) => (
                  <Badge key={idx} variant="brand" size="xs">{t}</Badge>
                ))}
              </div>
            )}

            {/* Document attachment preview & download */}
            {selectedDoc.attachment && (
              <div className="border border-border-primary rounded-xl overflow-hidden bg-bg-primary p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 select-none">
                  <FileText className="w-5 h-5 text-brand" />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-text-primary truncate max-w-[200px]">{selectedDoc.fileName || 'documento_adjunto.jpg'}</span>
                    <span className="text-[9px] text-text-secondary">Tamaño optimizado local</span>
                  </div>
                </div>
                <a 
                  href={selectedDoc.attachment} 
                  download={selectedDoc.fileName || 'LifeOS_Doc'}
                  className="inline-flex items-center justify-center p-2 rounded-xl bg-surface hover:bg-surface-secondary text-brand border border-border-primary/50 shadow-sm transition-colors"
                  title="Descargar archivo"
                >
                  <Download className="w-4.5 h-4.5" />
                </a>
              </div>
            )}

            {/* Bottom Actions toolbar */}
            <div className="flex flex-wrap items-center justify-between border-t border-border-primary/30 pt-4 mt-2">
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleToggleFavorite(selectedDoc)}
                  className="px-3"
                >
                  <Heart className={`w-4 h-4 mr-1.5 ${selectedDoc.favorite ? 'fill-red-500 text-red-500' : 'text-text-secondary'}`} />
                  {selectedDoc.favorite ? 'Quitar Favorito' : 'Favorito'}
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleToggleArchive(selectedDoc)}
                  className="px-3"
                >
                  <Archive className="w-4 h-4 mr-1.5 text-text-secondary" />
                  {selectedDoc.archived ? 'Desarchivar' : 'Archivar'}
                </Button>
              </div>

              <Button 
                variant="danger" 
                size="sm" 
                onClick={() => handleDelete(selectedDoc)}
                className="gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                {selectedDoc.deleted ? 'Eliminar Definitivo' : 'Mover a Papelera'}
              </Button>
            </div>
            
            {/* If deleted, show Restore button */}
            {selectedDoc.deleted && (
              <div className="p-3 bg-surface-secondary/40 border border-border-primary/60 rounded-xl flex items-center justify-between text-xs mt-1">
                <span className="font-semibold text-text-secondary">Este documento está en la papelera.</span>
                <Button variant="outline" size="sm" onClick={() => handleRestore(selectedDoc)}>Restaurar</Button>
              </div>
            )}

          </div>
        )}
      </Dialog>

    </div>
  );
};
