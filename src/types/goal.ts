export interface InvestmentGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  target_date: string;
  estimated_cdi_rate: number;
  created_at: string;
  updated_at: string;
}

export interface GoalFormData {
  name: string;
  target_amount: number;
  target_date: string;
  estimated_cdi_rate: number;
}

export interface GoalCalculation {
  goal: InvestmentGoal;
  monthsRemaining: number;
  monthlyContribution: number;
  totalContributions: number;
  projectedEarnings: number;
  currentProgress: number;
  progressPercent: number;
}
