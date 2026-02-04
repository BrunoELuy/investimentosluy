import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { StockInvestment, StockFormData } from '@/types/stock';

interface StockFormProps {
  stock?: StockInvestment;
  onSubmit: (data: StockFormData) => Promise<void>;
  onCancel: () => void;
}

export function StockForm({ stock, onSubmit, onCancel }: StockFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<StockFormData>({
    name: stock?.name || '',
    ticker: stock?.ticker || '',
    amount: stock?.amount || 0,
    notes: stock?.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Nome da Ação *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Petrobras, Vale, Itaú"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ticker">Ticker (opcional)</Label>
          <Input
            id="ticker"
            value={formData.ticker}
            onChange={(e) => setFormData({ ...formData, ticker: e.target.value.toUpperCase() })}
            placeholder="Ex: PETR4, VALE3"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Valor Investido (R$) *</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0"
          value={formData.amount || ''}
          onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
          placeholder="0,00"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Anotações sobre este investimento..."
          rows={3}
        />
      </div>

      <div className="flex gap-3 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : stock ? 'Atualizar' : 'Adicionar'}
        </Button>
      </div>
    </form>
  );
}
