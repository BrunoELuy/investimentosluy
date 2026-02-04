import { TrendingUp, TrendingDown, DollarSign, PiggyBank } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardSummary as DashboardSummaryType } from '@/types/investment';
import { formatCurrency, formatPercent } from '@/utils/investmentCalculations';

interface DashboardSummaryProps {
  summary: DashboardSummaryType;
}

export function DashboardSummary({ summary }: DashboardSummaryProps) {
  const isPositiveReturn = summary.totalNetReturn >= 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 min-w-0">
        <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6">
          <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2 text-muted-foreground">
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="truncate">Total Investido</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
          <p className="text-lg sm:text-2xl font-bold truncate">{formatCurrency(summary.totalInvested)}</p>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {summary.activeCount} ativos
          </p>
        </CardContent>
      </Card>

      <Card className={`bg-gradient-to-br min-w-0 ${isPositiveReturn ? 'from-success/10 to-success/5' : 'from-destructive/10 to-destructive/5'}`}>
        <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6">
          <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2 text-muted-foreground">
            {isPositiveReturn ? (
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-success flex-shrink-0" />
            ) : (
              <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-destructive flex-shrink-0" />
            )}
            <span className="truncate">Rendimento Líquido</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
          <p className={`text-lg sm:text-2xl font-bold truncate ${isPositiveReturn ? 'text-success' : 'text-destructive'}`}>
            {isPositiveReturn ? '+' : ''}{formatCurrency(summary.totalNetReturn)}
          </p>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {formatPercent(summary.totalNetPercent)} retorno
          </p>
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6">
          <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2 text-muted-foreground">
            <PiggyBank className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="truncate">Patrimônio Atual</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
          <p className="text-lg sm:text-2xl font-bold truncate">
            {formatCurrency(summary.totalInvested + summary.totalNetReturn)}
          </p>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            Líquido após impostos
          </p>
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6">
          <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2 text-muted-foreground">
            <PiggyBank className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="truncate">Quantidade</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
          <div className="flex gap-3 sm:gap-4">
            <div className="min-w-0">
              <p className="text-base sm:text-xl font-bold text-chart-1">{summary.cdbCount}</p>
              <p className="text-xs text-muted-foreground">{summary.cdbCount === 1 ? 'CDB' : 'CDBs'}</p>
            </div>
            <div className="min-w-0">
              <p className="text-base sm:text-xl font-bold text-chart-2">{summary.lcaCount}</p>
              <p className="text-xs text-muted-foreground">{summary.lcaCount === 1 ? 'LCA' : 'LCAs'}</p>
            </div>
            {summary.maturedCount > 0 && (
              <div className="min-w-0">
                <p className="text-base sm:text-xl font-bold text-warning">{summary.maturedCount}</p>
                <p className="text-xs text-muted-foreground truncate">{summary.maturedCount === 1 ? 'Vencido' : 'Vencidos'}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
