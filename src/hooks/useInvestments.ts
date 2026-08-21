import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Investment, InvestmentFormData, InvestmentFilters } from '@/types/investment';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  getLocalInvestments, 
  saveLocalInvestment, 
  saveLocalInvestments,
  deleteLocalInvestment,
  addToSyncQueue,
  isOnline 
} from '@/lib/offlineDb';

export function useInvestments(filters?: InvestmentFilters) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['investments', filters, user?.id],
    queryFn: async (): Promise<Investment[]> => {
      if (!user) return [];
      
      // Try online first
      if (isOnline()) {
        try {
          let query = supabase
            .from('investments')
            .select('*')
            .order('created_at', { ascending: false });

          if (filters?.type && filters.type !== 'ALL') {
            query = query.eq('type', filters.type);
          }

          if (filters?.institution) {
            query = query.ilike('institution', `%${filters.institution}%`);
          }

          if (filters?.rateType && filters.rateType !== 'ALL') {
            query = query.eq('rate_type', filters.rateType);
          }

          if (filters?.status === 'active') {
            query = query.eq('is_active', true);
          } else if (filters?.status === 'matured') {
            query = query.lt('end_date', new Date().toISOString().split('T')[0]);
          }

          if (filters?.searchTerm) {
            query = query.or(`name.ilike.%${filters.searchTerm}%,institution.ilike.%${filters.searchTerm}%`);
          }

          const { data, error } = await query;

          if (error) throw error;

          const investments = (data || []).map(inv => ({
            ...inv,
            initial_value: Number(inv.initial_value),
            rate_value: Number(inv.rate_value),
          })) as Investment[];
          
          // Cache to local DB
          await saveLocalInvestments(investments);
          
          return investments;
        } catch {
          // Fall through to offline
        }
      }
      
      // Offline mode - use local DB
      const localData = await getLocalInvestments(user.id);
      let filtered = localData;
      
      if (filters?.type && filters.type !== 'ALL') {
        filtered = filtered.filter(inv => inv.type === filters.type);
      }
      if (filters?.status === 'active') {
        filtered = filtered.filter(inv => inv.is_active);
      }
      if (filters?.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        filtered = filtered.filter(inv => 
          inv.name.toLowerCase().includes(term) || 
          inv.institution.toLowerCase().includes(term)
        );
      }
      
      return filtered;
    },
    enabled: !!user,
  });
}

export function useInvestment(id: string) {
  return useQuery({
    queryKey: ['investment', id],
    queryFn: async (): Promise<Investment | null> => {
      const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data ? {
        ...data,
        initial_value: Number(data.initial_value),
        rate_value: Number(data.rate_value),
      } as Investment : null;
    },
    enabled: !!id,
  });
}

export function useCreateInvestment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (formData: InvestmentFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { deposits: _deposits, ...investmentFields } = formData;

      const investmentData = {
        ...investmentFields,
        user_id: user.id,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true,
      };


      if (isOnline()) {
        const { data, error } = await supabase
          .from('investments')
          .insert(investmentData)
          .select()
          .single();

        if (error) {
          throw new Error(error.message);
        }

        // Save to local DB
        await saveLocalInvestment(data as Investment);
        return data;
      } else {
        // Offline mode - save locally and queue for sync
        await saveLocalInvestment(investmentData as Investment);
        await addToSyncQueue({
          table: 'investments',
          operation: 'create',
          data: investmentData,
        });
        return investmentData;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      toast({
        title: 'Investimento criado!',
        description: isOnline() ? 
          'Seu investimento foi adicionado com sucesso.' :
          'Salvo localmente. Será sincronizado quando reconectar.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar investimento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateInvestment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...formData }: InvestmentFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('investments')
        .update(formData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      queryClient.invalidateQueries({ queryKey: ['investment', variables.id] });
      toast({
        title: 'Investimento atualizado!',
        description: 'As alterações foram salvas com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar investimento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteInvestment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      if (isOnline()) {
        const { error } = await supabase
          .from('investments')
          .delete()
          .eq('id', id);

        if (error) {
          throw new Error(error.message);
        }
      } else {
        // Queue for sync
        await addToSyncQueue({
          table: 'investments',
          operation: 'delete',
          data: { id },
        });
      }
      
      // Delete from local DB
      await deleteLocalInvestment(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      toast({
        title: 'Investimento removido',
        description: isOnline() ? 
          'O investimento foi excluído com sucesso.' :
          'Removido localmente. Será sincronizado quando reconectar.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover investimento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
