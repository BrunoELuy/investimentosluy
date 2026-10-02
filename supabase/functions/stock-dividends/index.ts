const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface BrapiCashDividend {
  assetIssued?: string;
  paymentDate?: string;
  rate?: number;
  relatedTo?: string;
  lastDatePrior?: string;
  approvedOn?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BRAPI_API_KEY = Deno.env.get('BRAPI_API_KEY');
    if (!BRAPI_API_KEY) {
      throw new Error('BRAPI_API_KEY is not configured');
    }

    const { tickers } = await req.json();

    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No tickers provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const unique = [
      ...new Set(
        tickers.map((t: string) => String(t).trim().toUpperCase())
      ),
    ].filter(Boolean);

    const today = new Date().toISOString().split('T')[0];
    const result: Record<string, BrapiCashDividend[]> = {};
    const errors: Record<string, string> = {};

    // Free Brapi plan: 1 ticker per request — fetch sequentially
    for (const ticker of unique) {
      const url = `https://brapi.dev/api/quote/${encodeURIComponent(ticker)}?dividends=true&range=3mo&interval=1d&token=${BRAPI_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.results?.length) {
        const detail = typeof data?.message === 'string' ? data.message : `HTTP ${response.status}`;
        console.error(`Brapi dividends error for ${ticker}: ${detail}`);
        errors[ticker] = detail;
        continue;
      }

      const r = data.results[0];
      const raw: BrapiCashDividend[] = r?.dividendsData?.cashDividends ?? [];

      console.log(`Brapi ${ticker}: ${raw.length} total cash dividends recebidos`);

      // Filtra apenas futuros (paymentDate > hoje)
      const future = raw.filter((d) => {
        if (!d.paymentDate) return false;
        const pd = d.paymentDate.split('T')[0];
        return pd > today;
      });

      console.log(`Brapi ${ticker}: ${future.length} futuros`);
      result[ticker] = future;
    }

    return new Response(
      JSON.stringify({ dividends: result, errors, today }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching future dividends:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});