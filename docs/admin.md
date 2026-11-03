# Administração e operação

## Visão geral (sem jargão)

O MyVitri **não tem um painel administrativo próprio** — não existe rota `/admin`, papel de "administrador" nem usuário especial no código. (O nome `admin` está até na lista de links reservados, `lib/vitrine/types.ts:7`, justamente para ninguém criar uma vitrine com esse endereço.)

Na prática, o "painel de admin" do time é o **painel do Supabase** (o serviço que guarda o banco, os logins e as fotos) e, para o site em si, o **painel da Vercel** (hospedagem, variáveis de ambiente, logs e Web Analytics). É como uma loja que não tem sala de gerência: quando precisa mexer no estoque, o gerente vai direto ao depósito.

Este documento lista as tarefas operacionais reais que o time precisa fazer e **como fazer cada uma** com essas ferramentas.

> ⚠️ O painel do Supabase (Table Editor e SQL Editor) roda como `postgres`/`service_role` e **ignora as regras de RLS**. Tudo o que você editar lá vale na hora, para qualquer vitrine. Cuidado redobrado em produção.

## Onde fica cada coisa

| Ferramenta | Seção | Para quê |
|---|---|---|
| Supabase | **Table Editor** | Ver e editar linhas de `vitrines`, `coupons`, `products`, `kits`, `vitrine_drafts`, `events` |
| Supabase | **SQL Editor** | Consultas e correções em lote (exemplos abaixo) |
| Supabase | **Authentication → Users** | Ver contas, apagar usuário (dispara a cascata) |
| Supabase | **Authentication → Providers → Google** | Client ID/Secret do Google OAuth |
| Supabase | **Authentication → URL Configuration** | *Site URL* e *Redirect URLs* (precisam conter `…/auth/callback`) |
| Supabase | **Storage** | Buckets `brand-logos` e `vitrine-photos` (pastas por `uid`) |
| Supabase | **Project Settings → API Keys** | Chave publicável usada em `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| Vercel | **Settings → Environment Variables** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `BRAVE_SEARCH_API_KEY` |
| Vercel | **Logs** | Erros do servidor (tags abaixo) |
| Vercel | **Analytics** | Page views (via `<Analytics />` em `app/layout.tsx:20`) |
| Brave | [brave.com/search/api](https://brave.com/search/api/) | Chave da Search API (opcional) |

## Ponto de atenção antes de qualquer edição manual: o cache

As páginas públicas leem o banco através de funções com `"use cache"` (`lib/vitrine/data.ts:15-24` e `:51-98`) com perfil `cacheLife("hours")` — no Next 16 isso significa *stale* de 5 min, revalidação a cada **1 hora** e expiração em 1 dia. O cache só é invalidado na hora pelas Server Actions do próprio app (`updateTag` ao publicar, criar vitrine ou excluir conta).

**Consequência:** se você alterar uma vitrine direto no Supabase, a página `/{handle}` e a home podem continuar mostrando a versão antiga por até ~1 hora. Não existe rota nem botão de "limpar cache" no app. Opções: aguardar a revalidação, ou pedir para a creator clicar em **Publicar** de novo no editor (o que dispara `updateTag`).

## Tarefas do dia a dia

### 1. Encontrar a conta e a vitrine de alguém

```sql
-- por e-mail
select u.id as user_id, u.email, u.created_at, v.handle, v.name, v.updated_at
from auth.users u
left join public.vitrines v on v.owner_id = u.id
where u.email = 'pessoa@exemplo.com';

-- por link
select v.*, u.email
from public.vitrines v
left join auth.users u on u.id = v.owner_id
where v.handle = 'marinacosta';
```

### 2. Ver o conteúdo publicado e o rascunho de uma vitrine

```sql
select position, brand, code, kind, value, expires_at, starts_at
from public.coupons where vitrine_id = '<vitrine_id>' order by position;

select position, name, price / 100.0 as preco_reais, coupon_id, sold_out, url
from public.products where vitrine_id = '<vitrine_id>' order by position;

select position, name, product_ids from public.kits where vitrine_id = '<vitrine_id>' order by position;

