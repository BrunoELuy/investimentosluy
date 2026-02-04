import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { InvestmentFormData, Investment } from '@/types/investment';

const formSchema = z.object({
  type: z.enum(['CDB', 'LCA', 'ACAO']),
  institution: z.string().min(2, 'Instituição deve ter pelo menos 2 caracteres').max(100),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  initial_value: z.number().min(1, 'Valor deve ser maior que zero'),
  rate_type: z.enum(['CDI', 'IPCA', 'PREFIXADO', 'NONE']),
  rate_value: z.number().min(0),
  start_date: z.date(),
  end_date: z.date(),
  notes: z.string().max(500).optional(),
  // Stock-specific fields
  ticker: z.string().max(10).optional(),
  quantity: z.number().min(1).optional(),
}).refine(data => {
  // For stocks, end_date validation is skipped (we'll set it to a far future date)
  if (data.type === 'ACAO') return true;
  return data.end_date > data.start_date;
}, {
  message: 'Data de vencimento deve ser posterior à data de aplicação',
  path: ['end_date'],
}).refine(data => {
  // For stocks, quantity is required
  if (data.type === 'ACAO' && (!data.quantity || data.quantity < 1)) {
    return false;
  }
  return true;
}, {
  message: 'Quantidade de papéis é obrigatória para ações',
  path: ['quantity'],
}).refine(data => {
  // For fixed income, rate_value must be > 0
  if (data.type !== 'ACAO' && data.rate_value <= 0) {
    return false;
  }
  return true;
}, {
  message: 'Taxa deve ser maior que zero',
  path: ['rate_value'],
});

interface InvestmentFormProps {
  investment?: Investment;
  onSubmit: (data: InvestmentFormData) => Promise<void>;
  onCancel: () => void;
}

export function InvestmentForm({ investment, onSubmit, onCancel }: InvestmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: investment ? {
      type: investment.type,
      institution: investment.institution,
      name: investment.name,
      initial_value: investment.initial_value,
      rate_type: investment.rate_type,
      rate_value: investment.rate_value,
      start_date: new Date(investment.start_date),
      end_date: new Date(investment.end_date),
      notes: investment.notes || '',
      ticker: investment.ticker || '',
      quantity: investment.quantity || undefined,
    } : {
      type: 'CDB',
      institution: '',
      name: '',
      initial_value: 0,
      rate_type: 'CDI',
      rate_value: 100,
      start_date: new Date(),
      end_date: new Date(),
      notes: '',
      ticker: '',
      quantity: undefined,
    },
  });

  const investmentType = form.watch('type');
  const rateType = form.watch('rate_type');
  const isStock = investmentType === 'ACAO';

  // When type changes to ACAO, set default rate values
  const handleTypeChange = (value: 'CDB' | 'LCA' | 'ACAO') => {
    form.setValue('type', value);
    if (value === 'ACAO') {
      form.setValue('rate_type', 'NONE');
      form.setValue('rate_value', 0);
      // Set end_date to far future for stocks
      form.setValue('end_date', new Date('2099-12-31'));
    } else {
      if (form.getValues('rate_type') === 'NONE') {
        form.setValue('rate_type', 'CDI');
        form.setValue('rate_value', 100);
      }
    }
  };

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const formData: InvestmentFormData = {
        type: values.type,
        institution: values.institution,
        name: values.name,
        initial_value: values.initial_value,
        rate_type: values.rate_type,
        rate_value: values.rate_value,
        start_date: format(values.start_date, 'yyyy-MM-dd'),
        end_date: format(values.end_date, 'yyyy-MM-dd'),
        notes: values.notes || undefined,
        ticker: values.type === 'ACAO' ? values.ticker : undefined,
        quantity: values.type === 'ACAO' ? values.quantity : undefined,
      };
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Investimento</FormLabel>
                <Select onValueChange={handleTypeChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="CDB">CDB</SelectItem>
                    <SelectItem value="LCA">LCA</SelectItem>
                    <SelectItem value="ACAO">Ação</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  {field.value === 'LCA' && 'Isento de IR para pessoa física'}
                  {field.value === 'CDB' && 'IR regressivo aplicável'}
                  {field.value === 'ACAO' && 'Renda variável - Bolsa de Valores'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="institution"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{isStock ? 'Corretora' : 'Instituição'}</FormLabel>
                <FormControl>
                  <Input placeholder={isStock ? 'Ex: XP, Clear, Rico...' : 'Ex: Nubank, Inter, XP...'} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{isStock ? 'Nome da Empresa' : 'Nome do Investimento'}</FormLabel>
                <FormControl>
                  <Input placeholder={isStock ? 'Ex: BB Seguridade' : 'Ex: CDB 120% CDI Nubank'} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {isStock && (
            <FormField
              control={form.control}
              name="ticker"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código da Ação (Ticker)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: BBSE3" {...field} className="uppercase" />
                  </FormControl>
                  <FormDescription>Código negociado na B3</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="initial_value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor Total Investido (R$)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    placeholder="0,00" 
                    {...field}
                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {isStock && (
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantidade de Papéis</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="1" 
                      min="1"
                      placeholder="100" 
                      {...field}
                      value={field.value || ''}
                      onChange={e => field.onChange(parseInt(e.target.value) || undefined)}
                    />
                  </FormControl>
                  <FormDescription>Número de ações compradas</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {!isStock && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="rate_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Rentabilidade</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CDI">% do CDI</SelectItem>
                      <SelectItem value="IPCA">IPCA +</SelectItem>
                      <SelectItem value="PREFIXADO">Prefixado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rate_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {rateType === 'CDI' ? '% do CDI' : rateType === 'IPCA' ? 'Taxa adicional (%)' : 'Taxa anual (%)'}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      min="0"
                      placeholder={rateType === 'CDI' ? '110' : '6.00'} 
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    {rateType === 'CDI' && 'Ex: 110 para 110% do CDI'}
                    {rateType === 'IPCA' && 'Ex: 6.00 para IPCA + 6%'}
                    {rateType === 'PREFIXADO' && 'Ex: 12.50 para 12,50% a.a.'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{isStock ? 'Data da Compra' : 'Data de Aplicação'}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'dd/MM/yyyy', { locale: ptBR })
                        ) : (
                          <span>Selecione</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date > new Date()}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {!isStock && (
            <FormField
              control={form.control}
              name="end_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Vencimento</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'dd/MM/yyyy', { locale: ptBR })
                          ) : (
                            <span>Selecione</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações (opcional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Anotações sobre o investimento..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {investment ? 'Salvar Alterações' : 'Criar Investimento'}
          </Button>
        </div>
      </form>
    </Form>
  );
}