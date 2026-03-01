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

    // Join tickers for batch request
    const tickerList = tickers.join(',');
    const url = `https://brapi.dev/api/quote/${tickerList}?token=${BRAPI_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Brapi API error [${response.status}]: ${JSON.stringify(data)}`);
    }

    // Map results to a simplified format
    const quotes: Record<string, {
      price: number;
      change: number;
      changePercent: number;
      previousClose: number;
      marketCap?: number;
      shortName?: string;
      updatedAt: string;
    }> = {};

    if (data.results) {
      for (const result of data.results) {
        quotes[result.symbol] = {
          price: result.regularMarketPrice ?? 0,
          change: result.regularMarketChange ?? 0,
          changePercent: result.regularMarketChangePercent ?? 0,
          previousClose: result.regularMarketPreviousClose ?? 0,
          marketCap: result.marketCap,
          shortName: result.shortName,
          updatedAt: new Date().toISOString(),
        };
      }
    }

    return new Response(
      JSON.stringify({ quotes }),
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
