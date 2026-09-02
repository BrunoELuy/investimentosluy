import { normalizeKey } from '@/lib/b3Parser';
import type { B3ParseResult, B3ReportType } from '@/types/b3';

export interface B3Validation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/** Colunas obrigatórias para cada tipo de relatório suportado */
export const REQUIRED_COLUMNS: Record<Exclude<B3ReportType, 'DESCONHECIDO'>, string[]> = {
  MOVIMENTACAO: ['Produto', 'Data', 'Movimentação', 'Entrada/Saída', 'Valor da Operação'],
  ACOES: ['Produto', 'Código de Negociação', 'Quantidade'],
  RENDA_FIXA: ['Produto', 'Vencimento'],
  NEGOCIACAO: ['Produto', 'Data do Negócio', 'Quantidade'],
};

/** Colunas opcionais para cada tipo de relatório */
export const OPTIONAL_COLUMNS: Record<Exclude<B3ReportType, 'DESCONHECIDO'>, string[]> = {
  MOVIMENTACAO: ['Instituição', 'Quantidade', 'Preço unitário'],
  ACOES: ['Instituição', 'Preço de Fechamento', 'Valor Atualizado'],
  RENDA_FIXA: ['Emissor', 'Indexador', 'Quantidade', 'Valor Atualizado MTM', 'Valor Aplicado'],
  NEGOCIACAO: ['Instituição', 'Tipo de Movimentação', 'Preço', 'Valor'],
};

function hasColumn(headers: string[], column: string): boolean {
  const target = normalizeKey(column);
  return headers.some(h => normalizeKey(h).includes(target));
}

export function validateB3File(result: B3ParseResult): B3Validation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!result.headers.length) {
    errors.push('Não foi possível localizar a linha de cabeçalho na planilha. Envie o arquivo original exportado pela B3, sem edições.');
    return { valid: false, errors, warnings };
  }

  if (result.reportType === 'DESCONHECIDO') {
    errors.push(
      'Formato não reconhecido. Use o extrato de Movimentação ou os relatórios "Posição - Ações/BDRs", "Posição - Renda Fixa" ou "Negociação" exportados em Excel pela B3.'
    );
    return { valid: false, errors, warnings };
  }

  const requiredCols = REQUIRED_COLUMNS[result.reportType] || [];
  const missing = requiredCols.filter(c => !hasColumn(result.headers, c));
  if (missing.length) {
    errors.push(`Colunas obrigatórias ausentes: ${missing.join(', ')}.`);
  }

  const optionalCols = OPTIONAL_COLUMNS[result.reportType] || [];
  const missingOptional = optionalCols.filter(c => !hasColumn(result.headers, c));
  if (missingOptional.length) {
    warnings.push(`Colunas opcionais não encontradas (a conferência pode ficar incompleta): ${missingOptional.join(', ')}.`);
  }

  if (result.reportType === 'MOVIMENTACAO') {
    const movementsCount = result.movements?.length ?? 0;
    if (movementsCount === 0) {
      errors.push('Nenhuma movimentação válida foi encontrada no extrato.');
    }
    return { valid: errors.length === 0, errors, warnings };
  }

  if (!result.positions.length) {
    errors.push('Nenhuma posição válida foi encontrada nas linhas do arquivo.');
  }

  const withoutValue = result.positions.filter(p => p.totalValue === undefined && p.quantity === undefined).length;
  if (withoutValue > 0) {
    warnings.push(`${withoutValue} linha(s) sem quantidade nem valor — serão ignoradas na conciliação.`);
  }

  return { valid: errors.length === 0, errors, warnings };
}