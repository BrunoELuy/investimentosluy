import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useB3Imports } from '@/hooks/useB3';
import { REPORT_TYPE_LABEL } from '@/lib/b3Parser';
import type { B3ReportType } from '@/types/b3';

export function B3ImportHistory() {
  const { data: imports = [], isLoading } = useB3Imports();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <History className="h-5 w-5 text-primary" />
          Histórico de importações
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : imports.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum extrato importado ainda.</p>
        ) : (
          <ul className="space-y-3">
            {imports.map(item => (
              <li key={item.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.file_name || 'Arquivo sem nome'}</p>
                  <p className="text-xs text-muted-foreground">
                    {REPORT_TYPE_LABEL[item.report_type as B3ReportType] ?? item.report_type} ·{' '}
                    {format(new Date(item.imported_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-1">
                  <Badge variant="outline">{item.row_count} linhas</Badge>
                  {item.mismatch_count > 0 ? (
                    <Badge variant="outline" className="text-destructive border-destructive">
                      {item.mismatch_count} divergências
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-success border-success">
                      Sem divergências
                    </Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
