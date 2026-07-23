import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { KeyRound, Mail, Sparkles, Shield, Eye, EyeOff } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [loginLockout, setLoginLockout] = useState(0);

  React.useEffect(() => {
    if (loginLockout > 0) {
      const timer = setInterval(() => {
        setLoginLockout(prev => (prev > 1 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [loginLockout]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (loginLockout > 0) {
      setError(`Demasiados intentos fallidos. Intenta de nuevo en ${loginLockout} segundos.`);
      return;
    }

    setLoading(true);

    if (isRegister && !username.trim()) {
      setError('Por favor escribe tu nombre.');
      setLoading(false);
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError('Por favor llena todos los campos.');
      setLoading(false);
      return;
    }

    if (isRegister && password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres para tu seguridad.');
      setLoading(false);
      return;
    }

    setTimeout(async () => {
      try {
        await login(email, password, isRegister, username);
        setFailedAttempts(0);
      } catch (err: any) {
        setFailedAttempts(prev => {
          const next = prev + 1;
          if (next >= 5) {
            setLoginLockout(60);
            return 0;
          }
          return next;
        });

        if (err.message === 'user_exists') {
          setError('Esta dirección de correo electrónico ya está registrada.');
        } else if (err.message === 'user_not_found') {
          setError('No se encontró ninguna cuenta registrada con este correo.');
        } else if (err.message === 'invalid_password') {
          setError('Contraseña incorrecta. Verifica tus datos.');
        } else {
          setError('Ocurrió un error al procesar tu solicitud. Intenta de nuevo.');
        }
      } finally {
        setLoading(false);
      }
    }, 800);
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setTimeout(async () => {
      await login('local_user');
      setLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-bg-primary text-text-primary">
      
      {/* Background radial effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.06),rgba(255,255,255,0))]" />
      
      {/* Container Card */}
      <div className="relative w-full max-w-md bg-surface border border-border-primary/60 rounded-3xl shadow-premium p-8 overflow-hidden flex flex-col z-10 animate-slide-up">
        
        {/* Banner header */}
        <div className="flex flex-col items-center text-center mb-8 select-none">
          <img src="/favicon.png" className="w-12 h-12 object-contain rounded-2xl mb-3 shadow-sm" alt="Logo" />
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-[10px] font-bold tracking-wide uppercase mb-3">
            <Sparkles className="w-3 h-3 text-amber-500" /> Creado por Vexora Labs
          </div>
          <h2 className="font-heading font-black text-2xl tracking-tight bg-linear-to-b from-text-primary to-text-primary/75 bg-clip-text text-transparent">
            {isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </h2>
          <p className="text-xs text-text-secondary mt-1 max-w-[260px] leading-relaxed">
            {isRegister 
              ? 'Organiza tus documentos, recordatorios, vehículos y gastos desde un solo lugar.'
              : 'El centro de control definitivo para tu vida personal.'
            }
          </p>
        </div>

        {error && (
          <div className="mb-4.5 p-3 rounded-xl bg-danger-light border border-danger/10 text-danger text-xs font-semibold animate-slide-up text-center">
            {error}
          </div>
        )}

        {/* Input fields */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isRegister && (
            <Input
              label="Nombre"
              placeholder="Tu nombre (Ej. Mike)"
              value={username}
              onChange={e => setUsername(e.target.value)}
              disabled={loading}
            />
          )}

          <Input
            label="Correo Electrónico"
            type="email"
            placeholder="correo@ejemplo.com"
            icon={<Mail className="w-4 h-4" />}
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={loading}
          />

          <div className="relative">
            <Input
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              icon={<KeyRound className="w-4 h-4" />}
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-[38px] text-text-secondary hover:text-text-primary focus:outline-none"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {!isRegister && (
            <div className="flex justify-end select-none">
              <button 
                type="button"
                onClick={() => alert('Simulación: Se ha enviado un correo para restablecer tu contraseña.')} 
                className="text-[11px] font-bold text-brand hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}

          <Button type="submit" loading={loading} className="w-full py-3.5 mt-2 text-xs font-bold font-heading uppercase tracking-wider">
            {isRegister ? 'Registrarme' : 'Ingresar'}
          </Button>
        </form>



        <div className="mt-6 text-center select-none">
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="text-xs font-bold text-text-secondary hover:text-text-primary transition-colors"
          >
            {isRegister 
              ? '¿Ya tienes cuenta? Inicia sesión' 
              : '¿No tienes una cuenta? Regístrate aquí'
            }
          </button>
        </div>

      </div>
    </div>
  );
};
