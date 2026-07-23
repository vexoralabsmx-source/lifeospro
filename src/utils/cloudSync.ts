import { getSupabaseClient } from './supabase';
import { db } from '../db/lifeDB';

// Mapping between Dexie Table Names and Supabase SQL Table Names
const TABLE_MAPPING: Record<string, string> = {
  documents: 'documents',
  vehicles: 'vehicles',
  vehicleServices: 'vehicle_services',
  expenses: 'expenses',
  subscriptions: 'subscriptions',
  warranties: 'warranties',
  packages: 'packages',
  homes: 'homes',
  homeMaintenance: 'home_maintenance',
  tasks: 'tasks',
  activities: 'activities',
  healthRecords: 'health_records',
  passwordRecords: 'password_records',
  financialGoals: 'financial_goals',
  travelRecords: 'travel_records',
  habitRecords: 'habit_records',
  quickNoteRecords: 'quick_note_records',
  journalRecords: 'journal_records',
  pantryItems: 'pantry_items',
  petRecords: 'pet_records',
  calendarEvents: 'calendar_events'
};

// Convert camelCase object keys to snake_case for PostgreSQL
export function toSnakeCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] === undefined) continue;
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    result[snakeKey] = obj[key];
  }
  return result;
}

// Convert snake_case object keys to camelCase for TypeScript/Dexie
export function toCamelCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = obj[key];
  }
  return result;
}

/**
 * Check if active user plan is Premium or Lifetime
 */
export function isUserCloudEnabled(userId?: string): boolean {
  if (!userId || userId.toLowerCase().trim() === 'local_user') return false;
  const plan = localStorage.getItem('lifeos_plan_' + userId.toLowerCase().trim());
  return plan === 'premium' || plan === 'lifetime';
}

/**
 * Push a single record create/update to Supabase Cloud
 */
export async function pushRecordToCloud(dexieTableName: string, record: any): Promise<boolean> {
  const client = getSupabaseClient();
  const userId = record.userId || localStorage.getItem('lifeos_user');
  if (!client || !isUserCloudEnabled(userId)) return false;

  const sqlTable = TABLE_MAPPING[dexieTableName];
  if (!sqlTable) return false;

  try {
    const payload = toSnakeCase(record);
    if (payload.user_id) {
      payload.user_id = payload.user_id.toLowerCase().trim();
    }

    // Remove empty id if undefined/null to let database generate it
    if (!payload.id) delete payload.id;

    const { error } = await client.from(sqlTable).upsert(payload);
    if (error) {
      console.warn(`[CloudSync] Error al sincronizar ${sqlTable} en Supabase:`, error.message);
      return false;
    }
    console.log(`[CloudSync] ✅ Registro sincronizado en ${sqlTable} de Supabase.`);
    return true;
  } catch (err) {
    console.warn(`[CloudSync] Excepción al sincronizar ${sqlTable}:`, err);
    return false;
  }
}

/**
 * Delete a record from Supabase Cloud by ID
 */
export async function deleteRecordFromCloud(dexieTableName: string, recordId: number | string, userId?: string): Promise<boolean> {
  const client = getSupabaseClient();
  const activeUser = userId || localStorage.getItem('lifeos_user') || undefined;
  if (!client || !isUserCloudEnabled(activeUser)) return false;

  const sqlTable = TABLE_MAPPING[dexieTableName];
  if (!sqlTable || !recordId) return false;

  try {
    const { error } = await client
      .from(sqlTable)
      .delete()
      .eq('id', recordId);

    if (error) {
      console.warn(`[CloudSync] Error eliminando registro ${recordId} en ${sqlTable}:`, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[CloudSync] Excepción eliminando registro en ${sqlTable}:`, err);
    return false;
  }
}

/**
 * Download ALL records from Supabase Cloud for all 21 modules and populate IndexedDB
 * Triggered automatically on login and session start for Premium / Lifetime users.
 */
export async function syncAllCloudDataToLocal(userId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId || !isUserCloudEnabled(userId)) return;

  const normalizedUserId = userId.toLowerCase().trim();
  console.log(`[CloudSync] 🔄 Iniciando descarga completa de datos para usuario Premium/Vitalicio: ${normalizedUserId}`);

  for (const [dexieTable, sqlTable] of Object.entries(TABLE_MAPPING)) {
    try {
      // Child tables like vehicle_services or home_maintenance might not have user_id directly
      const query = client.from(sqlTable).select('*');
      
      // If table supports user_id filtering
      if (sqlTable !== 'vehicle_services' && sqlTable !== 'home_maintenance') {
        query.eq('user_id', normalizedUserId);
      }

      const { data, error } = await query;
      if (error || !data || data.length === 0) continue;

      const dexieTableRef = (db as any)[dexieTable];
      if (!dexieTableRef) continue;

      for (const row of data) {
        const camelRecord = toCamelCase(row);
        const existing = await dexieTableRef.get(camelRecord.id);

        if (!existing) {
          await dexieTableRef.put(camelRecord);
        } else {
          await dexieTableRef.put({
            ...existing,
            ...camelRecord
          });
        }
      }
      console.log(`[CloudSync] 📥 ${data.length} registros sincronizados localmente desde ${sqlTable}.`);
    } catch (err) {
      console.warn(`[CloudSync] Error al sincronizar tabla ${sqlTable}:`, err);
    }
  }
}

/**
 * Upload all existing local Dexie records for a user to Supabase Cloud
 * (Useful when a user upgrades from Free to Premium to upload their local history)
 */
export async function uploadAllLocalDataToCloud(userId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId || !isUserCloudEnabled(userId)) return;

  const normalizedUserId = userId.toLowerCase().trim();

  for (const [dexieTable, sqlTable] of Object.entries(TABLE_MAPPING)) {
    try {
      const dexieTableRef = (db as any)[dexieTable];
      if (!dexieTableRef) continue;

      const localRecords = await dexieTableRef.toArray();
      const userRecords = localRecords.filter((r: any) => !r.userId || r.userId.toLowerCase().trim() === normalizedUserId);

      for (const r of userRecords) {
        await pushRecordToCloud(dexieTable, r);
      }
    } catch (err) {
      console.warn(`[CloudSync] Error al subir datos locales de ${dexieTable}:`, err);
    }
  }
}
