import { differenceInMonths } from 'date-fns';
import type { InvestmentGoal, GoalCalculation } from '@/types/goal';

/**
 * Calculate the monthly contribution needed to reach a goal
 * considering compound interest from CDI
 * 
 * Formula: PMT = FV / ((((1 + r)^n - 1) / r))
 * Where:
 * - PMT = Monthly payment
 * - FV = Future Value (target amount)
 * - r = Monthly interest rate
 * - n = Number of months
 */
export function calculateMonthlyContribution(
  targetAmount: number,
  monthsRemaining: number,
  annualCdiRate: number
): number {
  if (monthsRemaining <= 0) return 0;
  
  // Convert annual CDI rate to monthly rate
  // Using compound interest formula: (1 + annual)^(1/12) - 1
  const monthlyRate = Math.pow(1 + annualCdiRate / 100, 1 / 12) - 1;
  
  if (monthlyRate === 0) {
    // No interest case - simple division
    return targetAmount / monthsRemaining;
  }
  
  // Future value of annuity formula rearranged to solve for PMT
  // FV = PMT * ((1 + r)^n - 1) / r
  // PMT = FV * r / ((1 + r)^n - 1)
  const factor = (Math.pow(1 + monthlyRate, monthsRemaining) - 1) / monthlyRate;
  
  return targetAmount / factor;
}

/**
 * Calculate the projected earnings from contributions with compound interest
 */
export function calculateProjectedEarnings(
  monthlyContribution: number,
  monthsRemaining: number,
  annualCdiRate: number
): number {
  const monthlyRate = Math.pow(1 + annualCdiRate / 100, 1 / 12) - 1;
  
  if (monthlyRate === 0 || monthsRemaining <= 0) {
    return 0;
  }
  
  // Future value with compound interest
  const futureValue = monthlyContribution * ((Math.pow(1 + monthlyRate, monthsRemaining) - 1) / monthlyRate);
  const totalContributions = monthlyContribution * monthsRemaining;
  
  return futureValue - totalContributions;
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
  
  // Amount still needed
  const amountNeeded = Math.max(0, goal.target_amount - currentInvestedAmount);
  
  // Calculate monthly contribution for remaining amount
  const monthlyContribution = calculateMonthlyContribution(
    amountNeeded,
    monthsRemaining,
    goal.estimated_cdi_rate
  );
  
  const totalContributions = monthlyContribution * monthsRemaining;
  const projectedEarnings = calculateProjectedEarnings(
    monthlyContribution,
    monthsRemaining,
    goal.estimated_cdi_rate
  );
  
  const progressPercent = goal.target_amount > 0 
    ? Math.min((currentInvestedAmount / goal.target_amount) * 100, 100)
    : 0;
  
  return {
    goal,
    monthsRemaining,
    monthlyContribution,
    totalContributions,
    projectedEarnings,
    currentProgress: currentInvestedAmount,
    progressPercent,
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}
