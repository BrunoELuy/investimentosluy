import { useState } from 'react';
import {
  Check,
  TrendingUp,
  Landmark,
  Coins,
  Calendar,
  Percent,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useImportB3Movements } from '@/hooks/useB3';
import { formatCurrency, formatDate } from '@/utils/investmentCalculations';
import type { B3MovementsConsolidation, B3AggregatedFixedIncome } from '@/types/b3';
import type { Investment, RateType } from '@/types/investment';

interface B3MovementsPreviewProps {
  consolidation: B3MovementsConsolidation;
  existingInvestments?: Investment[]; // opcional agora
  fileName: string;
  onImportComplete?: () => void;
}

export function B3MovementsPreview({
  consolidation,
  existingInvestments = [], // valor padrão para evitar undefined
  fileName,
  onImportComplete,
}: B3MovementsPreviewProps) {
  const importMutation = useImportB3Movements();

  // Local state for editable fixed income fields (RateType, RateValue, EndDate, matching existing investment)
  const [fixedIncomeState, setFixedIncomeState] = useState<B3AggregatedFixedIncome[]>(() =>
    consolidation.fixedIncome.map(fi => {
      // Check if matches an existing investment
      const match = (existingInvestments ?? []).find(
        inv =>
          inv.type === fi.type &&
          inv.institution.toLowerCase().includes(fi.institution.toLowerCase())
      );
      return {
        ...fi,
        rateType: (match?.rate_type as RateType) || fi.rateType || 'CDI',
        rateValue: match?.rate_value !== undefined ? match.rate_value : fi.rateValue || 100,
        endDate: match?.end_date || fi.endDate,
        existingInvestmentId: match?.id,
      };
    })
  );

  const activeFixedIncome = fixedIncomeState.filter(fi => !fi.isZeroBalance);
  const zeroFixedIncome = fixedIncomeState.filter(fi => fi.isZeroBalance);

  const activeStocks = consolidation.stocks.filter(s => !s.isZeroBalance);
  const zeroStocks = consolidation.stocks.filter(s => s.isZeroBalance);

  const handleRateTypeChange = (key: string, rateType: RateType) => {
    setFixedIncomeState(prev =>
      prev.map(fi => {
        if (fi.key !== key) return fi;
        let defaultRate = fi.rateValue;
        if (rateType === 'CDI' && defaultRate <= 0) defaultRate = 100;
        if (rateType === 'PREFIXADO' && defaultRate <= 0) defaultRate = 12;
        if (rateType === 'IPCA' && defaultRate <= 0) defaultRate = 6;
        return { ...fi, rateType, rateValue: defaultRate };
      })
    );
  };

  const handleRateValueChange = (key: string, rateValue: number) => {
    setFixedIncomeState(prev =>
      prev.map(fi => (fi.key === key ? { ...fi, rateValue } : fi))
    );
  };

  const handleEndDateChange = (key: string, endDate: string) => {
    setFixedIncomeState(prev =>
      prev.map(fi => (fi.key === key ? { ...fi, endDate } : fi))
    );
  };

  const handleExistingLinkChange = (key: string, investmentId: string) => {
    setFixedIncomeState(prev =>
      prev.map(fi => {
        if (fi.key !== key) return fi;
        if (investmentId === 'none') {
          return { ...fi, existingInvestmentId: undefined };
        }
        const found = existingInvestments.find(inv => inv.id === investmentId);
        return {
          ...fi,
          existingInvestmentId: investmentId,
          rateType: found?.rate_type || fi.rateType,
          rateValue: found?.rate_value !== undefined ? found.rate_value : fi.rateValue,
          endDate: found?.end_date || fi.endDate,
        };
      })
    );
  };

  const handleConfirmImport = async () => {
    await importMutation.mutateAsync({
      stocks: consolidation.stocks,
      fixedIncome: fixedIncomeState,
      dividends: consolidation.dividends,
      existingInvestments,
      fileName,
    });
    if (onImportComplete) {
      onImportComplete();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Overview Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Extrato de Movimentação B3 Processado
              </CardTitle>
              <CardDescription>
                Todas as {consolidation.summary.totalOperations} operações foram consolidadas cronologicamente.
              </CardDescription>
            </div>
            <Badge variant="outline" className="w-fit text-sm py-1 px-3 bg-background">
              Arquivo: {fileName}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div className="p-3 bg-card border rounded-lg">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Landmark className="h-3.5 w-3.5 text-blue-500" />
                Renda Fixa Líquida
              </p>
              <p className="text-lg font-bold mt-1 text-blue-600 dark:text-blue-400">
                {formatCurrency(consolidation.summary.totalInvestedFixedIncome)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeFixedIncome.length} ativos ativos {zeroFixedIncome.length > 0 && `(${zeroFixedIncome.length} zerados)`}
              </p>
            </div>

            <div className="p-3 bg-card border rounded-lg">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                Ações em Carteira
              </p>
              <p className="text-lg font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                {formatCurrency(consolidation.summary.totalInvestedStocks)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeStocks.length} ações {zeroStocks.length > 0 && `(${zeroStocks.length} zeradas)`}
              </p>
            </div>

            <div className="p-3 bg-card border rounded-lg">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Coins className="h-3.5 w-3.5 text-amber-500" />
                Dividendos & JCP
              </p>
              <p className="text-lg font-bold mt-1 text-amber-600 dark:text-amber-400">
                {formatCurrency(consolidation.summary.totalDividends)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {consolidation.dividends.length} proventos capturados
              </p>
            </div>

            <div className="p-3 bg-card border rounded-lg">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                Posições Zeradas
              </p>
              <p className="text-lg font-bold mt-1">
                {consolidation.zeroPositionsCount} descartadas
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Proventos preservados
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs for Review */}
      <Tabs defaultValue="fixedIncome" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="fixedIncome" className="flex items-center gap-2">
            <Landmark className="h-4 w-4" />
            <span>Renda Fixa ({activeFixedIncome.length})</span>
          </TabsTrigger>
          <TabsTrigger value="stocks" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span>Ações ({activeStocks.length})</span>
          </TabsTrigger>
          <TabsTrigger value="dividends" className="flex items-center gap-2">
            <Coins className="h-4 w-4" />
            <span>Proventos ({consolidation.dividends.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: FIXED INCOME */}
        <TabsContent value="fixedIncome" className="space-y-4">
          <Alert className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <HelpCircle className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-900 dark:text-blue-300 font-semibold">
              Definição Prática de Taxas e Vencimentos
            </AlertTitle>
            <AlertDescription className="text-blue-800 dark:text-blue-400 text-xs sm:text-sm">
              O extrato da B3 consolidou todas as aplicações e resgates por banco. Pré-configuramos <strong>100% do CDI</strong> e vencimento em 2 anos. Você pode ajustar a taxa e data abaixo se desejar antes de salvar.
            </AlertDescription>
          </Alert>

          {activeFixedIncome.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              Nenhuma posição de CDB ou LCA com saldo em aberto encontrada no extrato.
            </Card>
          ) : (
            <div className="space-y-4">
              {activeFixedIncome.map(fi => {
                const existingMatches = (existingInvestments ?? []).filter(
                  inv => inv.type === fi.type
                );

                return (
                  <Card key={fi.key} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-blue-600 text-white">{fi.type}</Badge>
                            <CardTitle className="text-base sm:text-lg">{fi.institution}</CardTitle>
                          </div>
                          <CardDescription className="mt-1">
                            Início em {formatDate(fi.startDate)} · {fi.operationsCount} movimentações consolidadas
                          </CardDescription>
                        </div>

                        <div className="text-right sm:text-right">
                          <p className="text-xs text-muted-foreground">Saldo Líquido Aplicado</p>
                          <p className="text-xl font-bold text-primary">{formatCurrency(fi.netInvested)}</p>
                          {fi.totalRedeemed > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(fi.totalApplied)} aplicados · {formatCurrency(fi.totalRedeemed)} resgatados
                            </p>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-2 border-t">
                      {/* Configuration Controls */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs flex items-center gap-1">
                            <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                            Tipo de Rendimento
                          </Label>
                          <Select
                            value={fi.rateType}
                            onValueChange={(val: RateType) => handleRateTypeChange(fi.key, val)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CDI">% do CDI</SelectItem>
                              <SelectItem value="PREFIXADO">Prefixado (a.a.)</SelectItem>
                              <SelectItem value="IPCA">IPCA + %</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs">
                            {fi.rateType === 'CDI'
                              ? 'Taxa (% do CDI)'
                              : fi.rateType === 'PREFIXADO'
                                ? 'Taxa Anual (% a.a.)'
                                : 'Taxa Adicional ao IPCA (%)'}
                          </Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={fi.rateValue}
                            onChange={e => handleRateValueChange(fi.key, parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            Data de Vencimento
                          </Label>
                          <Input
                            type="date"
                            value={fi.endDate}
                            onChange={e => handleEndDateChange(fi.key, e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Linking with existing investment */}
                      {existingMatches.length > 0 && (
                        <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1.5 border">
                          <p className="font-medium text-foreground">
                            Vincular a um investimento já existente no app:
                          </p>
                          <Select
                            value={fi.existingInvestmentId || 'none'}
                            onValueChange={val => handleExistingLinkChange(fi.key, val)}
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Criar como novo investimento" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Criar como novo investimento ({fi.name})</SelectItem>
                              {existingMatches.map(inv => (
                                <SelectItem key={inv.id} value={inv.id}>
                                  Somar ao existente: {inv.name} ({inv.institution} · {formatCurrency(inv.initial_value)})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Deposits Breakdown if multiple applications */}
                      {fi.deposits.length > 0 && (
                        <div className="text-xs space-y-1 text-muted-foreground bg-muted/20 p-2.5 rounded">
                          <p className="font-medium text-foreground">
                            Aportes Adicionais detectados na planilha ({fi.deposits.length}):
                          </p>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {fi.deposits.map((dep, idx) => (
                              <Badge key={idx} variant="secondary" className="font-normal">
                                {formatDate(dep.deposit_date)}: +{formatCurrency(dep.amount)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Zero balance items info */}
          {zeroFixedIncome.length > 0 && (
            <div className="mt-4 p-3 bg-muted/50 border rounded-lg text-xs text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-muted-foreground" />
                {zeroFixedIncome.length} CDB(s)/LCA(s) totalmente resgatados (0 a 0) foram identificados e não serão adicionados como investimentos ativos.
              </span>
              <Badge variant="outline">Saldo R$ 0,00</Badge>
            </div>
          )}
        </TabsContent>

        {/* TAB 2: STOCKS */}
        <TabsContent value="stocks" className="space-y-4">
          {activeStocks.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              Nenhuma ação com saldo em carteira encontrada.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeStocks.map(stock => {
                const existing = existingInvestments.find(
                  inv => inv.type === 'ACAO' && inv.ticker?.toUpperCase() === stock.ticker.toUpperCase()
                );

                return (
                  <Card key={stock.ticker} className="border-l-4 border-l-emerald-500">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-emerald-600 text-white font-mono text-sm">
                              {stock.ticker}
                            </Badge>
                            {existing && (
                              <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">
                                Já cadastrada (será atualizada)
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {stock.productName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Quantidade Líquida</p>
                          <p className="text-lg font-bold">{stock.totalQuantity.toLocaleString('pt-BR')}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm pt-2 border-t">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-muted/40 rounded">
                          <span className="text-muted-foreground">Preço Médio Ponderado:</span>
                          <p className="font-bold text-sm text-foreground mt-0.5">
                            {formatCurrency(stock.averagePrice)}
                          </p>
                        </div>
                        <div className="p-2 bg-muted/40 rounded">
                          <span className="text-muted-foreground">Total Investido Líquido:</span>
                          <p className="font-bold text-sm text-foreground mt-0.5">
                            {formatCurrency(stock.totalInvested)}
                          </p>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground flex justify-between pt-1">
                        <span>Operações: {stock.operationsCount} ({stock.totalBoughtQty} compradas{stock.totalSoldQty > 0 ? `, ${stock.totalSoldQty} vendidas` : ''})</span>
                        <span>Corretora: {stock.institution}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Zero balance stocks info */}
          {zeroStocks.length > 0 && (
            <div className="p-3 bg-muted/50 border rounded-lg text-xs space-y-1.5 text-muted-foreground">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <XCircle className="h-4 w-4 text-amber-500" />
                {zeroStocks.length} ação(ões) com posição zerada (compradas e vendidas na totalidade):
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {zeroStocks.map(zs => (
                  <Badge key={zs.ticker} variant="outline" className="text-muted-foreground bg-background">
                    {zs.ticker} ({zs.totalBoughtQty} compradas / {zs.totalSoldQty} vendidas = 0)
                  </Badge>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                * Conforme sua regra, essas ações não serão adicionadas à carteira, mas todos os dividendos/JCPs que elas geraram foram capturados e serão exibidos.
              </p>
            </div>
          )}
        </TabsContent>

        {/* TAB 3: DIVIDENDS */}
        <TabsContent value="dividends" className="space-y-4">
          <Alert className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
            <Coins className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-900 dark:text-amber-300 font-semibold">
              Proventos & JCPs Capturados ({consolidation.dividends.length})
            </AlertTitle>
            <AlertDescription className="text-amber-800 dark:text-amber-400 text-xs sm:text-sm">
              Total de <strong>{formatCurrency(consolidation.summary.totalDividends)}</strong> em dividendos, JCP e rendimentos identificados no extrato. Todos serão salvos e contabilizados nos gráficos.
            </AlertDescription>
          </Alert>

          {consolidation.dividends.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              Nenhum pagamento de dividendos ou JCP encontrado no extrato.
            </Card>
          ) : (
            <div className="rounded-md border overflow-x-auto bg-card">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-muted-foreground text-left">
                    <th className="p-3">Data</th>
                    <th className="p-3">Ativo</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3 text-right">Qtd Base</th>
                    <th className="p-3 text-right">Valor Unitário</th>
                    <th className="p-3 text-right">Valor Total</th>
                  </tr>
                </thead>
                <tbody>
                  {consolidation.dividends.map((div, idx) => (
                    <tr key={div.id || idx} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-3 font-mono">{formatDate(div.date)}</td>
                      <td className="p-3">
                        <div className="font-semibold text-foreground">{div.ticker}</div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                          {div.institution}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300">
                          {div.typeLabel}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-mono">{div.quantity > 0 ? div.quantity.toLocaleString('pt-BR') : '—'}</td>
                      <td className="p-3 text-right font-mono">{div.unitPrice > 0 ? formatCurrency(div.unitPrice) : '—'}</td>
                      <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {formatCurrency(div.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirmation Bottom Footer */}
      <Card className="border-2 border-primary/40 shadow-lg">
        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4">
          <div className="text-sm">
            <p className="font-bold text-foreground">Pronto para importar?</p>
            <p className="text-xs text-muted-foreground">
              Serão salvos {activeFixedIncome.length} ativos de Renda Fixa, {activeStocks.length} posições em Ações e {consolidation.dividends.length} proventos.
            </p>
          </div>
          <Button
            size="lg"
            className="w-full sm:w-auto font-bold px-8 shadow-md"
            onClick={handleConfirmImport}
            disabled={importMutation.isPending}
          >
            {importMutation.isPending ? (
              'Processando importação...'
            ) : (
              <>
                <Check className="h-5 w-5 mr-2" />
                Confirmar e Salvar Tudo
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}