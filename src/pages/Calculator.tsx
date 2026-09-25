import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InvestmentSimulator } from '@/components/simulator/InvestmentSimulator';
import { RateComparator } from '@/components/comparator/RateComparator';

export default function Calculator() {
  return (
    <Tabs defaultValue="simulator" className="space-y-4">
      <TabsList>
        <TabsTrigger value="simulator">Simulador</TabsTrigger>
        <TabsTrigger value="comparator">Comparador de Taxas</TabsTrigger>
      </TabsList>
      <TabsContent value="simulator">
        <InvestmentSimulator />
      </TabsContent>
      <TabsContent value="comparator">
        <RateComparator />
      </TabsContent>
    </Tabs>
  );
}