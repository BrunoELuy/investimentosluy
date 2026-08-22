import { AlertTriangle, Check, CircleSlash, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useApplyB3Row, useCreateFromB3 } from '@/hooks/useB3';
import { STATUS_LABEL } from '@/lib/b3Reconcile';
import { formatCurrency } from '@/utils/investmentCalculations';
import type { ReconcileRow, ReconcileStatus } from '@/types/b3';

interface B3ReconcileTableProps {
  rows: ReconcileRow[];
}

const STATUS_STYLES: Record<ReconcileStatus, string> = {
  OK: 'text-success border-success',
  DIVERGENTE: 'text-destructive border-destructive',
  NAO_CADASTRADO: 'text-warning border-warning',
  NAO_CONSTA: 'text-muted-foreground',
};

function formatMetric(row: ReconcileRow, value?: number) {
  if (value === undefined || value === null) return '—';
  return row.metric === 'QUANTIDADE' ? value.toLocaleString('pt-BR') : formatCurrency(value);
}

export function B3ReconcileTable({ rows }: B3ReconcileTableProps) {
  const applyRow = useApplyB3Row();
  const createFromB3 = useCreateFromB3();

  if (!rows.length) return null;

  const divergent = rows.filter(r => r.status === 'DIVERGENTE').length;
  const ok = rows.filter(r => r.status === 'OK').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Check className="h-5 w-5 text-primary" />
          Conciliação
        </CardTitle>
        <CardDescription>
          {ok} conferidos · {divergent} divergentes · {rows.length} linhas analisadas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map(row => (
          <div key={row.key} className="rounded-lg border p-3 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{row.label}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {row.position?.product ?? row.investment?.institution}
                </p>
              </div>
              <Badge variant="outline" className={`flex-shrink-0 ${STATUS_STYLES[row.status]}`}>
                {STATUS_LABEL[row.status]}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">No app</p>
                <p className="font-medium">{formatMetric(row, row.appValue)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Na B3</p>
                <p className="font-medium">{formatMetric(row, row.b3Value)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Diferença</p>
                <p className={`font-medium ${row.difference && row.difference !== 0 ? 'text-destructive' : ''}`}>
                  {row.difference === undefined ? '—' : formatMetric(row, row.difference)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {row.status === 'DIVERGENTE' && (
                <>
                  <Button
                    size="sm"
                    onClick={() => applyRow.mutate({ row, updateValues: true })}
                    disabled={applyRow.isPending}
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Usar valor da B3
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => applyRow.mutate({ row, updateValues: false })}
                    disabled={applyRow.isPending}
                  >
                    Manter meu valor
                  </Button>
                </>
              )}
              {row.status === 'OK' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => applyRow.mutate({ row, updateValues: false })}
                  disabled={applyRow.isPending}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Marcar como conferido
                </Button>
              )}
              {row.status === 'NAO_CADASTRADO' && row.position && (
                <Button
                  size="sm"
                  onClick={() => createFromB3.mutate(row.position!)}
                  disabled={createFromB3.isPending}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Cadastrar investimento
                </Button>
              )}
              {row.status === 'NAO_CONSTA' && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CircleSlash className="h-3 w-3" />
                  Não encontrado neste extrato (pode estar em outro relatório)
                </p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
