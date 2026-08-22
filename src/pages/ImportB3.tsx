import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { B3Upload } from '@/components/b3/B3Upload';
import { B3ReconcileTable } from '@/components/b3/B3ReconcileTable';
import { B3ImportHistory } from '@/components/b3/B3ImportHistory';
import { useAuth } from '@/hooks/useAuth';
import { useInvestments } from '@/hooks/useInvestments';
import { useRegisterB3Import } from '@/hooks/useB3';
import { reconcile } from '@/lib/b3Reconcile';
import { REPORT_TYPE_LABEL } from '@/lib/b3Parser';
import type { B3ParseResult } from '@/types/b3';

const ImportB3 = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: investments = [] } = useInvestments();
  const registerImport = useRegisterB3Import();
  const [parsed, setParsed] = useState<B3ParseResult | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  const rows = useMemo(
    () => (parsed ? reconcile(parsed.positions, investments) : []),
    [parsed, investments]
  );

  const handleParsed = (result: B3ParseResult, fileName: string) => {
    setParsed(result);
    const mismatches = reconcile(result.positions, investments).filter(r => r.status !== 'OK').length;
    registerImport.mutate({
      reportType: result.reportType,
      fileName,
      rowCount: result.positions.length,
      mismatchCount: mismatches,
      summary: { sheetName: result.sheetName, headers: result.headers },
    });
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden w-full max-w-full">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center gap-2 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <FileSpreadsheet className="h-5 w-5 text-primary flex-shrink-0" />
          <h1 className="text-lg font-bold truncate">Importar extrato da B3</h1>
        </div>
      </header>

      <main className="container py-4 sm:py-6 space-y-4 sm:space-y-6 px-4 overflow-x-hidden">
        <B3Upload onParsed={handleParsed} />
        {parsed && (
          <p className="text-sm text-muted-foreground">
            Relatório detectado: <strong>{REPORT_TYPE_LABEL[parsed.reportType]}</strong> · aba {parsed.sheetName}
          </p>
        )}
        <B3ReconcileTable rows={rows} />
        <B3ImportHistory />
      </main>
    </div>
  );
};

export default ImportB3;
