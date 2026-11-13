# MyVitri

> 📚 **Documentação:** [arquitetura](docs/architecture.md) e [banco de dados](docs/database.md).

O **MyVitri** (`myvitri.com`) é uma plataforma onde **creators** montam uma **vitrine pública** com os **cupons de desconto** das marcas que divulgam, os **produtos** que indicam (foto e nome, com o clique levando ao link que a creator colou, de afiliado ou da loja) e **outfits** (a foto da creator usando um conjunto, com a lista das peças; no código, `posts`). O cupom é só da marca e fica na seção Cupons. A vitrine fica num link curto (`myvitri.com/@seunome`) para a bio do Instagram/TikTok. O seguidor copia o cupom da marca e abre o produto na loja — o MyVitri não vende nada.

| | |
|---|---|
| **Stack** | Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind CSS v4 · Zod 4 |
| **Backend** | Supabase: Postgres com RLS, Auth (e-mail e senha, e Google), Storage |
| **Hospedagem** | Vercel (inferido: Web Analytics, Speed Insights + integração), funções em Portland (`pdx1`, `vercel.json`), junto ao Supabase |
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

   - `20261104000000_landing_home.sql`: a busca da home logada (`GET /api/busca`), as "Vitrines do dia" de `/inicio` (o ranking de cliques) e a ordem "Em alta hoje" da aba Vitrines dependem dela. Sem ela, a busca responde 500 e a página abre sem o destaque das Vitrines do dia.
   - `20261105000000_metrics_previous.sql`: faz `vitrine_stats()` devolver também o período anterior, usado para a variação ("↑ 18% vs. 30 dias anteriores") em `/metricas`. Sem ela a página de métricas funciona, só sem as variações.
   - `20261105010000_favorites.sql`: tabela `favorites` (o coração nas vitrines e a aba **Favoritas** de `/inicio`). Sem ela, favoritar falha e a aba fica vazia.
   - `20261105010100_comments.sql`: tabela `comments`, o trigger `comments_stamp` e as policies dos comentários da vitrine pública. Sem ela, a vitrine abre com a lista de comentários vazia e comentar falha.
   - `20261109000000_comment_replies.sql`: coluna `comments.parent_id`, índice e a nova `stamp_comment()` (respostas aos comentários). Sem ela, responder falha e a lista de comentários da vitrine também (a consulta pede `parent_id`).
   - `20261109000100_favorite_count.sql`: função `favorite_count()`, o número de favoritos mostrado no perfil da vitrine. Sem ela, a consulta falha e a vitrine aparece sem o número (o coração continua).
   - `20261109000200_profiles_onboarding.sql`: tabela `profiles` (respostas do onboarding de `/boas-vindas` e origem do cadastro), as políticas RLS dela, o preenchimento das contas existentes (marcadas com `onboarding_version = 0`, para não passarem pelo onboarding) e o schema `analytics`, com as views `account_activation` e `funnel_steps`. Aplicada no Supabase remoto em 09/11/2026 (as 4 contas existentes foram marcadas com versão 0). Sem ela, a leitura de `profiles` falha e o app segue sem mostrar o onboarding.
   - `20261110000000_posts.sql`: tabela `posts`, o tipo de evento `post` e a nova `publish_vitrine()`, que grava os posts e deixa de apagar os kits antigos. Sem ela, a vitrine, o catálogo e o carrossel abrem normalmente, só sem outfits (os "posts" do banco), mas publicar com a função antiga não grava os outfits do editor (e apaga os kits que existirem). Aplicada no Supabase do projeto `vitri` em 10/11/2026.
   - `20261110020000_vitrine_socials.sql`: coluna `vitrines.socials` (redes sociais da creator: Instagram, TikTok, YouTube e X) e a nova `publish_vitrine()`, que passa a gravar também as redes. Aplicada no Supabase do projeto `vitri` em 10/11/2026. Num banco sem ela, o editor guarda as redes no rascunho, mas publicar não as grava e a vitrine pública não mostra os ícones.
   - `20261110030000_comment_reply_to.sql`: coluna `comments.reply_to_id` e a nova `stamp_comment()`, para a resposta a uma resposta guardar a quem responde (o app usa para montar a árvore de respostas e o "@Nome"). Aplicada no Supabase do projeto `vitri` em 10/11/2026. Sem ela, a consulta de comentários (que pede `reply_to_id`) falha.
   - `20261110030100_onboarding_outro.sql`: onboarding versão 2. Troca "rede social" pelas redes em "Como conheceu" (`heard_from`), aceita `outro` na faixa de audiência, cria `profiles.other_answers` (texto livre das opções "Outro") e recria `analytics.account_activation` com essa coluna. Aplicada no Supabase remoto em 10/11/2026. Sem ela, salvar o onboarding falha nas respostas novas.
   - `20261110030200_session_recording_consent.sql`: consentimento de gravação de sessão. Cria `profiles.recording_opt_in` (default `false`) e `profiles.recording_opt_in_at` e recria `analytics.account_activation` com `recording_opt_in` no fim. Aplicada no Supabase remoto em 10/11/2026. Sem ela, salvar o onboarding falha e a leitura do consentimento vira "não consentiu".
   - `20261110040000_storage_quota.sql`: função `storage_upload_allowed()` e as policies de envio do Storage (`brand-logos` e `vitrine-photos`), que passam a limitar cada pessoa a 500 arquivos, 100 MiB e 40 envios a cada 10 minutos. Aplicada no Supabase do projeto `vitri` em 10/11/2026. Num banco sem ela, não há cota e o app funciona como antes (o envio só é limitado pelo tamanho e tipo do bucket).

