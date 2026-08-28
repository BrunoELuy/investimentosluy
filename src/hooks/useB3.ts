import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type {
  B3Position,
  B3ReportType,
  ReconcileRow,
  DividendPayment,
  B3AggregatedStock,
  B3AggregatedFixedIncome,
} from '@/types/b3';
import type { Investment, InvestmentType, RateType } from '@/types/investment';
import {
  getLocalDividends,
  saveLocalDividends,
  saveLocalInvestment,
  saveLocalInvestments,
  saveLocalDeposits,
  isOnline,
} from '@/lib/offlineDb';

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

export function useDividendPayments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dividend-payments', user?.id],
    queryFn: async (): Promise<DividendPayment[]> => {
      const local = await getLocalDividends(user?.id);
      return local.sort((a, b) => b.date.localeCompare(a.date));
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

/**
 * Imports full B3 consolidated movements:
 * - Active Stocks (non-zero): creates or updates positions.
 * - Active Fixed Income (non-zero): creates or updates positions + deposits.
 * - Zero balance positions: NOT created/added.
 * - Dividends/JCP: 100% saved and persisted regardless of whether asset is zeroed.
 */
export function useImportB3Movements() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      stocks: B3AggregatedStock[];
      fixedIncome: B3AggregatedFixedIncome[];
      dividends: DividendPayment[];
      existingInvestments: Investment[];
      fileName: string;
    }) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { stocks, fixedIncome, dividends, existingInvestments, fileName } = params;
      const now = new Date().toISOString();
      const today = now.split('T')[0];

      // 1. Process and save all dividends (including zero-balance assets)
      const userDividends = dividends.map(d => ({
        ...d,
        user_id: user.id,
        created_at: now,
      }));
      await saveLocalDividends(userDividends);

      let createdCount = 0;
      let updatedCount = 0;

      // 2. Process non-zero Stocks
      const activeStocks = stocks.filter(s => !s.isZeroBalance && s.totalQuantity > 0);
      for (const stock of activeStocks) {
        const existing = existingInvestments.find(
          inv => inv.type === 'ACAO' && inv.ticker && inv.ticker.toUpperCase() === stock.ticker.toUpperCase()
        );

        if (existing) {
          // Update existing stock
          const updatePayload = {
            quantity: stock.totalQuantity,
            initial_value: stock.totalInvested,
            last_verified_at: now,
            verified_value: stock.totalQuantity,
            b3_source: 'MOVIMENTACAO',
            updated_at: now,
          };

          if (isOnline()) {
            await supabase.from('investments').update(updatePayload).eq('id', existing.id);
          }
          await saveLocalInvestment({ ...existing, ...updatePayload });
          updatedCount++;
        } else {
          // Create new stock
          const newId = crypto.randomUUID();
          const newStock = {
            id: newId,
            user_id: user.id,
            type: 'ACAO' as InvestmentType,
            name: stock.ticker,
            ticker: stock.ticker,
            institution: stock.institution || 'B3',
            initial_value: stock.totalInvested,
            quantity: stock.totalQuantity,
            rate_type: 'NONE' as RateType,
            rate_value: 0,
            start_date: stock.firstDate || today,
            end_date: stock.lastDate || stock.firstDate || today,
            is_active: true,
            notes: `Importado da B3 (${stock.operationsCount} operações)`,
            last_verified_at: now,
            verified_value: stock.totalQuantity,
            b3_source: 'MOVIMENTACAO',
            created_at: now,
            updated_at: now,
          };

          if (isOnline()) {
            await supabase.from('investments').insert(newStock);
          }
          await saveLocalInvestment(newStock);
          createdCount++;
        }
      }

      // 3. Process non-zero Fixed Income (CDB / LCA)
      const activeFixedIncome = fixedIncome.filter(fi => !fi.isZeroBalance && fi.netInvested > 0);
      for (const fi of activeFixedIncome) {
        const existing = fi.existingInvestmentId
          ? existingInvestments.find(inv => inv.id === fi.existingInvestmentId)
          : existingInvestments.find(
            inv =>
              inv.type === fi.type &&
              inv.institution.toLowerCase().includes(fi.institution.toLowerCase()) &&
              inv.rate_type === fi.rateType &&
              inv.rate_value === fi.rateValue
          );

        if (existing) {
          // Update existing fixed income
          const updatePayload = {
            initial_value: fi.netInvested,
            last_verified_at: now,
            verified_value: fi.netInvested,
            b3_source: 'MOVIMENTACAO',
            updated_at: now,
          };

          if (isOnline()) {
            await supabase.from('investments').update(updatePayload).eq('id', existing.id);
          }
          await saveLocalInvestment({ ...existing, ...updatePayload });

          // Insert new deposits if present
          if (fi.deposits.length > 0) {
            const newDeposits = fi.deposits.map(d => ({
              id: crypto.randomUUID(),
              investment_id: existing.id,
              user_id: user.id,
              amount: d.amount,
              deposit_date: d.deposit_date,
              notes: d.notes || 'Aporte B3',
              created_at: now,
              updated_at: now,
            }));

            if (isOnline()) {
              await supabase.from('investment_deposits').insert(newDeposits);
            }
            await saveLocalDeposits(newDeposits);
          }
          updatedCount++;
        } else {
          // Create new fixed income investment
          const newId = crypto.randomUUID();
          // The base initial value is either the net invested minus additional deposits or net invested
          const baseInitial = fi.deposits.length > 0
            ? Math.max(0, fi.netInvested - fi.deposits.reduce((sum, d) => sum + d.amount, 0)) || fi.netInvested
            : fi.netInvested;

          const newInvestment = {
            id: newId,
            user_id: user.id,
            type: fi.type as InvestmentType,
            name: fi.name,
            institution: fi.institution,
            initial_value: baseInitial,
            rate_type: fi.rateType,
            rate_value: fi.rateValue,
            start_date: fi.startDate || today,
            end_date: fi.endDate || today,
            is_active: true,
            notes: `Importado da B3 (${fi.operationsCount} operações)`,
            last_verified_at: now,
            verified_value: fi.netInvested,
            b3_source: 'MOVIMENTACAO',
            created_at: now,
            updated_at: now,
          };

          if (isOnline()) {
            await supabase.from('investments').insert(newInvestment);
          }
          await saveLocalInvestment(newInvestment);

          // Save deposits if any
          if (fi.deposits.length > 0) {
            const newDeposits = fi.deposits.map(d => ({
              id: crypto.randomUUID(),
              investment_id: newId,
              user_id: user.id,
              amount: d.amount,
              deposit_date: d.deposit_date,
              notes: d.notes || 'Aporte B3',
              created_at: now,
              updated_at: now,
            }));

            if (isOnline()) {
              await supabase.from('investment_deposits').insert(newDeposits);
            }
            await saveLocalDeposits(newDeposits);
          }
          createdCount++;
        }
      }

      // 4. Register B3 import log
      if (isOnline()) {
        try {
          await supabase.from('b3_imports').insert({
            user_id: user.id,
            report_type: 'MOVIMENTACAO',
            file_name: fileName,
            row_count: stocks.length + fixedIncome.length + dividends.length,
            mismatch_count: 0,
            summary: {
              createdCount,
              updatedCount,
              dividendsCount: dividends.length,
              totalDividends: dividends.reduce((s, d) => s + d.totalAmount, 0),
            } as never,
          });
        } catch {
          // Continue if import log fails
        }
      }

      return { createdCount, updatedCount, dividendsCount: dividends.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      queryClient.invalidateQueries({ queryKey: ['all-deposits'] });
      queryClient.invalidateQueries({ queryKey: ['dividend-payments'] });
      queryClient.invalidateQueries({ queryKey: ['b3-imports'] });
      toast({
        title: 'Importação concluída com sucesso!',
        description: `${data.createdCount} novos investimentos, ${data.updatedCount} atualizados, ${data.dividendsCount} proventos registrados.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro na importação',
        description: error.message,
        variant: 'destructive',
      });
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
