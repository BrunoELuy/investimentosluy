import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from '@/integrations/supabase/client';
import {
  calculateQuantityAtDate,
} from '@/hooks/useFutureDividends';
import {
  createStockAporteCore,
  type StockAporteInput,
} from '@/hooks/useStockAportes';

// ══════════════════════════════════════════════════════════════
// 1. calculateQuantityAtDate — coração da Feature 4
//    (aporte antes × depois da Data-com)
// ══════════════════════════════════════════════════════════════
describe('calculateQuantityAtDate', () => {
  const buy = (date: string, qty: number) =>
    ({ date, operation: 'BUY' as const, quantity: qty });
  const sell = (date: string, qty: number) =>
    ({ date, operation: 'SELL' as const, quantity: qty });

  it('sem transações → 0', () => {
    expect(calculateQuantityAtDate([], '2026-03-01')).toBe(0);
  });

  it('aporte ANTES da Data-com é incluído', () => {
    const txs = [buy('2026-01-15', 100), buy('2026-02-20', 50)];
    expect(calculateQuantityAtDate(txs, '2026-03-01')).toBe(150);
  });

  it('aporte DEPOIS da Data-com é ignorado (provento mantém valor)', () => {
    const txs = [buy('2026-01-15', 100), buy('2026-03-05', 50)];
    expect(calculateQuantityAtDate(txs, '2026-03-01')).toBe(100);
  });

  it('aporte no MESMO dia da Data-com é incluído (contrato)', () => {
    expect(calculateQuantityAtDate([buy('2026-03-01', 100)], '2026-03-01')).toBe(100);
  });

  it('vendas reduzem a quantidade', () => {
    const txs = [buy('2026-01-15', 100), sell('2026-02-20', 30)];
    expect(calculateQuantityAtDate(txs, '2026-03-01')).toBe(70);
  });

  it('misto de compras e vendas antes e depois da Data-com', () => {
    const txs = [
      buy('2026-01-01', 100),
      sell('2026-01-20', 30),
      buy('2026-02-15', 50),
      sell('2026-03-05', 20), // depois da Data-com, ignorado
      buy('2026-03-10', 40),  // depois da Data-com, ignorado
    ];
    expect(calculateQuantityAtDate(txs, '2026-03-01')).toBe(120);
  });

  it('pode retornar negativo (caller aplica Math.max)', () => {
    const txs = [buy('2026-01-01', 10), sell('2026-02-01', 30)];
    expect(calculateQuantityAtDate(txs, '2026-03-01')).toBe(-20);
  });
});

// ══════════════════════════════════════════════════════════════
// 2. createStockAporteCore — persistência
// ══════════════════════════════════════════════════════════════
describe('createStockAporteCore', () => {
  const insertTx = vi.fn();
  const selectInv = vi.fn();
  // ← FIX: separa o mock do update (captura payload) do eq (retorna Promise)
  const updateMock = vi.fn();
  const updateEq = vi.fn();
  const insertInv = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    insertTx.mockResolvedValue({ error: null });
    selectInv.mockResolvedValue({ data: null, error: null });
    updateEq.mockResolvedValue({ error: null });
    updateMock.mockReturnValue({ eq: updateEq });
    insertInv.mockResolvedValue({ error: null });

    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      if (table === 'stock_transactions') {
        return { insert: insertTx } as never;
      }
      if (table === 'investments') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: selectInv,
                })),
              })),
            })),
          })),
          update: updateMock,
          insert: insertInv,
        } as never;
      }
      throw new Error(`unexpected table ${table}`);
    }) as never);
  });

  const baseInput: StockAporteInput = {
    ticker: 'tims3',
    quantity: 50,
    unitPrice: 10.5,
    date: '2026-03-10',
  };

  it('cria transação com ticker normalizado e source APORTE', async () => {
    await createStockAporteCore(baseInput, 'user-1');
    expect(insertTx).toHaveBeenCalledTimes(1);
    const row = insertTx.mock.calls[0][0];
    expect(row).toMatchObject({
      user_id: 'user-1',
      ticker: 'TIMS3',
      date: '2026-03-10',
      operation: 'BUY',
      quantity: 50,
      unit_price: 10.5,
      total_value: 525,
      source: 'APORTE',
    });
  });

  it('cria investimento novo se não existe', async () => {
    selectInv.mockResolvedValueOnce({ data: null, error: null });
    const result = await createStockAporteCore(baseInput, 'user-1');
    expect(insertInv).toHaveBeenCalledTimes(1);
    const inv = insertInv.mock.calls[0][0];
    expect(inv).toMatchObject({
      user_id: 'user-1',
      type: 'ACAO',
      ticker: 'TIMS3',
      quantity: 50,
      initial_value: 525,
      start_date: '2026-03-10',
    });
    expect(result.isNew).toBe(true);
  });

  it('atualiza investimento existente: soma quantidade e initial_value', async () => {
    selectInv.mockResolvedValueOnce({
      data: { id: 'inv-1', quantity: 100, initial_value: 1000, start_date: '2026-01-15' },
      error: null,
    });
    const result = await createStockAporteCore(baseInput, 'user-1');

    // ← FIX: agora validamos updateMock (payload), não updateEq
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(insertInv).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      investmentId: 'inv-1',
      isNew: false,
      quantity: 50,
      totalValue: 525,
    });

    // O payload do UPDATE está no primeiro argumento de `updateMock`
    const updatePayload = updateMock.mock.calls[0][0];
    expect(updatePayload).toMatchObject({
      quantity: 150,
      initial_value: 1525,
      start_date: '2026-01-15', // aporte é depois do início: mantém
    });

    // E o WHERE é `id = inv-1`
    expect(updateEq).toHaveBeenCalledWith('id', 'inv-1');
  });

  it('aporte anterior ao start_date vira o novo início', async () => {
    selectInv.mockResolvedValueOnce({
      data: { id: 'inv-1', quantity: 100, initial_value: 1000, start_date: '2026-02-01' },
      error: null,
    });
    await createStockAporteCore(
      { ...baseInput, date: '2026-01-15' }, // antes do start_date
      'user-1',
    );
    // ← FIX: payload está em updateMock, não em updateEq
    const updatePayload = updateMock.mock.calls[0][0];
    expect(updatePayload.start_date).toBe('2026-01-15');
  });

  it('erro no insert da transação propaga', async () => {
    insertTx.mockResolvedValueOnce({ error: { message: 'tx boom' } });
    await expect(
      createStockAporteCore(baseInput, 'user-1'),
    ).rejects.toThrow('tx boom');
  });

  it('erro no update do investimento propaga', async () => {
    selectInv.mockResolvedValueOnce({
      data: { id: 'inv-1', quantity: 100, initial_value: 1000, start_date: '2026-01-15' },
      error: null,
    });
    // ← FIX: o alvo do erro é updateEq (quem retorna a Promise do `.eq()`)
    updateEq.mockResolvedValueOnce({ error: { message: 'up boom' } });
    await expect(
      createStockAporteCore(baseInput, 'user-1'),
    ).rejects.toThrow('up boom');
  });
});