import { useMemo } from 'react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { calculateGrossReturn, getIRRate, formatCurrency } from '@/utils/investmentCalculations';

interface SimulatorChartProps {
  initialValue: number;
  rateType: string;
  rateValue: number;
  investmentType: 'CDB' | 'LCA';
  days: number;
  cdiRate: number;
  ipcaRate: number;
}

export function SimulatorChart({
  initialValue,
  rateType,
  rateValue,
  investmentType,
  days,
  cdiRate,
  ipcaRate,
}: SimulatorChartProps) {
  const chartData = useMemo(() => {
    const data = [];
    const startDate = new Date();
    const dataPoints = Math.min(days, 60); // Max 60 data points for performance
    const interval = Math.max(1, Math.floor(days / dataPoints));

    for (let d = 0; d <= days; d += interval) {
      const currentDate = addDays(startDate, d);
      const grossReturn = calculateGrossReturn(
        initialValue,
        rateType,
        rateValue,
        d,
        cdiRate,
        ipcaRate
      );
      
      const grossValue = initialValue + grossReturn;
      
      let netValue = grossValue;
      if (investmentType === 'CDB' && d > 0) {
        const irRate = getIRRate(d);
        const irAmount = grossReturn * irRate;
        netValue = initialValue + grossReturn - irAmount;
      }

      data.push({
        day: d,
        date: format(currentDate, 'dd/MM/yy', { locale: ptBR }),
        grossValue,
        netValue,
        grossReturn,
        netReturn: netValue - initialValue,
      });
    }

    // Ensure last day is included
    if (data[data.length - 1]?.day !== days) {
      const grossReturn = calculateGrossReturn(
        initialValue,
        rateType,
        rateValue,
        days,
        cdiRate,
        ipcaRate
      );
      const grossValue = initialValue + grossReturn;
      let netValue = grossValue;
      if (investmentType === 'CDB') {
        const irRate = getIRRate(days);
        const irAmount = grossReturn * irRate;
        netValue = initialValue + grossReturn - irAmount;
      }

      data.push({
        day: days,
        date: format(addDays(startDate, days), 'dd/MM/yy', { locale: ptBR }),
        grossValue,
        netValue,
        grossReturn,
        netReturn: netValue - initialValue,
      });
    }

    return data;
  }, [initialValue, rateType, rateValue, investmentType, days, cdiRate, ipcaRate]);

  const chartConfig = {
    grossValue: {
      label: 'Valor Bruto',
      color: 'hsl(var(--chart-1))',
    },
    netValue: {
      label: 'Valor Líquido',
      color: 'hsl(var(--chart-2))',
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução do Investimento</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="grossGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tickFormatter={(value) => formatCurrency(value)}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={100}
            />
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
              fill="url(#grossGradient)"
              strokeWidth={2}
            />
            {investmentType === 'CDB' && (
              <Area
                type="monotone"
                dataKey="netValue"
                stroke="hsl(var(--chart-2))"
                fillOpacity={1}
                fill="url(#netGradient)"
                strokeWidth={2}
              />
            )}
          </AreaChart>
        </ChartContainer>
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-1))' }} />
            <span className="text-sm text-muted-foreground">Valor Bruto</span>
          </div>
          {investmentType === 'CDB' && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-2))' }} />
              <span className="text-sm text-muted-foreground">Valor Líquido</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
