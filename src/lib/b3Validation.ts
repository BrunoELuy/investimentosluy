import { normalizeKey } from '@/lib/b3Parser';
import type { B3ParseResult, B3ReportType } from '@/types/b3';

export interface B3Validation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/** Columns we need for each supported statement */
export const REQUIRED_COLUMNS: Record<Exclude<B3ReportType, 'DESCONHECIDO'>, string[]> = {
  ACOES: ['Produto', 'Código de Negociação', 'Quantidade'],
  RENDA_FIXA: ['Produto', 'Vencimento'],
  NEGOCIACAO: ['Produto', 'Data do Negócio', 'Quantidade'],
};

export const OPTIONAL_COLUMNS: Record<Exclude<B3ReportType, 'DESCONHECIDO'>, string[]> = {
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
      'Formato não reconhecido. Use os relatórios "Posição - Ações/BDRs", "Posição - Renda Fixa" ou "Negociação" exportados em Excel pelo portal do Investidor B3.'
    );
    return { valid: false, errors, warnings };
  }

  const missing = REQUIRED_COLUMNS[result.reportType].filter(c => !hasColumn(result.headers, c));
  if (missing.length) {
    errors.push(`Colunas obrigatórias ausentes: ${missing.join(', ')}.`);
  }

  const missingOptional = OPTIONAL_COLUMNS[result.reportType].filter(c => !hasColumn(result.headers, c));
  if (missingOptional.length) {
    warnings.push(`Colunas opcionais não encontradas (a conferência pode ficar incompleta): ${missingOptional.join(', ')}.`);
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
