import { useState } from 'react';
import { Plus, TrendingUp, PieChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { StockForm } from './StockForm';
import { StockCard } from './StockCard';
import { useStocks, useCreateStock, useUpdateStock, useDeleteStock } from '@/hooks/useStocks';
import type { StockInvestment, StockFormData } from '@/types/stock';

interface StocksTabProps {
  totalFixedIncome: number;
}

export function StocksTab({ totalFixedIncome }: StocksTabProps) {
  const { data: stocks = [], isLoading } = useStocks();
  const createStock = useCreateStock();
  const updateStock = useUpdateStock();
  const deleteStock = useDeleteStock();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<StockInvestment | null>(null);

  const totalStocks = stocks.reduce((sum, stock) => sum + stock.amount, 0);
  const totalCapital = totalFixedIncome + totalStocks;
  const stocksPercentage = totalCapital > 0 ? (totalStocks / totalCapital) * 100 : 0;
  const fixedIncomePercentage = totalCapital > 0 ? (totalFixedIncome / totalCapital) * 100 : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleCreate = async (data: StockFormData) => {
    await createStock.mutateAsync(data);
    setIsFormOpen(false);
  };

  const handleUpdate = async (data: StockFormData) => {
    if (editingStock) {
      await updateStock.mutateAsync({ id: editingStock.id, ...data });
      setEditingStock(null);
      setIsFormOpen(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteStock.mutateAsync(id);
  };

  const handleEdit = (stock: StockInvestment) => {
    setEditingStock(stock);
    setIsFormOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total em Ações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalStocks)}</p>
            <p className="text-sm text-muted-foreground">
              {stocksPercentage.toFixed(1)}% do capital total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Renda Fixa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalFixedIncome)}</p>
            <p className="text-sm text-muted-foreground">
              {fixedIncomePercentage.toFixed(1)}% do capital total
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Capital Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalCapital)}</p>
            <p className="text-sm text-muted-foreground">
              Renda Fixa + Ações
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stocks List */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Minhas Ações</h3>
        <Dialog open={isFormOpen} onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingStock(null);
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Ação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingStock ? 'Editar Ação' : 'Adicionar Ação'}
              </DialogTitle>
            </DialogHeader>
            <StockForm
              stock={editingStock || undefined}
              onSubmit={editingStock ? handleUpdate : handleCreate}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingStock(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {stocks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma ação cadastrada</h3>
            <p className="text-muted-foreground text-center mb-4">
              Adicione suas ações para acompanhar a distribuição do seu capital.
            </p>
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeira Ação
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stocks.map((stock) => (
            <StockCard
              key={stock.id}
              stock={stock}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
