# Criar a tabela de sugestões no banco

## O que será feito
1. Aplicar o arquivo `20261127183000_create_user_suggestions.sql` exatamente como está no seu commit (tabela de sugestões, regras de acesso e atualização automática da data).
2. Aplicar um ajuste extra e necessário: o arquivo não libera o acesso da tabela para o app. Sem isso, a aba de Sugestões daria erro de permissão ao salvar ou listar. O ajuste libera leitura/criação/edição/exclusão para usuários logados; as regras do arquivo continuam valendo (cada um vê só as próprias sugestões e só o seu e-mail de administrador vê todas, muda status e exclui).
3. Conferir no banco que a tabela e as regras existem e rodar o teste `src/test/suggestions.test.ts`.

## Técnico
Migração extra:
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_suggestions TO authenticated;
GRANT ALL ON public.user_suggestions TO service_role;
```
Os tipos do app já incluem a tabela (vieram no seu commit) e serão regenerados.
