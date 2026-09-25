import { HISTORICAL_CDI_PERIODS } from './cdiHistoryData';

// Re-exporta tipos e dados para manter compatibilidade com imports existentes
export type { CDIPeriod } from './cdiHistoryData';
export { HISTORICAL_CDI_PERIODS } from './cdiHistoryData';

/** Spread médio entre Selic e CDI, em pontos percentuais */
const SELIC_TO_CDI_SPREAD = 0.10;

/**
 * Calcula o fator de retorno composto de um investimento atrelado ao CDI
 * entre duas datas, usando a tabela histórica de taxas Selic.
 * Aplica um spread médio de -0,10 p.p. para estimar o CDI.
 *
 * @param startDate Data inicial
 * @param endDate Data final (ou hoje)
 * @param cdiPercentage Percentual do CDI (ex.: 100, 110)
 * @param fallbackRate Taxa anual para datas fora da tabela (pré-2010 ou pós-última) - já é CDI
 * @returns Fator multiplicador (ex.: 1.12 = 12% de rendimento)
 */
export function calculateHistoricalCDIReturn(
  startDate: Date,
  endDate: Date,
  cdiPercentage: number,
  fallbackRate: number = 14.0
): number {
  const startMs = startDate.getTime();
  const endMs = endDate.getTime();

  if (endMs <= startMs) return 1.0;

  let compoundFactor = 1.0;

  // Datas antes do primeiro período (pré-2010)
  const firstPeriodStart = new Date(
    HISTORICAL_CDI_PERIODS[0].startDate + 'T00:00:00'
  ).getTime();

  if (startMs < firstPeriodStart) {
    const preEndMs = Math.min(endMs, firstPeriodStart);
    const preDays = (preEndMs - startMs) / (1000 * 60 * 60 * 24);
    if (preDays > 0) {
      const selicRate = HISTORICAL_CDI_PERIODS[0].annualRate;
      const cdiRate = Math.max(0, selicRate - SELIC_TO_CDI_SPREAD);
      const effRate = (cdiRate * cdiPercentage) / 100;
      compoundFactor *= Math.pow(1 + effRate / 100, preDays / 365);
    }
  }

  // Percorre os períodos e aplica a taxa proporcional aos dias sobrepostos
  for (const period of HISTORICAL_CDI_PERIODS) {
    const pStartMs = new Date(period.startDate + 'T00:00:00').getTime();
    const pEndMs = new Date(period.endDate + 'T23:59:59').getTime();

    const effStartMs = Math.max(startMs, pStartMs);
    const effEndMs = Math.min(endMs, pEndMs);

    if (effStartMs < effEndMs) {
      const days = (effEndMs - effStartMs) / (1000 * 60 * 60 * 24);
      const selicRate = period.annualRate;
      const cdiRate = Math.max(0, selicRate - SELIC_TO_CDI_SPREAD);
      const effectiveAnnualRate = (cdiRate * cdiPercentage) / 100;
      compoundFactor *= Math.pow(1 + effectiveAnnualRate / 100, days / 365);
    }

    if (effEndMs >= endMs) break; // já alcançou a data final
  }

  // Datas após o último período
  const lastPeriodEnd = new Date(
    HISTORICAL_CDI_PERIODS[HISTORICAL_CDI_PERIODS.length - 1].endDate + 'T23:59:59'
  ).getTime();

  if (endMs > lastPeriodEnd) {
    const postStartMs = Math.max(startMs, lastPeriodEnd);
    const postDays = (endMs - postStartMs) / (1000 * 60 * 60 * 24);
    if (postDays > 0) {
      const effRate = (fallbackRate * cdiPercentage) / 100; // fallbackRate já é CDI
      compoundFactor *= Math.pow(1 + effRate / 100, postDays / 365);
    }
  }

  return compoundFactor;
}

/**
 * Retorna a taxa média anual equivalente a um período, para exibição.
 * O valor retornado é uma estimativa do CDI (já descontado o spread).
 */
export function getAverageCDIForPeriod(
  startDate: Date,
  endDate: Date,
  fallbackRate: number = 14.0
): number {
  const factor = calculateHistoricalCDIReturn(startDate, endDate, 100, fallbackRate);
  const days = Math.floor(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (days <= 0) return fallbackRate;
  return (Math.pow(factor, 365 / days) - 1) * 100;
}