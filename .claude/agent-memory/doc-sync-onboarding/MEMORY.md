# Memória do doc-sync-onboarding

## Estado da revisão
- `docs/index.md` linha 5: conferido até `6f93ec3` + commit `28d79ca` (produtos/kits/Divulgar). PRs #8–#12 (home pessoas/kits, tema editorial, SEO/sitemap/robots/llms.txt, `/criar-vitrine` no lugar de `/para-creators`) **ainda não** documentadas: `/para-creators` ainda aparece em README, architecture, home.md, index; fontes "Barlow Condensed" em architecture (next/font, globals.css); linhas de `Storefront.tsx` em vitrine-publica.md (tabela de seções) e `types.ts` em dominio.md estão defasadas.

## Convenções observadas
- divida-tecnica.md: IDs B/S/D/Q/L sequenciais, prioridade 🔴🟠🟢, colunas `# | Prioridade | Item | Onde | Detalhe` (Q e L sem coluna Detalhe), mapa Mermaid por módulo no fim (nó DIV adicionado em 28d79ca).
- Módulos em docs/apps/: seções fixas (Visão geral, Responsabilidades, Estrutura de arquivos, Entidades, Rotas, Fluxos, Integração, Pegadinhas numeradas).
- Line refs `arquivo:linha` em todo lugar; ao mudar `app/actions.ts` revisar: architecture (tabela de actions, integrações, pegadinha 4), uploads, metricas, database (Storage, RPC), admin (tabela de `console.error`), divida (B2, S3, S5, D1).

## Fatos do código (pós-28d79ca)
- `refreshPricesAction`/`PriceCheck` removidos; `soldOut` só vem da importação (B13); `priceCheckedAt` gravado e não lido (L9).
- `ImageKind` = logo | cover | avatar | product (product → `vitrine-photos`, 1000 px).
- `share-image.tsx` baixa fotos com `fetchPublic` (exportado de import-link) + `sharp`; sem QR (`qrcode` removido).
- `SharePanel` recebe `publishedJson`; `?v=` = hash da versão publicada.

## Armadilhas
- Mermaid: evitar `;` em mensagens de sequenceDiagram; evitar `{}` em alias de participant por precaução.
