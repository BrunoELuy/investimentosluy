import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Building2,
  Percent,
  DollarSign,
  AlertCircle
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
import type { InvestmentCalculation } from '@/types/investment';
import { formatCurrency, formatPercent, formatRateValue, getIRRate } from '@/utils/investmentCalculations';
import { DepositsList } from './DepositsList';
import { StockDetails } from './StockDetails';

interface InvestmentDetailsProps {
  calculation: InvestmentCalculation;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}

export function InvestmentDetails({ calculation, onBack, onEdit, onDelete }: InvestmentDetailsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  
  // If it's a stock, render the specialized StockDetails component
  if (calculation.investment.type === 'ACAO') {
    return (
      <StockDetails
        calculation={calculation}
        onBack={onBack}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );
  }

  const { 
    investment,
    deposits,
    totalInvested,
    grossReturn, 
    grossReturnPercent,
    netReturn, 
    netReturnPercent, 
    currentValue,
    currentNetValue, 
    daysElapsed, 
    totalDays, 
    daysUntilMaturity, 
    isMatured,
    irRate,
    irAmount,
    iofAmount
  } = calculation;

  const progressPercent = Math.min((daysElapsed / totalDays) * 100, 100);
  const isPositive = netReturn >= 0;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculate IR schedule for CDB
  const irSchedule = investment.type === 'CDB' ? [
    { days: 180, rate: 0.225, label: 'Até 180 dias' },
    { days: 360, rate: 0.20, label: '181 a 360 dias' },
    { days: 720, rate: 0.175, label: '361 a 720 dias' },
    { days: Infinity, rate: 0.15, label: 'Acima de 720 dias' },
  ] : null;

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
                  Tem certeza que deseja excluir o investimento "{investment.name}"? Esta ação não pode ser desfeita.
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
      <Card className="border-l-4" style={{ borderLeftColor: investment.type === 'CDB' ? 'hsl(var(--chart-1))' : 'hsl(var(--chart-2))' }}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={investment.type === 'CDB' ? 'default' : 'secondary'} className="text-sm">
                  {investment.type}
                </Badge>
                {investment.type === 'LCA' && (
                  <Badge variant="outline" className="text-success border-success">
                    Isento de IR
                  </Badge>
                )}
                {isMatured && (
                  <Badge variant="outline" className="text-warning border-warning">
                    Vencido
                  </Badge>
                )}
                {!isMatured && daysUntilMaturity <= 30 && (
                  <Badge variant="outline" className="text-destructive border-destructive">
                    Vence em {daysUntilMaturity} dias
                  </Badge>
                )}
              </div>
              <CardTitle className="text-2xl">{investment.name}</CardTitle>
              <div className="flex items-center gap-1 text-muted-foreground mt-1">
                <Building2 className="h-4 w-4" />
                {investment.institution}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Valor Líquido Atual</p>
              <p className={`text-3xl font-bold ${investment.type === 'LCA' ? 'text-[hsl(199,89%,48%)]' : 'text-success'}`}>
                {formatCurrency(currentNetValue)}
              </p>
              <div className={`flex items-center justify-end gap-1 ${isPositive ? 'text-success' : 'text-destructive'}`}>
                {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span className="font-semibold">
                  {isPositive ? '+' : ''}{formatCurrency(netReturn)} ({formatPercent(netReturnPercent)})
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Aplicado em {format(new Date(investment.start_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
              <span className="text-muted-foreground">{daysElapsed} de {totalDays} dias</span>
            </div>
            <Progress 
              value={progressPercent} 
              className={`h-3 ${investment.type === 'LCA' ? '[&>div]:bg-[hsl(199,89%,48%)]' : ''}`} 
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Início</span>
              <span>Vencimento: {format(new Date(investment.end_date), "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">Total Investido</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalInvested)}</p>
            {deposits.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Inicial: {formatCurrency(investment.initial_value)} + {deposits.length} aporte{deposits.length > 1 ? 's' : ''}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Percent className="h-4 w-4" />
              <span className="text-sm">Rentabilidade</span>
            </div>
            <p className="text-2xl font-bold">{formatRateValue(investment.rate_type, investment.rate_value)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Rendimento Bruto</span>
            </div>
            <p className="text-2xl font-bold text-success">{formatCurrency(grossReturn)}</p>
            <p className="text-sm text-muted-foreground">{formatPercent(grossReturnPercent)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">Valor Bruto Atual</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(currentValue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tax Info for CDB */}
      {investment.type === 'CDB' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Tributação (CDB)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">IOF Retido</p>
                <p className="text-xl font-semibold text-destructive">
                  {formatCurrency(iofAmount)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {daysElapsed < 30 ? `${30 - daysElapsed} dias para isenção` : 'Isento após 30 dias'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">IR Retido</p>
                <p className="text-xl font-semibold text-destructive">
                  {formatCurrency(irAmount)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Alíquota atual: {(irRate * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rendimento Líquido</p>
                <p className="text-xl font-semibold text-success">
                  {formatCurrency(netReturn)}
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium mb-3">Tabela Regressiva de IR</p>
              <div className="grid grid-cols-4 gap-2">
                {irSchedule?.map((tier) => (
                  <div 
                    key={tier.label}
                    className={`p-3 rounded-lg border text-center ${
                      getIRRate(daysElapsed) === tier.rate ? 'bg-primary/10 border-primary' : 'bg-muted/50'
                    }`}
                  >
                    <p className="text-xs text-muted-foreground">{tier.label}</p>
                    <p className="text-lg font-bold">{(tier.rate * 100).toFixed(1)}%</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* LCA Tax Info */}
      {investment.type === 'LCA' && (
        <Card className="border-success/50 bg-success/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-success/20">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="font-semibold text-success">Investimento Isento de IR</p>
                <p className="text-sm text-muted-foreground">
                  LCA é isenta de Imposto de Renda para pessoa física. Seu rendimento bruto é igual ao líquido.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deposits List */}
      <Card>
        <CardHeader>
          <CardTitle>Aportes</CardTitle>
        </CardHeader>
        <CardContent>
          <DepositsList
            investmentId={investment.id}
            investmentStartDate={investment.start_date}
            investmentEndDate={investment.end_date}
            initialValue={investment.initial_value}
          />
        </CardContent>
      </Card>

      {/* Notes */}
      {investment.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{investment.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
