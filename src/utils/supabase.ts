import type { UserSettingRecord } from '../db/lifeDB';

// Default Supabase config or environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('supabase_url') || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('supabase_anon_key') || '';

export const isSupabaseConfigured = () => {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
};

export const saveSupabaseCredentials = (url: string, key: string) => {
  localStorage.setItem('supabase_url', url.trim());
  localStorage.setItem('supabase_anon_key', key.trim());
};

/**
 * Sync user settings & plan to Supabase Cloud
 */
export const syncUserSettingToCloud = async (setting: UserSettingRecord): Promise<boolean> => {
  const url = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('supabase_url');
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('supabase_anon_key');
  
  if (!url || !key) return false;

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

    return res.ok;
  } catch (err) {
    console.warn('Error syncing settings to Supabase cloud:', err);
    return false;
  }
};

/**
 * Fetch latest user setting & plan from Supabase Cloud
 */
export const fetchUserSettingFromCloud = async (userId: string): Promise<Partial<UserSettingRecord> | null> => {
  const url = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('supabase_url');
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('supabase_anon_key');

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
    console.warn('Error fetching settings from Supabase cloud:', err);
    return null;
  }
};

/**
 * Fetch all registered accounts from Supabase Cloud (Admin view)
 */
export const fetchAllCloudUsers = async (): Promise<UserSettingRecord[]> => {
  const url = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('supabase_url');
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('supabase_anon_key');

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
    console.warn('Error fetching all cloud users:', err);
    return [];
  }
};

