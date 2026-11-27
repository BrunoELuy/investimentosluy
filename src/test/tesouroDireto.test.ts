import { describe, it, expect } from 'vitest';
import {
  calculateGrossReturn,
  calculateInvestment,
  calculateDashboardSummary,
  formatRateValue,
  getRateTypeLabel,
  isTaxableFixedIncome,
} from '@/utils/investmentCalculations';
import type { Investment } from '@/types/investment';

function makeTesouroInvestment(overrides: Partial<Investment> = {}): Investment {
  return {
    id: 'tesouro-1',
    user_id: 'user-1',
    type: 'TESOURO',
    institution: 'Tesouro Direto',
    name: 'Tesouro Prefixado 2034',
    initial_value: 10000,
    rate_type: 'PREFIXADO',
    rate_value: 15.03,
    start_date: '2025-01-01',
    end_date: '2034-01-01',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('Tesouro Direto calculations & helpers', () => {
  it('calcula rendimento bruto para Tesouro Prefixado (ex: 15,03% a.a.)', () => {
    const gross = calculateGrossReturn(10000, 'PREFIXADO', 15.03, 365, 14.9, 4.5);
    expect(gross).toBeCloseTo(1503, 1);
  });

  it('calcula rendimento bruto para Tesouro Selic (SELIC + adicional)', () => {
    // Selic 10.5% + 0.10% = 10.60% a.a.
    const gross = calculateGrossReturn(
      10000,
      'SELIC',
      0.1,
      365,
      14.9,
      4.5,
      undefined,
      undefined,
      10.5,
    );
    expect(gross).toBeCloseTo(1060, 1);
  });

  it('aplica IR regressivo e IOF para TESOURO exatamente como CDB', () => {
    expect(isTaxableFixedIncome('TESOURO')).toBe(true);
    expect(isTaxableFixedIncome('CDB')).toBe(true);
    expect(isTaxableFixedIncome('LCA')).toBe(false);
    expect(isTaxableFixedIncome('ACAO')).toBe(false);

    const tesouro = makeTesouroInvestment();
    const calc = calculateInvestment(tesouro, 14.9, 4.5, [], 10.5);

    expect(calc.grossReturn).toBeGreaterThan(0);
    expect(calc.irRate).toBeGreaterThan(0);
    expect(calc.irAmount).toBeGreaterThan(0);
    expect(calc.netReturn).toBeLessThan(calc.grossReturn);
  });

  it('contabiliza tesouroCount no resumo do dashboard', () => {
    const tesouro = makeTesouroInvestment();
    const calc = calculateInvestment(tesouro, 14.9, 4.5, [], 10.5);
    const summary = calculateDashboardSummary([calc]);

    expect(summary.tesouroCount).toBe(1);
    expect(summary.cdbCount).toBe(0);
    expect(summary.lcaCount).toBe(0);
  });

  it('formata e rotula taxa SELIC corretamente', () => {
    expect(getRateTypeLabel('SELIC')).toBe('Selic +');
    expect(formatRateValue('SELIC', 0)).toBe('100% Selic');
    expect(formatRateValue('SELIC', 0.15)).toBe('Selic + 0.15%');
    expect(formatRateValue('PREFIXADO', 15.03)).toBe('15.03% a.a.');
  });
});
