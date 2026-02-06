import { useState, useRef, useCallback, useEffect } from 'react';
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
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync items when calculations change
  useEffect(() => {
    setItems(calculations);
  }, [calculations]);

  const handleHoldStart = useCallback((id: string, e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    holdTimerRef.current = setTimeout(() => {
      setDraggingId(id);
      setIsHolding(true);
      // Add haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, 300); // 300ms hold to start drag
  }, []);

  const handleHoldEnd = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    
    if (draggingId && dragOverId && draggingId !== dragOverId) {
      const newItems = [...items];
      const dragIndex = newItems.findIndex(item => item.investment.id === draggingId);
      const dropIndex = newItems.findIndex(item => item.investment.id === dragOverId);
      
      if (dragIndex !== -1 && dropIndex !== -1) {
        const [removed] = newItems.splice(dragIndex, 1);
        newItems.splice(dropIndex, 0, removed);
        setItems(newItems);
        onReorder(newItems.map(item => item.investment.id));
      }
    }
    
    setDraggingId(null);
    setDragOverId(null);
    setIsHolding(false);
  }, [draggingId, dragOverId, items, onReorder]);

  const handleDragOver = useCallback((id: string) => {
    if (draggingId && id !== draggingId) {
      setDragOverId(id);
    }
  }, [draggingId]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!draggingId) return;
    
    const touch = e.touches[0];
    const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
    
    for (const el of elements) {
      const cardEl = el.closest('[data-investment-id]');
      if (cardEl) {
        const id = cardEl.getAttribute('data-investment-id');
        if (id && id !== draggingId) {
          setDragOverId(id);
          break;
        }
      }
    }
  }, [draggingId]);

  const handleCardClick = useCallback((calc: InvestmentCalculation) => {
    if (!isHolding && !draggingId) {
      onInvestmentClick(calc);
    }
  }, [isHolding, draggingId, onInvestmentClick]);

  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= items.length) return;
    const newItems = [...items];
    const [moved] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, moved);
    setItems(newItems);
    onReorder(newItems.map(item => item.investment.id));
  }, [items, onReorder]);

  return (
    <>
      {/* Overlay when dragging */}
      {draggingId && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 pointer-events-none animate-fade-in"
          style={{ animationDuration: '150ms' }}
        />
      )}
      
      <div 
        ref={containerRef}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 relative"
        onTouchMove={handleTouchMove}
        onTouchEnd={handleHoldEnd}
        onMouseUp={handleHoldEnd}
        onMouseLeave={handleHoldEnd}
      >
        {items.map(calc => {
          const id = calc.investment.id;
          const isDragging = draggingId === id;
          const isDragOver = dragOverId === id && draggingId !== id;
          
          const isFirst = items.indexOf(calc) === 0;
          const isLast = items.indexOf(calc) === items.length - 1;
          const currentIndex = items.indexOf(calc);

          return (
            <div
              key={id}
              data-investment-id={id}
              className={`
                relative transition-all duration-200 ease-out
                ${isDragging ? 'z-50 scale-105 shadow-2xl rotate-1' : ''}
                ${isDragOver ? 'scale-95 opacity-60' : ''}
                ${draggingId && !isDragging ? 'opacity-70' : ''}
              `}
              style={{
                transform: isDragging 
                  ? 'scale(1.05) rotate(1deg)' 
                  : isDragOver 
                    ? 'scale(0.95) translateY(10px)' 
                    : 'none',
              }}
              onMouseDown={(e) => handleHoldStart(id, e)}
              onMouseEnter={() => handleDragOver(id)}
              onTouchStart={(e) => handleHoldStart(id, e)}
            >
              {/* Highlight ring when dragging */}
              {isDragging && (
                <div 
                  className="absolute inset-0 rounded-lg ring-4 ring-primary ring-offset-2 ring-offset-background pointer-events-none"
                  style={{ 
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                  }}
                />
              )}
              
              {/* Drop indicator */}
              {isDragOver && (
                <div className="absolute inset-x-0 -top-2 h-1 bg-primary rounded-full animate-pulse" />
              )}

              {/* Reorder buttons */}
              {!draggingId && items.length > 1 && (
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                  style={{ opacity: 1 }}
                >
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
                onClick={() => handleCardClick(calc)}
                className={`${isDragging ? 'pointer-events-none' : ''} ${!draggingId && items.length > 1 ? 'ml-6' : ''}`}
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
    </>
  );
}
