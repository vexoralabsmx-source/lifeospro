import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/lifeDB';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { 
  ShieldAlert, QrCode, Phone, Heart, User, 
  Printer, Share2, Download, AlertTriangle
} from 'lucide-react';

export const IceQr: React.FC = () => {
  const { user } = useApp();

  // Query ICE Record
  const healthRecords = useLiveQuery(
    () => db.healthRecords.where('userId').equals(user || 'local_user').toArray(),
    [user]
  );

  const ice = healthRecords?.find(r => r.recordType === 'ice');

  const bloodType = ice?.bloodType || 'O+';
  const allergies = ice?.allergies || 'Ninguna registrada';
  const doctorName = ice?.doctorName || 'No asignado';
  const doctorPhone = ice?.doctorPhone || '55-0000-0000';

  // Construct QR Payload text
  const qrDataText = `FICHA ICE EMERGENCIA - LIFEOS PRO
Nombre: ${user || 'Usuario'}
Grupo Sanguíneo: ${bloodType}
Alergias: ${allergies}
Médico/Contacto: ${doctorName} (${doctorPhone})
Cómputo Local Cifrado por Vexora Labs`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrDataText)}`;

  const handlePrintCard = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-6 select-none animate-fade-in print:p-0">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-primary/40 pb-4 print:hidden">
        <div>
          <h2 className="font-heading font-black text-2xl text-text-primary tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-500" /> Tarjeta de Emergencia ICE & Código QR
          </h2>
          <p className="text-xs text-text-secondary mt-0.5 font-medium">
            Genera tu ficha médica impresas o pantalla de bloqueo para emergencias médicas.
          </p>
        </div>

        <Button 
          variant="primary" 
          size="sm" 
          onClick={handlePrintCard}
          className="gap-1.5 text-xs font-bold py-2.5 rounded-xl cursor-pointer"
        >
          <Printer className="w-4 h-4" /> Imprimir Tarjeta de Billetera
        </Button>
      </div>

      {/* Main Wallet Card Preview */}
      <div className="flex flex-col items-center justify-center py-4">
        
        {/* PHYSICAL CREDIT CARD SIZE CONTAINER */}
        <Card variant="glass" className="w-full max-w-md p-6 border-rose-500/40 bg-linear-to-br from-rose-500/10 via-zinc-900 to-rose-950/20 relative overflow-hidden shadow-2xl rounded-3xl">
          <div className="flex items-center justify-between border-b border-rose-500/30 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-rose-500" />
              <span className="font-heading font-black text-sm text-text-primary tracking-wide">
                FICHA MÉDICA ICE
              </span>
            </div>
            <span className="text-[10px] font-black uppercase text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/30">
              En Caso de Emergencia
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 items-center">
            {/* Left QR Code */}
            <div className="col-span-1 bg-white p-2 rounded-2xl shadow-md flex items-center justify-center">
              <img 
                src={qrImageUrl} 
                alt="QR Emergencia" 
                className="w-full h-auto object-contain rounded-lg"
              />
            </div>

            {/* Right Details */}
            <div className="col-span-2 flex flex-col gap-2 text-xs">
              <div>
                <span className="text-[9px] uppercase font-bold text-text-secondary">Titular</span>
                <p className="font-black text-sm text-text-primary truncate">{user || 'Usuario'}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[9px] uppercase font-bold text-text-secondary">Tipo Sangre</span>
                  <p className="font-black text-rose-400 text-sm">{bloodType}</p>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-text-secondary">Contacto Urgencia</span>
                  <p className="font-bold text-text-primary text-[11px] truncate">{doctorPhone}</p>
                </div>
              </div>

              <div>
                <span className="text-[9px] uppercase font-bold text-text-secondary">Alergias</span>
                <p className="font-bold text-amber-300 text-[11px] truncate">{allergies}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-rose-500/20 flex items-center justify-between text-[10px] text-text-secondary">
            <span>Escanea el QR para leer datos sin internet</span>
            <span className="font-bold text-rose-400">✨ Vexora Labs</span>
          </div>
        </Card>

      </div>

    </div>
  );
};
