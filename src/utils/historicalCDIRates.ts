/**
 * Historical CDI rates by year (accumulated annual %)
 * Source: B3 / Investidor10 - Official CDI historical data
 * 
 * These rates represent the accumulated CDI for each year,
 * used for accurate calculation of investments that started in the past.
 */

export interface YearlyCDIRate {
  year: number;
  annualRate: number; // Accumulated CDI for the year in %
}

// Historical CDI rates from 2015 onwards
export const HISTORICAL_CDI_RATES: YearlyCDIRate[] = [
  { year: 2015, annualRate: 13.27 },
  { year: 2016, annualRate: 14.02 },
  { year: 2017, annualRate: 9.94 },
  { year: 2018, annualRate: 6.43 },
  { year: 2019, annualRate: 5.96 },
  { year: 2020, annualRate: 2.76 },
  { year: 2021, annualRate: 4.42 },
  { year: 2022, annualRate: 12.39 },
  { year: 2023, annualRate: 13.04 },
  { year: 2024, annualRate: 10.88 },
  { year: 2025, annualRate: 14.32 },
];

// Monthly CDI rates for 2020-2025 for more precise calculations
export interface MonthlyCDIRate {
  year: number;
  month: number; // 1-12
  rate: number; // Monthly rate in %
}

export const MONTHLY_CDI_RATES: MonthlyCDIRate[] = [
  // 2020
  { year: 2020, month: 1, rate: 0.38 },
  { year: 2020, month: 2, rate: 0.29 },
  { year: 2020, month: 3, rate: 0.34 },
  { year: 2020, month: 4, rate: 0.28 },
  { year: 2020, month: 5, rate: 0.24 },
  { year: 2020, month: 6, rate: 0.21 },
  { year: 2020, month: 7, rate: 0.19 },
  { year: 2020, month: 8, rate: 0.16 },
  { year: 2020, month: 9, rate: 0.16 },
  { year: 2020, month: 10, rate: 0.16 },
  { year: 2020, month: 11, rate: 0.15 },
  { year: 2020, month: 12, rate: 0.16 },
  // 2021
  { year: 2021, month: 1, rate: 0.15 },
  { year: 2021, month: 2, rate: 0.13 },
  { year: 2021, month: 3, rate: 0.20 },
  { year: 2021, month: 4, rate: 0.21 },
  { year: 2021, month: 5, rate: 0.27 },
  { year: 2021, month: 6, rate: 0.31 },
  { year: 2021, month: 7, rate: 0.36 },
  { year: 2021, month: 8, rate: 0.43 },
  { year: 2021, month: 9, rate: 0.44 },
  { year: 2021, month: 10, rate: 0.49 },
  { year: 2021, month: 11, rate: 0.59 },
  { year: 2021, month: 12, rate: 0.77 },
  // 2022
  { year: 2022, month: 1, rate: 0.73 },
  { year: 2022, month: 2, rate: 0.76 },
  { year: 2022, month: 3, rate: 0.93 },
  { year: 2022, month: 4, rate: 0.83 },
  { year: 2022, month: 5, rate: 1.03 },
  { year: 2022, month: 6, rate: 1.02 },
  { year: 2022, month: 7, rate: 1.03 },
  { year: 2022, month: 8, rate: 1.17 },
  { year: 2022, month: 9, rate: 1.07 },
  { year: 2022, month: 10, rate: 1.02 },
  { year: 2022, month: 11, rate: 1.02 },
  { year: 2022, month: 12, rate: 1.12 },
  // 2023
  { year: 2023, month: 1, rate: 1.12 },
  { year: 2023, month: 2, rate: 0.92 },
  { year: 2023, month: 3, rate: 1.17 },
  { year: 2023, month: 4, rate: 0.92 },
  { year: 2023, month: 5, rate: 1.12 },
  { year: 2023, month: 6, rate: 1.07 },
  { year: 2023, month: 7, rate: 1.07 },
  { year: 2023, month: 8, rate: 1.14 },
  { year: 2023, month: 9, rate: 0.97 },
  { year: 2023, month: 10, rate: 1.00 },
  { year: 2023, month: 11, rate: 0.92 },
  { year: 2023, month: 12, rate: 0.89 },
  // 2024
  { year: 2024, month: 1, rate: 0.97 },
  { year: 2024, month: 2, rate: 0.80 },
  { year: 2024, month: 3, rate: 0.83 },
  { year: 2024, month: 4, rate: 0.89 },
  { year: 2024, month: 5, rate: 0.83 },
  { year: 2024, month: 6, rate: 0.79 },
  { year: 2024, month: 7, rate: 0.91 },
  { year: 2024, month: 8, rate: 0.87 },
  { year: 2024, month: 9, rate: 0.84 },
  { year: 2024, month: 10, rate: 0.93 },
  { year: 2024, month: 11, rate: 0.79 },
  { year: 2024, month: 12, rate: 0.93 },
  // 2025
  { year: 2025, month: 1, rate: 1.01 },
  { year: 2025, month: 2, rate: 0.99 },
  { year: 2025, month: 3, rate: 0.96 },
  { year: 2025, month: 4, rate: 1.06 },
  { year: 2025, month: 5, rate: 1.14 },
  { year: 2025, month: 6, rate: 1.10 },
  { year: 2025, month: 7, rate: 1.28 },
  { year: 2025, month: 8, rate: 1.16 },
  { year: 2025, month: 9, rate: 1.22 },
  { year: 2025, month: 10, rate: 1.28 },
  { year: 2025, month: 11, rate: 1.05 },
  { year: 2025, month: 12, rate: 1.22 },
];

