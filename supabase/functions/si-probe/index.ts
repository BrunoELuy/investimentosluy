// Probe temporário: descobre a forma correta da URL de proventos do StatusInvest.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const VARIANTS = [
  'https://statusinvest.com.br/acao/companytickerprovents?ticker=ITSA4&chartProventsType=2',
  'https://statusinvest.com.br/acao/companytickerprovents?ticker=ITSA4',
  'https://statusinvest.com.br/acao/companytickerprovents?ticker=ITSA4&chartProventsType=1',
  'https://statusinvest.com.br/acao/companytickerprovents?ticker=ITSA4&type=2',
  'https://statusinvest.com.br/acao/companytickerprovents?ticker=ITSA4&chartProventsType=2&ajax=true',
];

Deno.serve(async () => {
  for (const url of VARIANTS) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': UA,
          Accept: 'application/json, text/plain, */*',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
          Referer: 'https://statusinvest.com.br/acoes/itsa4',
        },
      });
      const text = await res.text();
      console.log(`PROBE status=${res.status} len=${text.length} url=${url}`);
      console.log(`PROBE BODY url=${url} >>> ${text.slice(0, 400).replace(/\s+/g, ' ')}`);
    } catch (err) {
      console.log(`PROBE FAIL url=${url} err=${err instanceof Error ? err.message : String(err)}`);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return new Response('probe done', { headers: { 'Content-Type': 'text/plain' } });
});
