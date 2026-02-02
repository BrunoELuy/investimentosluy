import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Target, Calendar, TrendingUp, ArrowRight, Coins } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { GoalCalculation } from '@/types/goal';
import { formatCurrency } from '@/utils/goalCalculations';

interface GoalCardProps {
  calculation: GoalCalculation;
  onClick?: () => void;
}

export function GoalCard({ calculation, onClick }: GoalCardProps) {
  const { goal, monthsRemaining, monthlyContribution, progressPercent, currentProgress } = calculation;
  
  const today = new Date();
  const targetDate = new Date(goal.target_date);
  const daysRemaining = differenceInDays(targetDate, today);
  const isOverdue = daysRemaining < 0;
  const isNearDeadline = daysRemaining > 0 && daysRemaining <= 30;

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-l-4 border-l-primary"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-primary text-primary-foreground">
                <Target className="h-3 w-3 mr-1" />
                Objetivo
              </Badge>
              {isOverdue && (
                <Badge variant="outline" className="text-destructive border-destructive">
                  Vencido
                </Badge>
              )}
              {isNearDeadline && (
                <Badge variant="outline" className="text-warning border-warning">
                  {daysRemaining} dias restantes
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-lg mt-2">{goal.name}</h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Meta: {format(targetDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Valor Alvo</p>
            <p className="font-bold text-lg">{formatCurrency(goal.target_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Progresso Atual</p>
            <p className="font-semibold text-lg text-success">{formatCurrency(currentProgress)}</p>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {progressPercent.toFixed(1)}% atingido
            </span>
            <span className="text-muted-foreground">
              {monthsRemaining} meses restantes
            </span>
          </div>
          <Progress value={progressPercent} className="h-3" />
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Aporte mensal:</span>
          </div>
          <span className="font-bold text-primary">
            {formatCurrency(monthlyContribution)}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <TrendingUp className="h-3 w-3" />
          Taxa CDI estimada: {goal.estimated_cdi_rate}% a.a.
        </div>
      </CardContent>
    </Card>
  );
}