-- rascunho ainda não publicado (JSON completo do editor)
select updated_at, content from public.vitrine_drafts where owner_id = '<user_id>';
```

> Se existir rascunho, a creator está vendo **ele** no editor, não o publicado (`app/editor/page.tsx:23`). Edições manuais no publicado serão sobrescritas na próxima vez que ela publicar o rascunho.

### 3. Recuperar ou trocar o link (handle) de uma vitrine

Os [Termos](../app/termos/page.tsx) (seção 2) dizem que o time pode recuperar links que se passem por outra pessoa ou marca.

```sql
update public.vitrines set handle = 'novo_handle' where handle = 'handle_atual';
```

- O novo valor precisa casar com `^[a-z0-9_.]{3,30}$` e ser único (o banco recusa o contrário).
- O app também bloqueia nomes reservados (`RESERVED_HANDLES`, `lib/vitrine/types.ts:6-9`), mas o banco **não** — não use esses nomes manualmente.
- O link antigo passa a dar 404 e **não há redirecionamento**.
- Se a creator tiver rascunho, o `handle` antigo continua dentro do JSON do rascunho; na próxima publicação ela volta ao antigo. Apague o rascunho junto: `delete from public.vitrine_drafts where owner_id = '<user_id>';`

### 4. Tirar do ar conteúdo abusivo

Não existe "suspender vitrine". As alternativas, da mais leve para a mais drástica:

| Ação | Como | Efeito |
|---|---|---|
| Remover um item | Apagar a linha em `coupons`/`products`/`kits` | Some após a revalidação do cache. A creator pode recolocar se o item ainda estiver no rascunho. |
| Esvaziar a vitrine | `delete from public.coupons/products/kits where vitrine_id = …` e apagar o rascunho | Vitrine fica só com o perfil |
| Excluir a conta | **Authentication → Users → Delete user** | Cascata apaga vitrine, itens, eventos e rascunho. **Os arquivos do Storage ficam** (passo 5). |

### 5. Excluir uma conta a pedido (LGPD)

A [Política de Privacidade](../app/privacidade/page.tsx) (seção 8) promete exclusão em até 15 dias quando o pedido chega por e-mail. O próprio usuário também pode excluir pelo editor (aba Perfil → "Excluir minha conta"), o que faz tudo automaticamente.

Manualmente:

1. Ache o `user_id` (tarefa 1).
2. No **Storage**, apague as pastas `<user_id>/` dos buckets `brand-logos` e `vitrine-photos` (o banco **não** apaga arquivos em cascata).
3. Em **Authentication → Users**, apague o usuário. A cascata remove `vitrines`, `coupons`, `products`, `kits`, `events` e `vitrine_drafts`.
4. A vitrine pública e a home podem aparecer em cache por até ~1 hora.

### 6. Exportar os dados de alguém (portabilidade)

```sql
select jsonb_build_object(
  'vitrine',  to_jsonb(v),
  'cupons',   (select coalesce(jsonb_agg(to_jsonb(c) order by c.position), '[]'::jsonb) from public.coupons  c where c.vitrine_id = v.id),
  'produtos', (select coalesce(jsonb_agg(to_jsonb(p) order by p.position), '[]'::jsonb) from public.products p where p.vitrine_id = v.id),
  'kits',     (select coalesce(jsonb_agg(to_jsonb(k) order by k.position), '[]'::jsonb) from public.kits     k where k.vitrine_id = v.id),
  'rascunho', (select d.content from public.vitrine_drafts d where d.owner_id = v.owner_id)
)
from public.vitrines v
where v.owner_id = '<user_id>';
```

### 7. Conferir métricas e volume de eventos

```sql
-- eventos por vitrine nos últimos 30 dias
select v.handle, e.kind, count(*)
from public.events e join public.vitrines v on v.id = e.vitrine_id
where e.created_at >= now() - interval '30 days'
group by v.handle, e.kind
order by v.handle, e.kind;

-- tamanho total da tabela
select count(*), min(created_at), max(created_at) from public.events;
```

A tabela `events` nunca é limpa pelo app. O gráfico do editor só lê os últimos 90 dias (`vitrine_stats` limita `days` a 90). Se o time decidir expurgar dados antigos, algo como `delete from public.events where created_at < now() - interval '180 days';` não afeta as métricas visíveis — é uma decisão de produto, não há rotina pronta para isso.

### 8. Recriar a vitrine de demonstração (`/marinacosta`)

A vitrine demo é linkada no rodapé (`components/home/chrome.tsx:64`), na home e na landing. O `supabase/seed.sql` atual **falha** no schema de hoje (usa as colunas antigas `tab`/`title` de `kits`). Para rodar, troque na última instrução do seed:

- `insert into public.kits (id, vitrine_id, position, tab, title, description, signature, product_ids)` → `insert into public.kits (id, vitrine_id, position, name, description, signature, product_ids)`
- `select gen_random_uuid(), v.id, x.pos, x.tab, x.title, x.descr, …` → `select gen_random_uuid(), v.id, x.pos, x.title, x.descr, …`

O seed usa `on conflict (handle) do nothing`; se a vitrine já existir, nada é inserido (e as CTEs seguintes ficam vazias).

### 9. Aplicar migrações em produção

Não há CI nem deploy automático de banco. O fluxo é manual com o [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
npx supabase link --project-ref <project-ref>
```

