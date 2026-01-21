import { useState } from 'react';
import { format as formatDate } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, FileSpreadsheet, Download, Loader2, Calendar, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { InvestmentCalculation } from '@/types/investment';
import { formatCurrency, formatPercent, formatRateValue } from '@/utils/investmentCalculations';

interface ReportExporterProps {
  calculations: InvestmentCalculation[];
}

type ExportFormat = 'csv' | 'pdf';
type ReportType = 'portfolio' | 'performance' | 'tax';

export function ReportExporter({ calculations }: ReportExporterProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [reportType, setReportType] = useState<ReportType>('portfolio');
  const [includeMatured, setIncludeMatured] = useState(true);

  const filteredCalcs = includeMatured 
    ? calculations 
    : calculations.filter(c => !c.isMatured);

  const generateCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];

    switch (reportType) {
      case 'portfolio':
        headers = [
          'Nome',
          'Tipo',
          'Instituição',
          'Valor Aplicado',
          'Rentabilidade',
          'Data Aplicação',
          'Data Vencimento',
          'Valor Bruto Atual',
          'Valor Líquido Atual',
          'Rendimento Líquido',
          'Status',
        ];
        rows = filteredCalcs.map(c => [
          c.investment.name,
          c.investment.type,
          c.investment.institution,
          c.investment.initial_value.toString(),
          formatRateValue(c.investment.rate_type, c.investment.rate_value),
          formatDate(new Date(c.investment.start_date), 'dd/MM/yyyy'),
          formatDate(new Date(c.investment.end_date), 'dd/MM/yyyy'),
          c.currentValue.toFixed(2),
          c.currentNetValue.toFixed(2),
          c.netReturn.toFixed(2),
          c.isMatured ? 'Vencido' : 'Ativo',
        ]);
        break;

      case 'performance':
        headers = [
          'Nome',
          'Tipo',
          'Dias Corridos',
          'Dias Totais',
          'Rend. Bruto (R$)',
          'Rend. Bruto (%)',
          'Rend. Líquido (R$)',
          'Rend. Líquido (%)',
        ];
        rows = filteredCalcs.map(c => [
          c.investment.name,
          c.investment.type,
          c.daysElapsed.toString(),
          c.totalDays.toString(),
          c.grossReturn.toFixed(2),
          c.grossReturnPercent.toFixed(2),
          c.netReturn.toFixed(2),
          c.netReturnPercent.toFixed(2),
        ]);
        break;

      case 'tax':
        headers = [
          'Nome',
          'Tipo',
          'Valor Aplicado',
          'Rendimento Bruto',
          'IOF',
          'Alíquota IR',
          'IR Retido',
          'Rendimento Líquido',
        ];
        rows = filteredCalcs.map(c => [
          c.investment.name,
          c.investment.type,
          c.investment.initial_value.toFixed(2),
          c.grossReturn.toFixed(2),
          c.iofAmount.toFixed(2),
          c.investment.type === 'CDB' ? (c.irRate * 100).toFixed(1) + '%' : 'Isento',
          c.irAmount.toFixed(2),
          c.netReturn.toFixed(2),
        ]);
        break;
    }

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';')),
    ].join('\n');

    return csvContent;
  };

  const generatePDFContent = () => {
    const title = {
      portfolio: 'Relatório de Carteira de Investimentos',
      performance: 'Relatório de Performance',
      tax: 'Relatório para Declaração de IR',
    }[reportType];

    const dateStr = formatDate(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

    let content = `${title}\nGerado em: ${dateStr}\n\n`;

    // Summary
    const totalInvested = filteredCalcs.reduce((sum, c) => sum + c.investment.initial_value, 0);
    const totalGross = filteredCalcs.reduce((sum, c) => sum + c.currentValue, 0);
    const totalNet = filteredCalcs.reduce((sum, c) => sum + c.currentNetValue, 0);
    const totalNetReturn = filteredCalcs.reduce((sum, c) => sum + c.netReturn, 0);

    content += `RESUMO\n`;
    content += `Total Investido: ${formatCurrency(totalInvested)}\n`;
    content += `Valor Bruto Atual: ${formatCurrency(totalGross)}\n`;
    content += `Valor Líquido Atual: ${formatCurrency(totalNet)}\n`;
    content += `Rendimento Líquido Total: ${formatCurrency(totalNetReturn)}\n\n`;

    content += `DETALHAMENTO (${filteredCalcs.length} investimentos)\n`;
    content += '='.repeat(80) + '\n\n';

    filteredCalcs.forEach((c, index) => {
      content += `${index + 1}. ${c.investment.name}\n`;
      content += `   Tipo: ${c.investment.type} | Instituição: ${c.investment.institution}\n`;
      content += `   Valor Aplicado: ${formatCurrency(c.investment.initial_value)}\n`;
      content += `   Rentabilidade: ${formatRateValue(c.investment.rate_type, c.investment.rate_value)}\n`;
      content += `   Período: ${formatDate(new Date(c.investment.start_date), 'dd/MM/yyyy')} a ${formatDate(new Date(c.investment.end_date), 'dd/MM/yyyy')}\n`;
      content += `   Valor Líquido Atual: ${formatCurrency(c.currentNetValue)}\n`;
      content += `   Rendimento Líquido: ${formatCurrency(c.netReturn)} (${formatPercent(c.netReturnPercent)})\n`;
      if (c.investment.type === 'CDB') {
        content += `   IR Retido: ${formatCurrency(c.irAmount)} (${(c.irRate * 100).toFixed(1)}%)\n`;
      } else {
        content += `   IR: Isento (LCA)\n`;
      }
      content += '\n';
    });

    return content;
  };

  const handleExport = async () => {
    if (filteredCalcs.length === 0) {
      toast({
        title: 'Nenhum investimento',
        description: 'Não há investimentos para exportar.',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);

    try {
      let content: string;
      let filename: string;
      let mimeType: string;

      if (exportFormat === 'csv') {
        content = generateCSV();
        filename = `investimentos_${reportType}_${formatDate(new Date(), 'yyyy-MM-dd')}.csv`;
        mimeType = 'text/csv;charset=utf-8;';
      } else {
        content = generatePDFContent();
        filename = `investimentos_${reportType}_${formatDate(new Date(), 'yyyy-MM-dd')}.txt`;
        mimeType = 'text/plain;charset=utf-8;';
      }

      // Create blob and download
      const blob = new Blob(['\ufeff' + content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Relatório exportado!',
        description: `Arquivo ${filename} baixado com sucesso.`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao exportar',
        description: 'Não foi possível gerar o relatório.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Exportar Relatórios
        </CardTitle>
        <CardDescription>
          Gere relatórios da sua carteira para análise ou declaração de IR
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Formato</Label>
            <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as ExportFormat)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    CSV (Excel)
                  </div>
                </SelectItem>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Texto (TXT)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
            <Label>Tipo de Relatório</Label>
            <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portfolio">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Carteira Completa
                  </div>
                </SelectItem>
                <SelectItem value="performance">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Performance
                  </div>
                </SelectItem>
                <SelectItem value="tax">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Declaração de IR
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Formato</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    CSV (Excel)
                  </div>
                </SelectItem>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Texto (TXT)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox 
            id="include-matured" 
            checked={includeMatured}
            onCheckedChange={(checked) => setIncludeMatured(checked as boolean)}
          />
          <Label htmlFor="include-matured" className="cursor-pointer">
            Incluir investimentos vencidos
          </Label>
        </div>

        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Prévia do relatório</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {filteredCalcs.length} investimentos serão incluídos no relatório
          </p>
          <p className="text-sm text-muted-foreground">
            Valor total: {formatCurrency(filteredCalcs.reduce((sum, c) => sum + c.currentNetValue, 0))}
          </p>
        </div>

        <Button 
          onClick={handleExport} 
          disabled={isExporting || filteredCalcs.length === 0}
          className="w-full"
          size="lg"
        >
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gerando relatório...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Exportar Relatório
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
