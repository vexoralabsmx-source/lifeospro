import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { UserSettingRecord } from '../db/lifeDB';

export const getSupabaseUrl = (): string => {
  return (import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('supabase_url') || '').trim();
};

export const getSupabaseKey = (): string => {
  return (import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('supabase_anon_key') || '').trim();
};

export const isSupabaseConfigured = (): boolean => {
  return Boolean(getSupabaseUrl() && getSupabaseKey());
};

export const getSupabaseClient = (): SupabaseClient | null => {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();
  if (!url || !key) return null;
  return createClient(url, key);
};

export const saveSupabaseCredentials = (url: string, key: string) => {
  localStorage.setItem('supabase_url', url.trim());
  localStorage.setItem('supabase_anon_key', key.trim());
};

/**
 * Register account directly into Supabase Auth (Appears in Supabase Dashboard -> Authentication -> Users)
 */
export const signUpSupabaseAuth = async (email: string, password: string, displayName?: string) => {
  const client = getSupabaseClient();
  if (!client) {
    console.warn('Supabase no está configurado (URL o ANON KEY faltante).');
    return null;
  }

  try {
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName
        }
      }
    });

    if (error) {
      console.warn('Aviso de registro en Supabase Auth:', error.message);
    } else {
      console.log('✅ Usuario registrado exitosamente en Supabase Auth:', data);
    }
    return data;
  } catch (err) {
    console.warn('Error registrando usuario en Supabase Auth:', err);
    return null;
  }
};

/**
 * Sign in user with Supabase Auth
 */
export const signInSupabaseAuth = async (email: string, password: string) => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.warn('Aviso de inicio de sesión en Supabase Auth:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('Error al iniciar sesión en Supabase Auth:', err);
    return null;
  }
};

/**
 * Sync user settings & plan to Supabase Cloud
 */
export const syncUserSettingToCloud = async (setting: UserSettingRecord): Promise<boolean> => {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();
  
  if (!url || !key) {
    console.warn('Supabase URL/Key no configurados para sincronizar usuario.');
    return false;
  }

  try {
    const res = await fetch(`${url}/rest/v1/user_settings?on_conflict=user_id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        user_id: setting.userId,
        display_name: setting.displayName,
        password_hash: setting.passwordHash || null,
        plan: setting.plan || 'free',
        billing_cycle: setting.billingCycle || null,
        active_modules: setting.activeModules || [],
        pin_enabled: setting.pinEnabled || false,
        theme: setting.theme || 'dark',
        updated_at: new Date().toISOString()
      })
    });

    if (!res.ok) {
      console.warn('Respuesta no exitosa al sincronizar user_settings:', res.status, res.statusText);
    } else {
      console.log('✅ Registro sincronizado en la tabla user_settings de Supabase.');
    }

    return res.ok;
  } catch (err) {
    console.warn('Error al sincronizar configuración con Supabase Cloud:', err);
    return false;
  }
};

/**
 * Fetch latest user setting & plan from Supabase Cloud
 */
export const fetchUserSettingFromCloud = async (userId: string): Promise<Partial<UserSettingRecord> | null> => {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();

  if (!url || !key) return null;

  try {
    const res = await fetch(`${url}/rest/v1/user_settings?user_id=eq.${encodeURIComponent(userId)}&select=*`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.length > 0) {
      const row = data[0];
      return {
        userId: row.user_id,
        displayName: row.display_name,
        passwordHash: row.password_hash,
        plan: row.plan,
        billingCycle: row.billing_cycle,
        activeModules: row.active_modules,
        pinEnabled: row.pin_enabled,
        theme: row.theme
      };
    }
    return null;
  } catch (err) {
    console.warn('Error al consultar configuración desde Supabase Cloud:', err);
    return null;
  }
};

/**
 * Fetch all registered accounts from Supabase Cloud (Admin view)
 */
export const fetchAllCloudUsers = async (): Promise<UserSettingRecord[]> => {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();

  if (!url || !key) return [];

  try {
    const res = await fetch(`${url}/rest/v1/user_settings?select=*&order=updated_at.desc`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.map((row: any) => ({
      userId: row.user_id,
      displayName: row.display_name || row.user_id.split('@')[0],
      passwordHash: row.password_hash,
      plan: row.plan || 'free',
      billingCycle: row.billing_cycle,
      activeModules: row.active_modules || [],
      pinEnabled: row.pin_enabled || false,
      theme: row.theme || 'dark'
    }));
  } catch (err) {
    console.warn('Error al consultar todos los usuarios de Supabase Cloud:', err);
    return [];
  }
};


