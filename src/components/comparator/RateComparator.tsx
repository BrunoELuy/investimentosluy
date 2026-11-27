import { useState, useMemo } from 'react';
import { format, addDays, addMonths, addYears, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Scale, Plus, Trash2, Trophy, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useEconomicRates } from '@/hooks/useEconomicRates';
import { calculateGrossReturn, getIRRate, formatCurrency, formatPercent, isTaxableFixedIncome } from '@/utils/investmentCalculations';

interface InvestmentOption {
  id: string;
  name: string;
  type: 'CDB' | 'LCA' | 'TESOURO';
  rateType: 'CDI' | 'SELIC' | 'IPCA' | 'PREFIXADO';
  rateValue: number;
}

const COMPARE_YEARS = [2029, 2031, 2034, 2035, 2040];

interface ComparisonResult {
  option: InvestmentOption;
  grossReturn: number;
  grossReturnPercent: number;
  netReturn: number;
  netReturnPercent: number;
  irAmount: number;
  irRate: number;
  finalValue: number;
  isWinner: boolean;
}

export function RateComparator() {
  const { data: rates } = useEconomicRates();
  const cdiRate = rates?.cdi ?? 10.65;
  const selicRate = rates?.selic ?? 10.5;
  const ipcaRate = rates?.ipca ?? 4.5;
  
  const [initialValue, setInitialValue] = useState<number>(10000);
  const [periodMode, setPeriodMode] = useState<'months' | 'year'>('months');
  const [periodMonths, setPeriodMonths] = useState<number>(12);
  const [targetYear, setTargetYear] = useState<number>(2034);
  const [options, setOptions] = useState<InvestmentOption[]>([]);

  const [newOption, setNewOption] = useState<Omit<InvestmentOption, 'id'>>({
    name: '',
    type: 'CDB',
    rateType: 'CDI',
    rateValue: 100,
  });

  const addOption = () => {
    if (!newOption.name.trim()) return;
    setOptions([
      ...options,
      { ...newOption, id: Date.now().toString() },
    ]);
    setNewOption({ name: '', type: 'CDB', rateType: 'CDI', rateValue: 100 });
  };

  const removeOption = (id: string) => {
    setOptions(options.filter(o => o.id !== id));
  };

  const effectiveDays = useMemo(() => {
    const now = new Date();
    if (periodMode === 'year') {
      const end = new Date(targetYear, 0, 1);
      return Math.max(differenceInDays(end, now), 1);
    }
    return differenceInDays(addMonths(now, periodMonths), now);
  }, [periodMode, periodMonths, targetYear]);

  const comparison = useMemo((): ComparisonResult[] => {
    const days = effectiveDays;
    
    const results = options.map(option => {
      const grossReturn = calculateGrossReturn(
        initialValue,
        option.rateType,
        option.rateValue,
        days,
        cdiRate,
        ipcaRate,
        undefined,
        undefined,
        selicRate
      );

      const grossReturnPercent = initialValue > 0 ? (grossReturn / initialValue) * 100 : 0;

      let irRate = 0;
      let irAmount = 0;

      if (isTaxableFixedIncome(option.type)) {
        irRate = getIRRate(days);
        irAmount = grossReturn * irRate;
      }

      const netReturn = grossReturn - irAmount;
      const netReturnPercent = initialValue > 0 ? (netReturn / initialValue) * 100 : 0;
      const finalValue = initialValue + netReturn;

      return {
        option,
        grossReturn,
        grossReturnPercent,
        netReturn,
        netReturnPercent,
        irAmount,
        irRate,
        finalValue,
        isWinner: false,
      };
    });

    // Find winner(s)
    if (results.length > 0) {
      const maxNetReturn = Math.max(...results.map(r => r.netReturn));
      results.forEach(r => {
        if (r.netReturn === maxNetReturn) {
          r.isWinner = true;
        }
      });
    }

    return results.sort((a, b) => b.netReturn - a.netReturn);
  }, [options, initialValue, effectiveDays, cdiRate, selicRate, ipcaRate]);

  const presetPeriods = [
    { label: '6 meses', value: 6 },
    { label: '1 ano', value: 12 },
    { label: '2 anos', value: 24 },
    { label: '3 anos', value: 36 },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Comparador de Taxas
          </CardTitle>
          <CardDescription>
            Compare diferentes investimentos para encontrar a melhor opção
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Config Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor a Investir (R$)</Label>
              <Input
                type="number"
                min="0"
                step="100"
                value={initialValue === 0 ? '' : initialValue}
                onChange={(e) => setInitialValue(e.target.value === '' ? 0 : parseFloat(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Período / Vencimento</Label>
              <div className="flex gap-2 flex-wrap">
                {presetPeriods.map(period => (
                  <Button
                    key={period.value}
                    variant={periodMode === 'months' && periodMonths === period.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setPeriodMode('months');
                      setPeriodMonths(period.value);
                    }}
                  >
                    {period.label}
                  </Button>
                ))}
                {COMPARE_YEARS.map(yr => (
                  <Button
                    key={yr}
                    variant={periodMode === 'year' && targetYear === yr ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setPeriodMode('year');
                      setTargetYear(yr);
                    }}
                  >
                    Até {yr}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Economic Rates */}
          <div className="flex flex-wrap gap-4 p-3 bg-muted/50 rounded-lg text-sm">
            <span>CDI: <strong>{cdiRate.toFixed(2)}%</strong> a.a.</span>
            <span>Selic: <strong>{selicRate.toFixed(2)}%</strong> a.a.</span>
            <span>IPCA: <strong>{ipcaRate.toFixed(2)}%</strong> a.a.</span>
            <span>IR ({effectiveDays}d): <strong>{(getIRRate(effectiveDays) * 100).toFixed(1)}%</strong></span>
          </div>

          {/* Add New Option */}
          <div className="border rounded-lg p-4 space-y-4">
            <p className="font-medium text-sm">Adicionar Investimento</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Input
                placeholder="Nome (ex: Tesouro 2034)"
                value={newOption.name}
                onChange={(e) => setNewOption({ ...newOption, name: e.target.value })}
              />
              <Select
                value={newOption.type}
                onValueChange={(v) => {
                  const nextType = v as InvestmentOption['type'];
                  setNewOption({
                    ...newOption,
                    type: nextType,
                    rateType: nextType === 'TESOURO' && newOption.rateType === 'CDI' ? 'PREFIXADO' : newOption.rateType,
                    rateValue: nextType === 'TESOURO' && newOption.rateType === 'CDI' ? 15.03 : newOption.rateValue,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CDB">CDB</SelectItem>
                  <SelectItem value="LCA">LCA</SelectItem>
                  <SelectItem value="TESOURO">Tesouro Direto</SelectItem>
                </SelectContent>
              </Select>
              <Select value={newOption.rateType} onValueChange={(v) => setNewOption({ ...newOption, rateType: v as InvestmentOption['rateType'] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CDI">% CDI</SelectItem>
                  <SelectItem value="SELIC">Selic +</SelectItem>
                  <SelectItem value="IPCA">IPCA +</SelectItem>
                  <SelectItem value="PREFIXADO">Prefixado</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="Taxa"
                value={newOption.rateValue === 0 && newOption.rateType !== 'SELIC' ? '' : newOption.rateValue}
                onChange={(e) => setNewOption({ ...newOption, rateValue: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
              />
              <Button onClick={addOption} disabled={!newOption.name.trim()}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Table */}
      {comparison.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Resultado da Comparação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>Investimento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Taxa</TableHead>
                  <TableHead className="text-right">Rend. Bruto</TableHead>
                  <TableHead className="text-right">IR</TableHead>
                  <TableHead className="text-right">Rend. Líquido</TableHead>
                  <TableHead className="text-right">Valor Final</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparison.map((result, index) => (
                  <TableRow key={result.option.id} className={result.isWinner ? 'bg-success/10' : ''}>
                    <TableCell>
                      {result.isWinner && (
                        <Trophy className="h-5 w-5 text-warning" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{result.option.name}</span>
                        {result.isWinner && (
                          <Badge variant="default" className="bg-success">
                            Melhor opção
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={result.option.type === 'CDB' ? 'default' : result.option.type === 'TESOURO' ? 'outline' : 'secondary'}
                        className={result.option.type === 'TESOURO' ? 'bg-[hsl(38,92%,50%)] text-white border-[hsl(38,92%,50%)]' : ''}
                      >
                        {result.option.type === 'TESOURO' ? 'Tesouro' : result.option.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {result.option.rateType === 'CDI' && `${result.option.rateValue}% CDI`}
                      {result.option.rateType === 'SELIC' && (result.option.rateValue === 0 ? '100% Selic' : `Selic + ${result.option.rateValue}%`)}
                      {result.option.rateType === 'IPCA' && `IPCA + ${result.option.rateValue}%`}
                      {result.option.rateType === 'PREFIXADO' && `${result.option.rateValue}% a.a.`}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(result.grossReturn)}
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {formatPercent(result.grossReturnPercent)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      {result.irAmount > 0 ? (
                        <>
                          -{formatCurrency(result.irAmount)}
                          <br />
                          <span className="text-xs text-muted-foreground">
                            {(result.irRate * 100).toFixed(1)}%
                          </span>
                        </>
                      ) : (
                        <span className="text-success">Isento</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-success">
                      {formatCurrency(result.netReturn)}
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {formatPercent(result.netReturnPercent)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(result.finalValue)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOption(result.option.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Insight Card */}
      {comparison.length >= 2 && comparison[0].isWinner && (
        <Card className="border-success bg-success/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-success/20">
                <Trophy className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="font-semibold text-success mb-1">
                  {comparison[0].option.name} é a melhor opção!
                </p>
                <p className="text-sm text-muted-foreground">
                  Com um rendimento líquido de {formatCurrency(comparison[0].netReturn)}, 
                  você ganha {formatCurrency(comparison[0].netReturn - comparison[1].netReturn)} a mais 
                  que a segunda melhor opção {periodMode === 'year' ? `até ${targetYear}` : `em ${periodMonths} meses`}.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
