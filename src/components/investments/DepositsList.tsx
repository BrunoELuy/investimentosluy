import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Trash2, CalendarIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/investmentCalculations';
import { useDeposits, useCreateDeposit, useDeleteDeposit } from '@/hooks/useDeposits';
import type { InvestmentDeposit } from '@/types/investment';

interface DepositsListProps {
  investmentId: string;
  investmentStartDate: string;
  investmentEndDate: string;
  initialValue: number;
}

export function DepositsList({ 
  investmentId, 
  investmentStartDate, 
  investmentEndDate,
  initialValue 
}: DepositsListProps) {
  const { data: deposits = [], isLoading } = useDeposits(investmentId);
  const createDeposit = useCreateDeposit();
  const deleteDeposit = useDeleteDeposit();

  const [isAdding, setIsAdding] = useState(false);
  const [newAmount, setNewAmount] = useState('');
  const [newDate, setNewDate] = useState<Date>();

  const handleAddDeposit = async () => {
    if (!newAmount || !newDate) return;

    await createDeposit.mutateAsync({
      investmentId,
      deposit: {
        amount: parseFloat(newAmount),
        deposit_date: format(newDate, 'yyyy-MM-dd'),
      },
    });

    setNewAmount('');
    setNewDate(undefined);
    setIsAdding(false);
  };

  const handleDeleteDeposit = async (depositId: string) => {
    await deleteDeposit.mutateAsync({ depositId, investmentId });
  };

  const totalDeposits = deposits.reduce((sum, d) => sum + d.amount, 0);
  const totalInvested = initialValue + totalDeposits;

  const minDate = new Date(investmentStartDate);
  minDate.setDate(minDate.getDate() + 1); // Aporte deve ser após a data inicial

  const maxDate = new Date(investmentEndDate);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">Aportes Adicionais</h4>
          <p className="text-sm text-muted-foreground">
            Total investido: {formatCurrency(totalInvested)}
          </p>
        </div>
        {!isAdding && (
          <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Novo Aporte
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="flex flex-col sm:flex-row gap-3 p-4 border rounded-lg bg-muted/50">
          <div className="flex-1">
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="Valor (R$)"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full sm:w-[180px] justify-start text-left font-normal',
                  !newDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {newDate ? format(newDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Data do aporte'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={newDate}
                onSelect={setNewDate}
                disabled={(date) => date < minDate || date > maxDate || date > new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={handleAddDeposit}
              disabled={!newAmount || !newDate || createDeposit.isPending}
            >
              {createDeposit.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Adicionar
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => {
                setIsAdding(false);
                setNewAmount('');
                setNewDate(undefined);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {deposits.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="bg-muted/30">
              <TableCell className="font-medium">
                {format(new Date(investmentStartDate), 'dd/MM/yyyy', { locale: ptBR })}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(initialValue)}
              </TableCell>
              <TableCell className="text-right text-xs text-muted-foreground">
                Inicial
              </TableCell>
            </TableRow>
            {deposits.map((deposit) => (
              <TableRow key={deposit.id}>
                <TableCell>
                  {format(new Date(deposit.deposit_date), 'dd/MM/yyyy', { locale: ptBR })}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(deposit.amount)}
                </TableCell>
                <TableCell>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover aporte?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. O aporte de {formatCurrency(deposit.amount)} será removido.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteDeposit(deposit.id)}>
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum aporte adicional registrado. O valor inicial é {formatCurrency(initialValue)}.
        </p>
      )}
    </div>
  );
}
