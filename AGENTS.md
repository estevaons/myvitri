<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## ⚠ OBRIGATÓRIO: Sincronização de documentação

**Ao finalizar QUALQUER alteração de código neste repositório, é OBRIGATÓRIO executar, como última etapa, o agente `doc-sync-onboarding` (`.claude/agents/doc-sync-onboarding.md`) para atualizar a documentação (`README.md` e arquivos em `docs/`) refletindo as mudanças feitas.**

Isso vale para toda e qualquer modificação: rotas e páginas em `app/`, Server Actions (`app/actions.ts`), `proxy.ts`, migrações do Supabase (tabelas, colunas, índices, políticas RLS, funções RPC, buckets do Storage), seed, schemas e regras de domínio em `lib/`, cache e tags, integrações externas, variáveis de ambiente, dependências, configuração (`next.config.ts` etc.) e scripts de infraestrutura.

Nenhuma tarefa de código é considerada concluída antes de a documentação ter sido sincronizada por esse agente.

📚 Documentação do projeto: [`docs/index.md`](docs/index.md).
