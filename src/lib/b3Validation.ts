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
  MOVIMENTACAO: ['Data', 'Produto', 'Movimentação', 'Entrada/Saída', 'Valor da Operação'],
};

export const OPTIONAL_COLUMNS: Record<Exclude<B3ReportType, 'DESCONHECIDO'>, string[]> = {
  ACOES: ['Instituição', 'Preço de Fechamento', 'Valor Atualizado'],
  RENDA_FIXA: ['Emissor', 'Indexador', 'Quantidade', 'Valor Atualizado MTM', 'Valor Aplicado'],
  NEGOCIACAO: ['Instituição', 'Tipo de Movimentação', 'Preço', 'Valor'],
  MOVIMENTACAO: ['Instituição', 'Quantidade', 'Preço unitário'],
};

function hasColumn(headers: string[], column: string): boolean {
  const target = normalizeKey(column);
  return headers.some(h => normalizeKey(h).includes(target));
}

export function validateB3File(result: B3ParseResult): B3Validation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Garantir que positions seja sempre um array
  const positions = result.positions ?? [];
  const headers = result.headers ?? [];

  if (!headers.length) {
    errors.push('Não foi possível localizar a linha de cabeçalho na planilha. Envie o arquivo original exportado pela B3, sem edições.');
    return { valid: false, errors, warnings };
  }

  if (result.reportType === 'DESCONHECIDO') {
    errors.push(
      'Formato não reconhecido. Use os relatórios "Posição - Ações/BDRs", "Posição - Renda Fixa", "Negociação" ou "Movimentação" exportados em Excel pelo portal do Investidor B3.'
    );
    return { valid: false, errors, warnings };
  }

  // Como reportType já foi checado, podemos acessar as constantes com segurança
  const required = REQUIRED_COLUMNS[result.reportType];
  const optional = OPTIONAL_COLUMNS[result.reportType];

  const missing = required.filter(c => !hasColumn(headers, c));
  if (missing.length) {
    errors.push(`Colunas obrigatórias ausentes: ${missing.join(', ')}.`);
  }

  const missingOptional = optional.filter(c => !hasColumn(headers, c));
  if (missingOptional.length) {
    warnings.push(`Colunas opcionais não encontradas (a conferência pode ficar incompleta): ${missingOptional.join(', ')}.`);
  }

  if (positions.length === 0 && result.reportType !== 'MOVIMENTACAO') {
    errors.push('Nenhuma posição válida foi encontrada nas linhas do arquivo.');
  }

  if (result.reportType === 'MOVIMENTACAO' && !result.consolidation) {
    errors.push('Não foi possível consolidar as movimentações. Verifique se o arquivo contém dados válidos.');
  }

  const withoutValue = positions.filter(p => p.totalValue === undefined && p.quantity === undefined).length;
  if (withoutValue > 0 && result.reportType !== 'MOVIMENTACAO') {
    warnings.push(`${withoutValue} linha(s) sem quantidade nem valor — serão ignoradas na conciliação.`);
  }

  return { valid: errors.length === 0, errors, warnings };
}