import { InvestmentCard } from './InvestmentCard';
import type { InvestmentCalculation } from '@/types/investment';

interface DraggableInvestmentListProps {
  calculations: InvestmentCalculation[];
  onInvestmentClick: (calc: InvestmentCalculation) => void;
}

export function DraggableInvestmentList({ 
  calculations, 
  onInvestmentClick 
}: DraggableInvestmentListProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {calculations.map((calc) => (
        <div key={calc.investment.id} onClick={() => onInvestmentClick(calc)}>
          <InvestmentCard calculation={calc} onClick={() => {}} />
        </div>
      ))}
    </div>
  );
}
