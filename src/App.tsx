import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AppShell } from './components/AppShell';
import { CommandSearch } from './components/ui/CommandSearch';
import { ScannerModal } from './components/ui/ScannerModal';
import { db } from './db/lifeDB';
import { checkAndTriggerExpirations } from './utils/notifications';

// Pages
import { Login } from './pages/Login';
import { Onboarding } from './pages/Onboarding';
import { Dashboard } from './pages/Dashboard';
import { Documents } from './pages/Documents';
import { Warranties } from './pages/Warranties';
import { Vehicles } from './pages/Vehicles';
import { Expenses } from './pages/Expenses';
import { Subscriptions } from './pages/Subscriptions';
import { Packages } from './pages/Packages';
import { HomeModule } from './pages/HomeModule';
import { Tasks } from './pages/Tasks';
import { Activity } from './pages/Activity';
import { Pricing } from './pages/Pricing';
import { Settings } from './pages/Settings';
import { Reminders } from './pages/Reminders';
import { Health } from './pages/Health';
import { Passwords } from './pages/Passwords';
import { CalendarView } from './pages/Calendar';
import { NetWorth } from './pages/NetWorth';
import { Travel } from './pages/Travel';
import { Habits } from './pages/Habits';
import { AdminPanel } from './pages/Admin';
import { ExportData } from './pages/Export';
import { Journal } from './pages/Journal';
import { Pantry } from './pages/Pantry';
import { Pets } from './pages/Pets';
import { Calculators } from './pages/Calculators';
import { IceQr } from './pages/IceQr';

import { KeyRound, Delete, Lock, ShieldCheck, RefreshCw } from 'lucide-react';

