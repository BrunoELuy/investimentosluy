# Reduzir custos: cache compartilhado de cotações e proventos

## Objetivo
Cada ação é buscada na Brapi/StatusInvest uma vez para todos os usuários, e não uma vez por usuário. Menos atualizações automáticas.

## O que muda para o usuário
- Cotações continuam aparecendo, mas atualizadas no máximo a cada 15 minutos (antes: 3 min por usuário).
- Atualização automática só com o app visível e só em horário de pregão (seg–sex, 10h–18h de Brasília).
- Botão "atualizar" manual continua, mas respeita o cache (mínimo 1 min entre buscas reais).
- Proventos futuros atualizados uma vez a cada 12 horas por ação.

## Técnico
1. Nova tabela `market_cache` (ticker, kind 'quote'|'dividends', payload jsonb, fetched_at). RLS: leitura para usuários logados; escrita só pelas funções do servidor.
2. `stock-quotes`: lê o cache primeiro; só chama a Brapi para tickers com cache mais velho que 15 min (fora do pregão: usa o último valor sem buscar). Grava o resultado no cache. Mantém o formato de resposta atual e o erro por ticker.
3. `stock-dividends`: mesmo padrão, validade de 12 h; continua falhando por ticker.
4. `useStockQuotes`: intervalo 3 min -> 15 min, pausa com a aba oculta (`visibilitychange`) e fora do pregão.
5. `useFutureDividends`: cache local de 12 h para não chamar a função a cada abertura de tela.
6. Testes: regra de validade do cache (15 min / 12 h) e de horário de pregão.
7. Registrar a regra no AGENTS.md.

## Efeito esperado (estimativa, não medido)
Chamadas à Brapi passam a crescer com o número de ações diferentes, não com o número de usuários.
