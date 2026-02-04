import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { StockInvestment, StockFormData } from '@/types/stock';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { isOnline } from '@/lib/offlineDb';

export function useStocks() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['stocks', user?.id],
    queryFn: async (): Promise<StockInvestment[]> => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('stock_investments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(stock => ({
        ...stock,
        amount: Number(stock.amount),
      })) as StockInvestment[];
    },
    enabled: !!user,
  });
}

export function useCreateStock() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (formData: StockFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const stockData = {
        ...formData,
        user_id: user.id,
      };

      const { data, error } = await supabase
        .from('stock_investments')
        .insert(stockData)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      toast({
        title: 'Ação adicionada!',
        description: 'Seu investimento em ações foi registrado.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao adicionar ação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateStock() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...formData }: StockFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('stock_investments')
        .update(formData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      toast({
        title: 'Ação atualizada!',
        description: 'As alterações foram salvas.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar ação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteStock() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('stock_investments')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      toast({
        title: 'Ação removida',
        description: 'O investimento foi excluído.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover ação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
