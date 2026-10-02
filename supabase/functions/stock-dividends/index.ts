const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface StatusInvestProventsResponse {
  provents?: Array<{
    ed?: string;  // data ex (dd/mm/yyyy)
    pd?: string;  // data de pagamento (dd/mm/yyyy)
    v?: number;   // valor por ação
    t?: string;   // tipo (DIVIDENDO, JCP, etc.)
    et?: string;  // label
  }>;
}

/** Converte dd/MM/yyyy para YYYY-MM-DD */
function brDateToISO(br?: string): string | null {
  if (!br) return null;
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

async function fetchStatusInvestDividends(ticker: string) {
  const url = `https://statusinvest.com.br/acao/companytickerprovents?ticker=${encodeURIComponent(
    ticker.toUpperCase()
  )}&chartProventsType=2`;

  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      Referer: `https://statusinvest.com.br/acoes/${ticker.toLowerCase()}`,
    },
  });

  if (!res.ok) {
    throw new Error(`StatusInvest retornou HTTP ${res.status}`);
  }

  const json: StatusInvestProventsResponse = await res.json();
  const raw = json.provents ?? [];
  const today = new Date().toISOString().split('T')[0];

  const future: Array<{
    assetIssued: string;
    paymentDate: string;
    rate: number;
    relatedTo: string;
    lastDatePrior: string;
    approvedOn: string;
  }> = [];

  for (const p of raw) {
    const pd = brDateToISO(p.pd);
    const ed = brDateToISO(p.ed) ?? pd;
    if (!pd || !ed) continue;
    if (pd <= today) continue;   // só futuros
    if (p.v == null || p.v <= 0) continue;

    future.push({
      assetIssued: ticker,
      paymentDate: pd,
      rate: p.v,
      relatedTo: (p.t ?? 'DIVIDENDO').toUpperCase(),
      lastDatePrior: ed,
      approvedOn: ed,
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
        const events = await fetchStatusInvestDividends(ticker);
        dividends[ticker] = events;
        console.log(`StatusInvest ${ticker}: ${events.length} eventos futuros`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro desconhecido';
        console.error(`StatusInvest error for ${ticker}: ${msg}`);
        errors[ticker] = msg;
      }
      await new Promise((r) => setTimeout(r, 300));
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