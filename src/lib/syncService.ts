import { supabase } from '@/integrations/supabase/client';
import {
  getLocalInvestments,
  saveLocalInvestments,
  getLocalGoals,
  saveLocalGoals,
  getLocalDepositsByUser,
  saveLocalDeposits,
  getSyncQueue,
  clearSyncQueueItem,
  setLastSyncTime,
  isOnline,
} from './offlineDb';
import type { Investment } from '@/types/investment';
import type { InvestmentGoal } from '@/types/goal';

interface SyncResult {
  success: boolean;
  syncedItems: number;
  errors: string[];
}

/**
 * Sync local offline changes to the server
 */
export async function syncOfflineChanges(): Promise<SyncResult> {
  if (!isOnline()) {
    return { success: false, syncedItems: 0, errors: ['Sem conexão com a internet'] };
  }

  const queue = await getSyncQueue();
  let syncedItems = 0;
  const errors: string[] = [];

  for (const item of queue) {
    try {
      switch (item.table) {
        case 'investments':
          await syncInvestmentItem(item);
          break;
        case 'investment_goals':
          await syncGoalItem(item);
          break;
        case 'investment_deposits':
          await syncDepositItem(item);
          break;
      }
      await clearSyncQueueItem(item.id);
      syncedItems++;
    } catch (error) {
      errors.push(`Erro ao sincronizar ${item.table}: ${error}`);
    }
  }

  return { success: errors.length === 0, syncedItems, errors };
}

async function syncInvestmentItem(item: { operation: string; data: any }): Promise<void> {
  switch (item.operation) {
    case 'create':
      await supabase.from('investments').insert(item.data);
      break;
    case 'update':
      await supabase.from('investments').update(item.data).eq('id', item.data.id);
      break;
    case 'delete':
      await supabase.from('investments').delete().eq('id', item.data.id);
      break;
  }
}

async function syncGoalItem(item: { operation: string; data: any }): Promise<void> {
  switch (item.operation) {
    case 'create':
      await supabase.from('investment_goals').insert(item.data);
      break;
    case 'update':
      await supabase.from('investment_goals').update(item.data).eq('id', item.data.id);
      break;
    case 'delete':
      await supabase.from('investment_goals').delete().eq('id', item.data.id);
      break;
  }
}

async function syncDepositItem(item: { operation: string; data: any }): Promise<void> {
  switch (item.operation) {
    case 'create':
      await supabase.from('investment_deposits').insert(item.data);
      break;
    case 'update':
      await supabase.from('investment_deposits').update(item.data).eq('id', item.data.id);
      break;
    case 'delete':
      await supabase.from('investment_deposits').delete().eq('id', item.data.id);
      break;
  }
}

/**
 * Download server data to local database
 */
export async function downloadServerData(userId: string): Promise<SyncResult> {
  if (!isOnline()) {
    return { success: false, syncedItems: 0, errors: ['Sem conexão com a internet'] };
  }

  const errors: string[] = [];
  let syncedItems = 0;

  try {
    // Sync investments
    const { data: investments, error: invError } = await supabase
      .from('investments')
      .select('*')
      .eq('user_id', userId);
    
    if (invError) throw invError;
    if (investments) {
      await saveLocalInvestments(investments as Investment[]);
      await setLastSyncTime('investments');
      syncedItems += investments.length;
    }

    // Sync goals
    const { data: goals, error: goalsError } = await supabase
      .from('investment_goals')
      .select('*')
      .eq('user_id', userId);
    
    if (goalsError) throw goalsError;
    if (goals) {
      await saveLocalGoals(goals as InvestmentGoal[]);
      await setLastSyncTime('investment_goals');
      syncedItems += goals.length;
    }

    // Sync deposits
    const { data: deposits, error: depositsError } = await supabase
      .from('investment_deposits')
      .select('*')
      .eq('user_id', userId);
    
    if (depositsError) throw depositsError;
    if (deposits) {
      await saveLocalDeposits(deposits);
      await setLastSyncTime('investment_deposits');
      syncedItems += deposits.length;
    }

  } catch (error) {
    errors.push(`Erro ao baixar dados: ${error}`);
  }

  return { success: errors.length === 0, syncedItems, errors };
}

/**
 * Full sync - upload pending changes and download latest data
 */
export async function performFullSync(userId: string): Promise<SyncResult> {
  // First, sync any offline changes to the server
  const uploadResult = await syncOfflineChanges();
  
  // Then, download the latest data from the server
  const downloadResult = await downloadServerData(userId);

  return {
    success: uploadResult.success && downloadResult.success,
    syncedItems: uploadResult.syncedItems + downloadResult.syncedItems,
    errors: [...uploadResult.errors, ...downloadResult.errors],
  };
}

/**
 * Get data - tries server first, falls back to local
 */
export async function getInvestmentsWithFallback(userId: string): Promise<Investment[]> {
  if (isOnline()) {
    try {
      const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Update local cache
        await saveLocalInvestments(data as Investment[]);
        return data as Investment[];
      }
    } catch {
      // Fall through to local data
    }
  }
  
  // Offline or error - use local data
  return getLocalInvestments(userId);
}

export async function getGoalsWithFallback(userId: string): Promise<InvestmentGoal[]> {
  if (isOnline()) {
    try {
      const { data, error } = await supabase
        .from('investment_goals')
        .select('*')
        .eq('user_id', userId)
        .order('target_date', { ascending: true });

      if (!error && data) {
        await saveLocalGoals(data as InvestmentGoal[]);
        return data as InvestmentGoal[];
      }
    } catch {
      // Fall through to local data
    }
  }
  
  return getLocalGoals(userId);
}

export async function getDepositsWithFallback(userId: string): Promise<Record<string, any[]>> {
  if (isOnline()) {
    try {
      const { data, error } = await supabase
        .from('investment_deposits')
        .select('*')
        .eq('user_id', userId)
        .order('deposit_date', { ascending: true });

      if (!error && data) {
        await saveLocalDeposits(data);
        // Group by investment_id
        const grouped: Record<string, any[]> = {};
        data.forEach(dep => {
          if (!grouped[dep.investment_id]) {
            grouped[dep.investment_id] = [];
          }
          grouped[dep.investment_id].push(dep);
        });
        return grouped;
      }
    } catch {
      // Fall through to local data
    }
  }
  
  // Offline - use local data
  const deposits = await getLocalDepositsByUser(userId);
  const grouped: Record<string, any[]> = {};
  deposits.forEach(dep => {
    if (!grouped[dep.investment_id]) {
      grouped[dep.investment_id] = [];
    }
    grouped[dep.investment_id].push(dep);
  });
  return grouped;
}
