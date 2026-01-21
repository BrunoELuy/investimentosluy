import { useMemo } from 'react';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  ResponsiveContainer 
} from 'recharts';
import type { InvestmentCalculation } from '@/types/investment';
import { formatCurrency, formatPercent } from '@/utils/investmentCalculations';

interface PortfolioChartsProps {
  calculations: InvestmentCalculation[];
}

export function PortfolioCharts({ calculations }: PortfolioChartsProps) {
  const activeCalcs = calculations.filter(c => c.investment.is_active);

  // Distribution by type (CDB vs LCA)
  const typeDistribution = useMemo(() => {
    const cdbTotal = activeCalcs
      .filter(c => c.investment.type === 'CDB')
      .reduce((sum, c) => sum + c.currentNetValue, 0);
    const lcaTotal = activeCalcs
      .filter(c => c.investment.type === 'LCA')
      .reduce((sum, c) => sum + c.currentNetValue, 0);

    return [
      { name: 'CDB', value: cdbTotal, fill: 'hsl(var(--chart-1))' },
      { name: 'LCA', value: lcaTotal, fill: 'hsl(var(--chart-2))' },
    ].filter(d => d.value > 0);
  }, [activeCalcs]);

  // Distribution by institution
  const institutionDistribution = useMemo(() => {
    const byInstitution: Record<string, number> = {};
    activeCalcs.forEach(c => {
      byInstitution[c.investment.institution] = (byInstitution[c.investment.institution] || 0) + c.currentNetValue;
    });

    const colors = [
      'hsl(var(--chart-1))',
      'hsl(var(--chart-2))',
      'hsl(var(--chart-3))',
      'hsl(var(--chart-4))',
      'hsl(var(--chart-5))',
    ];

    return Object.entries(byInstitution)
      .map(([name, value], index) => ({
        name,
        value,
        fill: colors[index % colors.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [activeCalcs]);

  // Performance by investment
  const performanceData = useMemo(() => {
    return activeCalcs
      .map(c => ({
        name: c.investment.name.length > 20 ? c.investment.name.substring(0, 17) + '...' : c.investment.name,
        fullName: c.investment.name,
        grossPercent: c.grossReturnPercent,
        netPercent: c.netReturnPercent,
        type: c.investment.type,
      }))
      .sort((a, b) => b.netPercent - a.netPercent)
      .slice(0, 10);
  }, [activeCalcs]);

  // Monthly evolution simulation (last 6 months)
  const monthlyEvolution = useMemo(() => {
    const data = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthLabel = format(monthDate, 'MMM/yy', { locale: ptBR });

      // Simulate growth based on elapsed days
      const factor = (6 - i) / 6;
      const grossValue = activeCalcs.reduce((sum, c) => {
        return sum + c.investment.initial_value + (c.grossReturn * factor);
      }, 0);
      const netValue = activeCalcs.reduce((sum, c) => {
        return sum + c.investment.initial_value + (c.netReturn * factor);
      }, 0);

      data.push({
        month: monthLabel,
        grossValue,
        netValue,
      });
    }

    return data;
  }, [activeCalcs]);

  const chartConfigType = {
    CDB: { label: 'CDB', color: 'hsl(var(--chart-1))' },
    LCA: { label: 'LCA', color: 'hsl(var(--chart-2))' },
  };

  const chartConfigPerformance = {
    grossPercent: { label: 'Bruto %', color: 'hsl(var(--chart-1))' },
    netPercent: { label: 'Líquido %', color: 'hsl(var(--chart-2))' },
  };

  const chartConfigEvolution = {
    grossValue: { label: 'Bruto', color: 'hsl(var(--chart-1))' },
    netValue: { label: 'Líquido', color: 'hsl(var(--chart-2))' },
  };

  if (activeCalcs.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          Adicione investimentos para visualizar os gráficos
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Type Distribution Pie */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfigType} className="h-[250px] w-full">
            <PieChart>
              <Pie
                data={typeDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {typeDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value) => formatCurrency(value as number)}
                  />
                } 
              />
            </PieChart>
          </ChartContainer>
          <div className="flex justify-center gap-6 mt-4">
            {typeDistribution.map(d => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.fill }} />
                <span className="text-sm">{d.name}: {formatCurrency(d.value)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Institution Distribution Pie */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Instituição</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[250px] w-full">
            <PieChart>
              <Pie
                data={institutionDistribution}
                cx="50%"
                cy="50%"
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
              >
                {institutionDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value) => formatCurrency(value as number)}
                  />
                } 
              />
            </PieChart>
          </ChartContainer>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {institutionDistribution.slice(0, 5).map(d => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.fill }} />
                <span className="text-sm">{d.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Bar Chart */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Performance por Investimento (%)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfigPerformance} className="h-[300px] w-full">
            <BarChart data={performanceData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={true} vertical={false} />
              <XAxis type="number" tickFormatter={(v) => `${v.toFixed(1)}%`} />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={150}
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value, name) => {
                      const label = name === 'grossPercent' ? 'Bruto' : 'Líquido';
                      return [`${(value as number).toFixed(2)}%`, label];
                    }}
                  />
                } 
              />
              <Bar dataKey="grossPercent" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
              <Bar dataKey="netPercent" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-1))' }} />
              <span className="text-sm">Rendimento Bruto</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-2))' }} />
              <span className="text-sm">Rendimento Líquido</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Evolution Area Chart */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Evolução da Carteira (Últimos 6 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfigEvolution} className="h-[300px] w-full">
            <AreaChart data={monthlyEvolution} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="grossGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => formatCurrency(v)} width={100} tick={{ fontSize: 12 }} />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value, name) => {
                      const label = name === 'grossValue' ? 'Bruto' : 'Líquido';
                      return [formatCurrency(value as number), label];
                    }}
                  />
                } 
              />
              <Area
                type="monotone"
                dataKey="grossValue"
                stroke="hsl(var(--chart-1))"
                fillOpacity={1}
                fill="url(#grossGrad)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="netValue"
                stroke="hsl(var(--chart-2))"
                fillOpacity={1}
                fill="url(#netGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-1))' }} />
              <span className="text-sm">Valor Bruto</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-2))' }} />
              <span className="text-sm">Valor Líquido</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
