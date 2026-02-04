import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calculator, BarChart3, LogOut, TrendingUp, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DashboardSummary } from '@/components/dashboard/DashboardSummary';
import { InvestmentCard } from '@/components/investments/InvestmentCard';
import { InvestmentForm } from '@/components/investments/InvestmentForm';
import { InvestmentDetails } from '@/components/investments/InvestmentDetails';
import { PortfolioCharts } from '@/components/charts/PortfolioCharts';
import { ReportExporter } from '@/components/reports/ReportExporter';
import { GoalsTab } from '@/components/goals/GoalsTab';
import { OnlineStatusIndicator } from '@/components/OnlineStatusIndicator';
import { useAuth } from '@/hooks/useAuth';
import { useInvestments, useCreateInvestment, useDeleteInvestment, useUpdateInvestment } from '@/hooks/useInvestments';
import { useAllDeposits } from '@/hooks/useDeposits';
import { calculateInvestment } from '@/utils/investmentCalculations';
import type { Investment, InvestmentCalculation, DashboardSummary as DashboardSummaryType, InvestmentFormData } from '@/types/investment';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { data: investments, isLoading: investmentsLoading } = useInvestments();
  const createInvestment = useCreateInvestment();
  const updateInvestment = useUpdateInvestment();
  const deleteInvestment = useDeleteInvestment();
  
  // Load all deposits for all investments
  const investmentIds = useMemo(() => (investments || []).map(inv => inv.id), [investments]);
  const { data: depositsByInvestment = {} } = useAllDeposits(investmentIds);
  
  const [selectedCalculation, setSelectedCalculation] = useState<InvestmentCalculation | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);

  // Redirect to auth if not logged in - use useEffect to avoid breaking hooks
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  if (authLoading || investmentsLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-center">
          <TrendingUp className="mx-auto h-12 w-12 text-primary mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  const calculations: InvestmentCalculation[] = (investments || []).map(inv => 
    calculateInvestment(inv, 10.65, 4.5, depositsByInvestment[inv.id] || [])
  );

  // Compute dashboard summary
  const summary: DashboardSummaryType = calculations.reduce(
    (acc, calc) => ({
      totalInvested: acc.totalInvested + calc.totalInvested,
      totalGrossReturn: acc.totalGrossReturn + calc.grossReturn,
      totalNetReturn: acc.totalNetReturn + calc.netReturn,
      totalGrossPercent: 0, // will calculate below
      totalNetPercent: 0,
      cdbCount: acc.cdbCount + (calc.investment.type === 'CDB' ? 1 : 0),
      lcaCount: acc.lcaCount + (calc.investment.type === 'LCA' ? 1 : 0),
      stockCount: acc.stockCount + (calc.investment.type === 'ACAO' ? 1 : 0),
      activeCount: acc.activeCount + (!calc.isMatured ? 1 : 0),
      maturedCount: acc.maturedCount + (calc.isMatured ? 1 : 0),
    }),
    {
      totalInvested: 0,
      totalGrossReturn: 0,
      totalNetReturn: 0,
      totalGrossPercent: 0,
      totalNetPercent: 0,
      cdbCount: 0,
      lcaCount: 0,
      stockCount: 0,
      activeCount: 0,
      maturedCount: 0,
    }
  );

  // Calculate percentages
  if (summary.totalInvested > 0) {
    summary.totalGrossPercent = (summary.totalGrossReturn / summary.totalInvested) * 100;
    summary.totalNetPercent = (summary.totalNetReturn / summary.totalInvested) * 100;
  }

  const handleInvestmentClick = (calc: InvestmentCalculation) => {
    setSelectedCalculation(calc);
    setIsDetailsOpen(true);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleCreateInvestment = async (data: InvestmentFormData) => {
    await createInvestment.mutateAsync(data);
    setIsFormOpen(false);
    setEditingInvestment(null);
  };

  const handleUpdateInvestment = async (data: InvestmentFormData) => {
    if (editingInvestment) {
      await updateInvestment.mutateAsync({ id: editingInvestment.id, ...data });
      setIsFormOpen(false);
      setEditingInvestment(null);
      setIsDetailsOpen(false);
    }
  };

  const handleDeleteInvestment = async () => {
    if (selectedCalculation) {
      await deleteInvestment.mutateAsync(selectedCalculation.investment.id);
      setIsDetailsOpen(false);
      setSelectedCalculation(null);
    }
  };

  const handleEdit = () => {
    if (selectedCalculation) {
      setEditingInvestment(selectedCalculation.investment);
      setIsDetailsOpen(false);
      setIsFormOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden w-full max-w-full">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 min-w-0">
            <TrendingUp className="h-5 w-5 text-primary flex-shrink-0" />
            <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent truncate">
              InvestTracker
            </h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <OnlineStatusIndicator />
            <Button variant="outline" size="sm" onClick={() => navigate('/simulator')} className="hidden sm:flex">
              <Calculator className="h-4 w-4 mr-2" />
              Simulador
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigate('/simulator')} className="sm:hidden">
              <Calculator className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/comparator')} className="hidden sm:flex">
              <BarChart3 className="h-4 w-4 mr-2" />
              Comparador
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigate('/comparator')} className="sm:hidden">
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-4 sm:py-6 space-y-4 sm:space-y-6 px-4 overflow-x-hidden">
        {/* Dashboard Summary */}
        <DashboardSummary summary={summary} />

        {/* Main Content Tabs */}
        <Tabs defaultValue="investments" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
            <TabsList className="w-full sm:w-auto overflow-x-auto flex-shrink-0">
              <TabsTrigger value="investments" className="text-xs sm:text-sm">Investimentos</TabsTrigger>
              <TabsTrigger value="goals" className="gap-1 text-xs sm:text-sm">
                <Target className="h-3 w-3 sm:h-4 sm:w-4" />
                Objetivos
              </TabsTrigger>
              <TabsTrigger value="charts" className="text-xs sm:text-sm">Gráficos</TabsTrigger>
              <TabsTrigger value="reports" className="text-xs sm:text-sm">Relatórios</TabsTrigger>
            </TabsList>

            <Dialog open={isFormOpen} onOpenChange={(open) => {
              setIsFormOpen(open);
              if (!open) setEditingInvestment(null);
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Investimento
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingInvestment ? 'Editar Investimento' : 'Adicionar Investimento'}
                  </DialogTitle>
                </DialogHeader>
                <InvestmentForm 
                  investment={editingInvestment || undefined}
                  onSubmit={editingInvestment ? handleUpdateInvestment : handleCreateInvestment}
                  onCancel={() => {
                    setIsFormOpen(false);
                    setEditingInvestment(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          <TabsContent value="investments" className="space-y-4">
            {calculations.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum investimento cadastrado</h3>
                <p className="text-muted-foreground mb-4">
                  Comece adicionando seu primeiro investimento para acompanhar seus rendimentos.
                </p>
                <Button onClick={() => setIsFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Investimento
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {calculations.map(calc => (
                  <InvestmentCard
                    key={calc.investment.id}
                    calculation={calc}
                    onClick={() => handleInvestmentClick(calc)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="goals">
            <GoalsTab totalInvested={summary.totalInvested} currentCdiRate={10.65} />
          </TabsContent>

          <TabsContent value="charts">
            <PortfolioCharts calculations={calculations} />
          </TabsContent>

          <TabsContent value="reports">
            <ReportExporter calculations={calculations} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Investment Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedCalculation && (
            <InvestmentDetails
              calculation={selectedCalculation}
              onBack={() => setIsDetailsOpen(false)}
              onEdit={handleEdit}
              onDelete={handleDeleteInvestment}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
