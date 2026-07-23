import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, seedDemoData, type UserSettingRecord } from '../db/lifeDB';
import { hashPin, deriveKeyFromPin } from '../utils/security';
import { syncUserSettingToCloud, fetchUserSettingFromCloud, signUpSupabaseAuth, signInSupabaseAuth } from '../utils/supabase';
import { syncAllCloudDataToLocal, uploadAllLocalDataToCloud } from '../utils/cloudSync';

interface AppContextType {
  user: string | null; // Display name (ej. "Mike")
  accountEmail: string | null; // Account email (ej. "mike@example.com")
  theme: 'light' | 'dark';
  plan: 'free' | 'premium' | 'lifetime';
  billingCycle: 'monthly' | 'yearly' | null;
  activeModules: string[];
  pinEnabled: boolean;
  isLocked: boolean;
  derivedKey: CryptoKey | null;
  loading: boolean;
  
  // Actions
  login: (email: string, password?: string, isRegister?: boolean, username?: string) => Promise<void>;
  logout: () => void;
  toggleTheme: () => void;
  setPlan: (plan: 'free' | 'premium' | 'lifetime', cycle?: 'monthly' | 'yearly') => Promise<void>;
  updateModules: (modules: string[]) => Promise<void>;
  updateDisplayName: (newName: string) => Promise<void>;
  enablePin: (pin: string) => Promise<void>;
  disablePin: () => Promise<void>;
  unlockApp: (pin: string) => Promise<boolean>;
  lockApp: () => void;
  refreshSettings: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<string | null>(
    localStorage.getItem('lifeos_display_name') || 
    (localStorage.getItem('lifeos_user') ? localStorage.getItem('lifeos_user')!.split('@')[0] : null)
  );
  const [accountEmail, setAccountEmail] = useState<string | null>(
    localStorage.getItem('lifeos_user') || null
  );
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [plan, setPlanState] = useState<'free' | 'premium' | 'lifetime'>('free');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly' | null>(null);
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [derivedKey, setDerivedKey] = useState<CryptoKey | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize App and seed data if needed
  useEffect(() => {
    async function initApp() {
      if (accountEmail || user) {
        // Seed demo data if it's the first time
        if (accountEmail === 'mike_demo' || user === 'mike_demo') {
          await seedDemoData('mike_demo');
        }
        
        await refreshSettings();
      } else {
        setLoading(false);
      }
    }
    initApp();
  }, [accountEmail]);

