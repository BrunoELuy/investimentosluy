import { Info, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { REQUIRED_COLUMNS, OPTIONAL_COLUMNS } from '@/lib/b3Validation';
import { REPORT_TYPE_LABEL } from '@/lib/b3Parser';
import type { B3ReportType } from '@/types/b3';

const TYPES: Exclude<B3ReportType, 'DESCONHECIDO'>[] = ['ACOES', 'RENDA_FIXA', 'NEGOCIACAO'];

export function B3FormatGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Info className="h-5 w-5 text-primary" />
          Como devo enviar o arquivo?
        </CardTitle>
        <CardDescription>
          Aceitamos os relatórios em Excel (.xlsx/.xls) ou CSV exportados no portal do Investidor B3, em
          Extratos → Posição (ou Negociação). Envie o arquivo original, sem renomear colunas ou apagar linhas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Acesse investidor.b3.com.br e faça login.</li>
          <li>Vá em Extratos e escolha "Posição" (Ações/BDRs ou Renda Fixa).</li>
          <li>Clique em Exportar → Excel e salve o arquivo.</li>
          <li>Envie o arquivo abaixo. Validamos as colunas antes de conciliar.</li>
        </ol>

        <Accordion type="single" collapsible className="w-full">
          {TYPES.map(type => (
            <AccordionItem key={type} value={type}>
              <AccordionTrigger className="text-sm">{REPORT_TYPE_LABEL[type]}</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div>
                  <p className="mb-1 text-xs font-medium">Colunas obrigatórias</p>
                  <div className="flex flex-wrap gap-1">
                    {REQUIRED_COLUMNS[type].map(c => (
                      <Badge key={c} variant="default" className="text-[10px]">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium">Colunas recomendadas</p>
                  <div className="flex flex-wrap gap-1">
                    {OPTIONAL_COLUMNS[type].map(c => (
                      <Badge key={c} variant="secondary" className="text-[10px]">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-success" />
          Valores em R$ e datas no formato dd/mm/aaaa são reconhecidos automaticamente.
        </p>
      </CardContent>
    </Card>
  );
}
