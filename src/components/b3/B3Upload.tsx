import { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, Loader2, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { parseB3File, REPORT_TYPE_LABEL } from '@/lib/b3Parser';
import { validateB3File, type B3Validation } from '@/lib/b3Validation';
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
  const [validation, setValidation] = useState<B3Validation | null>(null);

  const handleFile = async (file: File) => {
    setLoading(true);
    setValidation(null);
    try {
      if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
        setValidation({ valid: false, errors: ['Extensão inválida. Envie um arquivo .xlsx, .xls ou .csv.'], warnings: [] });
        return;
      }

      const result = await parseB3File(file);
      const check = validateB3File(result);
      setValidation(check);
      setLastFile(file.name);

      if (!check.valid) {
        toast({
          title: 'Arquivo fora do padrão esperado',
          description: check.errors[0],
          variant: 'destructive',
        });
        return;
      }

      onParsed(result, file.name);
      toast({
        title: 'Extrato validado com sucesso',
        description: `${result.positions.length} posições · ${REPORT_TYPE_LABEL[result.reportType]}`,
      });
    } catch (error) {
      console.error('Erro detalhado na importação:', error);
      console.trace(); // opcional, mostra a pilha de chamadas
      setValidation({
        valid: false,
        errors: [error instanceof Error ? error.message : 'Formato não suportado.'],
        warnings: [],
      });
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
          className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${dragging ? 'border-primary bg-primary/5' : 'border-muted'
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

        {validation && (
          <div className="mt-4 space-y-2">
            {validation.valid && validation.errors.length === 0 && (
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-success" />
                <AlertTitle>Arquivo válido</AlertTitle>
                <AlertDescription>As colunas obrigatórias foram encontradas.</AlertDescription>
              </Alert>
            )}
            {validation.errors.map(message => (
              <Alert key={message} variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Não foi possível importar</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            ))}
            {validation.warnings.map(message => (
              <Alert key={message}>
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertTitle>Atenção</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </CardContent>

    </Card>
  );
}
