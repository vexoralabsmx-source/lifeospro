import Dexie, { type Table } from 'dexie';

// --- DATABASE INTERFACES ---

export interface DocumentRecord {
  id?: number;
  userId: string;
  name: string;
  category: string;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  issuer?: string;
  notes?: string;
  tags: string[];
  attachment?: string; // base64 or blob URL
  fileName?: string;
  isSensitive: boolean;
  archived: boolean;
  deleted: boolean;
  favorite: boolean;
  createdAt: string;
}

export interface VehicleRecord {
  id?: number;
  userId: string;
  brand: string;
  model: string;
  year: number;
  plates: string;
  color: string;
  mileage: number;
  fuelType: string;
  nextServiceMileage: number;
  insuranceExpiry: string;
  verificationExpiry?: string;
  circulationCard?: string;
  notes?: string;
  image?: string;
  createdAt: string;
}

export interface VehicleServiceRecord {
  id?: number;
  vehicleId: number;
  type: string;
  cost: number;
  date: string;
  mileage: number;
  details?: string;
  createdAt: string;
}

export interface ExpenseRecord {
  id?: number;
  userId: string;
  amount: number;
  date: string;
  category: string;
  paymentMethod: string;
  merchant: string;
  description?: string;
  tags: string[];
  isRecurring: boolean;
  relatedModule?: string; // 'vehicle', 'warranty', 'home', 'subscription'
  relatedId?: number;
  createdAt: string;
}

export interface SubscriptionRecord {
  id?: number;
  userId: string;
  name: string;
  plan: string;
  price: number;
  billDate: number; // Day of month (1-31)
  frequency: 'monthly' | 'yearly';
  paymentMethod: string;
  status: 'active' | 'paused' | 'cancelled' | 'trial';
  notes?: string;
  createdAt: string;
}

export interface WarrantyRecord {
  id?: number;
  userId: string;
  productName: string;
  brand: string;
  model?: string;
  serialNumber?: string;
  store: string;
  purchaseDate: string;
  price: number;
  durationMonths: number;
  expiryDate: string;
  receiptImage?: string;
  supportContact?: string;
  notes?: string;
  status: 'active' | 'expiring' | 'expired' | 'claim' | 'replaced' | 'closed';
  createdAt: string;
}

export interface PackageRecord {
  id?: number;
  userId: string;
  name: string;
  store?: string;
  courier?: string;
  trackingNumber?: string;
  status: 'ordered' | 'preparing' | 'shipped' | 'transit' | 'delivery' | 'delivered' | 'failed' | 'delayed' | 'returned' | 'cancelled';
  purchaseDate?: string;
  eta?: string;
  notes?: string;
  price?: number;
  trackingUrl?: string;
  createdAt: string;
}

export interface HomeRecord {
  id?: number;
  userId: string;
  name: string;
  address?: string;
  type: 'apartment' | 'house' | 'office' | 'other';
  rooms: string[];
  services: string[];
  createdAt: string;
}

export interface HomeMaintenanceRecord {
  id?: number;
  homeId: number;
  title: string;
  date: string;
  cost: number;
  contractor?: string;
  notes?: string;
}

export interface TaskRecord {
  id?: number;
  userId: string;
  title: string;
  dueDate?: string;
  dueTime?: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  notes?: string;
  tags: string[];
  isCompleted: boolean;
  parentId?: number; // For subtaks support
  createdAt: string;
}

export interface ActivityRecord {
  id?: number;
  userId: string;
  action: string; // 'created', 'updated', 'deleted', 'archived', 'exported'
  module: string; // 'documents', 'vehicles', 'expenses', etc.
  details: string;
  date: string;
}

export interface UserSettingRecord {
  userId: string;
  displayName?: string;
  passwordHash?: string; // Hashed password for local account verification
  pinHash?: string;
  pinEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  activeModules: string[];
  notificationsEnabled: boolean;
  plan: 'free' | 'premium' | 'lifetime';
  billingCycle?: 'monthly' | 'yearly';
}

export interface HealthRecord {
  id?: number;
  userId: string;
  recordType: 'ice' | 'prescription' | 'appointment' | 'medication' | 'lab';
  title: string;
  doctorName?: string;
  doctorPhone?: string;
  bloodType?: string;
  allergies?: string;
  medications?: string;
  dosage?: string;
  frequencyTime?: string;
  date?: string;
  notes?: string;
  attachment?: string;
  createdAt: string;
}

export interface PasswordRecord {
  id?: number;
  userId: string;
  title: string;
  category: 'web' | 'card' | 'wifi' | 'note';
  accountUsername?: string;
  encryptedSecret: string;
  secretIv?: string;
  url?: string;
  notes?: string;
  isFavorite: boolean;
  createdAt: string;
}

export interface FinancialGoalRecord {
  id?: number;
  userId: string;
  title: string;
  category: 'savings' | 'investment' | 'debt' | 'asset' | 'liability';
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  status: 'active' | 'achieved' | 'paused';
  notes?: string;
  createdAt: string;
}

export interface TravelRecord {
  id?: number;
  userId: string;
  destination: string;
  country?: string;
  startDate: string;
  endDate: string;
  budget?: number;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  flights?: string;
  lodging?: string;
  packingList: { id: string; item: string; packed: boolean }[];
  notes?: string;
  createdAt: string;
}

export interface HabitRecord {
  id?: number;
  userId: string;
  title: string;
  category: string;
  frequencyDays: number;
  completedDates: string[];
  streak: number;
  color?: string;
  createdAt: string;
}

