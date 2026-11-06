# MyVitri

> 📚 **Documentação:** [arquitetura](docs/architecture.md) e [banco de dados](docs/database.md).

O **MyVitri** (`myvitri.com`) é uma plataforma onde **creators** montam uma **vitrine pública** com os **cupons de desconto** das marcas que divulgam, os **produtos** que indicam (foto e nome, com o clique levando ao link que a creator colou, de afiliado ou da loja) e **kits** de produtos. O cupom é só da marca e fica na seção Cupons. A vitrine fica num link curto (`myvitri.com/seunome`) para a bio do Instagram/TikTok. O seguidor copia o cupom da marca e abre o produto na loja — o MyVitri não vende nada.

| | |
|---|---|
| **Stack** | Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind CSS v4 · Zod 4 |
| **Backend** | Supabase: Postgres com RLS, Auth (e-mail e senha, e Google), Storage |
| **Hospedagem** | Vercel (inferido: Web Analytics + integração) |
| **Idioma do produto e do código** | Português do Brasil |

> ⚠️ **Este projeto usa Next.js 16**, que mudou APIs e convenções (ex.: `proxy.ts` no lugar de `middleware.ts`, `updateTag`, `"use cache"`). Antes de escrever código, leia o guia correspondente em `node_modules/next/dist/docs/` — veja [`AGENTS.md`](AGENTS.md).

---

## Como rodar o projeto

### 1. Pré-requisitos