const NavigationRouter: React.FC = () => {
  const { user, accountEmail, isLocked, unlockApp, loading, plan } = useApp();
  
  // Routing State
  const [route, setRoute] = useState(window.location.hash || '#/dashboard');
  const [onboardingCompleted, setOnboardingCompleted] = useState(
    localStorage.getItem('lifeos_onboarding_completed') === 'true'
  );

  // Modals state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // PIN Keypad & Security States
  const [pinEntry, setPinEntry] = useState('');
  const [unlockError, setUnlockError] = useState(false);
  const [pinAttempts, setPinAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  const { pinEnabled, lockApp } = useApp();

  // Cooldown countdown timer for PIN lockout
  useEffect(() => {
    if (lockoutTimer <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  // Session Auto-Lock on Inactivity (5 minutes)
  useEffect(() => {
    if (!user || !pinEnabled || isLocked) return;

    let timeoutId: any;

    const resetInactivityTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        lockApp();
      }, 300000); // 5 minutes
    };

    const activityEvents = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    resetInactivityTimer();

    activityEvents.forEach(event => {
      window.addEventListener(event, resetInactivityTimer);
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [user, pinEnabled, isLocked, lockApp]);

  // Check upcoming expirations and trigger mobile notifications
  useEffect(() => {
    const activeUserId = accountEmail || localStorage.getItem('lifeos_user') || user || 'local_user';
    if (activeUserId) {
      checkAndTriggerExpirations(activeUserId);
    }
  }, [user, accountEmail]);

  // Handle URL hash changes
  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash || '#/dashboard');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (newRoute: string) => {
    window.location.hash = newRoute;
    setRoute(newRoute);
  };

  const handleKeypadPress = async (num: string) => {
    if (lockoutTimer > 0) return;
    setUnlockError(false);
    if (pinEntry.length >= 6) return;
    const nextPin = pinEntry + num;
    setPinEntry(nextPin);

    // Auto trigger unlock verification if length satisfies common limits
    if (nextPin.length >= 4) {
      const success = await unlockApp(nextPin);
      if (success) {
        setPinEntry('');
        setPinAttempts(0);
      } else if (nextPin.length === 6) {
        // failed on max digits
        setUnlockError(true);
        setPinEntry('');
        setPinAttempts(prev => {
          const next = prev + 1;
          if (next >= 5) {
            setLockoutTimer(30);
            return 0;
          }
          return next;
        });
      }
    }
  };

  const handleKeypadDelete = () => {
    if (lockoutTimer > 0) return;
    setPinEntry(prev => prev.slice(0, -1));
  };

  const handleKeypadSubmit = async () => {
    if (lockoutTimer > 0) return;
    const success = await unlockApp(pinEntry);
    if (success) {
      setPinEntry('');
      setPinAttempts(0);
    } else {
      setUnlockError(true);
      setPinEntry('');
      setPinAttempts(prev => {
        const next = prev + 1;
        if (next >= 5) {
          setLockoutTimer(30);
          return 0;
        }
        return next;
      });
    }
  };

  // Document Scan Save Callback
  const handleSaveScan = async (docData: { name: string; category: string; expiryDate?: string; pages: string[] }) => {
    if (plan === 'free') {
      const docCount = await db.documents.where('userId').equals(user || 'local_user').count();
      if (docCount >= 10) {
        alert('El plan gratuito está limitado a 10 documentos. Por favor actualiza a Premium para guardar documentos ilimitados.');
        return;
      }
    }

    await db.documents.add({
      userId: user || 'local_user',
      name: docData.name,
      category: docData.category,
      expiryDate: docData.expiryDate,
      tags: ['Escáner', docData.category],
      isSensitive: false,
      archived: false,
      deleted: false,
      favorite: false,
      attachment: docData.pages[0], // save first page as preview
      fileName: `${docData.name.replace(/\s+/g, '_')}_scanned.jpg`,
      createdAt: new Date().toISOString()
    });

    // Log Activity
    await db.activities.add({
      userId: user || 'local_user',
      action: 'created',
      module: 'documents',
      details: `Se escaneó y guardó el documento "${docData.name}".`,
      date: new Date().toISOString()
    });

    alert('Documento guardado del escaneo con éxito.');
  };

  // Render Page Switcher
  const renderRoute = () => {
    // Check specific routing matches
    const path = route.replace('#/', '').split('?')[0].split('/')[0] || 'dashboard';

    switch (path) {
      case 'dashboard':
        return <Dashboard onNavigate={navigateTo} onOpenScanner={() => setIsScannerOpen(true)} />;
      case 'documents':
        return <Documents />;
      case 'warranties':
        return <Warranties />;
      case 'vehicles':
        return <Vehicles />;
      case 'expenses':
        return <Expenses />;
      case 'subscriptions':
        return <Subscriptions />;
      case 'packages':
        return <Packages />;
      case 'home':
        return <HomeModule />;
      case 'tasks':
        return <Tasks />;
      case 'activity':
        return <Activity />;
      case 'pricing':
        return <Pricing />;
      case 'settings':
        return <Settings />;
      case 'reminders':
        return <Reminders />;
      case 'health':
        return <Health />;
      case 'passwords':
        return <Passwords />;
      case 'calendar':
        return <CalendarView />;
      case 'networth':
        return <NetWorth />;
      case 'travel':
        return <Travel />;
      case 'habits':
        return <Habits />;
      case 'admin':
        return <AdminPanel />;
      case 'export':
        return <ExportData />;
      case 'journal':
        return <Journal />;
      case 'pantry':
        return <Pantry />;
      case 'pets':
        return <Pets />;
      case 'calculators':
        return <Calculators />;
      case 'iceqr':
        return <IceQr />;
      default:
        return <Dashboard onNavigate={navigateTo} onOpenScanner={() => setIsScannerOpen(true)} />;
    }
  };

  // 1. Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 gap-4">
        <RefreshCw className="w-8 h-8 animate-spin text-brand" />
        <span className="text-xs font-semibold uppercase tracking-wider">Cargando base de datos local...</span>
      </div>
    );
  }

  // 2. Authentication layer check
  if (!user) {
    return <Login />;
  }

  // 3. Onboarding flow layer check
  if (!onboardingCompleted) {
    return <Onboarding onComplete={() => setOnboardingCompleted(true)} />;
  }

  // 4. PIN Locked key lock overlay screen
  if (isLocked) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col items-center justify-center p-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(239,68,68,0.04),rgba(255,255,255,0))]" />
        
        <div className="relative flex flex-col items-center max-w-sm w-full bg-surface border border-border-primary/60 p-8 rounded-3xl shadow-premium animate-scale-in">
          <div className="w-12 h-12 rounded-2xl bg-danger-light text-danger flex items-center justify-center mb-4">
            <Lock className="w-5.5 h-5.5" />
          </div>
          
          <h2 className="font-heading font-black text-xl tracking-tight text-text-primary">LifeOS Bloqueado</h2>
          <p className="text-[11px] text-text-secondary mt-1 max-w-[200px] text-center leading-relaxed">Escribe tu código PIN de seguridad local para reanudar la sesión.</p>
          
          {/* Display Code Circles */}
          <div className="flex gap-4.5 my-8 select-none">
            {[1, 2, 4, 5].map((_, idx) => {
              const active = idx < pinEntry.length;
              return (
                <div 
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full border transition-all duration-150 ${active ? 'bg-brand border-brand scale-110' : 'border-border-primary bg-zinc-150 dark:bg-zinc-800'}`}
                />
              );
            })}
          </div>

          {lockoutTimer > 0 ? (
            <p className="text-[11px] text-danger font-semibold -mt-4 mb-4 animate-pulse">
              Demasiados intentos. Bloqueado por {lockoutTimer}s.
            </p>
          ) : unlockError ? (
            <p className="text-[11px] text-danger font-medium -mt-4 mb-4 animate-pulse-slow">
              PIN incorrecto. Intenta de nuevo.
            </p>
          ) : pinAttempts > 0 ? (
            <p className="text-[10px] text-text-secondary font-medium -mt-4 mb-4">
              Intentos fallidos: {pinAttempts}/5
            </p>
          ) : null}

          {/* Graphical numerical keypad grid layout */}
          <div className="grid grid-cols-3 gap-3 w-full select-none">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                onClick={() => handleKeypadPress(num)}
                disabled={lockoutTimer > 0}
                className={`py-3.5 rounded-2xl border border-border-primary/50 text-base font-black transition-all text-text-primary ${lockoutTimer > 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-surface-secondary active:scale-95 cursor-pointer'}`}
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleKeypadDelete}
              disabled={lockoutTimer > 0}
              className={`py-3.5 rounded-2xl text-text-secondary flex items-center justify-center transition-all ${lockoutTimer > 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-surface-secondary active:scale-95 cursor-pointer'}`}
              aria-label="Delete"
            >
              <Delete className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleKeypadPress('0')}
              disabled={lockoutTimer > 0}
              className={`py-3.5 rounded-2xl border border-border-primary/50 text-base font-black transition-all text-text-primary ${lockoutTimer > 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-surface-secondary active:scale-95 cursor-pointer'}`}
            >
              0
            </button>
            <button
              onClick={handleKeypadSubmit}
              disabled={lockoutTimer > 0}
              className={`py-3.5 rounded-2xl text-sm font-bold text-brand uppercase transition-all ${lockoutTimer > 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-brand/10 active:scale-95 cursor-pointer'}`}
            >
              Ok
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 5. Unlocked application interface shell
  return (
    <>
      <AppShell 
        currentRoute={route} 
        onNavigate={navigateTo}
        onOpenSearch={() => setIsSearchOpen(true)}
      >
        {renderRoute()}
      </AppShell>

      {/* Global command bar search overlay */}
      <CommandSearch 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)}
        onNavigate={navigateTo}
      />

      {/* Global document scanner container overlay */}
      <ScannerModal 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)}
        onSave={handleSaveScan}
      />
    </>
  );
};

function App() {
  return (
    <AppProvider>
      <NavigationRouter />
    </AppProvider>
  );
}

export default App;
