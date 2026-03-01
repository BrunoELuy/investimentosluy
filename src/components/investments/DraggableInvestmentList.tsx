import { InvestmentCard } from './InvestmentCard';
import type { InvestmentCalculation } from '@/types/investment';
import type { StockQuote } from '@/hooks/useStockQuotes';

interface DraggableInvestmentListProps {
  calculations: InvestmentCalculation[];
  onInvestmentClick: (calc: InvestmentCalculation) => void;
  stockQuotes?: Record<string, StockQuote>;
}

export function DraggableInvestmentList({ 
  calculations, 
  onInvestmentClick,
  stockQuotes = {},
}: DraggableInvestmentListProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {calculations.map((calc) => {
        const ticker = calc.investment.ticker;
        const quote = ticker ? stockQuotes[ticker] : undefined;
        return (
          <div key={calc.investment.id} onClick={() => onInvestmentClick(calc)}>
            <InvestmentCard calculation={calc} onClick={() => {}} stockQuote={quote} />
          </div>
        );
      })}
    </div>
  );
}
