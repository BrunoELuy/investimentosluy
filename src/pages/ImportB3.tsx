import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { B3Upload } from '@/components/b3/B3Upload';
import { B3FormatGuide } from '@/components/b3/B3FormatGuide';
import { B3MovementsPreview } from '@/components/b3/B3MovementsPreview';
import { B3DividendsList } from '@/components/b3/B3DividendsList';
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
  const [currentFileName, setCurrentFileName] = useState<string>(
    'extrato_b3.xlsx'
  );

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  const rows = useMemo(() => {
    if (!parsed || parsed.reportType === 'MOVIMENTACAO') return [];
    const positions = parsed.positions ?? [];
    return reconcile(positions, investments);
  }, [parsed, investments]);

  const handleParsed = (result: B3ParseResult, fileName: string) => {
    setParsed(result);
    setCurrentFileName(fileName);

    if (result.reportType !== 'MOVIMENTACAO') {
      const positions = result.positions ?? [];
      const mismatches = reconcile(positions, investments).filter(
        r => r.status !== 'OK'
      ).length;
      registerImport.mutate({
        reportType: result.reportType,
        fileName,
        rowCount: positions.length,
        mismatchCount: mismatches,
        summary: { sheetName: result.sheetName, headers: result.headers },
      });
    }
  };

  return (
    <div className="space-y-6">
      <B3FormatGuide />

      <B3Upload onParsed={handleParsed} />

      {parsed && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
          <span>
            Relatório detectado:{' '}
            <strong>{REPORT_TYPE_LABEL[parsed.reportType]}</strong> · aba{' '}
            <em>{parsed.sheetName}</em>
          </span>
          <Button variant="ghost" size="sm" onClick={() => setParsed(null)}>
            Limpar prévia
          </Button>
        </div>
      )}

      {parsed?.reportType === 'MOVIMENTACAO' && parsed.consolidation && (
        <B3MovementsPreview
          consolidation={parsed.consolidation}
          existingInvestments={investments}
          fileName={currentFileName}
          onImportComplete={() => setParsed(null)}
        />
      )}

      {parsed && parsed.reportType !== 'MOVIMENTACAO' && (
        <B3ReconcileTable rows={rows} />
      )}

      <B3DividendsList />

      <B3ImportHistory />
    </div>
  );
};

export default ImportB3;