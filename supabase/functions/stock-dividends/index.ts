const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface YahooDividendEvent {
  amount: number;
  date: number; // Unix timestamp em segundos
}

interface YahooChartResponse {
  chart: {
    result?: Array<{
      meta?: { symbol?: string; shortName?: string; longName?: string };
      events?: { dividends?: Record<string, YahooDividendEvent> };
    }>;
    error?: { code: string; description: string } | null;
  };
}

/** Converte timestamp Unix (segundos) para YYYY-MM-DD */
function timestampToDate(ts: number): string {
  return new Date(ts * 1000).toISOString().split('T')[0];
}

/** Busca dividendos futuros de um único ticker no Yahoo Finance */
async function fetchYahooDividends(
  ticker: string
): Promise<Array<{
  assetIssued: string;
  paymentDate: string;
  rate: number;
  relatedTo: string;
  lastDatePrior: string;
  approvedOn: string;
}>> {
  const symbol = `${ticker.toUpperCase()}.SA`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?interval=1d&range=1y&events=div`;

  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Yahoo retornou HTTP ${res.status}`);
  }

  const json: YahooChartResponse = await res.json();

  if (json.chart.error) {
    throw new Error(json.chart.error.description ?? 'Erro desconhecido no Yahoo');
  }

  const result = json.chart.result?.[0];
  if (!result) return [];

  const divs = result.events?.dividends ?? {};
  const today = new Date().toISOString().split('T')[0];

  const future: Array<{
    assetIssued: string;
    paymentDate: string;
    rate: number;
    relatedTo: string;
    lastDatePrior: string;
    approvedOn: string;
  }> = [];

  for (const ev of Object.values(divs)) {
    if (!ev.date || ev.amount == null) continue;
    const dateStr = timestampToDate(ev.date);
    // Apenas eventos futuros (data do evento > hoje)
    if (dateStr <= today) continue;

    future.push({
      assetIssued: result.meta?.shortName ?? ticker,
      paymentDate: dateStr,
      rate: ev.amount,
      relatedTo: 'DIVIDENDO', // Yahoo não diferencia JCP; tratamos como dividendo
      lastDatePrior: dateStr, // usamos a própria data como fallback
      approvedOn: dateStr,
    });
  }

  return future;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tickers } = await req.json();

    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return new Response(JSON.stringify({ error: 'No tickers provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const unique = [
      ...new Set(tickers.map((t: string) => String(t).trim().toUpperCase())),
    ].filter(Boolean);

    const dividends: Record<string, unknown[]> = {};
    const errors: Record<string, string> = {};

    for (const ticker of unique) {

      try {
        const events = await fetchYahooDividends(ticker);
        dividends[ticker] = events;
        console.log(`Yahoo ${ticker}: ${events.length} eventos futuros`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro desconhecido';
        console.error(`Yahoo error for ${ticker}: ${msg}`);
        errors[ticker] = msg;
      }
      // Pequeno delay para evitar rate-limit do Yahoo
      await new Promise((r) => setTimeout(r, 250));
    }

    return new Response(JSON.stringify({ dividends, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching future dividends:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});