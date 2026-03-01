import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Calendar, Building2, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { InvestmentCalculation } from '@/types/investment';
import type { StockQuote } from '@/hooks/useStockQuotes';
import { formatCurrency, formatPercent, formatRateValue } from '@/utils/investmentCalculations';

interface InvestmentCardProps {
  calculation: InvestmentCalculation;
  onClick?: () => void;
  stockQuote?: StockQuote;
}

// Color mapping for investment types
const TYPE_COLORS = {
  CDB: 'hsl(var(--chart-1))',
  LCA: 'hsl(var(--chart-2))',
  ACAO: 'hsl(280, 70%, 50%)', // Purple for stocks
};

const TYPE_BADGE_VARIANTS = {
  CDB: 'default',
  LCA: 'secondary',
  ACAO: 'outline',
} as const;

export function InvestmentCard({ calculation, onClick, stockQuote }: InvestmentCardProps) {
  const { investment, grossReturn, netReturn, netReturnPercent, currentNetValue, daysElapsed, totalDays, daysUntilMaturity, isMatured, irRate } = calculation;

  const isStock = investment.type === 'ACAO';
  const progressPercent = isStock ? 100 : Math.min((daysElapsed / totalDays) * 100, 100);
  const isPositive = netReturn >= 0;

  // Calculate average price for stocks
  const averagePrice = isStock && investment.quantity 
    ? investment.initial_value / investment.quantity 
    : null;

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-l-4"
      style={{ borderLeftColor: TYPE_COLORS[investment.type] }}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge 
                variant={TYPE_BADGE_VARIANTS[investment.type]}
                className={investment.type === 'ACAO' ? 'bg-[hsl(280,70%,50%)] text-white border-[hsl(280,70%,50%)]' : ''}
              >
                {investment.type === 'ACAO' ? 'AÇÃO' : investment.type}
              </Badge>
              {isStock && investment.ticker && (
                <Badge variant="outline" className="font-mono text-xs">
                  {investment.ticker}
                </Badge>
              )}
              {!isStock && isMatured && (
                <Badge variant="outline" className="text-warning border-warning">
                  Vencido
                </Badge>
              )}
              {!isStock && !isMatured && daysUntilMaturity <= 30 && (
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
            <p className="text-xs text-muted-foreground">Valor Investido</p>
            <p className="font-medium">{formatCurrency(calculation.totalInvested)}</p>
          </div>
          {isStock ? (
            <div>
              <p className="text-xs text-muted-foreground">Qtd. de Papéis</p>
              <p className="font-medium">{investment.quantity?.toLocaleString('pt-BR')}</p>
            </div>
          ) : (
            <div>
              <p className="text-xs text-muted-foreground">Rentabilidade</p>
              <p className="font-medium">{formatRateValue(investment.rate_type, investment.rate_value)}</p>
            </div>
          )}
        </div>

        {isStock ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Preço Médio</p>
                <p className="font-semibold text-[hsl(280,70%,50%)]">
                  {averagePrice ? formatCurrency(averagePrice) : '-'}
                </p>
              </div>
              {stockQuote ? (
                <div>
                  <p className="text-xs text-muted-foreground">Cotação Atual</p>
                  <p className="font-semibold">{formatCurrency(stockQuote.price)}</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-muted-foreground">Data da Compra</p>
                  <p className="font-medium text-sm">
                    {format(new Date(investment.start_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
              )}
            </div>
            {stockQuote && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {stockQuote.changePercent >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-success" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                  <span className={`text-sm font-semibold ${stockQuote.changePercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {stockQuote.changePercent >= 0 ? '+' : ''}{stockQuote.changePercent.toFixed(2)}% hoje
                  </span>
                </div>
                {investment.quantity && averagePrice ? (
                  <span className={`text-sm font-semibold ${stockQuote.price >= averagePrice ? 'text-success' : 'text-destructive'}`}>
                    {stockQuote.price >= averagePrice ? '+' : ''}
                    {formatCurrency((stockQuote.price - averagePrice) * investment.quantity)}
                  </span>
                ) : null}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Valor Bruto Atual</p>
                <p className="font-medium">{formatCurrency(calculation.currentValue)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor Líquido Atual</p>
                <p className={`font-semibold ${investment.type === 'LCA' ? 'text-[hsl(199,89%,48%)]' : 'text-success'}`}>
                  {formatCurrency(currentNetValue)}
                </p>
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
              <Progress 
                value={progressPercent} 
                className={`h-2 ${investment.type === 'LCA' ? '[&>div]:bg-[hsl(199,89%,48%)]' : ''}`} 
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}