import { useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Target,
  Calendar,
  TrendingUp,
  Coins,
  PiggyBank,
  Calculator
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { GoalCalculation } from '@/types/goal';
import { formatCurrency } from '@/utils/goalCalculations';

interface GoalDetailsProps {
  calculation: GoalCalculation;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}

export function GoalDetails({ calculation, onBack, onEdit, onDelete }: GoalDetailsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { 
    goal,
    monthsRemaining,
    monthlyContribution,
    totalContributions,
    projectedEarnings,
    currentProgress,
    progressPercent,
    futureValueOfCurrentInvestments,
    earningsFromCurrentInvestments
  } = calculation;

  const today = new Date();
  const targetDate = new Date(goal.target_date);
  const daysRemaining = differenceInDays(targetDate, today);
  const isOverdue = daysRemaining < 0;
  
  const amountRemaining = goal.target_amount - currentProgress;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onEdit} className="gap-2">
            <Edit className="h-4 w-4" />
            Editar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir o objetivo "{goal.name}"? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? 'Excluindo...' : 'Excluir'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Header Card */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="default" className="text-sm">
                  <Target className="h-3 w-3 mr-1" />
                  Objetivo
                </Badge>
                {isOverdue ? (
                  <Badge variant="outline" className="text-destructive border-destructive">
                    Vencido há {Math.abs(daysRemaining)} dias
                  </Badge>
                ) : daysRemaining <= 30 ? (
                  <Badge variant="outline" className="text-warning border-warning">
                    {daysRemaining} dias restantes
                  </Badge>
                ) : null}
              </div>
              <CardTitle className="text-2xl">{goal.name}</CardTitle>
              <div className="flex items-center gap-1 text-muted-foreground mt-1">
                <Calendar className="h-4 w-4" />
                Meta: {format(targetDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Valor Alvo</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(goal.target_amount)}</p>
              <p className="text-sm text-muted-foreground">
                {monthsRemaining} meses restantes
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-success">
                {formatCurrency(currentProgress)} atingido
              </span>
              <span className="text-muted-foreground">
                {progressPercent.toFixed(1)}%
              </span>
              <span className="font-medium">
                Faltam {formatCurrency(amountRemaining)}
              </span>
            </div>
            <Progress value={progressPercent} className="h-4" />
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Coins className="h-4 w-4" />
              <span className="text-sm">Aporte Mensal</span>
            </div>
            <p className="text-2xl font-bold text-primary">{formatCurrency(monthlyContribution)}</p>
            <p className="text-xs text-muted-foreground">
              Para atingir a meta
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <PiggyBank className="h-4 w-4" />
              <span className="text-sm">Total Aportes</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalContributions)}</p>
            <p className="text-xs text-muted-foreground">
              {monthsRemaining} contribuições
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Calculator className="h-4 w-4" />
              <span className="text-sm">Taxa CDI</span>
            </div>
            <p className="text-2xl font-bold">{goal.estimated_cdi_rate}%</p>
            <p className="text-xs text-muted-foreground">
              Estimativa anual
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-success/30 bg-success/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-sm">Rendimento do Investido Atual</span>
            </div>
            <p className="text-2xl font-bold text-success">{formatCurrency(earningsFromCurrentInvestments)}</p>
            <p className="text-xs text-muted-foreground">
              Seus {formatCurrency(currentProgress)} renderão até a meta
            </p>
            <p className="text-sm font-medium mt-2">
              Valor projetado: {formatCurrency(futureValueOfCurrentInvestments)}
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm">Rendimento Total Projetado</span>
            </div>
            <p className="text-2xl font-bold text-primary">{formatCurrency(projectedEarnings)}</p>
            <p className="text-xs text-muted-foreground">
              Juros compostos de tudo (atual + novos aportes)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Calculation Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Detalhes do Cálculo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Progresso atual</p>
              <p className="text-xl font-semibold">{formatCurrency(currentProgress)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Faltando</p>
              <p className="text-xl font-semibold">{formatCurrency(amountRemaining)}</p>
            </div>
          </div>
          
          <Separator />
          
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <p className="text-sm font-medium mb-2">📊 Projeção detalhada:</p>
            <div className="text-muted-foreground text-sm space-y-2">
              <p>
                <span className="font-medium text-foreground">1. Seu investimento atual:</span> {formatCurrency(currentProgress)} 
                → renderá <span className="font-bold text-success">{formatCurrency(earningsFromCurrentInvestments)}</span> em {monthsRemaining} meses
                → totalizando <span className="font-bold">{formatCurrency(futureValueOfCurrentInvestments)}</span>
              </p>
              {monthlyContribution > 0 ? (
                <p>
                  <span className="font-medium text-foreground">2. Novos aportes:</span> {formatCurrency(monthlyContribution)}/mês 
                  × {monthsRemaining} meses = <span className="font-bold">{formatCurrency(totalContributions)}</span> + rendimentos
                </p>
              ) : (
                <p>
                  <span className="font-medium text-foreground">2. Novos aportes:</span> <span className="text-success font-bold">Nenhum necessário!</span> 
                  Seus investimentos atuais já atingirão a meta.
                </p>
              )}
              <p className="pt-2 border-t">
                <span className="font-medium text-foreground">Total na data alvo:</span>{' '}
                <span className="font-bold text-primary">{formatCurrency(goal.target_amount)}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
