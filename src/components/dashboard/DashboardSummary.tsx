import { TrendingUp, TrendingDown, DollarSign, PiggyBank, Percent, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardSummary as DashboardSummaryType } from '@/types/investment';
import { formatCurrency, formatPercent } from '@/utils/investmentCalculations';

interface DashboardSummaryProps {
  summary: DashboardSummaryType;
}

export function DashboardSummary({ summary }: DashboardSummaryProps) {
  const isPositiveReturn = summary.totalNetReturn >= 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            Total Investido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatCurrency(summary.totalInvested)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {summary.activeCount} investimentos ativos
          </p>
        </CardContent>
      </Card>

      <Card className={`bg-gradient-to-br ${isPositiveReturn ? 'from-success/10 to-success/5' : 'from-destructive/10 to-destructive/5'}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            {isPositiveReturn ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
            Rendimento Líquido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-2xl font-bold ${isPositiveReturn ? 'text-success' : 'text-destructive'}`}>
            {isPositiveReturn ? '+' : ''}{formatCurrency(summary.totalNetReturn)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatPercent(summary.totalNetPercent)} de retorno
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <PiggyBank className="h-4 w-4" />
            Patrimônio Atual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            {formatCurrency(summary.totalInvested + summary.totalNetReturn)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Valor líquido após impostos
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <Percent className="h-4 w-4" />
            Composição
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div>
              <p className="text-xl font-bold text-chart-1">{summary.cdbCount}</p>
              <p className="text-xs text-muted-foreground">CDB</p>
            </div>
            <div>
              <p className="text-xl font-bold text-chart-2">{summary.lcaCount}</p>
              <p className="text-xs text-muted-foreground">LCA</p>
            </div>
            {summary.maturedCount > 0 && (
              <div>
                <p className="text-xl font-bold text-warning">{summary.maturedCount}</p>
                <p className="text-xs text-muted-foreground">Vencidos</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
