import { useState, useCallback, useEffect } from 'react';
import { ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InvestmentCard } from './InvestmentCard';
import type { InvestmentCalculation } from '@/types/investment';

interface DraggableInvestmentListProps {
  calculations: InvestmentCalculation[];
  onReorder: (reorderedIds: string[]) => void;
  onInvestmentClick: (calc: InvestmentCalculation) => void;
}

export function DraggableInvestmentList({ 
  calculations, 
  onReorder, 
  onInvestmentClick 
}: DraggableInvestmentListProps) {
  const [items, setItems] = useState(calculations);

  useEffect(() => {
    setItems(calculations);
  }, [calculations]);

  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= items.length) return;
    const newItems = [...items];
    const [moved] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, moved);
    setItems(newItems);
    onReorder(newItems.map(item => item.investment.id));
  }, [items, onReorder]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 relative">
      {items.map((calc, currentIndex) => {
        const id = calc.investment.id;
        const isFirst = currentIndex === 0;
        const isLast = currentIndex === items.length - 1;

        return (
          <div key={id} className="relative">
            {items.length > 1 && (
              <div className="absolute -left-1 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-0.5">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-6 w-6 rounded-full shadow-md"
                  disabled={isFirst}
                  onClick={(e) => {
                    e.stopPropagation();
                    moveItem(currentIndex, currentIndex - 1);
                  }}
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <div className="flex items-center justify-center">
                  <GripVertical className="h-3 w-3 text-muted-foreground" />
                </div>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-6 w-6 rounded-full shadow-md"
                  disabled={isLast}
                  onClick={(e) => {
                    e.stopPropagation();
                    moveItem(currentIndex, currentIndex + 1);
                  }}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>
            )}
            
            <div
              onClick={() => onInvestmentClick(calc)}
              className={items.length > 1 ? 'ml-6' : ''}
            >
              <InvestmentCard
                calculation={calc}
                onClick={() => {}}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
