import { describe, it, expect } from 'vitest';
import { consolidateMovements, extractAssetPrefix } from '@/lib/b3Parser';
import type { B3MovementRow } from '@/types/b3';

describe('B3 Movements Parser and Consolidation', () => {
  it('should correctly extract prefix for CDB, LCA and Stocks', () => {
    expect(extractAssetPrefix('CDB - CDB32657GRD - BANCO BRADESCO S/A')).toEqual({
      prefix: 'CDB',
      fullName: 'CDB - CDB32657GRD - BANCO BRADESCO S/A',
      isFixedIncome: true,
      type: 'CDB',
    });

    expect(extractAssetPrefix('LCA - 25G05083553 - BCO VOTORANTIM S/A')).toEqual({
      prefix: 'LCA',
      fullName: 'LCA - 25G05083553 - BCO VOTORANTIM S/A',
      isFixedIncome: true,
      type: 'LCA',
    });

    expect(extractAssetPrefix('BBSE3 - BB SEGURIDADE PARTICIPACOES S.A.')).toEqual({
      prefix: 'BBSE3',
      fullName: 'BBSE3 - BB SEGURIDADE PARTICIPACOES S.A.',
      isFixedIncome: false,
      type: 'ACAO',
    });

    expect(extractAssetPrefix('RANI3 - IRANI PAPEL E EMBALAGEM S.A.')).toEqual({
      prefix: 'RANI3',
      fullName: 'RANI3 - IRANI PAPEL E EMBALAGEM S.A.',
      isFixedIncome: false,
      type: 'ACAO',
    });
  });

  it('should process user sample spreadsheet correctly, including zero-balance assets and proventos', () => {
    const sampleRows: B3MovementRow[] = [
      {
        entryExit: 'Credito',
        date: '2026-08-20',
        rawDate: '20/08/2026',
        movementType: 'Dividendo',
        product: 'RANI3 - IRANI PAPEL E EMBALAGEM S.A.',
        institution: 'XP INVESTIMENTOS CCTVM S/A.',
        quantity: 107,
        unitPrice: 0.034,
        operationValue: 3.68,
        raw: {},
      },
      {
        entryExit: 'Credito',
        date: '2026-08-17',
        rawDate: '17/08/2026',
        movementType: 'Transferência - Liquidação',
        product: 'TIMS3 - TIM S.A.',
        institution: 'XP INVESTIMENTOS CCTVM S/A.',
        quantity: 30,
        unitPrice: 18.04,
        operationValue: 541.2,
        raw: {},
      },
      {
        entryExit: 'Credito',
        date: '2026-08-13',
        rawDate: '13/08/2026',
        movementType: 'Transferência - Liquidação',
        product: 'ALOS3 - ALLOS S.A.',
        institution: 'XP INVESTIMENTOS CCTVM S/A.',
        quantity: 30,
        unitPrice: 26.15,
        operationValue: 784.5,
        raw: {},
      },
      {
        entryExit: 'Debito',
        date: '2026-08-13',
        rawDate: '13/08/2026',
        movementType: 'RESGATE ANTECIPADO/',
        product: 'CDB - CDB32657GRD - BANCO BRADESCO S/A',
        institution: 'BANCO BRADESCO S/A',
        quantity: 28667,
        unitPrice: 0.01060526,
        operationValue: 304.02,
        raw: {},
      },
      {
        entryExit: 'Credito',
        date: '2026-08-04',
        rawDate: '04/08/2026',
        movementType: 'Dividendo',
        product: 'ALOS3 - ALLOS S.A.',
        institution: 'XP INVESTIMENTOS CCTVM S/A.',
        quantity: 122,
        unitPrice: 0.292,
        operationValue: 35.61,
        raw: {},
      },
      {
        entryExit: 'Credito',
        date: '2026-08-03',
        rawDate: '03/08/2026',
        movementType: 'Juros Sobre Capital Próprio',
        product: 'BBDC3 - BANCO BRADESCO S/A',
        institution: 'XP INVESTIMENTOS CCTVM S/A.',
        quantity: 117,
        unitPrice: 0.017,
        operationValue: 1.66,
        raw: {},
      },
      // BBSE3 Buy and Sell: 260 bought, 260 sold
      {
        entryExit: 'Credito',
        date: '2026-07-15',
        rawDate: '15/07/2026',
        movementType: 'Transferência - Liquidação',
        product: 'BBSE3 - BB SEGURIDADE PARTICIPACOES S.A.',
        institution: 'XP INVESTIMENTOS CCTVM S/A.',
        quantity: 260,
        unitPrice: 40.39,
        operationValue: 10501.4,
        raw: {},
      },
      {
        entryExit: 'Debito',
        date: '2026-07-20',
        rawDate: '20/07/2026',
        movementType: 'Transferência - Liquidação',
        product: 'BBSE3 - BB SEGURIDADE PARTICIPACOES S.A.',
        institution: 'XP INVESTIMENTOS CCTVM S/A.',
        quantity: 260,
        unitPrice: 41.11,
        operationValue: 10688.6,
        raw: {},
      },
      // BBSE3 Dividends received
      {
        entryExit: 'Credito',
        date: '2026-03-02',
        rawDate: '02/03/2026',
        movementType: 'Dividendo',
        product: 'BBSE3 - BB SEGURIDADE PARTICIPACOES S.A.',
        institution: 'XP INVESTIMENTOS CCTVM S/A',
        quantity: 160,
        unitPrice: 2.55,
        operationValue: 407.99,
        raw: {},
      },
      {
        entryExit: 'Credito',
        date: '2026-03-02',
        rawDate: '02/03/2026',
        movementType: 'Rendimento',
        product: 'BBSE3 - BB SEGURIDADE PARTICIPACOES S.A.',
        institution: 'XP INVESTIMENTOS CCTVM S/A',
        quantity: 160,
        unitPrice: 0.057,
        operationValue: 7.05,
        raw: {},
      },
      // CDB Applications in Bradesco
      {
        entryExit: 'Credito',
        date: '2026-03-09',
        rawDate: '09/03/2026',
        movementType: 'APLICAÇÃO',
        product: 'CDB - CDB32657GRD',
        institution: 'BANCO BRADESCO S/A',
        quantity: 2000000,
        unitPrice: 0.01,
        operationValue: 20000.0,
        raw: {},
      },
      {
        entryExit: 'Credito',
        date: '2026-05-13',
        rawDate: '13/05/2026',
        movementType: 'APLICAÇÃO',
        product: 'CDB - CDB5267BS08',
        institution: 'BANCO BRADESCO S/A',
        quantity: 1000000,
        unitPrice: 0.01,
        operationValue: 10000.0,
        raw: {},
      },
    ];

    const result = consolidateMovements(sampleRows);

    // 1. Check BBSE3: Bought 260 and Sold 260 -> isZeroBalance should be true!
    const bbse3 = result.stocks.find(s => s.ticker === 'BBSE3');
    expect(bbse3).toBeDefined();
    expect(bbse3?.totalQuantity).toBe(0);
    expect(bbse3?.isZeroBalance).toBe(true);

    // 2. Check Dividends: BBSE3 Dividends MUST be present in dividends array
    const bbse3Dividends = result.dividends.filter(d => d.ticker === 'BBSE3');
    expect(bbse3Dividends.length).toBe(2);
    expect(bbse3Dividends.some(d => d.type === 'DIVIDENDO' && d.totalAmount === 407.99)).toBe(true);
    expect(bbse3Dividends.some(d => d.type === 'RENDIMENTO' && d.totalAmount === 7.05)).toBe(true);

    // 3. Other dividends present
    expect(result.dividends.some(d => d.ticker === 'RANI3' && d.totalAmount === 3.68)).toBe(true);
    expect(result.dividends.some(d => d.ticker === 'ALOS3' && d.totalAmount === 35.61)).toBe(true);
    expect(result.dividends.some(d => d.ticker === 'BBDC3' && d.totalAmount === 1.66)).toBe(true);

    // 4. Fixed Income Bradesco CDB
    const bradescoCdb = result.fixedIncome.find(fi => fi.institution.includes('BRADESCO'));
    expect(bradescoCdb).toBeDefined();
    expect(bradescoCdb?.totalApplied).toBe(30000.0);
    expect(bradescoCdb?.totalRedeemed).toBe(304.02);
    expect(bradescoCdb?.netInvested).toBe(29695.98);
    expect(bradescoCdb?.isZeroBalance).toBe(false);
    expect(bradescoCdb?.deposits.length).toBe(1);

    // 5. Active stocks
    const tims3 = result.stocks.find(s => s.ticker === 'TIMS3');
    expect(tims3).toBeDefined();
    expect(tims3?.totalQuantity).toBe(30);
    expect(tims3?.averagePrice).toBe(18.04);
    expect(tims3?.isZeroBalance).toBe(false);

    const alos3 = result.stocks.find(s => s.ticker === 'ALOS3');
    expect(alos3).toBeDefined();
    expect(alos3?.totalQuantity).toBe(30);
    expect(alos3?.isZeroBalance).toBe(false);
  });
});
