import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Investment, InvestmentFormData, InvestmentFilters } from '@/types/investment';
import { useToast } from '@/hooks/use-toast';

export function useInvestments(filters?: InvestmentFilters) {
  return useQuery({
    queryKey: ['investments', filters],
    queryFn: async (): Promise<Investment[]> => {
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

      if (error) {
        throw new Error(error.message);
      }

      return (data || []).map(inv => ({
        ...inv,
        initial_value: Number(inv.initial_value),
        rate_value: Number(inv.rate_value),
      })) as Investment[];
    },
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

      const { data, error } = await supabase
        .from('investments')
        .insert({
          ...formData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      toast({
        title: 'Investimento criado!',
        description: 'Seu investimento foi adicionado com sucesso.',
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
      const { error } = await supabase
        .from('investments')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      toast({
        title: 'Investimento removido',
        description: 'O investimento foi excluído com sucesso.',
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
