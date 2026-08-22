import { differenceInDays, parseISO, format, isAfter, isBefore } from 'date-fns';
import type { Investment, InvestmentCalculation, DashboardSummary, InvestmentDeposit } from '@/types/investment';
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

/**
 * Calculate investment with support for multiple deposits
 * Each deposit is calculated independently from its date to the calculation date
 */
export function calculateInvestment(
  investment: Investment,
  cdiRate: number = 10.65,
  ipcaRate: number = 4.5,
  deposits: InvestmentDeposit[] = []
): InvestmentCalculation {
  const today = new Date();
  const startDate = parseISO(investment.start_date);
  const endDate = parseISO(investment.end_date);
  
  // For stocks (ACAO), we don't calculate returns - just show invested value
  if (investment.type === 'ACAO') {
    const totalInvested = investment.initial_value + deposits.reduce((sum, d) => sum + d.amount, 0);
    return {
      investment,
      deposits,
      daysElapsed: differenceInDays(today, startDate),
      totalDays: 0,
      grossReturn: 0,
      grossReturnPercent: 0,
      netReturn: 0,
      netReturnPercent: 0,
      currentValue: totalInvested,
      currentNetValue: totalInvested,
      irRate: 0,
      irAmount: 0,
      iofAmount: 0,
      daysUntilMaturity: 0,
      isMatured: false,
      totalInvested,
    };
  }
  
  const totalDays = differenceInDays(endDate, startDate);
  const daysElapsed = Math.min(
    differenceInDays(today, startDate),
    totalDays
  );
  const daysUntilMaturity = Math.max(differenceInDays(endDate, today), 0);
  const isMatured = isAfter(today, endDate);
  
  const effectiveDays = Math.max(daysElapsed, 0);
  const calculationEndDate = isMatured ? endDate : today;
  
  // Calculate return for initial investment
  let totalGrossReturn = calculateGrossReturn(
    investment.initial_value,
    investment.rate_type,
    investment.rate_value,
    effectiveDays,
    cdiRate,
    ipcaRate,
    startDate,
    calculationEndDate
  );
  
  // Calculate return for each deposit
  for (const deposit of deposits) {
    const depositDate = parseISO(deposit.deposit_date);
    
    // Only calculate if deposit is before calculation end date
    if (isBefore(depositDate, calculationEndDate)) {
      const depositDays = Math.max(differenceInDays(calculationEndDate, depositDate), 0);
      
      if (depositDays > 0) {
        const depositReturn = calculateGrossReturn(
          deposit.amount,
          investment.rate_type,
          investment.rate_value,
          depositDays,
          cdiRate,
          ipcaRate,
          depositDate,
          calculationEndDate
        );
        totalGrossReturn += depositReturn;
      }
    }
  }
  
  // Total invested = initial value + all deposits
  const totalInvested = investment.initial_value + deposits.reduce((sum, d) => sum + d.amount, 0);
  const currentValue = totalInvested + totalGrossReturn;
  const grossReturnPercent = (totalGrossReturn / totalInvested) * 100;
  
  // Calculate taxes (LCA is tax-exempt for individuals)
  let irRate = 0;
  let irAmount = 0;
  let iofAmount = 0;
  
  if (investment.type === 'CDB') {
    // IOF (only in first 30 days of initial investment)
    if (effectiveDays < 30) {
      const iofRate = getIOFRate(effectiveDays);
      // IOF applies proportionally to the portion of return from early investments
      const initialReturn = calculateGrossReturn(
        investment.initial_value,
        investment.rate_type,
        investment.rate_value,
        effectiveDays,
        cdiRate,
        ipcaRate,
        startDate,
        calculationEndDate
      );
      iofAmount = initialReturn * iofRate;
    }
    
    // IR (applied to gross return minus IOF)
    // Use the average weighted days for IR calculation
    irRate = getIRRate(effectiveDays);
    irAmount = (totalGrossReturn - iofAmount) * irRate;
  }
  
  const netReturn = totalGrossReturn - irAmount - iofAmount;
  const currentNetValue = totalInvested + netReturn;
  const netReturnPercent = (netReturn / totalInvested) * 100;
  
  return {
    investment,
    deposits,
    daysElapsed: effectiveDays,
    totalDays,
    grossReturn: totalGrossReturn,
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
    totalInvested,
  };
}

export function calculateDashboardSummary(
  calculations: InvestmentCalculation[]
): DashboardSummary {
  const activeCalcs = calculations.filter(c => c.investment.is_active);
  
  const totalInvested = activeCalcs.reduce(
    (sum, c) => sum + c.totalInvested,
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
    stockCount: calculations.filter(c => c.investment.type === 'ACAO').length,
    activeCount: activeCalcs.length,
    maturedCount: calculations.filter(c => c.isMatured).length,
    verifiedCount: calculations.filter(c => !!c.investment.last_verified_at).length,
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
