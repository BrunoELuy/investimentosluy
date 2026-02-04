export interface StockInvestment {
  id: string;
  user_id: string;
  name: string;
  ticker?: string | null;
  amount: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockFormData {
  name: string;
  ticker?: string;
  amount: number;
  notes?: string;
}
