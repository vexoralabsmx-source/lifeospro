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

  const normalizedUserId = setting.userId.trim().toLowerCase();
  let success = false;

  // 1. Intentar upsert completo en user_settings
  try {
    const fullPayload = {
      user_id: normalizedUserId,
      display_name: setting.displayName,
      password_hash: setting.passwordHash || null,
      plan: setting.plan || 'free',
      billing_cycle: setting.billingCycle || null,
      active_modules: setting.activeModules || [],
      pin_enabled: setting.pinEnabled || false,
      theme: setting.theme || 'dark',
      updated_at: new Date().toISOString()
    };

    const { error: err1 } = await client
      .from('user_settings')
      .upsert(fullPayload, { onConflict: 'user_id' });

    if (!err1) {
      success = true;
      console.log('✅ Plan y configuración guardados en user_settings de Supabase.');
    } else {
      console.warn('Upsert completo falló en user_settings, probando payload simplificado:', err1.message);
      // Fallback a payload esencial de plan (por si faltan columnas opcionales en Supabase)
      const { error: err2 } = await client
        .from('user_settings')
        .upsert({
          user_id: normalizedUserId,
          plan: setting.plan || 'free',
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (!err2) {
        success = true;
        console.log('✅ Plan guardado con payload de plan en user_settings de Supabase.');
      } else {
        console.error('Error final en user_settings:', err2.message);
      }
    }
  } catch (e) {
    console.warn('Excepción al escribir en user_settings:', e);
  }

  // 2. Sincronizar en paralelo con la tabla secundaria "settings" por si existe esa tabla en Supabase
  try {
    const { error: errSettings } = await client.from('settings').upsert({
      user_id: normalizedUserId,
      plan: setting.plan || 'free',
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

    if (!errSettings) {
      success = true;
    }
  } catch {
    // Ignorar si la tabla "settings" alternativa no está en la base de datos
  }

  return success;
};

/**
 * Fetch latest user setting & plan from Supabase Cloud
 */
export const fetchUserSettingFromCloud = async (userId: string): Promise<Partial<UserSettingRecord> | null> => {
  const client = getSupabaseClient();
  if (!client) return null;

  const normalizedUserId = userId.trim().toLowerCase();

  try {
    const { data, error } = await client
      .from('user_settings')
      .select('*')
      .eq('user_id', normalizedUserId)
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

/**
 * Record a Clip payment activation attempt into Supabase for audit
 */
export const recordClipPaymentInCloud = async (userId: string, plan: string, reference?: string) => {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from('activities').insert({
      user_id: userId.trim().toLowerCase(),
      action: 'CLIP_PAYMENT_ACTIVATION',
      module: 'pricing',
      details: `Plan ${plan} activado con Clip. Ref: ${reference || 'N/A'}`
    });
  } catch {
    // Audit logging failure is non-blocking
  }
};

/**
 * Calendar Events Cloud Synchronization
 */
export const syncCalendarEventToCloud = async (event: any): Promise<boolean> => {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('calendar_events').insert({
      user_id: event.userId.trim().toLowerCase(),
      title: event.title,
      date: event.date,
      time: event.time || null,
      category: event.category || 'birthday',
      notes: event.notes || null,
      created_at: event.createdAt || new Date().toISOString()
    });

    if (error) {
      console.warn('Error al sincronizar evento de calendario en Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Excepción al sincronizar evento de calendario:', err);
    return false;
  }
};

export const fetchCalendarEventsFromCloud = async (userId: string): Promise<any[]> => {
  const client = getSupabaseClient();
  if (!client) return [];

  const normalizedUserId = userId.trim().toLowerCase();

  try {
    const { data, error } = await client
      .from('calendar_events')
      .select('*')
      .eq('user_id', normalizedUserId);

    if (error || !data) return [];

    return data.map((row: any) => ({
      userId: row.user_id,
      title: row.title,
      date: row.date,
      time: row.time || undefined,
      category: row.category || 'birthday',
      notes: row.notes || undefined,
      createdAt: row.created_at
    }));
  } catch (err) {
    console.warn('Error al obtener eventos del calendario desde Supabase:', err);
    return [];
  }
};

export const deleteCalendarEventFromCloud = async (title: string, date: string, userId: string): Promise<boolean> => {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('calendar_events')
      .delete()
      .eq('user_id', userId.trim().toLowerCase())
      .eq('title', title)
      .eq('date', date);

    return !error;
  } catch {
    return false;
  }
};



