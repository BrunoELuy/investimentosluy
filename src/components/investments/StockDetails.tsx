import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  TrendingUp,
  TrendingDown,
  Calendar,
  Building2,
  Hash,
  DollarSign,
  Coins,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { InvestmentCalculation } from '@/types/investment';
import { formatCurrency } from '@/utils/investmentCalculations';
import { useStockQuotes } from '@/hooks/useStockQuotes';

interface StockDetailsProps {
  calculation: InvestmentCalculation;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}

export function StockDetails({ calculation, onBack, onEdit, onDelete }: StockDetailsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { investment } = calculation;
  
  const tickers = investment.ticker ? [investment.ticker] : [];
  const { quotes, isLoading: quotesLoading, lastUpdated, refetch } = useStockQuotes(tickers);
  const quote = investment.ticker ? quotes[investment.ticker] : undefined;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  const averagePrice = investment.quantity 
    ? investment.initial_value / investment.quantity 
    : 0;

  const currentMarketValue = quote && investment.quantity 
    ? quote.price * investment.quantity 
    : null;
  
  const totalGainLoss = currentMarketValue !== null 
    ? currentMarketValue - investment.initial_value 
    : null;
  
  const totalGainLossPercent = totalGainLoss !== null && investment.initial_value > 0
    ? (totalGainLoss / investment.initial_value) * 100
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onEdit} className="gap-2">
            <Edit className="h-4 w-4" />
            Editar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir a ação "{investment.name}"? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? 'Excluindo...' : 'Excluir'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Header Card - Purple theme for stocks */}
      <Card className="border-l-4 border-l-[hsl(280,70%,50%)] bg-gradient-to-br from-[hsl(280,70%,50%)]/5 to-transparent">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="text-sm bg-[hsl(280,70%,50%)] hover:bg-[hsl(280,70%,45%)]">
                  Ação
                </Badge>
                {investment.ticker && (
                  <Badge variant="outline" className="text-[hsl(280,70%,50%)] border-[hsl(280,70%,50%)]">
                    {investment.ticker}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-2xl">{investment.name}</CardTitle>
              <div className="flex items-center gap-1 text-muted-foreground mt-1">
                <Building2 className="h-4 w-4" />
                {investment.institution}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Valor Investido</p>
              <p className="text-3xl font-bold text-[hsl(280,70%,50%)]">
                {formatCurrency(investment.initial_value)}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Comprado em {format(new Date(investment.start_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Quote Card */}
      {investment.ticker && (
        <Card className="border-[hsl(280,70%,50%)]/30 bg-gradient-to-r from-[hsl(280,70%,50%)]/10 to-transparent">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                📈 Cotação em Tempo Real
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refetch} 
                disabled={quotesLoading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${quotesLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {quote ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Preço Atual</p>
                    <p className="text-2xl font-bold">{formatCurrency(quote.price)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Variação do Dia</p>
                    <div className="flex items-center gap-1">
                      {quote.changePercent >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-success" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      )}
                      <p className={`text-2xl font-bold ${quote.changePercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {quote.changePercent >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
                      </p>
                    </div>
                    <p className={`text-xs ${quote.change >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {quote.change >= 0 ? '+' : ''}{formatCurrency(quote.change)}
                    </p>
                  </div>
                  {currentMarketValue !== null && (
                    <div>
                      <p className="text-xs text-muted-foreground">Valor de Mercado</p>
                      <p className="text-2xl font-bold text-[hsl(280,70%,50%)]">
                        {formatCurrency(currentMarketValue)}
                      </p>
                    </div>
                  )}
                  {totalGainLoss !== null && (
                    <div>
                      <p className="text-xs text-muted-foreground">Ganho/Perda Total</p>
                      <div className="flex items-center gap-1">
                        {totalGainLoss >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-success" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-destructive" />
                        )}
                        <p className={`text-2xl font-bold ${totalGainLoss >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {totalGainLoss >= 0 ? '+' : ''}{formatCurrency(totalGainLoss)}
                        </p>
                      </div>
                      {totalGainLossPercent !== null && (
                        <p className={`text-xs ${totalGainLoss >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {totalGainLossPercent >= 0 ? '+' : ''}{totalGainLossPercent.toFixed(2)}%
                        </p>
                      )}
                    </div>
                  )}
                </div>
                {lastUpdated && (
                  <p className="text-xs text-muted-foreground text-right">
                    Atualizado às {format(lastUpdated, 'HH:mm:ss', { locale: ptBR })} • Auto-refresh a cada 3 min
                  </p>
                )}
              </div>
            ) : quotesLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Carregando cotação...</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Não foi possível carregar a cotação. Tente atualizar.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="border-[hsl(280,70%,50%)]/20 bg-[hsl(280,70%,50%)]/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Hash className="h-4 w-4 text-[hsl(280,70%,50%)]" />
              <span className="text-sm">Quantidade</span>
            </div>
            <p className="text-2xl font-bold text-[hsl(280,70%,50%)]">
              {investment.quantity || 0}
            </p>
            <p className="text-xs text-muted-foreground">papéis</p>
          </CardContent>
        </Card>
        
        <Card className="border-[hsl(280,70%,50%)]/20 bg-[hsl(280,70%,50%)]/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Coins className="h-4 w-4 text-[hsl(280,70%,50%)]" />
              <span className="text-sm">Preço Médio</span>
            </div>
            <p className="text-2xl font-bold text-[hsl(280,70%,50%)]">
              {formatCurrency(averagePrice)}
            </p>
            <p className="text-xs text-muted-foreground">por ação</p>
          </CardContent>
        </Card>
        
        <Card className="border-[hsl(280,70%,50%)]/20 bg-[hsl(280,70%,50%)]/5 col-span-2 md:col-span-1">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <DollarSign className="h-4 w-4 text-[hsl(280,70%,50%)]" />
              <span className="text-sm">Total Investido</span>
            </div>
            <p className="text-2xl font-bold text-[hsl(280,70%,50%)]">
              {formatCurrency(investment.initial_value)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stock Info Card */}
      <Card className="border-[hsl(280,70%,50%)]/30 bg-[hsl(280,70%,50%)]/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-[hsl(280,70%,50%)]/20">
              <TrendingUp className="h-6 w-6 text-[hsl(280,70%,50%)]" />
            </div>
            <div>
              <p className="font-semibold text-[hsl(280,70%,50%)]">Renda Variável</p>
              <p className="text-sm text-muted-foreground">
                Ações são investimentos de renda variável. O valor de mercado pode oscilar diariamente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ticker Info */}
      {investment.ticker && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[hsl(280,70%,50%)]">
              <Hash className="h-5 w-5" />
              Informações do Ativo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Código (Ticker)</p>
                <p className="text-xl font-bold text-[hsl(280,70%,50%)]">{investment.ticker}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Corretora</p>
                <p className="text-xl font-semibold">{investment.institution}</p>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-[hsl(280,70%,50%)]">{investment.quantity || 0}</p>
                <p className="text-xs text-muted-foreground">Papéis</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[hsl(280,70%,50%)]">{formatCurrency(averagePrice)}</p>
                <p className="text-xs text-muted-foreground">Preço Médio</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[hsl(280,70%,50%)]">{formatCurrency(investment.initial_value)}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {investment.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{investment.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
