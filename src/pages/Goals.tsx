import { GoalsTab } from '@/components/goals/GoalsTab';
import { useInvestmentCalculations } from '@/hooks/useInvestmentCalculations';

export default function Goals() {
  const { summary } = useInvestmentCalculations();
  return <GoalsTab totalInvested={summary.totalInvested} currentCdiRate={10.65} />;
}