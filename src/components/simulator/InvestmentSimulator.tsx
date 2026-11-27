import { useState, useMemo } from 'react';
import { format, addDays, addMonths, addYears, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calculator, TrendingUp, Calendar, DollarSign, Percent, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useEconomicRates } from '@/hooks/useEconomicRates';
import { calculateGrossReturn, getIRRate, formatCurrency, formatPercent, isTaxableFixedIncome } from '@/utils/investmentCalculations';
import { SimulatorChart } from './SimulatorChart';

type InvestmentType = 'CDB' | 'LCA' | 'TESOURO';
type RateType = 'CDI' | 'SELIC' | 'IPCA' | 'PREFIXADO';
type PeriodType = 'days' | 'months' | 'years' | 'targetYear' | 'custom';

const TESOURO_PRESET_YEARS = [2027, 2029, 2031, 2034, 2035, 2040, 2045];

interface SimulationResult {
  grossValue: number;
  grossReturn: number;
  grossReturnPercent: number;
  netValue: number;
  netReturn: number;
  netReturnPercent: number;
  irRate: number;
  irAmount: number;
  days: number;
  endDate: Date;
}

export function InvestmentSimulator() {
  const { data: rates, isLoading: ratesLoading } = useEconomicRates();
  const cdiRate = rates?.cdi ?? 10.65;
  const selicRate = rates?.selic ?? 10.5;
  const ipcaRate = rates?.ipca ?? 4.5;
  
  const [investmentType, setInvestmentType] = useState<InvestmentType>('CDB');
  const [rateType, setRateType] = useState<RateType>('CDI');
  const [initialValue, setInitialValue] = useState<number>(10000);
  const [rateValue, setRateValue] = useState<number>(110);
  const [periodType, setPeriodType] = useState<PeriodType>('years');
  const [periodValue, setPeriodValue] = useState<number>(1);
  const [targetYear, setTargetYear] = useState<number>(2034);
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const handleInvestmentTypeChange = (nextType: InvestmentType) => {
    setInvestmentType(nextType);
    if (nextType === 'TESOURO') {
      if (rateType === 'CDI') {
        setRateType('PREFIXADO');
        setRateValue(15.03);
      }
      if (periodType !== 'targetYear' && periodType !== 'custom') {
        setPeriodType('targetYear');
        setTargetYear(2034);
      }
    } else if (rateType === 'SELIC') {
      setRateType('CDI');
      setRateValue(100);
    }
  };

  const simulation = useMemo((): SimulationResult | null => {
    if (initialValue <= 0) return null;
    if (rateType !== 'SELIC' && rateValue <= 0) return null;
    if (rateType === 'SELIC' && rateValue < 0) return null;

    const startDate = new Date();
    let endDate: Date;

    switch (periodType) {
      case 'days':
        endDate = addDays(startDate, periodValue);
        break;
      case 'months':
        endDate = addMonths(startDate, periodValue);
        break;
      case 'years':
        endDate = addYears(startDate, periodValue);
        break;
      case 'targetYear':
        if (!targetYear || targetYear <= startDate.getFullYear()) return null;
        endDate = new Date(targetYear, 0, 1);
        break;
      case 'custom':
        if (!customEndDate) return null;
        endDate = new Date(customEndDate);
        break;
      default:
        return null;
    }

    const days = differenceInDays(endDate, startDate);
    if (days <= 0) return null;

    const grossReturn = calculateGrossReturn(
      initialValue,
      rateType,
      rateValue,
      days,
      cdiRate,
      ipcaRate,
      undefined,
      undefined,
      selicRate
    );

    const grossValue = initialValue + grossReturn;
    const grossReturnPercent = (grossReturn / initialValue) * 100;

    let irRate = 0;
    let irAmount = 0;

    if (isTaxableFixedIncome(investmentType)) {
      irRate = getIRRate(days);
      irAmount = grossReturn * irRate;
    }

    const netReturn = grossReturn - irAmount;
    const netValue = initialValue + netReturn;
    const netReturnPercent = (netReturn / initialValue) * 100;

    return {
      grossValue,
      grossReturn,
      grossReturnPercent,
      netValue,
      netReturn,
      netReturnPercent,
      irRate,
      irAmount,
      days,
      endDate,
    };
  }, [investmentType, rateType, initialValue, rateValue, periodType, periodValue, targetYear, customEndDate, cdiRate, selicRate, ipcaRate]);

  const presetPeriods = [
    { label: '6 meses', type: 'months' as PeriodType, value: 6 },
    { label: '1 ano', type: 'years' as PeriodType, value: 1 },
    { label: '2 anos', type: 'years' as PeriodType, value: 2 },
    { label: '3 anos', type: 'years' as PeriodType, value: 3 },
    { label: '5 anos', type: 'years' as PeriodType, value: 5 },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Simulador de Investimentos
          </CardTitle>
          <CardDescription>
            Calcule o rendimento estimado de seus investimentos em CDB, LCA e Tesouro Direto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Economic Rates Info */}
          <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">CDI atual:</span>
              <span className="font-semibold">{cdiRate.toFixed(2)}% a.a.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Selic atual:</span>
              <span className="font-semibold">{selicRate.toFixed(2)}% a.a.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">IPCA atual:</span>
              <span className="font-semibold">{ipcaRate.toFixed(2)}% a.a.</span>
            </div>
            {ratesLoading && (
              <span className="text-xs text-muted-foreground">Atualizando taxas...</span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Investment Type */}
            <div className="space-y-2">
              <Label>Tipo de Investimento</Label>
              <Tabs value={investmentType} onValueChange={(v) => handleInvestmentTypeChange(v as InvestmentType)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="CDB">CDB</TabsTrigger>
                  <TabsTrigger value="LCA">LCA</TabsTrigger>
                  <TabsTrigger value="TESOURO">Tesouro</TabsTrigger>
                </TabsList>
              </Tabs>
              <p className="text-xs text-muted-foreground">
                {investmentType === 'LCA'
                  ? 'Isento de IR para pessoa física'
                  : investmentType === 'TESOURO'
                    ? 'Tesouro Direto · Sujeito a IR regressivo'
                    : 'Sujeito a IR regressivo'}
              </p>
            </div>

            {/* Initial Value */}
            <div className="space-y-2">
              <Label htmlFor="value">Valor a Investir (R$)</Label>
              <Input
                id="value"
                type="number"
                min="0"
                step="100"
                value={initialValue === 0 ? '' : initialValue}
                onChange={(e) => setInitialValue(e.target.value === '' ? 0 : parseFloat(e.target.value))}
              />
            </div>

            {/* Rate Type */}
            <div className="space-y-2">
              <Label>Tipo de Rentabilidade</Label>
              <Select value={rateType} onValueChange={(v) => setRateType(v as RateType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CDI">% do CDI</SelectItem>
                  <SelectItem value="SELIC">Pós-fixado (Selic +)</SelectItem>
                  <SelectItem value="IPCA">IPCA +</SelectItem>
                  <SelectItem value="PREFIXADO">Prefixado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Rate Value */}
            <div className="space-y-2">
              <Label htmlFor="rate">
                {rateType === 'CDI'
                  ? '% do CDI'
                  : rateType === 'SELIC'
                    ? 'Adicional à Selic (%)'
                    : rateType === 'IPCA'
                      ? 'Taxa adicional (%)'
                      : 'Taxa anual (%)'}
              </Label>
              <Input
                id="rate"
                type="number"
                min="0"
                step="0.01"
                value={rateValue === 0 && rateType !== 'SELIC' ? '' : rateValue}
                onChange={(e) => setRateValue(e.target.value === '' ? 0 : parseFloat(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                {rateType === 'CDI' && `Equivale a ${((rateValue / 100) * cdiRate).toFixed(2)}% a.a.`}
                {rateType === 'SELIC' && `Rentabilidade total: ${(selicRate + rateValue).toFixed(2)}% a.a.`}
                {rateType === 'IPCA' && `Rentabilidade total: ${(ipcaRate + rateValue).toFixed(2)}% a.a.`}
                {rateType === 'PREFIXADO' && `Taxa fixa de ${rateValue.toFixed(2)}% a.a.`}
              </p>
            </div>
          </div>

          {/* Period Selection */}
          <div className="space-y-4">
            <Label>Período de Investimento</Label>
            <div className="flex flex-wrap gap-2">
              {presetPeriods.map((preset) => (
                <Button
                  key={preset.label}
                  variant={periodType === preset.type && periodValue === preset.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setPeriodType(preset.type);
                    setPeriodValue(preset.value);
                  }}
                >
                  {preset.label}
                </Button>
              ))}
              <Button
                variant={periodType === 'targetYear' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriodType('targetYear')}
              >
                Até o ano ({targetYear})
              </Button>
              <Button
                variant={periodType === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriodType('custom')}
              >
                Personalizado
              </Button>
            </div>

            {periodType === 'targetYear' && (
              <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">Ano de vencimento:</span>
                  {TESOURO_PRESET_YEARS.map((yr) => (
                    <Button
                      key={yr}
                      type="button"
                      size="sm"
                      variant={targetYear === yr ? 'default' : 'outline'}
                      className="h-7 px-2.5 text-xs"
                      onClick={() => setTargetYear(yr)}
                    >
                      {yr}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-3 max-w-xs">
                  <Label htmlFor="target-year" className="text-xs whitespace-nowrap">
                    Outro ano:
                  </Label>
                  <Input
                    id="target-year"
                    type="number"
                    min={new Date().getFullYear() + 1}
                    max={2070}
                    value={targetYear === 0 ? '' : targetYear}
                    onChange={(e) => setTargetYear(e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
                    className="h-8"
                  />
                </div>
              </div>
            )}

            {periodType === 'custom' && (
              <div className="flex gap-4 items-end">
                <div className="space-y-2 flex-1">
                  <Label htmlFor="custom-date">Data de Vencimento</Label>
                  <Input
                    id="custom-date"
                    type="date"
                    value={customEndDate}
                    min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {simulation && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm">Valor Líquido Final</span>
                </div>
                <p className="text-3xl font-bold text-primary">{formatCurrency(simulation.netValue)}</p>
                <p className="text-sm text-success mt-1">
                  +{formatCurrency(simulation.netReturn)} ({formatPercent(simulation.netReturnPercent)})
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm">Rendimento Bruto</span>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(simulation.grossReturn)}</p>
                <p className="text-sm text-muted-foreground">
                  {formatPercent(simulation.grossReturnPercent)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">Prazo</span>
                </div>
                <p className="text-2xl font-bold">{simulation.days} dias</p>
                <p className="text-sm text-muted-foreground">
                  Vencimento: {format(simulation.endDate, 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tax Details for CDB and Tesouro Direto */}
          {isTaxableFixedIncome(investmentType) && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Imposto de Renda</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>IR regressivo: quanto mais tempo, menor a alíquota</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-destructive">-{formatCurrency(simulation.irAmount)}</p>
                    <p className="text-xs text-muted-foreground">Alíquota: {(simulation.irRate * 100).toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {investmentType === 'LCA' && (
            <Card className="border-success/50 bg-success/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-success/20">
                    <TrendingUp className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="font-semibold text-success">Isento de Imposto de Renda</p>
                    <p className="text-sm text-muted-foreground">
                      Seu rendimento bruto é igual ao líquido
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Chart */}
          <SimulatorChart
            initialValue={initialValue}
            rateType={rateType}
            rateValue={rateValue}
            investmentType={investmentType}
            days={simulation.days}
            cdiRate={cdiRate}
            selicRate={selicRate}
            ipcaRate={ipcaRate}
          />
        </>
      )}
    </div>
  );
}
