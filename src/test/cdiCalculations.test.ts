import { describe, it, expect } from 'vitest';
import { calculateHistoricalCDIReturn, getAverageCDIForPeriod } from '@/utils/historicalCDIRates';
import { calculateGrossReturn } from '@/utils/investmentCalculations';

describe('Historical CDI Rate Calculation Engine', () => {
  it('should calculate compound return factor across specific historical CDI rate periods', () => {
    // Investment from 2022-08-03 to 2023-08-01 (13.75% rate period)
    const startDate = new Date('2022-08-03T00:00:00');
    const endDate = new Date('2023-08-01T00:00:00');

    // For 100% CDI:
    const factor100 = calculateHistoricalCDIReturn(startDate, endDate, 100, 14.0);
    // Expected annual factor for ~1 year at 13.75%
    expect(factor100).toBeGreaterThan(1.13);
    expect(factor100).toBeLessThan(1.14);

    // For 110% CDI:
    const factor110 = calculateHistoricalCDIReturn(startDate, endDate, 110, 14.0);
    // Expected annual factor for ~1 year at 110% of 13.75% = 15.125%
    expect(factor110).toBeGreaterThan(1.145);
    expect(factor110).toBeLessThan(1.155);
  });

  it('should compound accurately across multiple rate changes (e.g. 2023 to 2026)', () => {
    const startDate = new Date('2023-01-01T00:00:00');
    const endDate = new Date('2026-08-10T00:00:00');

    const factor = calculateHistoricalCDIReturn(startDate, endDate, 100, 14.0);
    // From 2023 to 2026, CDI was between 10.5% and 15.0%, so 3.6 years should compound to around 40-50%
    expect(factor).toBeGreaterThan(1.40);
    expect(factor).toBeLessThan(1.60);
  });

  it('should calculate gross return for initial investment and deposits', () => {
    const startDate = new Date('2023-08-02T00:00:00');
    const endDate = new Date('2024-08-02T00:00:00');
    const initialValue = 10000;

    const grossReturn = calculateGrossReturn(
      initialValue,
      'CDI',
      100, // 100% do CDI
      365,
      14.0,
      4.5,
      startDate,
      endDate
    );

    // Initial 10.000 should yield around R$ 1.200 to R$ 1.350 return over 1 year (rates 13.25% to 10.50%)
    expect(grossReturn).toBeGreaterThan(1100);
    expect(grossReturn).toBeLessThan(1350);
  });
});