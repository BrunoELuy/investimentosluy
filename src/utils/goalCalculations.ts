import { differenceInMonths } from 'date-fns';
import type { InvestmentGoal, GoalCalculation } from '@/types/goal';

/**
 * Calculate the future value of a present amount with compound interest
 * FV = PV * (1 + r)^n
 */
export function calculateFutureValue(
  presentValue: number,
  monthsRemaining: number,
  annualCdiRate: number
): number {
  if (monthsRemaining <= 0 || presentValue <= 0) return presentValue;
  
  const monthlyRate = Math.pow(1 + annualCdiRate / 100, 1 / 12) - 1;
  return presentValue * Math.pow(1 + monthlyRate, monthsRemaining);
}

/**
 * Calculate the monthly contribution needed to reach a goal
 * considering compound interest from CDI AND the growth of existing investments
 * 
 * Formula: PMT = (FV - PV*(1+r)^n) / ((((1 + r)^n - 1) / r))
 * Where:
 * - PMT = Monthly payment needed
 * - FV = Future Value (target amount)
 * - PV = Present Value (current invested amount)
 * - r = Monthly interest rate
 * - n = Number of months
 */
export function calculateMonthlyContribution(
  targetAmount: number,
  currentInvested: number,
  monthsRemaining: number,
  annualCdiRate: number
): number {
  if (monthsRemaining <= 0) return 0;
  
  // Convert annual CDI rate to monthly rate
  const monthlyRate = Math.pow(1 + annualCdiRate / 100, 1 / 12) - 1;
  
  // Calculate future value of current investments
  const futureValueOfCurrentInvestments = calculateFutureValue(
    currentInvested,
    monthsRemaining,
    annualCdiRate
  );
  
  // Amount still needed after accounting for growth of current investments
  const amountNeededFromContributions = targetAmount - futureValueOfCurrentInvestments;
  
  // If current investments will grow enough to meet the goal, no contributions needed
  if (amountNeededFromContributions <= 0) {
    return 0;
  }
  
  if (monthlyRate === 0) {
    // No interest case - simple division
    return amountNeededFromContributions / monthsRemaining;
  }
  
  // Future value of annuity formula rearranged to solve for PMT
  // PMT = FV * r / ((1 + r)^n - 1)
  const factor = (Math.pow(1 + monthlyRate, monthsRemaining) - 1) / monthlyRate;
  
  return amountNeededFromContributions / factor;
}

/**
 * Calculate the projected earnings from contributions with compound interest
 */
export function calculateProjectedEarnings(
  monthlyContribution: number,
  currentInvested: number,
  monthsRemaining: number,
  annualCdiRate: number
): number {
  const monthlyRate = Math.pow(1 + annualCdiRate / 100, 1 / 12) - 1;
  
  if (monthsRemaining <= 0) {
    return 0;
  }
  
  // Earnings from current investments
  const futureValueOfCurrentInvestments = calculateFutureValue(
    currentInvested,
    monthsRemaining,
    annualCdiRate
  );
  const earningsFromCurrent = futureValueOfCurrentInvestments - currentInvested;
  
  // Earnings from new contributions (if any)
  let earningsFromContributions = 0;
  if (monthlyContribution > 0 && monthlyRate > 0) {
    const futureValueOfContributions = monthlyContribution * 
      ((Math.pow(1 + monthlyRate, monthsRemaining) - 1) / monthlyRate);
    const totalContributions = monthlyContribution * monthsRemaining;
    earningsFromContributions = futureValueOfContributions - totalContributions;
  }
  
  return earningsFromCurrent + earningsFromContributions;
}

/**
 * Calculate goal progress and required contributions
 */
export function calculateGoalProgress(
  goal: InvestmentGoal,
  currentInvestedAmount: number
): GoalCalculation {
  const today = new Date();
  const targetDate = new Date(goal.target_date);
  
  const monthsRemaining = Math.max(0, differenceInMonths(targetDate, today));
  
  // Calculate the future value of current investments
  const futureValueOfCurrent = calculateFutureValue(
    currentInvestedAmount,
    monthsRemaining,
    goal.estimated_cdi_rate
  );
  
  // Calculate monthly contribution considering growth of existing investments
  const monthlyContribution = calculateMonthlyContribution(
    goal.target_amount,
    currentInvestedAmount,
    monthsRemaining,
    goal.estimated_cdi_rate
  );
  
  const totalContributions = monthlyContribution * monthsRemaining;
  
  // Calculate projected earnings from both existing and new investments
  const projectedEarnings = calculateProjectedEarnings(
    monthlyContribution,
    currentInvestedAmount,
    monthsRemaining,
    goal.estimated_cdi_rate
  );
  
  const progressPercent = goal.target_amount > 0 
    ? Math.min((currentInvestedAmount / goal.target_amount) * 100, 100)
    : 0;
  
  // Amount still needed (gap between target and what we'll have)
  const amountNeeded = Math.max(0, goal.target_amount - futureValueOfCurrent);
  
  return {
    goal,
    monthsRemaining,
    monthlyContribution,
    totalContributions,
    projectedEarnings,
    currentProgress: currentInvestedAmount,
    progressPercent,
    futureValueOfCurrentInvestments: futureValueOfCurrent,
    earningsFromCurrentInvestments: futureValueOfCurrent - currentInvestedAmount,
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}