```bash
npx supabase db push
```

Depois de qualquer migração, regere os tipos e confira o diff:

```bash
npx supabase gen types typescript --project-id <project-ref> --schema public > lib/supabase/database.types.ts
```

> Sem `supabase/config.toml` no repositório, o CLI pode pedir `npx supabase init` antes do `link`. Veja também a pegadinha do buraco na numeração (`000200`/`000300`) em [database.md](database.md#pegadinhas-e-dívidas-de-modelagem).

### 10. Configurar o login com Google

1. No Google Cloud Console, crie um OAuth Client (tipo *Web*) com o *redirect URI* `https://<project-ref>.supabase.co/auth/v1/callback`.
2. No Supabase, **Authentication → Providers → Google**: cole Client ID e Secret.
3. Em **Authentication → URL Configuration**:
   - *Site URL*: a URL pública (ex.: `https://myvitri.com`).
   - *Redirect URLs*: `https://myvitri.com/auth/callback`, `http://localhost:3000/auth/callback` e, se usar previews da Vercel, o padrão dos domínios de preview.
4. Se o `redirectTo` pedido pelo app não estiver na lista, o Supabase volta para a *Site URL* com `?code=…`. O `proxy.ts:11-15` redireciona `/?code=…` para `/auth/callback` para não perder o login, mas o certo é cadastrar a URL.

A tela de consentimento do Google exige os links de [Privacidade](../app/privacidade/page.tsx) e [Termos](../app/termos/page.tsx), que já existem no site (o aviso de aceite fica em `components/auth/forms.tsx:39-53`).

### 11. Ler os logs de erro

Todos os erros de servidor são logados com uma etiqueta fixa no primeiro argumento. Busque por elas nos logs da Vercel:

| Etiqueta | Onde | Significa |
|---|---|---|
| `publish_vitrine` | `app/actions.ts:134` | Publicação falhou por erro que não é "link em uso" |
| `deleteDraft` | `app/actions.ts:127` | Publicou, mas não apagou o rascunho (o rascunho velho volta a aparecer no editor) |
| `saveDraft` | `app/actions.ts:148` | Autosave falhou (o editor mostra "erro ao salvar rascunho") |
| `uploadImage` | `app/actions.ts:198` | Upload para o Storage falhou |
| `delete_my_account` | `app/actions.ts:100` | Exclusão de conta falhou (os arquivos já podem ter sido apagados) |
| `vitrine_stats` | `app/actions.ts:215` | Métricas não carregaram |
| `track` | `app/api/t/route.ts:24` | Insert em `events` falhou |
| `getHomeFeed` | `app/page.tsx:69` | Home abriu sem dados (banco fora ou erro de consulta) |

### 12. Trocar chaves

| Chave | Onde trocar | Observação |
|---|---|---|
| Publicável do Supabase | Vercel env + redeploy | Variável `NEXT_PUBLIC_*` entra no build; precisa de novo deploy |
| Brave Search | Vercel env + redeploy | Sem a chave, a importação continua funcionando, só sem o fallback de busca |
| Google OAuth | Supabase → Providers → Google | Não precisa de deploy |

## Pegadinhas operacionais

- **Não existe papel de admin**: qualquer ferramenta interna futura precisará de `service_role` (nunca no navegador) ou de policies novas.
- **Edição manual + cache**: mudanças no banco aparecem com até ~1 hora de atraso (ver acima).
- **Edição manual + rascunho**: a próxima publicação da creator sobrescreve tudo com o rascunho dela.
- **Excluir usuário pelo painel não apaga os arquivos** do Storage; isso só acontece pelo botão do editor (`deleteAccountAction`), e mesmo assim limitado a 1000 arquivos por bucket.
- **Arquivos órfãos**: trocar a foto de capa/perfil/produto ou o logo não apaga o arquivo anterior do bucket. Os buckets só crescem.
- **A Política de Privacidade não menciona a Vercel Web Analytics** (seção 5 diz "Não usamos … ferramentas de rastreamento de terceiros"), embora `<Analytics />` esteja ativo em `app/layout.tsx:20`. Vale alinhar o texto com o jurídico.
