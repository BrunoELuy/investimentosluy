import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { InvestmentDeposit, DepositFormData } from '@/types/investment';

export function useDeposits(investmentId: string) {
  return useQuery({
    queryKey: ['deposits', investmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('investment_deposits')
        .select('*')
        .eq('investment_id', investmentId)
        .order('deposit_date', { ascending: true });

      if (error) throw error;

      return (data || []).map(d => ({
        ...d,
        amount: Number(d.amount),
      })) as InvestmentDeposit[];
    },
    enabled: !!investmentId,
  });
}

export function useAllDeposits(investmentIds: string[]) {
  return useQuery({
    queryKey: ['all-deposits', investmentIds],
    queryFn: async () => {
      if (investmentIds.length === 0) return {};

      const { data, error } = await supabase
        .from('investment_deposits')
        .select('*')
        .in('investment_id', investmentIds)
        .order('deposit_date', { ascending: true });

      if (error) throw error;

      const depositsByInvestment: Record<string, InvestmentDeposit[]> = {};
      (data || []).forEach(d => {
        const deposit = { ...d, amount: Number(d.amount) } as InvestmentDeposit;
        if (!depositsByInvestment[d.investment_id]) {
          depositsByInvestment[d.investment_id] = [];
        }
        depositsByInvestment[d.investment_id].push(deposit);
      });

      return depositsByInvestment;
    },
    enabled: investmentIds.length > 0,
  });
}

export function useCreateDeposit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ investmentId, deposit }: { investmentId: string; deposit: DepositFormData }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('investment_deposits')
        .insert({
          investment_id: investmentId,
          user_id: user.id,
          amount: deposit.amount,
          deposit_date: deposit.deposit_date,
          notes: deposit.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deposits', variables.investmentId] });
      queryClient.invalidateQueries({ queryKey: ['all-deposits'] });
      toast({
        title: 'Aporte adicionado',
        description: 'O aporte foi registrado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao adicionar aporte',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteDeposit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ depositId, investmentId }: { depositId: string; investmentId: string }) => {
      const { error } = await supabase
        .from('investment_deposits')
        .delete()
        .eq('id', depositId);

      if (error) throw error;
      return investmentId;
    },
    onSuccess: (investmentId) => {
      queryClient.invalidateQueries({ queryKey: ['deposits', investmentId] });
      queryClient.invalidateQueries({ queryKey: ['all-deposits'] });
      toast({
        title: 'Aporte removido',
        description: 'O aporte foi removido com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao remover aporte',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
