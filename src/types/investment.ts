// Investment types
export type InvestmentType = 'CDB' | 'LCA' | 'ACAO';
export type RateType = 'CDI' | 'IPCA' | 'PREFIXADO' | 'NONE';

export interface Investment {
  id: string;
  user_id: string;
  type: InvestmentType;
  institution: string;
  name: string;
  initial_value: number;
  rate_type: RateType;
  rate_value: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Stock-specific fields
  ticker?: string | null;
  quantity?: number | null;
  // B3 reconciliation fields
  last_verified_at?: string | null;
  verified_value?: number | null;
  b3_source?: string | null;
}

export interface InvestmentDeposit {
  id: string;
  investment_id: string;
  user_id: string;
  amount: number;
  deposit_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface EconomicRate {
  id: string;
  rate_type: string;
  rate_value: number;
  reference_date: string;
  created_at: string;
}

export interface InvestmentAlert {
  id: string;
  user_id: string;
  investment_id: string;
  alert_type: 'EXPIRING_SOON' | 'EXPIRED' | 'CUSTOM';
  alert_date: string;
  is_read: boolean;
  message?: string;
  created_at: string;
}

// Calculated investment data
export interface InvestmentCalculation {
  investment: Investment;
  deposits: InvestmentDeposit[];
  daysElapsed: number;
  totalDays: number;
  grossReturn: number;
  grossReturnPercent: number;
  netReturn: number;
  netReturnPercent: number;
  currentValue: number;
  currentNetValue: number;
  irRate: number;
  irAmount: number;
  iofAmount: number;
  daysUntilMaturity: number;
  isMatured: boolean;
  totalInvested: number;
}

// Form data for creating/editing investments
export interface InvestmentFormData {
  type: InvestmentType;
  institution: string;
  name: string;
  initial_value: number;
  rate_type: RateType;
  rate_value: number;
  start_date: string;
  end_date: string;
  notes?: string;
  deposits?: DepositFormData[];
  // Stock-specific fields
  ticker?: string;
  quantity?: number;
}

export interface DepositFormData {
  amount: number;
  deposit_date: string;
  notes?: string;
}

// Dashboard summary
export interface DashboardSummary {
  totalInvested: number;
  totalGrossReturn: number;
  totalNetReturn: number;
  totalGrossPercent: number;
  totalNetPercent: number;
  cdbCount: number;
  lcaCount: number;
  stockCount: number;
  activeCount: number;
  maturedCount: number;
  verifiedCount: number;
}

// Filter options
export interface InvestmentFilters {
  type?: InvestmentType | 'ALL';
  institution?: string;
  rateType?: RateType | 'ALL';
  status?: 'active' | 'matured' | 'all';
  searchTerm?: string;
}
