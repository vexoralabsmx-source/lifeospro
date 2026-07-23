import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Check, Info, ShieldCheck, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Dialog } from '../components/ui/Dialog';

export const Pricing: React.FC = () => {
  const { plan, setPlan } = useApp();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [activatedPlan, setActivatedPlan] = useState<'premium' | 'lifetime' | null>(null);

  useEffect(() => {
    // Detect redirect success parameters in the hash URL
    const currentHash = window.location.hash;
    if (currentHash.includes('?')) {
      const queryString = currentHash.split('?')[1];
      const params = new URLSearchParams(queryString);
      const status = params.get('status');

      if (status === 'success_monthly' || status === 'success_lifetime' || status === 'success') {
        const targetPlan = status === 'success_lifetime' ? 'lifetime' : 'premium';
        const cycle = status === 'success_monthly' ? 'monthly' : undefined;

        setPlan(targetPlan, cycle).then(() => {
          setActivatedPlan(targetPlan);
          setShowSuccessModal(true);

          // Confetti celebration
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 }
          });

          // Clean url hash path
          window.history.replaceState(null, '', '#/pricing');
        });
      }
    }
  }, [setPlan]);

  // Official Clip Payment Links
  const CLIP_MONTHLY_URL = 'https://pago.clip.mx/v2/suscripcion/08b54cd9-e48a-4dfb-a1cc-7152eaf2bf6a';
  const CLIP_LIFETIME_URL = 'https://pago.clip.mx/v3/9912dc4b-0dfc-46d7-9316-f0c2a205d168';

  const handleCheckoutRedirect = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const faqs = [
    { q: '¿Mis archivos y documentos se suben a algún servidor?', a: 'No en el plan local. LifeOS Pro guarda toda la información y adjuntos de forma local en la base de datos IndexedDB de tu navegador de forma encriptada. Si activas la cuenta Premium, los respaldos se sincronizan de forma segura con tu cuenta de Supabase.' },
    { q: '¿Cómo se activa mi plan tras pagar en Clip?', a: 'Una vez que completes tu pago en la plataforma de Clip, nuestro equipo recibirá la confirmación del pago y activará la cuenta Premium/Vitalicia vinculada a tu correo electrónico de forma inmediata.' },
    { q: '¿Puedo cancelar mi suscripción en cualquier momento?', a: 'Sí. No hay plazos forzosos. Si cancelas tu suscripción Premium, tu cuenta regresará al plan de uso local privado pero conservaremos tus datos almacenados localmente de forma intacta.' },
    { q: '¿Qué cubre el plan Vitalicio / Lifetime?', a: 'Cubre acceso permanente a todas las características Premium de LifeOS Pro de forma indefinida en todos tus dispositivos móviles y computadoras personales, incluyendo futuras actualizaciones.' }
  ];

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto select-none">
      
      {/* Header banner */}
      <div className="text-center py-6 select-none">
        <h2 className="font-heading font-black text-2xl md:text-3xl tracking-tight text-text-primary">
          Elige la mejor forma de organizar tu vida
        </h2>
        <p className="text-xs text-text-secondary mt-1.5 max-w-md mx-auto">
          Comienza gratis de forma local o libera todo el potencial con sincronización cifrada en la nube y almacenamiento ilimitado.
        </p>
      </div>

      {/* Grid of Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch animate-slide-up">
        
        {/* FREE PLAN */}
        <Card className={`p-6 flex flex-col justify-between ${plan === 'free' ? 'border-brand/40 ring-1 ring-brand/10' : 'border-border-primary/50'}`}>
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Uso Básico Local</span>
            <h3 className="font-heading font-black text-xl text-text-primary">Gratis</h3>
            <p className="text-[11px] text-text-secondary leading-relaxed mt-2">Para organizar tu vida personal de forma 100% local, privada y offline en tu dispositivo.</p>
            
            <div className="h-px bg-border-primary/45 my-4" />
            
            <ul className="flex flex-col gap-2.5 text-xs">
              <li className="flex items-start gap-2 text-text-secondary">
                <Check className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                <span><strong>Hasta 50 registros totales</strong> acumulados</span>
              </li>
              <li className="flex items-start gap-2 text-text-secondary">
                <Check className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                <span>10 Documentos & 3 Vehículos</span>
              </li>
              <li className="flex items-start gap-2 text-text-secondary">
                <Check className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                <span>5 Registros Médicos & 5 en Bóveda Claves</span>
              </li>
              <li className="flex items-start gap-2 text-text-secondary">
                <Check className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                <span>3 Metas Financieras & 2 Viajes</span>
              </li>
              <li className="flex items-start gap-2 text-text-secondary">
                <Check className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                <span>5 Hábitos Diarios & Sticky Notes</span>
              </li>
              <li className="flex items-start gap-2 text-text-secondary">
                <Check className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                <span>Acceso a los 19 Módulos de LifeOS Pro</span>
              </li>
              <li className="flex items-start gap-2 text-text-secondary">
                <Check className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                <span>Guardado local offline encriptado (AES-GCM)</span>
              </li>
              <li className="flex items-start gap-2 text-text-secondary">
                <Check className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                <span>Escáner de Documentos & Lectura OCR</span>
              </li>
              <li className="flex items-start gap-2 text-text-secondary">
                <Check className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                <span>Notificaciones Nativas para Celular</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 select-none">
            {plan === 'free' ? (
              <Button disabled className="w-full text-xs font-bold py-3.5">Plan Activo</Button>
            ) : (
              <Button variant="outline" className="w-full text-xs font-bold py-3.5" disabled>
                Uso Local Activo
              </Button>
            )}
          </div>
        </Card>

        {/* PREMIUM MONTHLY PLAN */}
        <Card className={`p-6 flex flex-col justify-between relative ${plan === 'premium' ? 'border-brand/40 ring-1 ring-brand/10' : 'border-border-primary/50 shadow-md'}`}>
          <div className="absolute top-3.5 right-3.5 bg-brand-light text-brand px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide">Popular</div>
          
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Plan Completo</span>
            <h3 className="font-heading font-black text-xl text-text-primary">
              $59 MXN
              <span className="text-xs text-text-secondary font-semibold ml-1">/mes</span>
            </h3>
            <p className="text-[11px] text-text-secondary leading-relaxed mt-2">Acceso sin límites a los 13 módulos y sincronización en la nube con Supabase.</p>
            
            <div className="h-px bg-border-primary/45 my-4" />
            
            <ul className="flex flex-col gap-2.5 text-xs">
              <li className="flex items-start gap-2 text-text-primary">
                <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <span className="font-semibold">Registros y cargas ILIMITADAS</span>
              </li>
              <li className="flex items-start gap-2 text-text-primary">
                <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <span className="font-semibold">Documentos, Vehículos y Salud ILIMITADOS</span>
              </li>
              <li className="flex items-start gap-2 text-text-primary">
                <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <span className="font-semibold">Bóveda de Claves, Viajes y Metas ILIMITADAS</span>
              </li>
              <li className="flex items-start gap-2 text-text-primary">
                <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <span>Sincronización multi-dispositivo en la nube</span>
              </li>
              <li className="flex items-start gap-2 text-text-primary">
                <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <span>Exportaciones completas (JSON, PDF, CSV)</span>
              </li>
              <li className="flex items-start gap-2 text-text-primary">
                <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <span>Copias de seguridad automáticas en la nube</span>
              </li>
              <li className="flex items-start gap-2 text-text-primary">
                <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <span>Soporte prioritario 1-on-1</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 select-none">
            {plan === 'premium' ? (
              <Button disabled className="w-full text-xs font-bold py-3.5">Plan Activo</Button>
            ) : (
              <Button 
                variant="primary" 
                onClick={() => handleCheckoutRedirect(CLIP_MONTHLY_URL)} 
                className="w-full text-xs font-bold py-3.5 cursor-pointer"
              >
                Suscribirme con Clip
              </Button>
            )}
          </div>
        </Card>

        {/* LIFETIME PLAN */}
        <Card className={`p-6 flex flex-col justify-between ${plan === 'lifetime' ? 'border-brand/40 ring-1 ring-brand/10' : 'border-border-primary/50'}`}>
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Un solo pago</span>
            <h3 className="font-heading font-black text-xl text-text-primary">
              $1,299 MXN
              <span className="text-xs text-text-secondary font-semibold ml-1">único</span>
            </h3>
            <p className="text-[11px] text-text-secondary leading-relaxed mt-2">Todas las ventajas del plan Premium para siempre sin ningún cargo mensual futuro.</p>
            
            <div className="h-px bg-border-primary/45 my-4" />
            
            <ul className="flex flex-col gap-2.5 text-xs">
              <li className="flex items-start gap-2 text-text-primary">
                <Check className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span className="font-semibold">Funciones Premium Vitalicias</span>
              </li>
              <li className="flex items-start gap-2 text-text-primary">
                <Check className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span className="font-semibold">Acceso Ilimitado a los 13 Módulos</span>
              </li>
              <li className="flex items-start gap-2 text-text-primary">
                <Check className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>Actualizaciones principales de por vida</span>
              </li>
              <li className="flex items-start gap-2 text-text-primary">
                <Check className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>Soporte prioritario VIP de por vida</span>
              </li>
              <li className="flex items-start gap-2 text-text-primary">
                <Check className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>Sin renovaciones ni cobros ocultos</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 select-none">
            {plan === 'lifetime' ? (
              <Button disabled className="w-full text-xs font-bold py-3.5">Plan Activo</Button>
            ) : (
              <Button 
                variant="premium" 
                onClick={() => handleCheckoutRedirect(CLIP_LIFETIME_URL)} 
                className="w-full text-xs font-bold py-3.5 bg-linear-to-r from-amber-500 to-yellow-600 text-white cursor-pointer"
              >
                Pagar Vitalicio con Clip
              </Button>
            )}
          </div>
        </Card>

      </div>

      {/* FAQs Panel Section */}
      <Card className="p-6 mt-6 select-none">
        <h3 className="font-heading font-black text-sm text-text-primary mb-4 flex items-center gap-1.5">
          <Info className="w-4.5 h-4.5 text-brand" /> Preguntas Frecuentes
        </h3>
        
        <div className="flex flex-col gap-4">
          {faqs.map((f, idx) => (
            <div key={idx} className="flex flex-col gap-1 text-xs">
              <span className="font-bold text-text-primary">{f.q}</span>
              <p className="text-text-secondary leading-relaxed mt-0.5">{f.a}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Success Modal */}
      <Dialog
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="¡Pago Confirmado!"
        size="sm"
        footer={
          <Button 
            className="w-full text-xs font-bold py-2.5 cursor-pointer" 
            onClick={() => setShowSuccessModal(false)}
          >
            Comenzar a disfrutar
          </Button>
        }
      >
        <div className="flex flex-col items-center text-center gap-4 py-4 select-none">
          <div className="w-16 h-16 rounded-full bg-brand/10 text-brand flex items-center justify-center animate-scale-in">
            <Sparkles className="w-8 h-8 text-amber-500 fill-amber-500/20" />
          </div>
          
          <div className="flex flex-col gap-1.5">
            <h4 className="font-heading font-black text-lg text-text-primary">
              ¡Gracias por tu apoyo!
            </h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              Tu plan <span className="font-bold text-amber-500 uppercase">{activatedPlan}</span> ha sido activado con éxito en este dispositivo y se sincronizará con tu cuenta.
            </p>
          </div>
        </div>
      </Dialog>

    </div>
  );
};
