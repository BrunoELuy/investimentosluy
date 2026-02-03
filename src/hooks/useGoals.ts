import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { InvestmentGoal, GoalFormData } from '@/types/goal';
import { useToast } from '@/hooks/use-toast';
import {
  getLocalGoals,
  saveLocalGoal,
  saveLocalGoals,
  deleteLocalGoal,
  addToSyncQueue,
  isOnline
} from '@/lib/offlineDb';

export function useGoals() {
  const { user } = useAuth();
  const { toast } = useToast();

  return useQuery({
    queryKey: ['goals', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Try online first
      if (isOnline()) {
        try {
          const { data, error } = await supabase
            .from('investment_goals')
            .select('*')
            .eq('user_id', user.id)
            .order('target_date', { ascending: true });

          if (error) throw error;
          
          // Cache to local DB
          if (data) {
            await saveLocalGoals(data as InvestmentGoal[]);
          }

          return data as InvestmentGoal[];
        } catch (err) {
          toast({
            title: 'Erro ao carregar objetivos',
            description: 'Usando dados locais.',
            variant: 'destructive',
          });
        }
      }
      
      // Offline mode - use local DB
      return getLocalGoals(user.id);
    },
    enabled: !!user,
  });
}

export function useCreateGoal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: GoalFormData) => {
      if (!user) throw new Error('Usuário não autenticado');

      const goalData = {
        id: crypto.randomUUID(),
        user_id: user.id,
        name: data.name,
        target_amount: data.target_amount,
        target_date: data.target_date,
        estimated_cdi_rate: data.estimated_cdi_rate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (isOnline()) {
        const { data: goal, error } = await supabase
          .from('investment_goals')
          .insert(goalData)
          .select()
          .single();

        if (error) throw error;
        
        await saveLocalGoal(goal as InvestmentGoal);
        return goal;
      } else {
        // Offline mode
        await saveLocalGoal(goalData as InvestmentGoal);
        await addToSyncQueue({
          table: 'investment_goals',
          operation: 'create',
          data: goalData,
        });
        return goalData;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast({
        title: 'Objetivo criado!',
        description: isOnline() ?
          'Seu objetivo de investimento foi cadastrado com sucesso.' :
          'Salvo localmente. Será sincronizado quando reconectar.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar objetivo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: GoalFormData & { id: string }) => {
      const updateData = {
        name: data.name,
        target_amount: data.target_amount,
        target_date: data.target_date,
        estimated_cdi_rate: data.estimated_cdi_rate,
        updated_at: new Date().toISOString(),
      };

      if (isOnline()) {
        const { data: goal, error } = await supabase
          .from('investment_goals')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        
        await saveLocalGoal(goal as InvestmentGoal);
        return goal;
      } else {
        // Offline mode - update local and queue
        const fullData = { id, ...updateData };
        await addToSyncQueue({
          table: 'investment_goals',
          operation: 'update',
          data: fullData,
        });
        return fullData;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast({
        title: 'Objetivo atualizado!',
        description: isOnline() ?
          'Seu objetivo foi atualizado com sucesso.' :
          'Salvo localmente. Será sincronizado quando reconectar.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar objetivo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      if (isOnline()) {
        const { error } = await supabase
          .from('investment_goals')
          .delete()
          .eq('id', id);

        if (error) throw error;
      } else {
        // Queue for sync
        await addToSyncQueue({
          table: 'investment_goals',
          operation: 'delete',
          data: { id },
        });
      }
      
      await deleteLocalGoal(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast({
        title: 'Objetivo excluído',
        description: isOnline() ?
          'O objetivo foi removido com sucesso.' :
          'Removido localmente. Será sincronizado quando reconectar.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir objetivo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
