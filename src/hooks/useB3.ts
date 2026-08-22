import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type { B3Position, B3ReportType, ReconcileRow } from '@/types/b3';
import type { Investment, InvestmentType, RateType } from '@/types/investment';

export interface B3Import {
  id: string;
  user_id: string;
  imported_at: string;
  report_type: string;
  file_name: string | null;
  row_count: number;
  mismatch_count: number;
  summary: unknown;
}

export function useB3Imports() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['b3-imports', user?.id],
    queryFn: async (): Promise<B3Import[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('b3_imports')
        .select('*')
        .order('imported_at', { ascending: false })
        .limit(20);
      if (error) throw new Error(error.message);
      return (data || []) as B3Import[];
    },
    enabled: !!user,
  });
}

export function useRegisterB3Import() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      reportType: B3ReportType;
      fileName: string;
      rowCount: number;
      mismatchCount: number;
      summary?: unknown;
    }) => {
      if (!user) throw new Error('Usuário não autenticado');
      const { error } = await supabase.from('b3_imports').insert({
        user_id: user.id,
        report_type: input.reportType,
        file_name: input.fileName,
        row_count: input.rowCount,
        mismatch_count: input.mismatchCount,
        summary: (input.summary ?? null) as never,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['b3-imports'] });
    },
  });
}

function inferRate(indexer?: string): { rate_type: RateType; rate_value: number } {
  const value = (indexer || '').toUpperCase();
  if (value.includes('IPCA')) return { rate_type: 'IPCA', rate_value: 5 };
  if (value.includes('PRÉ') || value.includes('PRE')) return { rate_type: 'PREFIXADO', rate_value: 12 };
  if (value.includes('CDI') || value.includes('DI')) return { rate_type: 'CDI', rate_value: 100 };
  return { rate_type: 'CDI', rate_value: 100 };
}

/** Creates an investment straight from a B3 statement row */
export function useCreateFromB3() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (position: B3Position) => {
      if (!user) throw new Error('Usuário não autenticado');

      const today = new Date().toISOString().split('T')[0];
      const isStock = !!position.ticker && !position.maturityDate;
      const type: InvestmentType = isStock ? 'ACAO' : 'CDB';
      const rate = isStock ? { rate_type: 'NONE' as RateType, rate_value: 0 } : inferRate(position.indexer);

      const payload = {
        user_id: user.id,
        type,
        name: position.product,
        institution: position.issuer || position.institution || 'B3',
        initial_value: position.totalValue ?? 0,
        rate_type: rate.rate_type,
        rate_value: rate.rate_value,
        start_date: position.tradeDate ?? today,
        end_date: position.maturityDate ?? today,
        is_active: true,
        ticker: position.ticker ?? null,
        quantity: position.quantity ?? null,
        last_verified_at: new Date().toISOString(),
        verified_value: isStock ? (position.quantity ?? null) : (position.totalValue ?? null),
        b3_source: position.reportType,
      };

      const { error } = await supabase.from('investments').insert(payload);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      toast({ title: 'Investimento criado', description: 'Cadastrado a partir do extrato da B3.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar investimento', description: error.message, variant: 'destructive' });
    },
  });
}

/** Applies the B3 values to an existing investment and stamps the verification */
export function useApplyB3Row() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ row, updateValues }: { row: ReconcileRow; updateValues: boolean }) => {
      const investment = row.investment;
      if (!investment) throw new Error('Investimento não encontrado');

      const update: {
        last_verified_at: string;
        verified_value: number | null;
        b3_source: string | null;
        updated_at: string;
        quantity?: number;
        initial_value?: number;
      } = {
        last_verified_at: new Date().toISOString(),
        verified_value: row.b3Value ?? null,
        b3_source: row.position?.reportType ?? null,
        updated_at: new Date().toISOString(),
      };

      if (updateValues && row.b3Value !== undefined) {
        if (row.metric === 'QUANTIDADE') update.quantity = row.b3Value;
        else update.initial_value = row.b3Value;
      }

      const { error } = await supabase.from('investments').update(update).eq('id', investment.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      toast({
        title: variables.updateValues ? 'Valores atualizados' : 'Investimento conferido',
        description: variables.updateValues
          ? 'O investimento agora reflete o extrato da B3.'
          : 'Marcado como conferido com o extrato da B3.',
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },
  });
}