  // Synchronize CSS class for theme changes
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const refreshSettings = async () => {
    const activeEmail = (accountEmail || localStorage.getItem('lifeos_user'))?.trim().toLowerCase();
    if (!activeEmail) return;
    try {
      let settings = await db.settings.get(activeEmail);

      // Check cloud settings
      const cloudSettings = await fetchUserSettingFromCloud(activeEmail);
      
      const cloudPlan = cloudSettings?.plan;
      const localPlan = settings?.plan || (localStorage.getItem('lifeos_plan_' + activeEmail) as any) || 'free';
      const activePlan = cloudPlan || localPlan;

      if (!settings) {
        // Create initial settings
        const initial: UserSettingRecord = {
          userId: activeEmail,
          displayName: cloudSettings?.displayName || user || activeEmail.split('@')[0],
          pinEnabled: cloudSettings?.pinEnabled || false,
          theme: cloudSettings?.theme || 'dark',
          activeModules: cloudSettings?.activeModules || ['documents', 'health', 'passwords', 'networth', 'travel', 'habits', 'export', 'journal', 'pantry', 'pets', 'calculators', 'iceqr', 'vehicles', 'expenses', 'subscriptions', 'warranties', 'packages', 'homes', 'tasks'],
          notificationsEnabled: true,
          plan: activePlan
        };
        await db.settings.put(initial);
        settings = initial;
      } else if (activePlan !== settings.plan) {
        settings = {
          ...settings,
          plan: activePlan,
          activeModules: cloudSettings?.activeModules || settings.activeModules
        };
        await db.settings.put(settings);
      }

      localStorage.setItem('lifeos_plan_' + activeEmail, activePlan);

      if (settings.displayName) {
        setUser(settings.displayName);
        localStorage.setItem('lifeos_display_name', settings.displayName);
      }
      setTheme(settings.theme === 'light' ? 'light' : 'dark');
      setPlanState(activePlan);
      setBillingCycle(settings.billingCycle || null);
      setActiveModules(settings.activeModules || []);
      setPinEnabled(settings.pinEnabled || false);
      
      // Sincronizar automáticamente todos los datos del usuario desde la nube si es Premium o Vitalicio
      if (activePlan === 'premium' || activePlan === 'lifetime') {
        syncAllCloudDataToLocal(activeEmail);
      }

      // If PIN is enabled and we haven't decrypted key, lock the app
      if (settings.pinEnabled && !derivedKey) {
        setIsLocked(true);
      }
    } catch (e) {
      console.error('Failed to load user settings', e);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password?: string, isRegister?: boolean, username?: string) => {
    const sanitizedEmail = email.trim().toLowerCase();
    const chosenName = username?.trim() || sanitizedEmail.split('@')[0];
    
    if (sanitizedEmail === 'local_user') {
      const name = username?.trim() || 'Usuario Local';
      localStorage.setItem('lifeos_user', sanitizedEmail);
      localStorage.setItem('lifeos_display_name', name);
      setUser(name);
      setAccountEmail(sanitizedEmail);
      return;
    }

    if (!password) {
      throw new Error('password_required');
    }
    
    // Hash password with unique salt per email
    const passwordHash = await hashPin(password, 'lifeos_pass_salt_' + sanitizedEmail);
    
    if (isRegister) {
      // Check if user already exists locally or in Supabase cloud
      const existingLocal = await db.settings.get(sanitizedEmail);
      const existingCloud = await fetchUserSettingFromCloud(sanitizedEmail);

      if (existingLocal || existingCloud) {
        throw new Error('user_exists');
      }

      // Create new user settings with password hash & display name
      const initial: UserSettingRecord = {
        userId: sanitizedEmail,
        displayName: chosenName,
        passwordHash,
        pinEnabled: false,
        theme: 'dark',
        activeModules: ['documents', 'vehicles', 'expenses', 'subscriptions', 'warranties', 'packages', 'homes', 'tasks'],
        notificationsEnabled: true,
        plan: 'free'
      };
      await db.settings.put(initial);
      
      // 1. Registrar cuenta directamente en Supabase Auth (Aparece en Supabase Dashboard -> Authentication -> Users)
      await signUpSupabaseAuth(sanitizedEmail, password, chosenName);

      // 2. Sincronizar tabla de configuraciones y planes en Supabase Cloud (user_settings)
      await syncUserSettingToCloud(initial);

      localStorage.setItem('lifeos_user', sanitizedEmail);
      localStorage.setItem('lifeos_display_name', chosenName);
      setUser(chosenName);
      setAccountEmail(sanitizedEmail);
    } else {
      // Login attempt: Iniciar sesión en Supabase Auth si está configurado
      await signInSupabaseAuth(sanitizedEmail, password);

      let settings = await db.settings.get(sanitizedEmail);
      
      // Si no existe en IndexedDB local, intentar traer desde Supabase Cloud
      if (!settings) {
        const cloudSettings = await fetchUserSettingFromCloud(sanitizedEmail);
        if (cloudSettings && cloudSettings.userId) {
          settings = {
            userId: cloudSettings.userId,
            displayName: cloudSettings.displayName || chosenName,
            passwordHash: cloudSettings.passwordHash || passwordHash,
            pinEnabled: cloudSettings.pinEnabled || false,
            theme: cloudSettings.theme === 'light' ? 'light' : 'dark',
            activeModules: cloudSettings.activeModules || ['documents', 'vehicles', 'expenses', 'subscriptions', 'warranties', 'packages', 'homes', 'tasks'],
            notificationsEnabled: true,
            plan: cloudSettings.plan || 'free',
            billingCycle: cloudSettings.billingCycle
          };
          await db.settings.put(settings);
        }
      }

      if (!settings) {
        throw new Error('user_not_found');
      }
      
      // If there is a password hash stored, verify it.
      if (settings.passwordHash && settings.passwordHash !== passwordHash) {
        throw new Error('invalid_password');
      } else if (!settings.passwordHash || !settings.displayName) {
        const updated = {
          ...settings,
          passwordHash: settings.passwordHash || passwordHash,
          displayName: settings.displayName || chosenName
        };
        await db.settings.put(updated);
        syncUserSettingToCloud(updated);
      }

      const activeDisplayName = settings.displayName || chosenName;
      
      // Sincronizar de forma transparente con Supabase Auth y Supabase Cloud por si la cuenta era únicamente local
      signUpSupabaseAuth(sanitizedEmail, password, activeDisplayName);
      syncUserSettingToCloud({ ...settings, displayName: activeDisplayName });

      localStorage.setItem('lifeos_user', sanitizedEmail);
      localStorage.setItem('lifeos_display_name', activeDisplayName);
      if (settings.plan) {
        localStorage.setItem('lifeos_plan_' + sanitizedEmail, settings.plan);
        setPlanState(settings.plan);
      }
      if (settings.activeModules) {
        setActiveModules(settings.activeModules);
      }
      setUser(activeDisplayName);
      setAccountEmail(sanitizedEmail);

      if (settings.plan === 'premium' || settings.plan === 'lifetime') {
        syncAllCloudDataToLocal(sanitizedEmail);
      }
    }
  };

  const logout = () => {
    localStorage.removeItem('lifeos_user');
    localStorage.removeItem('lifeos_display_name');
    setUser(null);
    setAccountEmail(null);
    setDerivedKey(null);
    setIsLocked(false);
  };

  const updateDisplayName = async (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setUser(trimmed);
    localStorage.setItem('lifeos_display_name', trimmed);
    const activeEmail = accountEmail || localStorage.getItem('lifeos_user');
    if (activeEmail) {
      const current = await db.settings.get(activeEmail);
      if (current) {
        await db.settings.put({ ...current, displayName: trimmed });
      }
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    const activeEmail = accountEmail || localStorage.getItem('lifeos_user');
    if (activeEmail) {
      const current = await db.settings.get(activeEmail);
      if (current) {
        await db.settings.put({ ...current, theme: newTheme });
      }
    }
  };

  const setPlan = async (newPlan: 'free' | 'premium' | 'lifetime', cycle?: 'monthly' | 'yearly') => {
    setPlanState(newPlan);
    if (cycle) setBillingCycle(cycle);
    const activeEmail = (accountEmail || localStorage.getItem('lifeos_user'))?.trim().toLowerCase();
    if (activeEmail) {
      localStorage.setItem('lifeos_plan_' + activeEmail, newPlan);
      let current = await db.settings.get(activeEmail);
      if (!current) {
        current = {
          userId: activeEmail,
          displayName: user || activeEmail.split('@')[0],
          pinEnabled: false,
          theme: 'dark',
          activeModules: ['documents', 'health', 'passwords', 'networth', 'travel', 'habits', 'vehicles', 'expenses', 'subscriptions', 'warranties', 'packages', 'homes', 'tasks'],
          notificationsEnabled: true,
          plan: newPlan
        };
      } else {
        current = { 
          ...current, 
          plan: newPlan, 
          billingCycle: cycle || current.billingCycle 
        };
      }
      await db.settings.put(current);
      await syncUserSettingToCloud(current);

      if (newPlan === 'premium' || newPlan === 'lifetime') {
        uploadAllLocalDataToCloud(activeEmail);
      }
    }
  };

  const updateModules = async (modules: string[]) => {
    setActiveModules(modules);
    const activeEmail = accountEmail || localStorage.getItem('lifeos_user');
    if (activeEmail) {
      const current = await db.settings.get(activeEmail);
      if (current) {
        const updated = { ...current, activeModules: modules };
        await db.settings.put(updated);
        syncUserSettingToCloud(updated);
      }
    }
  };

  const enablePin = async (pin: string) => {
    const activeEmail = accountEmail || localStorage.getItem('lifeos_user');
    if (!activeEmail) return;
    const pinHash = await hashPin(pin);
    const key = await deriveKeyFromPin(pin);
    
    const current = await db.settings.get(activeEmail);
    if (current) {
      await db.settings.put({
        ...current,
        pinEnabled: true,
        pinHash
      });
    }

    setPinEnabled(true);
    setDerivedKey(key);
    setIsLocked(false);
  };

  const disablePin = async () => {
    const activeEmail = accountEmail || localStorage.getItem('lifeos_user');
    if (!activeEmail) return;
    const current = await db.settings.get(activeEmail);
    if (current) {
      await db.settings.put({
        ...current,
        pinEnabled: false,
        pinHash: undefined
      });
    }

    setPinEnabled(false);
    setDerivedKey(null);
    setIsLocked(false);
  };

  const unlockApp = async (pin: string): Promise<boolean> => {
    const activeEmail = accountEmail || localStorage.getItem('lifeos_user');
    if (!activeEmail) return false;
    const current = await db.settings.get(activeEmail);
    if (!current || !current.pinHash) return false;

    const testHash = await hashPin(pin);
    if (testHash === current.pinHash) {
      const key = await deriveKeyFromPin(pin);
      setDerivedKey(key);
      setIsLocked(false);
      return true;
    }
    return false;
  };

  const lockApp = () => {
    if (pinEnabled) {
      setDerivedKey(null);
      setIsLocked(true);
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        accountEmail,
        theme,
        plan,
        billingCycle,
        activeModules,
        pinEnabled,
        isLocked,
        derivedKey,
        loading,
        login,
        logout,
        toggleTheme,
        setPlan,
        updateModules,
        updateDisplayName,
        enablePin,
        disablePin,
        unlockApp,
        lockApp,
        refreshSettings
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