3. (Opcional) Crie a vitrine de demonstração `/marinacosta`. O `supabase/seed.sql` atual usa as colunas antigas `tab`/`title` de `kits` e precisa ser ajustado para `name` antes de rodar (os kits não são mais usados pelo app).

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
3. O envio de e-mails do SMTP padrão do Supabase é limitado e serve só para testes. Para uso real, configure um SMTP próprio em **Authentication → Emails**. Os modelos de e-mail (confirmar conta e senha nova) são editados no mesmo lugar e hoje existem só em português; o app não os traduz.
4. Os links por e-mail usam PKCE: abra-os no mesmo navegador em que a conta foi criada ou a senha foi pedida. Se a confirmação for aberta em outro navegador, o e-mail fica confirmado mas a troca por sessão falha, e a pessoa entra com a senha em `/entrar`. O modal que avisa do envio tem **Reenviar e-mail**, que espera 60 s (`RESEND_AFTER_SECONDS` em `lib/auth/email.ts`, o intervalo mínimo padrão do Supabase Auth entre e-mails para o mesmo endereço). Quem tenta entrar em `/entrar` com a conta ainda não confirmada recebe o link de novo e vê o mesmo modal.

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
| `NEXT_PUBLIC_POSTHOG_KEY` | não | PostHog → Project Settings (chave do projeto, pública) | Liga o PostHog (funis e retenção, navegador e servidor). Sem ela, nada é enviado: dev e preview funcionam sem a conta |
| `NEXT_PUBLIC_POSTHOG_HOST` | não | Região do projeto no PostHog | Endereço do PostHog. Padrão `https://us.i.posthog.com` (EUA); para a UE, `https://eu.i.posthog.com` |
| `TRACK_SALT` | não em dev, recomendada em produção | string aleatória longa, só do servidor | Reservada para o hash diário anônimo de visitante (`events.visitor`). O código de `/api/t` ainda não a usa. |

### 5. Instalar e subir o servidor

```bash
npm ci
```

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

