import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { InvestmentForm } from '@/components/investments/InvestmentForm';
import { DraggableInvestmentList } from '@/components/investments/DraggableInvestmentList';
import {
  InvestmentSortMenu,
  type SortOption,
} from '@/components/investments/InvestmentSortMenu';
import { useInvestmentCalculations } from '@/hooks/useInvestmentCalculations';
import { useCreateInvestment } from '@/hooks/useInvestments';
import type {
  InvestmentCalculation,
  InvestmentFormData,
} from '@/types/investment';

export default function Investments() {
  const navigate = useNavigate();
  const { calculations, stockQuotes, isLoading } = useInvestmentCalculations();
  const createInvestment = useCreateInvestment();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('default');

  const sortedCalculations = useMemo(() => {
    if (sortOption === 'default') return calculations;
    return [...calculations].sort((a, b) => {
      switch (sortOption) {
        case 'type': {
          const order = { CDB: 0, LCA: 1, ACAO: 2 };
          return (
            (order[a.investment.type as keyof typeof order] ?? 3) -
            (order[b.investment.type as keyof typeof order] ?? 3)
          );
        }
        case 'institution':
          return a.investment.institution.localeCompare(b.investment.institution);
        case 'value-desc':
          return b.totalInvested - a.totalInvested;
        case 'maturity-asc':
          return (
            new Date(a.investment.end_date).getTime() -
            new Date(b.investment.end_date).getTime()
          );
        case 'maturity-desc':
          return (
            new Date(b.investment.end_date).getTime() -
            new Date(a.investment.end_date).getTime()
          );
        default:
          return 0;
      }
    });
  }, [calculations, sortOption]);

  const handleCreate = useCallback(
    async (data: InvestmentFormData) => {
      await createInvestment.mutateAsync(data);
      setIsFormOpen(false);
    },
    [createInvestment]
  );

  const handleInvestmentClick = useCallback(
    (calc: InvestmentCalculation) => {
      navigate(`/investments/${calc.investment.id}`);
    },
    [navigate]
  );

  if (isLoading) {
    return (
      <div className="animate-pulse py-12 text-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Seus Investimentos</h2>
        <div className="flex items-center gap-2">
          <InvestmentSortMenu
            currentSort={sortOption}
            onSortChange={setSortOption}
          />
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Investimento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Adicionar Investimento</DialogTitle>
              </DialogHeader>
              <InvestmentForm
                onSubmit={handleCreate}
                onCancel={() => setIsFormOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {calculations.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed py-12 text-center">
          <TrendingUp className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium">
            Nenhum investimento cadastrado
          </h3>
          <p className="mb-4 text-muted-foreground">
            Comece adicionando seu primeiro investimento.
          </p>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Investimento
          </Button>
        </div>
      ) : (
        <DraggableInvestmentList
          calculations={sortedCalculations}
          onInvestmentClick={handleInvestmentClick}
          stockQuotes={stockQuotes}
        />
      )}
    </div>
  );
}