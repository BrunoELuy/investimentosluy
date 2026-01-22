import { differenceInDays, parseISO, format, isAfter } from 'date-fns';
import type { Investment, InvestmentCalculation, DashboardSummary } from '@/types/investment';
import { calculateHistoricalCDIReturn } from './historicalCDIRates';

// IR rates based on investment duration (only for CDB)
const IR_RATES = [
  { maxDays: 180, rate: 0.225 },
  { maxDays: 360, rate: 0.20 },
  { maxDays: 720, rate: 0.175 },
  { maxDays: Infinity, rate: 0.15 },
];

// IOF rates for first 30 days (decreases daily)
const IOF_RATES = [
  96, 93, 90, 86, 83, 80, 76, 73, 70, 66, 63, 60, 56, 53, 50, 
  46, 43, 40, 36, 33, 30, 26, 23, 20, 16, 13, 10, 6, 3, 0
];

export function getIRRate(days: number): number {
  for (const tier of IR_RATES) {
    if (days <= tier.maxDays) {
      return tier.rate;
    }
  }
  return 0.15;
}

export function getIOFRate(days: number): number {
  if (days >= 30) return 0;
  if (days < 1) return 0.96;
  return IOF_RATES[days - 1] / 100;
}

export function calculateDailyRate(annualRate: number): number {
  // Convert annual rate to daily rate using compound interest
  return Math.pow(1 + annualRate / 100, 1 / 365) - 1;
}

/**
 * Calculate gross return using historical CDI rates for CDI-indexed investments
 * This provides accurate calculations for investments that started in the past
 */
export function calculateGrossReturn(
  initialValue: number,
  rateType: string,
  rateValue: number,
  days: number,
  cdiRate: number,
  ipcaRate: number,
  startDate?: Date,
  endDate?: Date
): number {
  // For CDI-indexed investments with historical dates, use monthly historical rates
  if (rateType === 'CDI' && startDate && endDate) {
    const compoundFactor = calculateHistoricalCDIReturn(
      startDate,
      endDate,
      rateValue, // This is the % of CDI (e.g., 110 for 110% CDI)
      cdiRate
    );
    return initialValue * (compoundFactor - 1);
  }
  
  // For other rate types or when dates aren't provided, use the simple calculation
  let annualRate: number;
  
  switch (rateType) {
    case 'CDI':
      // rateValue is percentage of CDI (e.g., 110 means 110% of CDI)
      annualRate = (cdiRate * rateValue) / 100;
      break;
    case 'IPCA':
      // rateValue is the fixed rate added to IPCA
      annualRate = ipcaRate + rateValue;
      break;
    case 'PREFIXADO':
      // rateValue is the fixed annual rate
      annualRate = rateValue;
      break;
    default:
      annualRate = 0;
  }
  
  const dailyRate = calculateDailyRate(annualRate);
  const futureValue = initialValue * Math.pow(1 + dailyRate, days);
  return futureValue - initialValue;
}

export function calculateInvestment(
  investment: Investment,
  cdiRate: number = 10.65,
  ipcaRate: number = 4.5
): InvestmentCalculation {
  const today = new Date();
  const startDate = parseISO(investment.start_date);
  const endDate = parseISO(investment.end_date);
  
  const totalDays = differenceInDays(endDate, startDate);
  const daysElapsed = Math.min(
    differenceInDays(today, startDate),
    totalDays
  );
  const daysUntilMaturity = Math.max(differenceInDays(endDate, today), 0);
  const isMatured = isAfter(today, endDate);
  
  // Calculate gross return using historical rates when available
  const effectiveDays = Math.max(daysElapsed, 0);
  const calculationEndDate = isMatured ? endDate : today;
  
  const grossReturn = calculateGrossReturn(
    investment.initial_value,
    investment.rate_type,
    investment.rate_value,
    effectiveDays,
    cdiRate,
    ipcaRate,
    startDate,
    calculationEndDate
  );
  
  const currentValue = investment.initial_value + grossReturn;
  const grossReturnPercent = (grossReturn / investment.initial_value) * 100;
  
  // Calculate taxes (LCA is tax-exempt for individuals)
  let irRate = 0;
  let irAmount = 0;
  let iofAmount = 0;
  
  if (investment.type === 'CDB') {
    // IOF (only in first 30 days)
    if (effectiveDays < 30) {
      const iofRate = getIOFRate(effectiveDays);
      iofAmount = grossReturn * iofRate;
    }
    
    // IR (applied to gross return minus IOF)
    irRate = getIRRate(effectiveDays);
    irAmount = (grossReturn - iofAmount) * irRate;
  }
  
  const netReturn = grossReturn - irAmount - iofAmount;
  const currentNetValue = investment.initial_value + netReturn;
  const netReturnPercent = (netReturn / investment.initial_value) * 100;
  
  return {
    investment,
    daysElapsed: effectiveDays,
    totalDays,
    grossReturn,
    grossReturnPercent,
    netReturn,
    netReturnPercent,
    currentValue,
    currentNetValue,
    irRate,
    irAmount,
    iofAmount,
    daysUntilMaturity,
    isMatured,
  };
}

export function calculateDashboardSummary(
  calculations: InvestmentCalculation[]
): DashboardSummary {
  const activeCalcs = calculations.filter(c => c.investment.is_active);
  
  const totalInvested = activeCalcs.reduce(
    (sum, c) => sum + c.investment.initial_value,
    0
  );
  
  const totalGrossReturn = activeCalcs.reduce(
    (sum, c) => sum + c.grossReturn,
    0
  );
  
  const totalNetReturn = activeCalcs.reduce(
    (sum, c) => sum + c.netReturn,
    0
  );
  
  const totalGrossPercent = totalInvested > 0
    ? (totalGrossReturn / totalInvested) * 100
    : 0;
  
  const totalNetPercent = totalInvested > 0
    ? (totalNetReturn / totalInvested) * 100
    : 0;
  
  return {
    totalInvested,
    totalGrossReturn,
    totalNetReturn,
    totalGrossPercent,
    totalNetPercent,
    cdbCount: calculations.filter(c => c.investment.type === 'CDB').length,
    lcaCount: calculations.filter(c => c.investment.type === 'LCA').length,
    activeCount: activeCalcs.length,
    maturedCount: calculations.filter(c => c.isMatured).length,
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

export function formatDate(dateString: string): string {
  return format(parseISO(dateString), 'dd/MM/yyyy');
}

export function getRateTypeLabel(rateType: string): string {
  switch (rateType) {
    case 'CDI':
      return '% do CDI';
    case 'IPCA':
      return 'IPCA +';
    case 'PREFIXADO':
      return 'Prefixado';
    default:
      return rateType;
  }
}

export function formatRateValue(rateType: string, rateValue: number): string {
  switch (rateType) {
    case 'CDI':
      return `${rateValue.toFixed(0)}% do CDI`;
    case 'IPCA':
      return `IPCA + ${rateValue.toFixed(2)}%`;
    case 'PREFIXADO':
      return `${rateValue.toFixed(2)}% a.a.`;
    default:
      return `${rateValue}%`;
  }
}
