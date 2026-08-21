# Importação e conciliação do extrato da B3

Permitir que você suba o arquivo de **Posição** ou **Negociação** exportado do portal Investidor B3 (.xlsx) e o app compare com o que está cadastrado, apontando divergências e oferecendo correção com um clique.

## Por que este caminho

Open Finance Brasil exige autorização do Banco Central e certificação — não há acesso gratuito para apps individuais. O extrato da B3 é a fonte oficial das suas posições em renda variável e renda fixa custodiada, é gratuito e não exige credenciais.

## O que será construído

### 1. Nova tela "Importar B3"
- Botão no header (junto de Simulador/Comparador) levando a `/importar-b3`.
- Área de upload (arrastar ou selecionar) aceitando `.xlsx` exportado da B3.
- Todo o processamento acontece no navegador — o arquivo não é enviado a lugar nenhum.

### 2. Leitura do arquivo
- Detecção automática do tipo de relatório:
  - **Posição - Ações / BDRs**: ticker, quantidade, preço de fechamento, valor atualizado, instituição.
  - **Posição - Renda Fixa**: emissor, indexador, vencimento, quantidade, valor aplicado, valor bruto/líquido atual.
  - **Negociação**: data, ticker, compra/venda, quantidade, preço, valor.
- Se o layout não for reconhecido, mostra uma tela de mapeamento manual de colunas.

### 3. Tela de conciliação
Tabela comparando cada linha da B3 com o investimento correspondente no app:

```text
Ativo     Cadastrado no app     Extrato B3        Situação
BBSE3     150 papéis            150 papéis        OK
PETR4     —                     80 papéis         Não cadastrado
CDB XP    R$ 10.000 aplicado    R$ 12.500         Divergente
LCA Y     R$ 5.000              —                 Não consta na B3
```

Ações disponíveis por linha:
- **Criar investimento** a partir da linha da B3 (pré-preenchido).
- **Atualizar valores** do investimento existente com os dados do extrato.
- **Vincular** manualmente quando o nome não bate mas é o mesmo ativo.
- **Ignorar** a linha.

O casamento automático usa ticker (ações) e emissor + vencimento (renda fixa).

### 4. Selo de verificação
- Cada investimento passa a guardar quando foi conferido pela última vez contra a B3 e qual valor constava.
- O card mostra um selo discreto "Conferido em dd/mm" e um aviso quando o valor cadastrado diverge do último extrato importado.
- Um resumo no dashboard indica quantos investimentos estão conferidos.

### 5. Histórico de importações
Lista das importações feitas (data, tipo de relatório, quantidade de linhas, divergências encontradas), para acompanhar a evolução da conferência.

## Detalhes técnicos

- Dependência nova: `xlsx` (SheetJS) para leitura de planilhas no cliente.
- Novos arquivos:
  - `src/pages/ImportB3.tsx` — página de upload e conciliação.
  - `src/lib/b3Parser.ts` — detecção de layout, normalização de linhas em um tipo `B3Position`.
  - `src/lib/b3Reconcile.ts` — casamento entre linhas da B3 e `Investment[]`, cálculo de divergências.
  - `src/components/b3/B3Upload.tsx`, `B3ReconcileTable.tsx`, `B3ImportHistory.tsx`.
  - `src/types/b3.ts`.
- Banco (Lovable Cloud), com RLS por `user_id` e GRANTs:
  - `investments`: colunas novas `last_verified_at timestamptz`, `verified_value numeric`, `b3_source text`.
  - Tabela `b3_imports`: `id`, `user_id`, `imported_at`, `report_type`, `row_count`, `mismatch_count`, `summary jsonb`.
- Rota `/importar-b3` registrada em `src/App.tsx`.
- Sem edge function: o parsing é client-side; apenas as atualizações passam pelos hooks existentes (`useCreateInvestment`, `useUpdateInvestment`), preservando o suporte offline.

## Fora do escopo

- Login automático no portal da B3 (não há API pública; o download do arquivo continua manual).
- Importação de dividendos e proventos — pode entrar em uma etapa seguinte.