O site abre em português; a versão em inglês fica em [http://localhost:3000/en](http://localhost:3000/en), com os nomes das páginas traduzidos (por exemplo `/en/home` no lugar de `/inicio`).

### 6. Primeiro acesso ("usuário admin")

**Não existe usuário administrador nem painel admin** no app. Para ter uma vitrine de teste:

1. Acesse [http://localhost:3000/criar-vitrine](http://localhost:3000/criar-vitrine), escolha nome e link e, em "Como você quer entrar?", clique em **Criar com Google** (não pede e-mail nem senha) ou preencha e-mail, senha e a confirmação da senha e use **Criar conta** (depois confirme o e-mail pelo link recebido, no mesmo navegador).
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

- **Páginas:** landing com hero de texto e foto (`LookHero`, imagem `public/hero/retrato.webp`), vitrines, cupons, categorias e marcas (`/`, estática; quem tem sessão é redirecionado para `/inicio`), home (`/inicio`, só para quem entrou: sem sessão o proxy leva para `/`; com o perfil no topo, como num perfil de rede social: foto, nome, endereço da vitrine com **Copiar link**, as visitas, os cliques e os cupons copiados dos últimos 7 dias, e os botões **Editar vitrine** e **Ver minha vitrine** (ou o convite para criar uma vitrine, para quem ainda não tem); embaixo, **Explorar**, com a busca de vitrines, marcas e produtos e cinco abas presas no topo ao rolar, cujo estado fica na URL, `?tab=`: **Favoritas** (a padrão: as vitrines marcadas com o coração, só de quem entrou, com sugestões quando está vazia) e os catálogos **Vitrines** (com as Vitrines do dia em destaque), **Produtos**, **Outfits** e **Marcas**, com filtros, ordem e "Ver mais"; o **Entrar** do site, `LoginButton`, leva a `/entrar` e depois do login volta à mesma página), entrar (`/entrar`, e-mail e senha, com botão para mostrar a senha, ou Google, com "Esqueci minha senha"), senha nova (`/nova-senha`, com confirmação da senha, para quem chegou pelo link do e-mail), métricas da vitrine (`/metricas`, só logado), criação de conta/vitrine (`/criar-vitrine`, nome, link, e-mail, senha e confirmação da senha, ou Google, com a foto da arara ao lado no desktop; a venda e o FAQ ficam no fim da landing), vitrine pública (`/@{handle}`, com coração de favoritar e comentários de quem entrou), editor (`/editor`), páginas legais (`/privacidade`, `/termos`).
- **Mutações:** todas em Server Actions (`app/actions.ts`); a autorização é feita pelo banco (RLS), o app nunca usa chave de serviço.
- **Leitura pública** com `"use cache"` + tags (`vitrine:{handle}`, `home`) e `cacheLife("hours")` (`"minutes"` para o ranking e a busca da home logada, que passa por `GET /api/busca`); os catálogos das abas de `/inicio` (`lib/vitrine/catalog/`) usam a tag `home` e filtram em memória a partir da URL; a publicação invalida com `updateTag`. Comentários e o número de favoritos têm cache próprio (tags `comentarios:{handle}` e `favoritos:{handle}`); o que é por pessoa (coração, formulário, botão de excluir) vem de `GET /api/eu` no navegador.
- **Favoritos e comentários:** tabelas `favorites` (lista privada de cada conta) e `comments` (leitura pública, com respostas em um nível, preenchida por um trigger do banco a partir da sessão); veja [docs/database.md](docs/database.md).
- **Editor:** rascunho salvo automaticamente em `vitrine_drafts`; **Publicar** grava tudo de uma vez pela função `publish_vitrine()` do Postgres. Nome, link e foto de perfil (Configurações, no menu da conta da home, ou tocando na foto do topo da home; sem foto própria vale a da conta Google, gravada em `avatar_url`, e sem nenhuma das duas a vitrine mostra as iniciais) e a capa (painel Perfil do editor, seção "Capa") não passam pelo rascunho: `updateProfileAction`, `updateAvatarAction` (tocar na foto grande do topo da home) e `updateCoverAction` gravam direto em `vitrines`, na hora. Sem capa, a vitrine mostra a primeira letra do nome.
- **Onboarding:** quem acabou de criar a conta responde algumas perguntas em `/boas-vindas` (`/en/welcome`), ou pula, antes de usar `/inicio` ou `/editor`; as respostas e a origem do cadastro (cookie `vitri_ref`) ficam em `profiles`.
- **Analytics (dois níveis, fora da métrica das creators):** views no schema `analytics` do Postgres (`account_activation`, `funnel_steps`, só pelo SQL Editor) e PostHog (opcional, `posthog-js` no navegador e `posthog-node` nas Server Actions, com o id interno da conta como identificador). A página `/privacidade` (pt e en) declara o PostHog (pageviews, cliques com o texto do elemento, mapas de calor e desempenho do carregamento, gravação de sessões só de quem marcar o consentimento no onboarding (implementada, desligada para todos os demais; exige o Session Replay ativado no projeto do PostHog)), o Vercel Web Analytics e o Speed Insights, o cookie `vitri_ref` (30 dias) e as respostas do onboarding em `profiles`. Não há banner de consentimento.
- **Métricas:** eventos anônimos via `POST /api/t` na tabela `events`, agregados por `vitrine_stats()` e mostrados na página `/metricas`.

- **Idiomas (i18n):** o site inteiro existe em português (sem prefixo, o padrão: `/inicio`) e em inglês (prefixo `/en` e nomes de página traduzidos: `/en/home`, `/en/sign-in`; os nomes ficam em `pathnames` de `lib/i18n/routing.ts`), com `next-intl`. Os parâmetros de URL são em inglês nos dois idiomas (`?tab=`, `?period=`). As páginas ficam em `app/[locale]/`, os textos em `messages/pt-BR.json` e `messages/en.json` (mesmas chaves) e o idioma vem da URL; o cookie `NEXT_LOCALE` só lembra a última escolha, e o idioma do navegador é ignorado. O fuso é sempre `America/Sao_Paulo` e os preços, BRL. Fora do escopo: o conteúdo das creators não é traduzido, os e-mails do Supabase Auth continuam só em português (configurados no painel do Supabase) e o `llms.txt` é só em português. Como adicionar texto ou idioma: [Internacionalização](docs/architecture.md#internacionalização-i18n).

Mais em [docs/architecture.md](docs/architecture.md).

### Estrutura de pastas

```text
app/[locale]/        páginas e imagens por idioma (layout raiz incluso); /en/... é o inglês
app/                 fora do idioma: actions.ts, api/, auth/callback, llms.txt, robots.ts, sitemap.ts, global-not-found.tsx, global-error.tsx
components/          analytics/ (PostHog), auth/, editor/, onboarding/ (perguntas de /boas-vindas), storefront/, home/ (com catalog/ e tabs/), metrics/, brand/ (com LocaleSwitcher, ErrorScreen, a tela dos erros e 404, e Skeleton, base das telas de espera), legal/ (termos e privacidade em pt e en)
lib/                 analytics/ (PostHog e cookie de atribuição), onboarding/ (opções, Zod e gravação em profiles), brand.ts, fonts.ts, i18n/ (idiomas, prefixo e nome das páginas por idioma em routing.ts, navegação com idioma em navigation.ts, idioma por requisição e fuso em request.ts, tipagem das mensagens), supabase/ (clientes e tipos), vitrine/ (domínio, com catalog/)
supabase/            migrations/ (SQL em ordem) e seed.sql
messages/            pt-BR.json e en.json, catálogo de textos
proxy.ts             proxy do Next 16 (idioma com next-intl, sessão, retorno do OAuth, cookie de atribuição `vitri_ref`, / e /entrar → /inicio com sessão e /inicio → / sem sessão)
docs/                architecture.md e database.md
```

