import { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { parseB3File, REPORT_TYPE_LABEL } from '@/lib/b3Parser';
import type { B3ParseResult } from '@/types/b3';

interface B3UploadProps {
  onParsed: (result: B3ParseResult, fileName: string) => void;
}

export function B3Upload({ onParsed }: B3UploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [lastFile, setLastFile] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setLoading(true);
    try {
      const result = await parseB3File(file);
      if (!result.positions.length) {
        toast({
          title: 'Nenhuma posição encontrada',
          description: 'Verifique se o arquivo é o relatório exportado do portal da B3.',
          variant: 'destructive',
        });
        return;
      }
      setLastFile(file.name);
      onParsed(result, file.name);
      toast({
        title: 'Extrato lido com sucesso',
        description: `${result.positions.length} posições · ${REPORT_TYPE_LABEL[result.reportType]}`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao ler o arquivo',
        description: error instanceof Error ? error.message : 'Formato não suportado.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          Importar extrato da B3
        </CardTitle>
        <CardDescription>
          Exporte o relatório de posição (Ações/BDRs ou Renda Fixa) no portal do Investidor B3 em Excel e envie o
          arquivo aqui para conferir seus dados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          onDragOver={e => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
            dragging ? 'border-primary bg-primary/5' : 'border-muted'
          }`}
        >
          {loading ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}
          <p className="text-sm text-muted-foreground">
            Arraste o arquivo .xlsx aqui ou selecione no seu dispositivo
          </p>
          <Button type="button" onClick={() => inputRef.current?.click()} disabled={loading}>
            Selecionar arquivo
          </Button>
          {lastFile && <p className="text-xs text-muted-foreground truncate max-w-full">Último: {lastFile}</p>}
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = '';
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
