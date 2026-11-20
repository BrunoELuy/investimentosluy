import { ArrowDownLeft, ArrowUpRight, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStockTransactions } from '@/hooks/useB3';
import { formatCurrency, formatDate } from '@/utils/investmentCalculations';

interface StockAportesListProps {
  ticker: string;
}

export function StockAportesList({ ticker }: StockAportesListProps) {
  const { data: transactions = [], isLoading } = useStockTransactions(ticker);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-muted-foreground animate-pulse">
          Carregando aportes...
        </CardContent>
      </Card>
    );
  }

  if (transactions.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4 text-[hsl(280,70%,50%)]" />
          Histórico de aportes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground text-left">
                <th className="p-2.5">Data</th>
                <th className="p-2.5">Operação</th>
                <th className="p-2.5 text-right">Qtd</th>
                <th className="p-2.5 text-right">Preço</th>
                <th className="p-2.5 text-right">Total</th>
                <th className="p-2.5">Origem</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const isBuy = tx.operation === 'BUY';
                return (
                  <tr key={tx.id} className="border-b last:border-0">
                    <td className="p-2.5 font-mono">{formatDate(tx.date)}</td>
                    <td className="p-2.5">
                      <Badge
                        variant="outline"
                        className={
                          isBuy
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 gap-1'
                            : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-300 gap-1'
                        }
                      >
                        {isBuy ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                        {isBuy ? 'Compra' : 'Venda'}
                      </Badge>
                    </td>
                    <td className="p-2.5 text-right font-mono">{tx.quantity}</td>
                    <td className="p-2.5 text-right font-mono">
                      {tx.unit_price != null ? formatCurrency(tx.unit_price) : '—'}
                    </td>
                    <td className="p-2.5 text-right font-mono">
                      {tx.total_value != null ? formatCurrency(tx.total_value) : '—'}
                    </td>
                    <td className="p-2.5 text-xs text-muted-foreground">{tx.source ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}