/**
 * Get the CDI rate for a specific year
 * Returns the accumulated annual CDI rate
 */
export function getCDIRateForYear(year: number): number {
  const rate = HISTORICAL_CDI_RATES.find(r => r.year === year);
  if (rate) {
    return rate.annualRate;
  }
  // For years before 2015, use a reasonable average
  if (year < 2015) {
    return 10.0; // Historical average approximation
  }
  // For future years, use the most recent rate
  const latestRate = HISTORICAL_CDI_RATES[HISTORICAL_CDI_RATES.length - 1];
  return latestRate.annualRate;
}

/**
 * Get the monthly CDI rate for a specific month/year
 */
export function getMonthlyCDIRate(year: number, month: number): number | null {
  const rate = MONTHLY_CDI_RATES.find(r => r.year === year && r.month === month);
  return rate ? rate.rate : null;
}

/**
 * Calculate compound CDI return for a date range using historical monthly rates
 * This provides more accurate calculations for past investments
 * 
 * @param startDate - Investment start date
 * @param endDate - End date for calculation (or today)
 * @param cdiPercentage - Percentage of CDI (e.g., 110 for 110% CDI)
 * @param currentCDIRate - Current CDI rate for months without historical data
 * @returns The compound factor to multiply by initial value
 */
export function calculateHistoricalCDIReturn(
  startDate: Date,
  endDate: Date,
  cdiPercentage: number,
  currentCDIRate: number
): number {
  let compoundFactor = 1;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Iterate through each month
  let current = new Date(start.getFullYear(), start.getMonth(), 1);
  
  while (current <= end) {
    const year = current.getFullYear();
    const month = current.getMonth() + 1; // 1-12
    
    // Get the monthly rate
    let monthlyRate = getMonthlyCDIRate(year, month);
    
    if (monthlyRate === null) {
      // Use current CDI rate converted to monthly for months without historical data
      // Monthly rate from annual: (1 + annual/100)^(1/12) - 1
      monthlyRate = (Math.pow(1 + currentCDIRate / 100, 1 / 12) - 1) * 100;
    }
    
    // Calculate days in this month that are within the investment period
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0); // Last day of month
    
    const effectiveStart = start > monthStart ? start : monthStart;
    const effectiveEnd = end < monthEnd ? end : monthEnd;
    
    if (effectiveStart <= effectiveEnd) {
      const daysInMonth = monthEnd.getDate();
      const effectiveDays = Math.floor((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // Pro-rata the monthly rate based on days
      const proRataRate = (monthlyRate * effectiveDays) / daysInMonth;
      
      // Apply the CDI percentage (e.g., 110% of CDI)
      const adjustedRate = (proRataRate * cdiPercentage) / 100;
      
      compoundFactor *= (1 + adjustedRate / 100);
    }
    
    // Move to next month
    current.setMonth(current.getMonth() + 1);
  }
  
  return compoundFactor;
}

/**
 * Get the weighted average CDI for a date range
 * Useful for displaying to users
 */
export function getAverageCDIForPeriod(startDate: Date, endDate: Date, currentCDIRate: number): number {
  const factor = calculateHistoricalCDIReturn(startDate, endDate, 100, currentCDIRate);
  const days = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (days <= 0) return currentCDIRate;
  
  // Convert compound factor back to annual rate
  const annualRate = (Math.pow(factor, 365 / days) - 1) * 100;
  return annualRate;
}
