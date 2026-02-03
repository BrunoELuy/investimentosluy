import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Investment } from '@/types/investment';
import type { InvestmentGoal } from '@/types/goal';

interface InvestDeposit {
  id: string;
  investment_id: string;
  user_id: string;
  amount: number;
  deposit_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface SyncQueueItem {
  id: string;
  table: 'investments' | 'investment_goals' | 'investment_deposits';
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

interface InvestTrackerDB extends DBSchema {
  investments: {
    key: string;
    value: Investment;
    indexes: { 'by-user': string };
  };
  investment_goals: {
    key: string;
    value: InvestmentGoal;
    indexes: { 'by-user': string };
  };
  investment_deposits: {
    key: string;
    value: InvestDeposit;
    indexes: { 'by-investment': string; 'by-user': string };
  };
  sync_queue: {
    key: string;
    value: SyncQueueItem;
    indexes: { 'by-table': string };
  };
  meta: {
    key: string;
    value: { key: string; value: any };
  };
}

const DB_NAME = 'investtracker-offline';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<InvestTrackerDB> | null = null;

export async function getDb(): Promise<IDBPDatabase<InvestTrackerDB>> {
  if (dbInstance) return dbInstance;
  
  dbInstance = await openDB<InvestTrackerDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Investments store
      if (!db.objectStoreNames.contains('investments')) {
        const investmentsStore = db.createObjectStore('investments', { keyPath: 'id' });
        investmentsStore.createIndex('by-user', 'user_id');
      }
      
      // Goals store
      if (!db.objectStoreNames.contains('investment_goals')) {
        const goalsStore = db.createObjectStore('investment_goals', { keyPath: 'id' });
        goalsStore.createIndex('by-user', 'user_id');
      }
      
      // Deposits store
      if (!db.objectStoreNames.contains('investment_deposits')) {
        const depositsStore = db.createObjectStore('investment_deposits', { keyPath: 'id' });
        depositsStore.createIndex('by-investment', 'investment_id');
        depositsStore.createIndex('by-user', 'user_id');
      }
      
      // Sync queue for pending operations
      if (!db.objectStoreNames.contains('sync_queue')) {
        const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
        syncStore.createIndex('by-table', 'table');
      }
      
      // Meta store for last sync timestamps
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    },
  });
  
  return dbInstance;
}

// ============ Investments ============
export async function getLocalInvestments(userId: string): Promise<Investment[]> {
  const db = await getDb();
  const allInvestments = await db.getAllFromIndex('investments', 'by-user', userId);
  return allInvestments;
}

export async function saveLocalInvestment(investment: Investment): Promise<void> {
  const db = await getDb();
  await db.put('investments', investment);
}

export async function saveLocalInvestments(investments: Investment[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('investments', 'readwrite');
  await Promise.all([
    ...investments.map(inv => tx.store.put(inv)),
    tx.done
  ]);
}

export async function deleteLocalInvestment(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('investments', id);
}

// ============ Goals ============
export async function getLocalGoals(userId: string): Promise<InvestmentGoal[]> {
  const db = await getDb();
  return db.getAllFromIndex('investment_goals', 'by-user', userId);
}

export async function saveLocalGoal(goal: InvestmentGoal): Promise<void> {
  const db = await getDb();
  await db.put('investment_goals', goal);
}

export async function saveLocalGoals(goals: InvestmentGoal[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('investment_goals', 'readwrite');
  await Promise.all([
    ...goals.map(g => tx.store.put(g)),
    tx.done
  ]);
}

export async function deleteLocalGoal(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('investment_goals', id);
}

// ============ Deposits ============
export async function getLocalDeposits(investmentId: string): Promise<InvestDeposit[]> {
  const db = await getDb();
  return db.getAllFromIndex('investment_deposits', 'by-investment', investmentId);
}

export async function getLocalDepositsByUser(userId: string): Promise<InvestDeposit[]> {
  const db = await getDb();
  return db.getAllFromIndex('investment_deposits', 'by-user', userId);
}

export async function saveLocalDeposits(deposits: InvestDeposit[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('investment_deposits', 'readwrite');
  await Promise.all([
    ...deposits.map(d => tx.store.put(d)),
    tx.done
  ]);
}

// ============ Sync Queue ============
export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp'>): Promise<void> {
  const db = await getDb();
  const syncItem: SyncQueueItem = {
    ...item,
    id: `${item.table}-${item.operation}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
  };
  await db.put('sync_queue', syncItem);
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDb();
  return db.getAll('sync_queue');
}

export async function clearSyncQueueItem(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('sync_queue', id);
}

export async function clearSyncQueue(): Promise<void> {
  const db = await getDb();
  await db.clear('sync_queue');
}

// ============ Meta ============
export async function setLastSyncTime(table: string): Promise<void> {
  const db = await getDb();
  await db.put('meta', { key: `lastSync_${table}`, value: Date.now() });
}

export async function getLastSyncTime(table: string): Promise<number | null> {
  const db = await getDb();
  const meta = await db.get('meta', `lastSync_${table}`);
  return meta?.value ?? null;
}

// ============ Clear All Data ============
export async function clearAllLocalData(): Promise<void> {
  const db = await getDb();
  await Promise.all([
    db.clear('investments'),
    db.clear('investment_goals'),
    db.clear('investment_deposits'),
    db.clear('sync_queue'),
    db.clear('meta'),
  ]);
}

// Check if we're online
export function isOnline(): boolean {
  return navigator.onLine;
}
