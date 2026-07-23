import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { UserSettingRecord } from '../db/lifeDB';

const DEFAULT_SUPABASE_URL = 'https://svamiluhtvvbgjaciiqu.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2YW1pbHVodHZ2YmdqYWNpaXF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NDk0NTIsImV4cCI6MjA5OTQyNTQ1Mn0.JcynGPo8N579tX7Bmm0ZmayeraskAkBLYJR_v6zm2mU';

export const getSupabaseUrl = (): string => {
  return (import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('supabase_url') || DEFAULT_SUPABASE_URL).trim();
};

export const getSupabaseKey = (): string => {
  return (import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('supabase_anon_key') || DEFAULT_SUPABASE_ANON_KEY).trim();
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
  const client = getSupabaseClient();
  if (!client) {
    console.warn('Supabase URL/Key no configurados para sincronizar usuario.');
    return false;
  }

  try {
    const { error } = await client.from('user_settings').upsert({
      user_id: setting.userId,
      display_name: setting.displayName,
      password_hash: setting.passwordHash || null,
      plan: setting.plan || 'free',
      billing_cycle: setting.billingCycle || null,
      active_modules: setting.activeModules || [],
      pin_enabled: setting.pinEnabled || false,
      theme: setting.theme || 'dark',
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

    if (error) {
      console.warn('Error al sincronizar en user_settings vía SDK:', error.message);
      return false;
    }

    console.log('✅ Registro sincronizado exitosamente en la tabla user_settings de Supabase.');
    return true;
  } catch (err) {
    console.warn('Excepción al sincronizar configuración con Supabase Cloud:', err);
    return false;
  }
};

/**
 * Fetch latest user setting & plan from Supabase Cloud
 */
export const fetchUserSettingFromCloud = async (userId: string): Promise<Partial<UserSettingRecord> | null> => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .limit(1);

    if (error || !data || data.length === 0) return null;

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
  } catch (err) {
    console.warn('Error al consultar configuración desde Supabase Cloud:', err);
    return null;
  }
};

/**
 * Fetch all registered accounts from Supabase Cloud (Admin view)
 */
export const fetchAllCloudUsers = async (): Promise<UserSettingRecord[]> => {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('user_settings')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error || !data) {
      console.warn('Error al consultar todos los usuarios de Supabase Cloud:', error?.message);
      return [];
    }

    return data.map((row: any) => ({
      userId: row.user_id,
      displayName: row.display_name || row.user_id.split('@')[0],
      passwordHash: row.password_hash,
      plan: row.plan || 'free',
      billingCycle: row.billing_cycle,
      activeModules: row.active_modules || [],
      pinEnabled: row.pin_enabled || false,
      notificationsEnabled: true,
      theme: row.theme || 'dark'
    }));
  } catch (err) {
    console.warn('Error al consultar todos los usuarios de Supabase Cloud:', err);
    return [];
  }
};


