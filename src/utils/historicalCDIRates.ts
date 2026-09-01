export interface CDIPeriod {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  annualRate: number; // taxa anual em %
}

/**
 * Tabela oficial de decisões COPOM / CDI desde 2010.
 * Cada período define a taxa anual vigente entre as datas.
 */
export const HISTORICAL_CDI_PERIODS: CDIPeriod[] = [
  { startDate: '2010-01-28', endDate: '2010-04-28', annualRate: 8.75 },
  { startDate: '2010-04-29', endDate: '2010-06-09', annualRate: 9.50 },
  { startDate: '2010-06-10', endDate: '2010-07-21', annualRate: 10.25 },
  { startDate: '2010-07-22', endDate: '2011-01-18', annualRate: 10.75 },
  { startDate: '2011-01-19', endDate: '2011-03-01', annualRate: 11.25 },
  { startDate: '2011-03-02', endDate: '2011-04-19', annualRate: 11.75 },
  { startDate: '2011-04-20', endDate: '2011-06-07', annualRate: 12.00 },
  { startDate: '2011-06-08', endDate: '2011-07-19', annualRate: 12.25 },
  { startDate: '2011-07-20', endDate: '2011-08-30', annualRate: 12.50 },
  { startDate: '2011-08-31', endDate: '2011-10-18', annualRate: 12.00 },
  { startDate: '2011-10-19', endDate: '2011-11-29', annualRate: 11.50 },
  { startDate: '2011-11-30', endDate: '2012-01-17', annualRate: 11.00 },
  { startDate: '2012-01-18', endDate: '2012-03-06', annualRate: 10.50 },
  { startDate: '2012-03-07', endDate: '2012-04-17', annualRate: 9.75 },
  { startDate: '2012-04-18', endDate: '2012-05-29', annualRate: 9.00 },
  { startDate: '2012-05-30', endDate: '2012-07-10', annualRate: 8.50 },
  { startDate: '2012-07-11', endDate: '2012-08-28', annualRate: 8.00 },
  { startDate: '2012-08-29', endDate: '2012-10-09', annualRate: 7.50 },
  { startDate: '2012-10-10', endDate: '2013-04-16', annualRate: 7.25 },
  { startDate: '2013-04-17', endDate: '2013-05-28', annualRate: 7.50 },
  { startDate: '2013-05-29', endDate: '2013-07-09', annualRate: 8.00 },
  { startDate: '2013-07-10', endDate: '2013-08-27', annualRate: 8.50 },
  { startDate: '2013-08-28', endDate: '2013-10-08', annualRate: 9.00 },
  { startDate: '2013-10-09', endDate: '2013-11-26', annualRate: 9.50 },
  { startDate: '2013-11-27', endDate: '2014-01-14', annualRate: 10.00 },
  { startDate: '2014-01-15', endDate: '2014-02-25', annualRate: 10.50 },
  { startDate: '2014-02-26', endDate: '2014-04-01', annualRate: 10.75 },
  { startDate: '2014-04-02', endDate: '2014-10-28', annualRate: 11.00 },
  { startDate: '2014-10-29', endDate: '2014-12-02', annualRate: 11.25 },
  { startDate: '2014-12-03', endDate: '2015-01-20', annualRate: 11.75 },
  { startDate: '2015-01-21', endDate: '2015-03-03', annualRate: 12.25 },
  { startDate: '2015-03-04', endDate: '2015-04-28', annualRate: 12.75 },
  { startDate: '2015-04-29', endDate: '2015-06-02', annualRate: 13.25 },
  { startDate: '2015-06-03', endDate: '2015-07-28', annualRate: 13.75 },
  { startDate: '2015-07-29', endDate: '2016-10-18', annualRate: 14.25 },
  { startDate: '2016-10-19', endDate: '2016-11-29', annualRate: 14.00 },
  { startDate: '2016-11-30', endDate: '2017-01-10', annualRate: 13.75 },
  { startDate: '2017-01-11', endDate: '2017-02-21', annualRate: 13.00 },
  { startDate: '2017-02-22', endDate: '2017-04-11', annualRate: 12.25 },
  { startDate: '2017-04-12', endDate: '2017-05-30', annualRate: 11.25 },
  { startDate: '2017-05-31', endDate: '2017-07-25', annualRate: 10.25 },
  { startDate: '2017-07-26', endDate: '2017-09-05', annualRate: 9.25 },
  { startDate: '2017-09-06', endDate: '2017-10-24', annualRate: 8.25 },
  { startDate: '2017-10-25', endDate: '2017-12-05', annualRate: 7.50 },
  { startDate: '2017-12-06', endDate: '2018-02-06', annualRate: 7.00 },
  { startDate: '2018-02-07', endDate: '2018-03-20', annualRate: 6.75 },
  { startDate: '2018-03-21', endDate: '2019-07-30', annualRate: 6.50 },
  { startDate: '2019-07-31', endDate: '2019-09-17', annualRate: 6.00 },
  { startDate: '2019-09-18', endDate: '2019-10-29', annualRate: 5.50 },
  { startDate: '2019-10-30', endDate: '2019-12-04', annualRate: 5.00 },
  { startDate: '2019-12-05', endDate: '2020-02-04', annualRate: 4.50 },
  { startDate: '2020-02-05', endDate: '2020-03-17', annualRate: 4.25 },
  { startDate: '2020-03-18', endDate: '2020-05-05', annualRate: 3.75 },
  { startDate: '2020-05-06', endDate: '2020-06-16', annualRate: 3.00 },
  { startDate: '2020-06-17', endDate: '2020-08-04', annualRate: 2.25 },
  { startDate: '2020-08-05', endDate: '2021-03-16', annualRate: 2.00 },
  { startDate: '2021-03-17', endDate: '2021-05-04', annualRate: 2.75 },
  { startDate: '2021-05-05', endDate: '2021-06-15', annualRate: 3.50 },
  { startDate: '2021-06-16', endDate: '2021-08-03', annualRate: 4.25 },
  { startDate: '2021-08-04', endDate: '2021-09-21', annualRate: 5.25 },
  { startDate: '2021-09-22', endDate: '2021-10-26', annualRate: 6.25 },
  { startDate: '2021-10-27', endDate: '2021-12-07', annualRate: 7.75 },
  { startDate: '2021-12-08', endDate: '2022-02-01', annualRate: 9.25 },
  { startDate: '2022-02-02', endDate: '2022-03-15', annualRate: 10.75 },
  { startDate: '2022-03-16', endDate: '2022-05-03', annualRate: 11.75 },
  { startDate: '2022-05-04', endDate: '2022-06-14', annualRate: 12.75 },
  { startDate: '2022-06-15', endDate: '2022-08-02', annualRate: 13.25 },
  { startDate: '2022-08-03', endDate: '2023-08-01', annualRate: 13.75 },
  { startDate: '2023-08-02', endDate: '2023-09-19', annualRate: 13.25 },
  { startDate: '2023-09-20', endDate: '2023-10-31', annualRate: 12.75 },
  { startDate: '2023-11-01', endDate: '2023-12-12', annualRate: 12.25 },
  { startDate: '2023-12-13', endDate: '2024-01-30', annualRate: 11.75 },
  { startDate: '2024-01-31', endDate: '2024-03-19', annualRate: 11.25 },
  { startDate: '2024-03-20', endDate: '2024-05-07', annualRate: 10.75 },
  { startDate: '2024-05-08', endDate: '2024-09-17', annualRate: 10.50 },
  { startDate: '2024-09-18', endDate: '2024-11-05', annualRate: 10.75 },
  { startDate: '2024-11-06', endDate: '2024-12-10', annualRate: 11.25 },
  { startDate: '2024-12-11', endDate: '2025-01-28', annualRate: 12.25 },
  { startDate: '2025-01-29', endDate: '2025-05-07', annualRate: 13.25 },
  { startDate: '2025-05-08', endDate: '2025-06-19', annualRate: 14.75 },
  { startDate: '2025-06-20', endDate: '2026-03-17', annualRate: 15.00 },
  { startDate: '2026-03-18', endDate: '2026-04-28', annualRate: 14.75 },
  { startDate: '2026-04-29', endDate: '2026-08-05', annualRate: 14.50 },
  { startDate: '2026-08-06', endDate: '2099-12-31', annualRate: 14.00 },
];

