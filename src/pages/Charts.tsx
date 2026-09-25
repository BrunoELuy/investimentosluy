import { PortfolioCharts } from '@/components/charts/PortfolioCharts';
import { useInvestmentCalculations } from '@/hooks/useInvestmentCalculations';

export default function Charts() {
  const { calculations, cdiRate, ipcaRate, isLoading } =
    useInvestmentCalculations();

  if (isLoading) {
    return (
      <div className="animate-pulse py-12 text-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return (
    <PortfolioCharts
      calculations={calculations}
      cdiRate={cdiRate}
      ipcaRate={ipcaRate}
    />
  );
}