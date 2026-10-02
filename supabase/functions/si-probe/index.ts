// Probe temporário: despeja a estrutura do JSON de proventos do StatusInvest.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const URL =
  'https://statusinvest.com.br/acao/companytickerprovents?ticker=ITSA4&chartProventsType=2';

Deno.serve(async () => {
  const res = await fetch(URL, {
    headers: {
      'User-Agent': UA,
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      Referer: 'https://statusinvest.com.br/acoes/itsa4',
    },
  });
  const text = await res.text();
  console.log(`STRUCT status=${res.status} len=${text.length}`);

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text);
  } catch {
    console.log('STRUCT parse-fail');
    return new Response('parse fail', { headers: { 'Content-Type': 'text/plain' } });
  }

  for (const [k, v] of Object.entries(json)) {
    if (Array.isArray(v)) {
      console.log(
        `STRUCT key="${k}" ARRAY len=${v.length} sample=${JSON.stringify(v[0] ?? null).slice(0, 300)}`
      );
    } else if (v && typeof v === 'object') {
      console.log(`STRUCT key="${k}" OBJECT subkeys=${Object.keys(v as object).join('|').slice(0, 300)}`);
    } else {
      console.log(`STRUCT key="${k}" PRIMITIVE ${JSON.stringify(v).slice(0, 120)}`);
    }
  }

  return new Response('struct done', { headers: { 'Content-Type': 'text/plain' } });
});