/**
 * Calcula o fator de retorno composto de um investimento atrelado ao CDI
 * entre duas datas, usando a tabela histórica de taxas.
 *
 * @param startDate Data inicial
 * @param endDate Data final (ou hoje)
 * @param cdiPercentage Percentual do CDI (ex.: 100, 110)
 * @param fallbackRate Taxa anual para datas fora da tabela (pré-2010 ou pós-última)
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
  const firstPeriodStart = new Date(HISTORICAL_CDI_PERIODS[0].startDate + 'T00:00:00').getTime();
  if (startMs < firstPeriodStart) {
    const preEndMs = Math.min(endMs, firstPeriodStart);
    const preDays = (preEndMs - startMs) / (1000 * 60 * 60 * 24);
    if (preDays > 0) {
      const effRate = (HISTORICAL_CDI_PERIODS[0].annualRate * cdiPercentage) / 100;
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
      const effectiveAnnualRate = (period.annualRate * cdiPercentage) / 100;
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
      const effRate = (fallbackRate * cdiPercentage) / 100;
      compoundFactor *= Math.pow(1 + effRate / 100, postDays / 365);
    }
  }

  return compoundFactor;
}

/**
 * Retorna a taxa média anual equivalente a um período, para exibição.
 */
export function getAverageCDIForPeriod(
  startDate: Date,
  endDate: Date,
  fallbackRate: number = 14.0
): number {
  const factor = calculateHistoricalCDIReturn(startDate, endDate, 100, fallbackRate);
  const days = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  if (days <= 0) return fallbackRate;
  return (Math.pow(factor, 365 / days) - 1) * 100;
}