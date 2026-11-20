import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/investmentCalculations';

export interface StockAporteInput {
  ticker: string;
  quantity: number;
  unitPrice: number;
  date: string;         // YYYY-MM-DD
  institution?: string;
  notes?: string;
}

export interface StockAporteResult {
  ticker: string;
  quantity: number;
  totalValue: number;
  investmentId: string;
  isNew: boolean;
}

/**
 * Núcleo testável: insere transação + atualiza/cria investimento.
 * Extraído do hook para permitir testes com Supabase mockado.
 */
export async function createStockAporteCore(
  input: StockAporteInput,
  userId: string,
): Promise<StockAporteResult> {
  const ticker = input.ticker.trim().toUpperCase();
  const totalValue = input.quantity * input.unitPrice;
  const now = new Date().toISOString();

  // 1. Insere a transação (fonte de verdade para Data-com)
  const txId = crypto.randomUUID();
  const { error: txError } = await supabase
    .from('stock_transactions')
    .insert({
      id: txId,
      user_id: userId,
      ticker,
      date: input.date,
      operation: 'BUY',
      quantity: input.quantity,
      unit_price: input.unitPrice,
      total_value: totalValue,
      source: 'APORTE',
      created_at: now,
    });
  if (txError) throw new Error(txError.message);

  // 2. Busca investimento existente
  const { data: existing, error: selError } = await supabase
    .from('investments')
    .select('id, quantity, initial_value, start_date')
    .eq('user_id', userId)
    .eq('type', 'ACAO')
    .eq('ticker', ticker)
    .maybeSingle();
  if (selError) throw new Error(selError.message);

  if (existing) {
    const newQuantity = Number(existing.quantity ?? 0) + input.quantity;
    const newInitialValue = Number(existing.initial_value ?? 0) + totalValue;
    // Se o aporte é anterior ao início do investimento, ele vira o novo start_date.
    const newStartDate =
      input.date < existing.start_date ? input.date : existing.start_date;

    const { error: upError } = await supabase
      .from('investments')
      .update({
        quantity: newQuantity,
        initial_value: newInitialValue,
        start_date: newStartDate,
        updated_at: now,
      })
      .eq('id', existing.id);
    if (upError) throw new Error(upError.message);

    return {
      ticker,
      quantity: input.quantity,
      totalValue,
      investmentId: existing.id,
      isNew: false,
    };
  }

  // 3. Cria investimento novo
  const investmentId = crypto.randomUUID();
  const { error: createError } = await supabase
    .from('investments')
    .insert({
      id: investmentId,
      user_id: userId,
      type: 'ACAO',
      name: ticker,
      ticker,
      institution: input.institution ?? 'B3',
      initial_value: totalValue,
      quantity: input.quantity,
      rate_type: 'NONE',
      rate_value: 0,
      start_date: input.date,
      end_date: input.date,
      is_active: true,
      notes: input.notes ?? null,
      created_at: now,
      updated_at: now,
    });
  if (createError) throw new Error(createError.message);

  return {
    ticker,
    quantity: input.quantity,
    totalValue,
    investmentId,
    isNew: true,
  };
}

export function useCreateStockAporte() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: StockAporteInput): Promise<StockAporteResult> => {
      if (!user) throw new Error('Usuário não autenticado');
      return createStockAporteCore(input, user.id);
    },
    onSuccess: (data) => {
      // investimentos + transações + futuros proventos são interdependentes
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      queryClient.invalidateQueries({ queryKey: ['stock-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['future-dividends'] });

      toast({
        title: 'Aporte registrado!',
        description: `${data.quantity} ${data.ticker} por ${formatCurrency(data.totalValue)}.${
          data.isNew ? ' Investimento criado.' : ''
        }`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao registrar aporte',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}