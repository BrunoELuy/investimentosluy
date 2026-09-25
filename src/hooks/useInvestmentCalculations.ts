import { useMemo } from 'react';
import { useInvestments } from '@/hooks/useInvestments';
import { useEconomicRates } from '@/hooks/useEconomicRates';
import { useAllDeposits } from '@/hooks/useDeposits';
import { useStockQuotes } from '@/hooks/useStockQuotes';
import { calculateInvestment } from '@/utils/investmentCalculations';
import type { DashboardSummary } from '@/types/investment';

export function useInvestmentCalculations() {
  const { data: investments, isLoading } = useInvestments();
  const { data: rates } = useEconomicRates();
  const cdiRate = rates?.cdi ?? 14.9;
  const ipcaRate = rates?.ipca ?? 4.5;

  const investmentIds = useMemo(
    () => (investments || []).map(inv => inv.id),
    [investments]
  );
  const { data: depositsByInvestment = {} } = useAllDeposits(investmentIds);

  const stockTickers = useMemo(
    () =>
      (investments || [])
        .filter(inv => inv.type === 'ACAO' && inv.ticker)
        .map(inv => inv.ticker!),
    [investments]
  );
  const { quotes: stockQuotes } = useStockQuotes(stockTickers);

  const calculations = useMemo(
    () =>
      (investments || []).map(inv =>
        calculateInvestment(inv, cdiRate, ipcaRate, depositsByInvestment[inv.id] || [])
      ),
    [investments, depositsByInvestment, cdiRate, ipcaRate]
  );

  const summary: DashboardSummary = useMemo(() => {
    const activeCalcs = calculations.filter(c => c.investment.is_active);
    const totalInvested = activeCalcs.reduce((s, c) => s + c.totalInvested, 0);
    const totalGrossReturn = activeCalcs.reduce((s, c) => s + c.grossReturn, 0);
    const totalNetReturn = activeCalcs.reduce((s, c) => s + c.netReturn, 0);

    return {
      totalInvested,
      totalGrossReturn,
      totalNetReturn,
      totalGrossPercent: totalInvested > 0 ? (totalGrossReturn / totalInvested) * 100 : 0,
      totalNetPercent: totalInvested > 0 ? (totalNetReturn / totalInvested) * 100 : 0,
      cdbCount: calculations.filter(c => c.investment.type === 'CDB').length,
      lcaCount: calculations.filter(c => c.investment.type === 'LCA').length,
      stockCount: calculations.filter(c => c.investment.type === 'ACAO').length,
      activeCount: activeCalcs.length,
      maturedCount: calculations.filter(c => c.isMatured).length,
      verifiedCount: calculations.filter(c => !!c.investment.last_verified_at).length,
    };
  }, [calculations]);

  return {
    investments: investments || [],
    calculations,
    summary,
    stockQuotes,
    cdiRate,
    ipcaRate,
    isLoading,
  };
}