const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

    const quotes: Record<string, {
      price: number;
      change: number;
      changePercent: number;
      previousClose: number;
      marketCap?: number;
      shortName?: string;
      updatedAt: string;
    }> = {};
    const errors: Record<string, string> = {};

    // Free Brapi plans allow only 1 ticker per request — fetch sequentially
    const unique = [...new Set(tickers.map((t: string) => String(t).trim().toUpperCase()))].filter(Boolean);

    for (const ticker of unique) {
      const url = `https://brapi.dev/api/quote/${encodeURIComponent(ticker)}?token=${BRAPI_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.results?.length) {
        const detail = typeof data?.message === 'string' ? data.message : `HTTP ${response.status}`;
        console.error(`Brapi error for ${ticker}: ${detail}`);
        errors[ticker] = detail;
        continue;
      }

      const result = data.results[0];
      quotes[result.symbol ?? ticker] = {
        price: result.regularMarketPrice ?? 0,
        change: result.regularMarketChange ?? 0,
        changePercent: result.regularMarketChangePercent ?? 0,
        previousClose: result.regularMarketPreviousClose ?? 0,
        marketCap: result.marketCap,
        shortName: result.shortName,
        updatedAt: new Date().toISOString(),
      };
    }

    if (!Object.keys(quotes).length && Object.keys(errors).length) {
      return new Response(
        JSON.stringify({ quotes, errors, error: Object.values(errors)[0] }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }


    return new Response(
      JSON.stringify({ quotes, errors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching stock quotes:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
