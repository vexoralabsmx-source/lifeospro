import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { 
  FileText, Car, DollarSign, Shield, CreditCard, 
  Package, Home, CheckSquare, ChevronRight, Check
} from 'lucide-react';

export const Onboarding: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { updateModules, activeModules } = useApp();
  const [slide, setSlide] = useState(0);
  const [selectedModules, setSelectedModules] = useState<string[]>([
    'documents', 'vehicles', 'expenses', 'subscriptions', 'warranties', 'packages', 'homes', 'tasks'
  ]);

  const slides = [
    {
      title: 'Organiza tu vida desde un solo lugar',
      description: 'Centraliza tus documentos, contratos, vehículos, gastos y pendientes importantes en un centro de control unificado y privado.',
      image: '🗂️'
    },
    {
      title: 'Nunca olvides un vencimiento importante',
      description: 'Recibe alertas proactivas antes de que expiren tu seguro del auto, tu pasaporte, tus suscripciones recurrentes o las garantías de tus compras.',
      image: '🔔'
    },
    {
      title: 'Guarda documentos, garantías, gastos y vehículos',
      description: 'Accede a tus datos 100% offline, escanea comprobantes físicos con tu cámara y exporta tu información en archivos ZIP, CSV o PDF cuando quieras.',
      image: '⚡'
    },
    {
      title: 'Tus datos permanecen protegidos',
      description: 'Nuestra arquitectura local cifra tus archivos más sensibles usando la API Web Crypto de tu navegador. Nadie más tiene acceso a tus claves.',
      image: '🔐'
    }
  ];

  const modulesList = [
    { id: 'documents', name: 'Documentos', description: 'INE, Pasaporte, Licencia, RFC', icon: FileText, color: 'text-blue-500 bg-blue-500/10' },
    { id: 'vehicles', name: 'Vehículos', description: 'Servicios, gasolina, tenencia, kilometraje', icon: Car, color: 'text-indigo-500 bg-indigo-500/10' },
    { id: 'expenses', name: 'Gastos', description: 'Registro manual de egresos y presupuestos', icon: DollarSign, color: 'text-emerald-500 bg-emerald-500/10' },
    { id: 'subscriptions', name: 'Suscripciones', description: 'Cobros recurrentes de Netflix, Spotify', icon: CreditCard, color: 'text-violet-500 bg-violet-500/10' },
    { id: 'warranties', name: 'Garantías', description: 'Fechas límite de reclamo de tus compras', icon: Shield, color: 'text-amber-500 bg-amber-500/10' },
    { id: 'packages', name: 'Paquetes', description: 'Seguimiento manual de pedidos y envíos', icon: Package, color: 'text-rose-500 bg-rose-500/10' },
    { id: 'homes', name: 'Hogar', description: 'Inventario, servicios y mantenimientos', icon: Home, color: 'text-cyan-500 bg-cyan-500/10' },
    { id: 'tasks', name: 'Tareas', description: 'Listas sencillas de pendientes diarios', icon: CheckSquare, color: 'text-orange-500 bg-orange-500/10' }
  ];

  const toggleModule = (id: string) => {
    setSelectedModules(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleNext = () => {
    if (slide < slides.length - 1) {
      setSlide(slide + 1);
    } else {
      setSlide(slides.length); // Enter modules selection slide
    }
  };

  const handleFinish = async () => {
    if (selectedModules.length === 0) {
      alert('Por favor selecciona al menos un módulo para comenzar.');
      return;
    }
    // Update active modules list
    await updateModules(selectedModules);
    
    // Save onboarding completion to localstorage
    localStorage.setItem('lifeos_onboarding_completed', 'true');
    onComplete();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-primary text-text-primary">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.06),rgba(255,255,255,0))]" />
      
      <div className="relative w-full max-w-xl bg-surface border border-border-primary/60 rounded-3xl shadow-premium p-8 overflow-hidden flex flex-col z-10 animate-slide-up min-h-[500px]">
        
        {/* SLIDES FLOW */}
        {slide < slides.length ? (
          <div className="flex flex-col flex-1 items-center justify-between text-center select-none py-4">
            
            {/* Slide Header & Art */}
            <div className="flex flex-col items-center">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-[10px] font-bold tracking-wide uppercase mb-4">
                ✨ Creado por Vexora Labs
              </div>
              <div className="text-6xl mb-6 animate-pulse-slow">{slides[slide].image}</div>
              <h2 className="font-heading font-black text-2xl tracking-tight leading-snug px-4">
                {slides[slide].title}
              </h2>
              <p className="text-sm text-text-secondary mt-4 max-w-md leading-relaxed px-2">
                {slides[slide].description}
              </p>
            </div>

            {/* Slide Footer */}
            <div className="w-full flex flex-col items-center gap-6 mt-12">
              {/* Dot indicators */}
              <div className="flex gap-2">
                {slides.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === slide ? 'w-6 bg-brand' : 'w-1.5 bg-border-primary'}`}
                  />
                ))}
              </div>
              
              <div className="w-full flex items-center justify-between">
                <button 
                  onClick={() => setSlide(slides.length)} 
                  className="text-xs font-bold text-text-secondary hover:text-text-primary px-3 py-2 rounded-lg"
                >
                  Saltar
                </button>
                <Button 
                  onClick={handleNext}
                  className="flex items-center gap-1 text-xs font-bold font-heading uppercase py-3.5 tracking-wider px-5"
                >
                  Siguiente <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

          </div>
        ) : (
          /* MODULES CONFIG SELECTION */
          <div className="flex flex-col flex-1 justify-between py-2">
            
            <div className="mb-6 select-none">
              <h2 className="font-heading font-black text-2xl tracking-tight">Activar Módulos</h2>
              <p className="text-xs text-text-secondary mt-1">Elige los módulos que deseas ver en tu panel de control inicial. Podrás modificarlos después.</p>
            </div>

            {/* Grid list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-1">
              {modulesList.map((mod) => {
                const Icon = mod.icon;
                const isSelected = selectedModules.includes(mod.id);
                return (
                  <div
                    key={mod.id}
                    onClick={() => toggleModule(mod.id)}
                    className={`
                      flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer select-none transition-all duration-200
                      ${isSelected 
                        ? 'border-brand/40 bg-brand/5 shadow-sm' 
                        : 'border-border-primary hover:bg-surface-secondary/50'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9.5 h-9.5 rounded-xl flex items-center justify-center ${mod.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-text-primary">{mod.name}</span>
                        <span className="text-[10px] text-text-secondary font-semibold mt-0.5 truncate max-w-[130px]">{mod.description}</span>
                      </div>
                    </div>

                    <div className={`
                      w-5 h-5 rounded-full border flex items-center justify-center transition-all
                      ${isSelected 
                        ? 'bg-brand border-brand text-white' 
                        : 'border-border-primary bg-surface'
                      }
                    `}>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Finish actions */}
            <div className="flex items-center justify-between border-t border-border-primary/40 pt-5 mt-6">
              <button 
                onClick={() => setSlide(0)} 
                className="text-xs font-bold text-text-secondary hover:text-text-primary"
              >
                Atrás
              </button>
              <Button 
                onClick={handleFinish}
                className="text-xs font-bold font-heading uppercase py-3.5 tracking-wider px-6"
              >
                Comenzar Mi Configuración
              </Button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
