import { useState, useEffect, useCallback } from 'react';
import { syncOfflineChanges, downloadServerData } from '@/lib/syncService';
import { getSyncQueue } from '@/lib/offlineDb';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  // Check for pending changes in sync queue
  const checkPendingChanges = useCallback(async () => {
    const queue = await getSyncQueue();
    setPendingChanges(queue.length);
  }, []);

  // Sync when coming back online
  const handleOnline = useCallback(async () => {
    setIsOnline(true);
    
    if (!user) return;
    
    const queue = await getSyncQueue();
    if (queue.length > 0) {
      setIsSyncing(true);
      toast({
        title: 'Reconectado!',
        description: `Sincronizando ${queue.length} alterações pendentes...`,
      });

      const result = await syncOfflineChanges();
      
      if (result.success) {
        toast({
          title: 'Sincronização concluída',
          description: `${result.syncedItems} itens sincronizados com sucesso.`,
        });
        
        // Download latest data from server
        await downloadServerData(user.id);
      } else {
        toast({
          title: 'Erro na sincronização',
          description: result.errors.join(', '),
          variant: 'destructive',
        });
      }
      
      setIsSyncing(false);
      await checkPendingChanges();
    }
  }, [user, toast, checkPendingChanges]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    toast({
      title: 'Modo offline',
      description: 'Você está sem conexão. Alterações serão sincronizadas quando reconectar.',
      variant: 'destructive',
    });
  }, [toast]);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial check for pending changes
    checkPendingChanges();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline, checkPendingChanges]);

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    if (!isOnline || !user) return;
    
    setIsSyncing(true);
    const result = await syncOfflineChanges();
    await downloadServerData(user.id);
    setIsSyncing(false);
    await checkPendingChanges();
    
    return result;
  }, [isOnline, user, checkPendingChanges]);

  return {
    isOnline,
    isSyncing,
    pendingChanges,
    triggerSync,
    checkPendingChanges,
  };
}
