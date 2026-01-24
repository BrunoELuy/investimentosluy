import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Calendar, Building2, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { InvestmentCalculation } from '@/types/investment';
import { formatCurrency, formatPercent, formatRateValue } from '@/utils/investmentCalculations';

interface InvestmentCardProps {
  calculation: InvestmentCalculation;
  onClick?: () => void;
}

export function InvestmentCard({ calculation, onClick }: InvestmentCardProps) {
  const { investment, grossReturn, netReturn, netReturnPercent, currentNetValue, daysElapsed, totalDays, daysUntilMaturity, isMatured, irRate } = calculation;

  const progressPercent = Math.min((daysElapsed / totalDays) * 100, 100);
  const isPositive = netReturn >= 0;

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-l-4"
      style={{ borderLeftColor: investment.type === 'CDB' ? 'hsl(var(--chart-1))' : 'hsl(var(--chart-2))' }}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant={investment.type === 'CDB' ? 'default' : 'secondary'}>
                {investment.type}
              </Badge>
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
            <h3 className="font-semibold text-lg mt-2">{investment.name}</h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Building2 className="h-3 w-3" />
              {investment.institution}
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Valor Aplicado</p>
            <p className="font-medium">{formatCurrency(calculation.totalInvested)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Rentabilidade</p>
            <p className="font-medium">{formatRateValue(investment.rate_type, investment.rate_value)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Valor Bruto Atual</p>
            <p className="font-medium">{formatCurrency(calculation.currentValue)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Valor Líquido Atual</p>
            <p className="font-semibold text-success">{formatCurrency(currentNetValue)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
            <span className={`font-semibold ${isPositive ? 'text-success' : 'text-destructive'}`}>
              {isPositive ? '+' : ''}{formatCurrency(netReturn)} ({formatPercent(netReturnPercent)})
            </span>
          </div>
          {investment.type === 'CDB' && (
            <span className="text-xs text-muted-foreground">
              IR: {(irRate * 100).toFixed(1)}%
            </span>
          )}
          {investment.type === 'LCA' && (
            <span className="text-xs text-success">
              Isento de IR
            </span>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(investment.start_date), 'dd/MM/yy', { locale: ptBR })}
            </span>
            <span>{daysElapsed} de {totalDays} dias</span>
            <span>{format(new Date(investment.end_date), 'dd/MM/yy', { locale: ptBR })}</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}
