import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  BarChart3,
  Target,
  Calculator,
  FileSpreadsheet,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DashboardSummary } from '@/components/dashboard/DashboardSummary';
import { useInvestmentCalculations } from '@/hooks/useInvestmentCalculations';
import { formatCurrency } from '@/utils/investmentCalculations';

const SHORTCUTS = [
  { title: 'Investimentos', url: '/investments', icon: TrendingUp, description: 'Ver todos os ativos' },
  { title: 'Gráficos', url: '/charts', icon: BarChart3, description: 'Análise visual da carteira' },
  { title: 'Objetivos', url: '/goals', icon: Target, description: 'Metas financeiras' },
  { title: 'Calculador', url: '/calculator', icon: Calculator, description: 'Simulador e comparador' },
  { title: 'Importar B3', url: '/import-b3', icon: FileSpreadsheet, description: 'Extratos da B3' },
];

const Index = () => {
  const navigate = useNavigate();
  const { summary, calculations, isLoading } = useInvestmentCalculations();

  const recentInvestments = useMemo(
    () =>
      [...calculations]
        .sort(
          (a, b) =>
            new Date(b.investment.start_date).getTime() -
            new Date(a.investment.start_date).getTime()
        )
        .slice(0, 5),
    [calculations]
  );

  if (isLoading) {
    return (
      <div className="animate-pulse py-12 text-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardSummary summary={summary} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SHORTCUTS.map(s => (
          <Card
            key={s.url}
            className="cursor-pointer transition-colors hover:border-primary"
            onClick={() => navigate(s.url)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <s.icon className="h-4 w-4 text-primary" />
                {s.title}
              </CardTitle>
              <CardDescription>{s.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      {recentInvestments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Investimentos Recentes</CardTitle>
            <CardDescription>Últimos ativos adicionados à sua carteira</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentInvestments.map(calc => (
              <div
                key={calc.investment.id}
                className="flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/40"
                onClick={() => navigate(`/investments/${calc.investment.id}`)}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{calc.investment.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {calc.investment.institution}
                  </p>
                </div>
                <p className="text-sm font-semibold">
                  {formatCurrency(calc.currentNetValue)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Index;