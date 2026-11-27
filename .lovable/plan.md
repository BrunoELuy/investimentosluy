# Como funciona o servidor do app e como migrar no futuro

## Como funciona hoje
- **Site (telas do app):** fica hospedado pela Lovable (investimentosluy.lovable.app). É só arquivo estático, custo baixo.
- **Lovable Cloud (backend):** banco de dados, login dos usuários e funções (cotações e proventos). Por baixo é a mesma tecnologia de mercado (Postgres + Supabase), então não há "prisão": tudo pode ser exportado.
- **Custo:** 20 créditos grátis por mês para o backend. O que pesa é o tempo do servidor ligado e o volume de uso, não o número de cadastros.

## Quando vale migrar
Só quando o uso real passar do grátis com folga. Até lá, a Lovable costuma ser o caminho mais barato, porque não há servidor para manter.

## Caminho de migração (quando chegar a hora)
1. **Código:** já está no seu GitHub. Nada a fazer.
2. **Site:** publicar a mesma pasta em Vercel, Netlify ou Cloudflare Pages (planos grátis generosos).
3. **Backend:** criar um projeto próprio no Supabase (tem plano grátis; o pago custa cerca de US$ 25/mês) e:
   - exportar o banco (tabelas e dados) e importar lá;
   - recriar as funções de cotações e proventos (mesmo código, já está no repositório);
   - cadastrar de novo a chave da Brapi;
   - trocar no app o endereço e a chave pública do backend.
4. **Usuários:** as contas de login precisam ser exportadas junto; senhas podem exigir que cada pessoa redefina.
5. **Teste:** rodar em paralelo um tempo antes de desligar o antigo.

## Recomendação
Manter na Lovable agora. Com o cache recém-criado, o consumo cresce pouco por usuário. Quando quiser, eu monto um passo a passo detalhado de exportação.
