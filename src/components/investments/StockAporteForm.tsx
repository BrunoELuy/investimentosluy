import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { useCreateStockAporte } from '@/hooks/useStockAportes';

interface StockAporteFormProps {
  ticker: string;
  institution?: string;
}

export function StockAporteForm({ ticker, institution }: StockAporteFormProps) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const create = useCreateStockAporte();

  const parsedQty = Number(quantity);
  const parsedPrice = Number(unitPrice.replace(',', '.'));
  const total = parsedQty > 0 && parsedPrice > 0 ? parsedQty * parsedPrice : 0;
  const canSubmit = parsedQty > 0 && parsedPrice > 0 && !!date && !create.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await create.mutateAsync({
      ticker,
      quantity: parsedQty,
      unitPrice: parsedPrice,
      date,
      institution,
    });
    setQuantity('');
    setUnitPrice('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Novo aporte
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Novo aporte · {ticker}</DialogTitle>
            <DialogDescription>
              Aportes com data anterior à Data-com entram no cálculo dos próximos proventos.
              Aportes depois da Data-com mantêm o provento como está.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="quantity">Quantidade</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="100"
                  required
                />
              </div>
              <div>
                <Label htmlFor="unitPrice">Preço unitário (R$)</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="10,50"
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="date">Data do aporte</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                required
              />
            </div>
            {total > 0 && (
              <p className="text-sm text-muted-foreground">
                Total: <strong className="text-foreground">
                  {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </strong>
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {create.isPending ? 'Registrando...' : 'Registrar aporte'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}