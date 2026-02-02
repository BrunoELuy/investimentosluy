import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { InvestmentGoal, GoalFormData } from '@/types/goal';
import { useToast } from '@/hooks/use-toast';

export function useGoals() {
  const { user } = useAuth();
  const { toast } = useToast();

  return useQuery({
    queryKey: ['goals', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('investment_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('target_date', { ascending: true });

      if (error) {
        toast({
          title: 'Erro ao carregar objetivos',
          description: error.message,
          variant: 'destructive',
        });
        throw error;
      }

      return data as InvestmentGoal[];
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

      const { data: goal, error } = await supabase
        .from('investment_goals')
        .insert({
          user_id: user.id,
          name: data.name,
          target_amount: data.target_amount,
          target_date: data.target_date,
          estimated_cdi_rate: data.estimated_cdi_rate,
        })
        .select()
        .single();

      if (error) throw error;
      return goal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast({
        title: 'Objetivo criado!',
        description: 'Seu objetivo de investimento foi cadastrado com sucesso.',
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
      const { data: goal, error } = await supabase
        .from('investment_goals')
        .update({
          name: data.name,
          target_amount: data.target_amount,
          target_date: data.target_date,
          estimated_cdi_rate: data.estimated_cdi_rate,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return goal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast({
        title: 'Objetivo atualizado!',
        description: 'Seu objetivo foi atualizado com sucesso.',
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
      const { error } = await supabase
        .from('investment_goals')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast({
        title: 'Objetivo excluído',
        description: 'O objetivo foi removido com sucesso.',
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
