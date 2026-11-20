import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks (hoisted) ────────────────────────────────────────────
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}));

vi.mock('@/lib/offlineDb', () => ({
  isOnline: vi.fn(() => true),
  saveLocalDividends: vi.fn(async () => {}),
}));

// useAuth/useInvestments não são exercitados nos testes de função pura,
// mas o arquivo importa o hook inteiro. Mockamos para evitar side effects.
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/hooks/useInvestments', () => ({ useInvestments: () => ({ data: [] }) }));

// ── Imports após mocks ─────────────────────────────────────────
import { supabase } from '@/integrations/supabase/client';
import { isOnline, saveLocalDividends } from '@/lib/offlineDb';
import {
  todayInBrazil,
  mapRelatedTo,
  splitDueAndFuture,
  reconcileDueDividends,
  type FutureDividend,
} from '@/hooks/useFutureDividends';

// ── Helpers ───────────────────────────────────────────────────
function makeDividend(overrides: Partial<FutureDividend> = {}): FutureDividend {
  return {
    id: 'TIMS3-2026-11-10-0.5-DIVIDENDO',
    ticker: 'TIMS3',
    assetName: 'TIM S.A.',
    type: 'DIVIDENDO',
    typeLabel: 'Dividendo',
    dateCom: '2026-11-01',
    paymentDate: '2026-11-10',
    valuePerShare: 0.5,
    quantityOnDateCom: 240,
    totalAmount: 120,
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════
// 1. todayInBrazil — fuso America/Sao_Paulo (UTC-3, sem DST)
// ══════════════════════════════════════════════════════════════
describe('todayInBrazil', () => {
  it('retorna a data em BRT para um instante no meio do dia', () => {
    expect(todayInBrazil(new Date('2026-11-19T15:30:00Z'))).toBe('2026-11-19');
  });

  it('NÃO vira o dia às 21h de Brasília (bug clássico de UTC)', () => {
    // 2026-11-20T00:30:00Z = 2026-11-19 21:30 BRT → ainda deve ser dia 19
    expect(todayInBrazil(new Date('2026-11-20T00:30:00Z'))).toBe('2026-11-19');
  });

  it('vira para o próximo dia à meia-noite BRT', () => {
    // 2026-11-20T03:00:00Z = 2026-11-20 00:00 BRT
    expect(todayInBrazil(new Date('2026-11-20T03:00:00Z'))).toBe('2026-11-20');
  });
});

// ══════════════════════════════════════════════════════════════
// 2. mapRelatedTo — classificação de proventos
// ══════════════════════════════════════════════════════════════
describe('mapRelatedTo', () => {
  it('classifica dividendos', () => {
    expect(mapRelatedTo('Dividendo')).toEqual({ type: 'DIVIDENDO', label: 'Dividendo' });
    expect(mapRelatedTo('DIVIDENDOS')).toEqual({ type: 'DIVIDENDO', label: 'Dividendo' });
  });

  it('classifica JCP (incluindo "Juros sobre capital")', () => {
    expect(mapRelatedTo('JCP')).toEqual({ type: 'JCP', label: 'JCP' });
    expect(mapRelatedTo('Juros Sobre Capital Próprio')).toEqual({ type: 'JCP', label: 'JCP' });
    expect(mapRelatedTo('juros sobre capital')).toEqual({ type: 'JCP', label: 'JCP' });
  });

  it('trata string vazia/undefined como Provento', () => {
    expect(mapRelatedTo('')).toEqual({ type: 'OUTRO', label: 'Provento' });
    expect(mapRelatedTo(undefined)).toEqual({ type: 'OUTRO', label: 'Provento' });
  });

  it('preserva o rótulo original em OUTRO', () => {
    expect(mapRelatedTo('Rendimento')).toEqual({ type: 'OUTRO', label: 'Rendimento' });
  });
});

// ══════════════════════════════════════════════════════════════
// 3. splitDueAndFuture — coração da Feature 1
// ══════════════════════════════════════════════════════════════
describe('splitDueAndFuture', () => {
  it('array vazio retorna ambos vazios', () => {
    expect(splitDueAndFuture([], '2026-11-19')).toEqual({ future: [], due: [] });
  });

  it('todos futuros quando nenhum passou', () => {
    const events = [
      { paymentDate: '2026-11-20' },
      { paymentDate: '2026-12-01' },
    ];
    const { future, due } = splitDueAndFuture(events, '2026-11-19');
    expect(future).toHaveLength(2);
    expect(due).toHaveLength(0);
  });

  it('todos vencidos quando todos passaram', () => {
    const events = [
      { paymentDate: '2026-10-01' },
      { paymentDate: '2026-11-01' },
    ];
    const { future, due } = splitDueAndFuture(events, '2026-11-19');
    expect(future).toHaveLength(0);
    expect(due).toHaveLength(2);
  });

  it('separa corretamente misto', () => {
    const events = [
      { paymentDate: '2026-10-15', id: 'a' }, // due
      { paymentDate: '2026-11-19', id: 'b' }, // fut (hoje ainda é futuro)
      { paymentDate: '2026-12-20', id: 'c' }, // fut
      { paymentDate: '2026-11-18', id: 'd' }, // due
    ];
    const { future, due } = splitDueAndFuture(events, '2026-11-19');
    expect(due.map((e) => e.id)).toEqual(['a', 'd']);
    expect(future.map((e) => e.id)).toEqual(['b', 'c']);
  });

  it('paymentDate === hoje permanece em FUTUROS (contrato atual)', () => {
    // Regra: `< today` (estrito). Se mudar para `<=`, este teste quebra
    // de propósito e força revisão da semântica.
    const events = [{ paymentDate: '2026-11-19' }];
    expect(splitDueAndFuture(events, '2026-11-19').due).toHaveLength(0);
    expect(splitDueAndFuture(events, '2026-11-19').future).toHaveLength(1);
  });

  it('não muta o array original', () => {
    const events = [{ paymentDate: '2026-10-01' }];
    const original = [...events];
    splitDueAndFuture(events, '2026-11-19');
    expect(events).toEqual(original);
  });
});

// ══════════════════════════════════════════════════════════════
// 4. reconcileDueDividends — persistência idempotente
// ══════════════════════════════════════════════════════════════
describe('reconcileDueDividends', () => {
  const upsertMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    upsertMock.mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockReturnValue({
      upsert: upsertMock,
    } as never);
    vi.mocked(isOnline).mockReturnValue(true);
  });

  it('array vazio não faz nada (no-op)', async () => {
    await reconcileDueDividends('user-1', []);
    expect(supabase.from).not.toHaveBeenCalled();
    expect(saveLocalDividends).not.toHaveBeenCalled();
  });

  it('faz upsert com ignoreDuplicates e prefixo fd-', async () => {
    const due = [makeDividend()];
    await reconcileDueDividends('user-1', due);

    expect(supabase.from).toHaveBeenCalledWith('dividend_payments');
    expect(upsertMock).toHaveBeenCalledTimes(1);

    const [rows, options] = upsertMock.mock.calls[0];
    expect(rows).toHaveLength(1);
    // Contra o schema real (types.ts → dividend_payments.Row), a coluna é `date`.
    expect(rows[0]).toMatchObject({
      id: 'fd-TIMS3-2026-11-10-0.5-DIVIDENDO',
      user_id: 'user-1',
      ticker: 'TIMS3',
      type: 'DIVIDENDO',
      date: '2026-11-10',
      source: 'auto',
      total_amount: 120,
    });
    expect(rows[0].id.startsWith('fd-')).toBe(true);
    expect(options).toEqual({
      onConflict: 'user_id,id',
      ignoreDuplicates: true,
    });
  });

  it('payload NÃO inclui payment_date (regressão)', async () => {
    await reconcileDueDividends('user-1', [makeDividend()]);
    const [rows] = upsertMock.mock.calls[0];
    expect(rows[0]).not.toHaveProperty('payment_date');
    expect(rows[0]).toHaveProperty('date', '2026-11-10');
  });

  it('é idempotente: chamar 2x gera 2 upserts mas o id é o mesmo', async () => {
    const due = [makeDividend()];
    await reconcileDueDividends('user-1', due);
    await reconcileDueDividends('user-1', due);

    expect(upsertMock).toHaveBeenCalledTimes(2);
    const idFirst = upsertMock.mock.calls[0][0][0].id;
    const idSecond = upsertMock.mock.calls[1][0][0].id;
    expect(idFirst).toBe(idSecond); // ignoreDuplicates garante 1 linha no DB
  });

  it('offline: pula o upsert do Supabase mas salva no IndexedDB', async () => {
    vi.mocked(isOnline).mockReturnValue(false);
    await reconcileDueDividends('user-1', [makeDividend()]);

    expect(supabase.from).not.toHaveBeenCalled();
    expect(saveLocalDividends).toHaveBeenCalledTimes(1);
  });

  it('online: salva tanto no Supabase quanto no IndexedDB', async () => {
    await reconcileDueDividends('user-1', [makeDividend()]);

    expect(upsertMock).toHaveBeenCalledTimes(1);
    expect(saveLocalDividends).toHaveBeenCalledTimes(1);
  });

  it('propaga erro do Supabase (para o caller logar e retentar)', async () => {
    upsertMock.mockResolvedValueOnce({ error: { message: 'boom' } });
    await expect(
      reconcileDueDividends('user-1', [makeDividend()]),
    ).rejects.toEqual({ message: 'boom' });
    // Não deve ter salvado localmente após erro do upsert
    expect(saveLocalDividends).not.toHaveBeenCalled();
  });
});