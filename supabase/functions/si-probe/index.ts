// Probe temporário: revela nomes de campos do JSON de proventos do StatusInvest.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const URL =
  'https://statusinvest.com.br/acao/companytickerprovents?ticker=ITSA4&chartProventsType=2';

// Remove aspas para não quebrar o parser de logs
const clean = (s: string) => s.replace(/["\\]/g, "'").replace(/\s+/g, ' ');

function describe(label: string, value: unknown, depth: number) {
  if (Array.isArray(value)) {
    console.log(`S2 ${label} ARRAY len=${value.length}`);
    if (value.length > 0 && depth < 2) {
      const first = value[0];
      if (first && typeof first === 'object') {
        console.log(`S2 ${label}[0] FIELDS=${clean(Object.keys(first as object).join(','))}`);
        console.log(`S2 ${label}[0] VALUES=${clean(Object.values(first as object).join(' | ')).slice(0, 200)}`);
      } else {
        console.log(`S2 ${label}[0] PRIM=${clean(String(first)).slice(0, 120)}`);
      }
    }
    return;
  }
  if (value && typeof value === 'object') {
    console.log(`S2 ${label} OBJECT SUB=${clean(Object.keys(value as object).join(','))}`);
    if (depth < 2) {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        describe(`${label}.${k}`, v, depth + 1);
      }
    }
    return;
  }
  console.log(`S2 ${label} PRIM=${clean(String(value)).slice(0, 80)}`);
}

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
  console.log(`S2 status=${res.status} len=${text.length}`);
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    console.log('S2 PARSE-FAIL');
    return new Response('parse fail', { headers: { 'Content-Type': 'text/plain' } });
  }
  describe('root', json, 0);
  return new Response('s2 done', { headers: { 'Content-Type': 'text/plain' } });
});
