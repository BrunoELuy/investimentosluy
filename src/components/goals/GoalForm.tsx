import { useState, useEffect } from 'react';
import { format, addMonths } from 'date-fns';
import { CalendarIcon, Target, Percent, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { InvestmentGoal, GoalFormData } from '@/types/goal';
import { ptBR } from 'date-fns/locale';

interface GoalFormProps {
  goal?: InvestmentGoal;
  currentCdiRate?: number;
  onSubmit: (data: GoalFormData) => Promise<void>;
  onCancel: () => void;
}

export function GoalForm({ goal, currentCdiRate = 10.65, onSubmit, onCancel }: GoalFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(goal?.name || '');
  const [targetAmount, setTargetAmount] = useState(goal?.target_amount?.toString() || '');
  const [targetDate, setTargetDate] = useState<Date | undefined>(
    goal?.target_date ? new Date(goal.target_date) : addMonths(new Date(), 12)
  );
  const [estimatedCdiRate, setEstimatedCdiRate] = useState(
    goal?.estimated_cdi_rate?.toString() || currentCdiRate.toString()
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount || !targetDate || !estimatedCdiRate) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name,
        target_amount: parseFloat(targetAmount),
        target_date: format(targetDate, 'yyyy-MM-dd'),
        estimated_cdi_rate: parseFloat(estimatedCdiRate),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name" className="flex items-center gap-2">
          <Target className="h-4 w-4" />
          Nome do Objetivo
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Reserva de emergência, Casa própria..."
          required
          maxLength={100}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="targetAmount" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Valor Alvo (R$)
          </Label>
          <Input
            id="targetAmount"
            type="number"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            placeholder="50000"
            min="100"
            step="0.01"
            required
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Data Alvo
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !targetDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {targetDate ? format(targetDate, 'dd/MM/yyyy') : 'Selecione a data'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={targetDate}
                onSelect={setTargetDate}
                disabled={(date) => date < new Date()}
                initialFocus
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="estimatedCdiRate" className="flex items-center gap-2">
          <Percent className="h-4 w-4" />
          Taxa CDI Estimada (% a.a.)
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="estimatedCdiRate"
            type="number"
            value={estimatedCdiRate}
            onChange={(e) => setEstimatedCdiRate(e.target.value)}
            placeholder="10.65"
            min="0"
            max="50"
            step="0.01"
            required
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEstimatedCdiRate(currentCdiRate.toString())}
          >
            Usar atual ({currentCdiRate}%)
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Taxa usada para calcular os rendimentos projetados
        </p>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Salvando...' : goal ? 'Atualizar' : 'Criar Objetivo'}
        </Button>
      </div>
    </form>
  );
}
