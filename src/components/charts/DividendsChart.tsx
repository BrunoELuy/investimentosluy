import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Coins, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDividendPayments } from '@/hooks/useB3';
import { formatCurrency } from '@/utils/investmentCalculations';
import type { DividendPayment } from '@/types/b3';

const MONTHS_PT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const TICKER_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899',
  '#06b6d4', '#84cc16', '#6366f1', '#f97316', '#14b8a6',
  '#a855f7', '#eab308', '#ef4444', '#0ea5e9', '#22c55e',
];

function getTickerColor(allTickers: string[], ticker: string): string {
  const idx = allTickers.indexOf(ticker);
  return TICKER_COLORS[idx % TICKER_COLORS.length];
}

interface MonthDataPoint {
  month: string;
  [key: string]: number | string;
}

export function DividendsChart() {
  const { data: dividends = [], isLoading } = useDividendPayments();

  const today = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedTickers, setSelectedTickers] = useState<Set<string>>(new Set());

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const d of dividends) {
      const y = parseInt(d.date.substring(0, 4), 10);
      if (!isNaN(y)) years.add(y);
    }
    if (years.size === 0) years.add(today.getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [dividends]);

  const allTickers = useMemo(() => {
    const tickers = new Set<string>();
    for (const d of dividends) {
      if (d.type === 'DIVIDENDO' || d.type === 'JCP') tickers.add(d.ticker);
    }
    return Array.from(tickers).sort();
  }, [dividends]);

  const toggleTicker = (ticker: string) => {
    setSelectedTickers(prev => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker);
      else next.add(ticker);
      return next;
    });
  };

  const activeTickers = selectedTickers.size > 0 ? Array.from(selectedTickers).sort() : allTickers;

  const yearDividends = useMemo<DividendPayment[]>(() => {
    return dividends.filter(d => {
      const year = parseInt(d.date.substring(0, 4), 10);
      if (year !== selectedYear) return false;
      if (d.type !== 'DIVIDENDO' && d.type !== 'JCP') return false;
      if (selectedTickers.size > 0 && !selectedTickers.has(d.ticker)) return false;
      return true;
    });
  }, [dividends, selectedYear, selectedTickers]);

  const chartData = useMemo<MonthDataPoint[]>(() => {
    return MONTHS_PT.map((monthLabel, monthIdx) => {
      const point: MonthDataPoint = { month: monthLabel };
      for (const ticker of activeTickers) {
        point[`${ticker}_DIV`] = 0;
        point[`${ticker}_JCP`] = 0;
        for (const d of yearDividends) {
          const m = parseInt(d.date.substring(5, 7), 10) - 1;
          if (m !== monthIdx || d.ticker !== ticker) continue;
          if (d.type === 'DIVIDENDO') (point[`${ticker}_DIV`] as number) += d.totalAmount;
          if (d.type === 'JCP') (point[`${ticker}_JCP`] as number) += d.totalAmount;
        }
      }
      return point;
    });
  }, [yearDividends, activeTickers]);

  const totals = useMemo(() => {
    let dividendTotal = 0;
    let jcpTotal = 0;
    for (const d of yearDividends) {
      if (d.type === 'DIVIDENDO') dividendTotal += d.totalAmount;
      if (d.type === 'JCP') jcpTotal += d.totalAmount;
    }
    let allDividendTotal = 0;
    let allJcpTotal = 0;
    for (const d of dividends) {
      if (d.type !== 'DIVIDENDO' && d.type !== 'JCP') continue;
      if (selectedTickers.size > 0 && !selectedTickers.has(d.ticker)) continue;
      if (d.type === 'DIVIDENDO') allDividendTotal += d.totalAmount;
      if (d.type === 'JCP') allJcpTotal += d.totalAmount;
    }
    return { dividendTotal, jcpTotal, allDividendTotal, allJcpTotal };
  }, [yearDividends, dividends, selectedTickers]);

  const perTickerTotals = useMemo(() => {
    const map: Record<string, { dividendo: number; jcp: number }> = {};
    for (const d of yearDividends) {
      if (!map[d.ticker]) map[d.ticker] = { dividendo: 0, jcp: 0 };
      if (d.type === 'DIVIDENDO') map[d.ticker].dividendo += d.totalAmount;
      if (d.type === 'JCP') map[d.ticker].jcp += d.totalAmount;
    }
    return map;
  }, [yearDividends]);

  if (isLoading) {
    return (
      <Card className="lg:col-span-2">
        <CardContent className="p-8 text-center text-muted-foreground animate-pulse">
          Carregando histórico de proventos...
        </CardContent>
      </Card>
    );
  }

  if (dividends.length === 0) return null;

  const minYear = availableYears[availableYears.length - 1];
  const maxYear = availableYears[0];

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-amber-500" />
            Proventos por Mês (Dividendos e JCP)
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="icon" className="h-8 w-8"
              disabled={selectedYear <= minYear}
              onClick={() => setSelectedYear(y => y - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-bold text-lg w-14 text-center">{selectedYear}</span>
            <Button
              variant="outline" size="icon" className="h-8 w-8"
              disabled={selectedYear >= maxYear}
              onClick={() => setSelectedYear(y => y + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Ticker filter pills */}
        {allTickers.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
              <Filter className="h-3.5 w-3.5" />
              Filtrar por ativo:
            </span>
            {allTickers.map(ticker => {
              const isActive = selectedTickers.has(ticker);
              const color = getTickerColor(allTickers, ticker);
              return (
                <button
                  key={ticker}
                  onClick={() => toggleTicker(ticker)}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all ${isActive
                      ? 'text-white border-transparent shadow-sm'
                      : 'bg-background text-muted-foreground border-border hover:border-foreground/40'
                    }`}
                  style={isActive ? { backgroundColor: color, borderColor: color } : {}}
                >
                  {ticker}
                </button>
              );
            })}
            {selectedTickers.size > 0 && (
              <button
                onClick={() => setSelectedTickers(new Set())}
                className="px-2.5 py-0.5 rounded-full text-xs border border-dashed border-muted-foreground/50 text-muted-foreground hover:border-foreground/40 transition-all"
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}

        {/* Summary totals */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20">
            <p className="text-xs text-muted-foreground">Dividendos {selectedYear}</p>
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
              {formatCurrency(totals.dividendTotal)}
            </p>
          </div>
          <div className="p-3 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20">
            <p className="text-xs text-muted-foreground">JCP {selectedYear}</p>
            <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
              {formatCurrency(totals.jcpTotal)}
            </p>
          </div>
          <div className="p-3 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20">
            <p className="text-xs text-muted-foreground">Total {selectedYear}</p>
            <p className="text-lg font-bold text-amber-700 dark:text-amber-400">
              {formatCurrency(totals.dividendTotal + totals.jcpTotal)}
            </p>
          </div>
          <div className="p-3 rounded-lg border bg-purple-50/50 dark:bg-purple-950/20">
            <p className="text-xs text-muted-foreground">Acumulado Total</p>
            <p className="text-lg font-bold text-purple-700 dark:text-purple-400">
              {formatCurrency(totals.allDividendTotal + totals.allJcpTotal)}
            </p>
          </div>
        </div>

        {/* Monthly bar chart */}
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 10, left: 0, bottom: 0 }} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis
                fontSize={11}
                tickFormatter={v => v === 0 ? '' : `R$${v.toFixed(0)}`}
                width={60}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  const parts = name.split('_');
                  const type = parts[parts.length - 1];
                  const ticker = parts.slice(0, -1).join('_');
                  const label = type === 'DIV' ? `${ticker} — Dividendo` : `${ticker} — JCP`;
                  return value > 0 ? [formatCurrency(value), label] : null;
                }}
                labelFormatter={(label: string) => `Mês: ${label}`}
              />
              <Legend
                formatter={(value: string) => {
                  const parts = value.split('_');
                  const type = parts[parts.length - 1];
                  const ticker = parts.slice(0, -1).join('_');
                  return `${ticker} ${type === 'DIV' ? '(Div)' : '(JCP)'}`;
                }}
                wrapperStyle={{ fontSize: '11px' }}
              />
              {activeTickers.map(ticker => {
                const color = getTickerColor(allTickers, ticker);
                return [
                  <Bar
                    key={`${ticker}_DIV`}
                    dataKey={`${ticker}_DIV`}
                    name={`${ticker}_DIV`}
                    stackId={ticker}
                    fill={color}
                    radius={[0, 0, 0, 0]}
                    maxBarSize={36}
                  />,
                  <Bar
                    key={`${ticker}_JCP`}
                    dataKey={`${ticker}_JCP`}
                    name={`${ticker}_JCP`}
                    stackId={ticker}
                    fill={color}
                    fillOpacity={0.45}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={36}
                  />,
                ];
              })}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Per-ticker breakdown table */}
        {Object.keys(perTickerTotals).length > 0 ? (
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-muted-foreground text-left">
                  <th className="p-2.5">Ativo</th>
                  <th className="p-2.5 text-right">Dividendos</th>
                  <th className="p-2.5 text-right">JCP</th>
                  <th className="p-2.5 text-right font-semibold">Total {selectedYear}</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(perTickerTotals)
                  .sort(([, a], [, b]) => (b.dividendo + b.jcp) - (a.dividendo + a.jcp))
                  .map(([ticker, vals]) => {
                    const color = getTickerColor(allTickers, ticker);
                    return (
                      <tr key={ticker} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="p-2.5">
                          <span
                            className="font-semibold text-xs px-2 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: color }}
                          >
                            {ticker}
                          </span>
                        </td>
                        <td className="p-2.5 text-right text-emerald-700 dark:text-emerald-400 font-mono">
                          {vals.dividendo > 0 ? formatCurrency(vals.dividendo) : '—'}
                        </td>
                        <td className="p-2.5 text-right text-blue-700 dark:text-blue-400 font-mono">
                          {vals.jcp > 0 ? formatCurrency(vals.jcp) : '—'}
                        </td>
                        <td className="p-2.5 text-right font-bold font-mono">
                          {formatCurrency(vals.dividendo + vals.jcp)}
                        </td>
                      </tr>
                    );
                  })}
                <tr className="border-t-2 bg-muted/40 font-bold text-xs">
                  <td className="p-2.5">Total</td>
                  <td className="p-2.5 text-right text-emerald-700 dark:text-emerald-400 font-mono">
                    {formatCurrency(totals.dividendTotal)}
                  </td>
                  <td className="p-2.5 text-right text-blue-700 dark:text-blue-400 font-mono">
                    {formatCurrency(totals.jcpTotal)}
                  </td>
                  <td className="p-2.5 text-right font-mono">
                    {formatCurrency(totals.dividendTotal + totals.jcpTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-muted-foreground text-sm py-4">
            Nenhum dividendo ou JCP registrado em {selectedYear}
            {selectedTickers.size > 0 ? ' para os ativos selecionados' : ''}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
