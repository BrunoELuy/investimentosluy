import { ReportExporter } from '@/components/reports/ReportExporter';
import { useInvestmentCalculations } from '@/hooks/useInvestmentCalculations';

export default function Reports() {
  const { calculations, isLoading } = useInvestmentCalculations();

  if (isLoading) {
    return (
      <div className="animate-pulse py-12 text-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return <ReportExporter calculations={calculations} />;
}