| Ferramenta | Versão / observação |
|---|---|
| Node.js | `>= 20.9.0` (exigência do Next 16) |
| npm | o repositório tem `package-lock.json` |
| Conta no [Supabase](https://supabase.com) | um projeto para desenvolvimento (recomendado) — ou Docker + Supabase CLI para rodar local |
| Projeto no Google Cloud | OAuth Client "Web" para o login com Google (o login com e-mail e senha não precisa dele) |
| Chave da [Brave Search API](https://brave.com/search/api/) | **opcional** (melhora a importação de produtos por link) |

### 2. Banco (Supabase)

O repositório traz as migrações em `supabase/migrations/` e um seed em `supabase/seed.sql`, mas **não** traz `supabase/config.toml`. O caminho mais simples é usar um projeto Supabase na nuvem só para desenvolvimento.

**Opção A — projeto na nuvem (recomendado)**

1. Crie um projeto no Supabase.
2. Aplique as migrações **em ordem de nome**. Pelo CLI (pode pedir `npx supabase init` antes, por causa da falta do `config.toml`):

```bash
npx supabase link --project-ref <project-ref>
```

```bash
npx supabase db push
```

   Ou cole cada arquivo de `supabase/migrations/` no **SQL Editor**, do mais antigo para o mais novo.

   Aplique também as mais recentes:

   - `20261104000000_landing_home.sql`: a busca da home logada (`GET /api/busca`), os carrosséis de `/inicio` ("Vitrines do dia" e "Últimos kits") e a ordem "Em alta hoje" da aba Vitrines dependem dela. Sem ela, a busca responde 500 e a página abre sem os carrosséis.
   - `20261105000000_metrics_previous.sql`: faz `vitrine_stats()` devolver também o período anterior, usado para a variação ("↑ 18% vs. 30 dias anteriores") em `/metricas`. Sem ela a página de métricas funciona, só sem as variações.
   - `20261105010000_favorites.sql`: tabela `favorites` (o coração nas vitrines e a aba **Favoritas** de `/inicio`). Sem ela, favoritar falha e a aba fica vazia.
   - `20261105010100_comments.sql`: tabela `comments`, o trigger `comments_stamp` e as policies dos comentários da vitrine pública. Sem ela, a vitrine abre com a lista de comentários vazia e comentar falha.

3. (Opcional) Crie a vitrine de demonstração `/marinacosta`. O `supabase/seed.sql` atual usa as colunas antigas `tab`/`title` de `kits` e precisa ser ajustado para `name` antes de rodar.

**Opção B — Supabase local (Docker)**

```bash
npx supabase init
```

```bash
npx supabase start
```

```bash
npx supabase db reset
```

O `start` imprime a URL da API e a chave publicável para o `.env.local`. O `db reset` aplica as migrações e roda o seed — que hoje falha (veja acima); corrija o seed antes. Para o login funcionar localmente, configure `site_url` e `additional_redirect_urls` no `supabase/config.toml` gerado (e `[auth.external.google]`, para o Google).

Detalhes do schema: [docs/database.md](docs/database.md).

### 3. Login com e-mail e com Google

O login com e-mail e senha e o recebimento de links por e-mail (confirmar conta e criar senha nova) dependem de configurações feitas **no painel do Supabase**, não em migração: quem monta outro ambiente precisa repeti-las.

**E-mail e senha**

1. No Supabase: **Authentication → Providers → Email**: provedor ativado, **Confirm email** ligado e senha mínima de **8 caracteres** (o mesmo valor de `PASSWORD_MIN` em `lib/auth/password.ts`).
2. No Supabase: **Authentication → URL Configuration**: *Site URL* `http://localhost:3000` e *Redirect URLs* com `http://localhost:3000/auth/callback`. Os links por e-mail só funcionam se o endereço de `/auth/callback` do ambiente estiver nessa lista.
3. O envio de e-mails do SMTP padrão do Supabase é limitado e serve só para testes. Para uso real, configure um SMTP próprio em **Authentication → Emails**.
4. Os links por e-mail usam PKCE: abra-os no mesmo navegador em que a conta foi criada ou a senha foi pedida. Se a confirmação for aberta em outro navegador, o e-mail fica confirmado mas a troca por sessão falha, e a pessoa entra com a senha em `/entrar`.

**Google**

1. No Google Cloud Console, crie um OAuth Client (Web) com o redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`.
2. No Supabase: **Authentication → Providers → Google** (Client ID e Secret).
3. A *Site URL* e as *Redirect URLs* são as do passo 2 de e-mail e senha.

### 4. Variáveis de ambiente

Copie o exemplo e preencha:

```bash
cp .env.example .env.local
```

| Variável | Obrigatória | Onde achar | Para quê |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | sim | Supabase → Project Settings → API | URL do projeto (`https://<ref>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | sim | Supabase → Project Settings → API Keys | Chave publicável (`sb_publishable_…`). Não existe chave de serviço no projeto. |
| `BRAVE_SEARCH_API_KEY` | não | brave.com/search/api | Fallback quando a loja bloqueia a leitura da página do produto |
| `TRACK_SALT` | não em dev, recomendada em produção | string aleatória longa, só do servidor | Reservada para o hash diário anônimo de visitante (`events.visitor`). O código de `/api/t` ainda não a usa. |

### 5. Instalar e subir o servidor

```bash
npm ci
```

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

### 6. Primeiro acesso ("usuário admin")

**Não existe usuário administrador nem painel admin** no app. Para ter uma vitrine de teste:

1. Acesse [http://localhost:3000/criar-vitrine](http://localhost:3000/criar-vitrine), escolha nome e link e crie a conta com e-mail e senha (**Criar conta**, depois confirme o e-mail pelo link recebido, no mesmo navegador) ou clique em **Criar com Google**.
2. Depois do login você cai no editor (`/editor`). Em logins seguintes (botão **Entrar** do site, que leva a `/entrar` com e-mail e senha ou Google), você volta à página em que clicou em **Entrar** (ou, sem ela, à home `/inicio`), de onde se chega ao editor. Quem esqueceu a senha usa **Esqueci minha senha** em `/entrar` e define a nova em `/nova-senha`. Cadastre um cupom, um produto e clique em **Publicar**.
3. Veja a vitrine em `http://localhost:3000/<seu-link>`.

Tarefas administrativas (editar dados, excluir contas, liberar links) são feitas no painel do Supabase.

### 7. Outros comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (Turbopack). Também reescreve o bloco do `AGENTS.md` (`experimental.agentFeedback`). |
| `npm run build` | Build de produção |
| `npm start` | Sobe o build de produção |
| `npm run lint` | ESLint (`eslint-config-next` core-web-vitals + TypeScript) |

Não há testes automatizados, CI, Docker, filas ou workers. O único serviço auxiliar é o Supabase.

---

## Arquitetura e infraestrutura (resumo)

```mermaid
graph LR
    U[Navegador] --> N["Next.js 16 na Vercel"]
    N -->|"PostgREST + RLS"| DB[(Supabase Postgres)]
    N -->|e-mail e senha, Google| AU[Supabase Auth]
    N -->|uploads| ST[(Supabase Storage)]
    N -->|ler páginas e fotos de produto| L[Sites das lojas]
    N -.->|opcional| BR[Brave Search API]
    U -->|imagens públicas| ST
```

- **Páginas:** landing com hero de texto e foto (`LookHero`, imagem `public/hero/retrato.webp`), vitrines, cupons, categorias e marcas (`/`, estática; quem tem sessão é redirecionado para `/inicio`), home (`/inicio`, só para quem entrou: sem sessão o proxy leva para `/`; com saudação, busca de vitrines, marcas e produtos e seis abas cujo estado fica na URL, `?aba=`: **Para você**, com o bloco da própria vitrine e os carrosséis de vitrines do dia e últimos kits, **Favoritas** (as vitrines marcadas com o coração, só de quem entrou) e os catálogos **Vitrines**, **Produtos**, **Kits** e **Marcas**, com filtros, ordem e "Ver mais"; o **Entrar** do site, `LoginButton`, leva a `/entrar` e depois do login volta à mesma página), entrar (`/entrar`, e-mail e senha ou Google, com "Esqueci minha senha"), senha nova (`/nova-senha`, para quem chegou pelo link do e-mail), métricas da vitrine (`/metricas`, só logado), criação de conta/vitrine (`/criar-vitrine`, nome, link, e-mail e senha ou Google, com a foto da arara ao lado no desktop; a venda e o FAQ ficam no fim da landing), vitrine pública (`/{handle}`, com coração de favoritar e comentários de quem entrou), editor (`/editor`), páginas legais (`/privacidade`, `/termos`).
- **Mutações:** todas em Server Actions (`app/actions.ts`); a autorização é feita pelo banco (RLS), o app nunca usa chave de serviço.
- **Leitura pública** com `"use cache"` + tags (`vitrine:{handle}`, `home`) e `cacheLife("hours")` (`"minutes"` para o ranking e a busca da home logada, que passa por `GET /api/busca`); os catálogos das abas de `/inicio` (`lib/vitrine/catalog/`) usam a tag `home` e filtram em memória a partir da URL; a publicação invalida com `updateTag`. Comentários têm cache próprio (tag `comentarios:{handle}`); o que é por pessoa (coração, formulário, botão de excluir) vem de `GET /api/eu` no navegador.
- **Favoritos e comentários:** tabelas `favorites` (lista privada de cada conta) e `comments` (leitura pública, preenchida por um trigger do banco a partir da sessão); veja [docs/database.md](docs/database.md).
- **Editor:** rascunho salvo automaticamente em `vitrine_drafts`; **Publicar** grava tudo de uma vez pela função `publish_vitrine()` do Postgres. Nome, link e foto de perfil (Configurações, no menu da conta da home; sem foto própria vale a da conta Google, gravada em `avatar_url`, e sem nenhuma das duas a vitrine mostra as iniciais) e a capa (bloco "Sua vitrine" da home) não passam pelo rascunho: `updateProfileAction` e `updateCoverAction` gravam direto em `vitrines`, na hora. Sem capa, a vitrine mostra a primeira letra do nome.
- **Métricas:** eventos anônimos via `POST /api/t` na tabela `events`, agregados por `vitrine_stats()` e mostrados na página `/metricas` (a antiga aba do editor foi removida; `/editor?aba=metricas` redireciona).

Mais em [docs/architecture.md](docs/architecture.md).

### Estrutura de pastas

```text
app/                 rotas (páginas, route handlers, imagens OG) + actions.ts + layout
components/          auth/, editor/, storefront/, home/ (com catalog/ e tabs/), metrics/, brand/
lib/                 brand.ts, supabase/ (clientes e tipos), vitrine/ (domínio, com catalog/)
supabase/            migrations/ (SQL em ordem) e seed.sql
proxy.ts             proxy do Next 16 (sessão, retorno do OAuth, / e /entrar → /inicio com sessão e /inicio → / sem sessão, /editor?aba=metricas → /metricas)
docs/                architecture.md e database.md
```

