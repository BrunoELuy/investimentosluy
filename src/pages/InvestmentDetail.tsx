import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import {
  useDeleteInvestment,
  useInvestment,
  useUpdateInvestment,
} from '@/hooks/useInvestments';
import { useEconomicRates } from '@/hooks/useEconomicRates';
import { useDeposits } from '@/hooks/useDeposits';
import { InvestmentDetails } from '@/components/investments/InvestmentDetails';
import { InvestmentForm } from '@/components/investments/InvestmentForm';
import { calculateInvestment } from '@/utils/investmentCalculations';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { InvestmentFormData } from '@/types/investment';

export default function InvestmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);

  const { data: investment, isLoading } = useInvestment(id || '');
  const { data: deposits = [] } = useDeposits(id || '');
  const { data: rates } = useEconomicRates();
  const cdiRate = rates?.cdi ?? 10.65;
  const ipcaRate = rates?.ipca ?? 4.5;
  const updateMutation = useUpdateInvestment();
  const deleteMutation = useDeleteInvestment();

  const calculation = useMemo(() => {
    if (!investment) return null;
    return calculateInvestment(investment, cdiRate, ipcaRate, deposits);
  }, [investment, cdiRate, ipcaRate, deposits]);

  const handleUpdate = async (data: InvestmentFormData) => {
    if (!id) return;
    await updateMutation.mutateAsync({ ...data, id });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!id) return;
    await deleteMutation.mutateAsync(id);
    navigate('/investments');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!calculation) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Investimento não encontrado</p>
      </div>
    );
  }

  return (
    <>
      <InvestmentDetails
        calculation={calculation}
        onBack={() => navigate('/investments')}
        onEdit={() => setIsEditing(true)}
        onDelete={handleDelete}
      />

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Investimento</DialogTitle>
          </DialogHeader>
          <InvestmentForm
            investment={calculation.investment}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditing(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}