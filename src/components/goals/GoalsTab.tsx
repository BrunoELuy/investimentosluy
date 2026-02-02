import { useState, useMemo } from 'react';
import { Plus, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { GoalCard } from './GoalCard';
import { GoalForm } from './GoalForm';
import { GoalDetails } from './GoalDetails';
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from '@/hooks/useGoals';
import { calculateGoalProgress } from '@/utils/goalCalculations';
import type { InvestmentGoal, GoalFormData, GoalCalculation } from '@/types/goal';

interface GoalsTabProps {
  totalInvested: number;
  currentCdiRate?: number;
}

export function GoalsTab({ totalInvested, currentCdiRate = 10.65 }: GoalsTabProps) {
  const { data: goals, isLoading } = useGoals();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedCalculation, setSelectedCalculation] = useState<GoalCalculation | null>(null);
  const [editingGoal, setEditingGoal] = useState<InvestmentGoal | null>(null);

  const calculations = useMemo(() => {
    return (goals || []).map(goal => 
      calculateGoalProgress(goal, totalInvested)
    );
  }, [goals, totalInvested]);

  const handleGoalClick = (calc: GoalCalculation) => {
    setSelectedCalculation(calc);
    setIsDetailsOpen(true);
  };

  const handleCreateGoal = async (data: GoalFormData) => {
    await createGoal.mutateAsync(data);
    setIsFormOpen(false);
    setEditingGoal(null);
  };

  const handleUpdateGoal = async (data: GoalFormData) => {
    if (editingGoal) {
      await updateGoal.mutateAsync({ id: editingGoal.id, ...data });
      setIsFormOpen(false);
      setEditingGoal(null);
      setIsDetailsOpen(false);
    }
  };

  const handleDeleteGoal = async () => {
    if (selectedCalculation) {
      await deleteGoal.mutateAsync(selectedCalculation.goal.id);
      setIsDetailsOpen(false);
      setSelectedCalculation(null);
    }
  };

  const handleEdit = () => {
    if (selectedCalculation) {
      setEditingGoal(selectedCalculation.goal);
      setIsDetailsOpen(false);
      setIsFormOpen(true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-center">
          <Target className="mx-auto h-12 w-12 text-primary mb-4" />
          <p className="text-muted-foreground">Carregando objetivos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Objetivos de Investimento</h2>
          <p className="text-sm text-muted-foreground">
            Total investido atualmente: <span className="font-medium text-foreground">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalInvested)}
            </span>
          </p>
        </div>
        
        <Dialog open={isFormOpen} onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingGoal(null);
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Objetivo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingGoal ? 'Editar Objetivo' : 'Criar Objetivo de Investimento'}
              </DialogTitle>
            </DialogHeader>
            <GoalForm
              goal={editingGoal || undefined}
              currentCdiRate={currentCdiRate}
              onSubmit={editingGoal ? handleUpdateGoal : handleCreateGoal}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingGoal(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {calculations.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum objetivo cadastrado</h3>
          <p className="text-muted-foreground mb-4">
            Defina metas de investimento para acompanhar seu progresso e saber quanto investir por mês.
          </p>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeiro Objetivo
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {calculations.map(calc => (
            <GoalCard
              key={calc.goal.id}
              calculation={calc}
              onClick={() => handleGoalClick(calc)}
            />
          ))}
        </div>
      )}

      {/* Goal Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedCalculation && (
            <GoalDetails
              calculation={selectedCalculation}
              onBack={() => setIsDetailsOpen(false)}
              onEdit={handleEdit}
              onDelete={handleDeleteGoal}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