export interface QuickNoteRecord {
  id?: number;
  userId: string;
  title?: string;
  content: string;
  color: string;
  pinned: boolean;
  createdAt: string;
}

export interface JournalRecord {
  id?: number;
  userId: string;
  date: string;
  mood: 'great' | 'good' | 'neutral' | 'bad' | 'terrible';
  title: string;
  content: string;
  tags?: string[];
  createdAt: string;
}

export interface PantryItemRecord {
  id?: number;
  userId: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expiryDate?: string;
  isLow: boolean;
  createdAt: string;
}

export interface PetRecord {
  id?: number;
  userId: string;
  petName: string;
  species: 'dog' | 'cat' | 'bird' | 'other';
  breed?: string;
  birthDate?: string;
  weight?: number;
  medicalNotes?: string;
  vaccinations: { name: string; date: string }[];
  createdAt: string;
}

export interface CalendarEventRecord {
  id?: number;
  userId: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  category: 'birthday' | 'anniversary' | 'event' | 'reminder' | 'meeting' | 'other';
  notes?: string;
  createdAt: string;
}

// --- DEXIE CLASS DEFINITION ---

class LifeOSDatabase extends Dexie {
  documents!: Table<DocumentRecord, number>;
  vehicles!: Table<VehicleRecord, number>;
  vehicleServices!: Table<VehicleServiceRecord, number>;
  expenses!: Table<ExpenseRecord, number>;
  subscriptions!: Table<SubscriptionRecord, number>;
  warranties!: Table<WarrantyRecord, number>;
  packages!: Table<PackageRecord, number>;
  homes!: Table<HomeRecord, number>;
  homeMaintenance!: Table<HomeMaintenanceRecord, number>;
  tasks!: Table<TaskRecord, number>;
  activities!: Table<ActivityRecord, number>;
  settings!: Table<UserSettingRecord, string>;

  healthRecords!: Table<HealthRecord, number>;
  passwordRecords!: Table<PasswordRecord, number>;
  financialGoals!: Table<FinancialGoalRecord, number>;
  travelRecords!: Table<TravelRecord, number>;
  habitRecords!: Table<HabitRecord, number>;
  quickNoteRecords!: Table<QuickNoteRecord, number>;

  journalRecords!: Table<JournalRecord, number>;
  pantryItems!: Table<PantryItemRecord, number>;
  petRecords!: Table<PetRecord, number>;
  calendarEvents!: Table<CalendarEventRecord, number>;

  constructor() {
    super('LifeOSProDatabase');
    
    // Define tables and indices
    this.version(1).stores({
      documents: '++id, userId, category, isSensitive, archived, deleted, favorite, expiryDate',
      vehicles: '++id, userId, brand, model',
      vehicleServices: '++id, vehicleId',
      expenses: '++id, userId, date, category, relatedModule',
      subscriptions: '++id, userId, status',
      warranties: '++id, userId, status, expiryDate',
      packages: '++id, userId, status',
      homes: '++id, userId',
      homeMaintenance: '++id, homeId',
      tasks: '++id, userId, isCompleted, dueDate, priority',
      activities: '++id, userId, date, module',
      settings: 'userId'
    });

    this.version(2).stores({
      healthRecords: '++id, userId, recordType, date',
      passwordRecords: '++id, userId, category, isFavorite',
      financialGoals: '++id, userId, status, category',
      travelRecords: '++id, userId, status, startDate',
      habitRecords: '++id, userId, streak',
      quickNoteRecords: '++id, userId, pinned, createdAt'
    });

    this.version(3).stores({
      journalRecords: '++id, userId, date, mood',
      pantryItems: '++id, userId, category, isLow',
      petRecords: '++id, userId, species'
    });

    this.version(4).stores({
      calendarEvents: '++id, userId, date, category'
    });
  }
}

export const db = new LifeOSDatabase();

// --- AUTOMATIC CLOUD SYNC HOOKS FOR PREMIUM / LIFETIME USERS ---
import { pushRecordToCloud, deleteRecordFromCloud } from '../utils/cloudSync';

const SYNCED_TABLES = [
  'documents', 'vehicles', 'vehicleServices', 'expenses', 'subscriptions', 
  'warranties', 'packages', 'homes', 'homeMaintenance', 'tasks', 'activities', 
  'healthRecords', 'passwordRecords', 'financialGoals', 'travelRecords', 
  'habitRecords', 'quickNoteRecords', 'journalRecords', 'pantryItems', 
  'petRecords', 'calendarEvents'
];

SYNCED_TABLES.forEach(tableName => {
  const table = (db as any)[tableName];
  if (table) {
    table.hook('creating', function (this: any, primKey: any, obj: any) {
      this.onsuccess = function (createdId: any) {
        pushRecordToCloud(tableName, { ...obj, id: createdId });
      };
    });

    table.hook('updating', function (this: any, modifications: any, primKey: any, obj: any) {
      this.onsuccess = function (updatedObj: any) {
        pushRecordToCloud(tableName, updatedObj || { ...obj, ...modifications, id: primKey });
      };
    });

    table.hook('deleting', function (this: any, primKey: any, obj: any) {
      deleteRecordFromCloud(tableName, primKey, obj?.userId);
    });
  }
});

// --- DEMO DATA SEEDING FUNCTION (DESACTIVADA) ---

export async function seedDemoData(userId: string = 'mike_demo') {
  // Seeder desactivado permanentemente para la versión de producción
  return;
}
