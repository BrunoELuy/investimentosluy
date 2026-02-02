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
    progressPercent
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Rendimento Projetado</span>
            </div>
            <p className="text-2xl font-bold text-success">{formatCurrency(projectedEarnings)}</p>
            <p className="text-xs text-muted-foreground">
              Juros compostos estimados
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
          
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm font-medium mb-2">Como atingir sua meta:</p>
            <p className="text-muted-foreground text-sm">
              Investindo <span className="font-bold text-primary">{formatCurrency(monthlyContribution)}</span> por mês 
              durante <span className="font-bold">{monthsRemaining} meses</span>, 
              com rendimento de <span className="font-bold">{goal.estimated_cdi_rate}% a.a.</span>, 
              você terá aproximadamente <span className="font-bold text-success">{formatCurrency(projectedEarnings)}</span> em 
              juros compostos, totalizando sua meta de <span className="font-bold">{formatCurrency(goal.target_amount)}</span>.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
