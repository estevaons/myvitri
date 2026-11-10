-- Onboarding pós-cadastro: respostas de quem criou a conta (uma linha por conta) e a origem do cadastro.
-- Quem não tem linha ainda não respondeu: /inicio e /editor mandam para /boas-vindas.
-- Os valores de `persona`, `audience_band` e `heard_from` são conferidos aqui; as listas de `networks`,
-- `niches` e `interests` são conferidas pelo Zod (lib/onboarding/options.ts), para mudar opções sem migração.
create table public.profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  -- 'creator' monta a vitrine; 'shopper' só procura cupons. Nulo se a pessoa pulou.
  persona text check (persona in ('creator', 'shopper')),
  networks text[] not null default '{}' check (cardinality(networks) <= 9),
  audience_band text check (audience_band in ('menos-1k', '1k-10k', '10k-50k', '50k-200k', '200k-1m', 'acima-1m')),
  niches text[] not null default '{}' check (cardinality(niches) <= 3),
  interests text[] not null default '{}' check (cardinality(interests) <= 12),
  heard_from text check (heard_from in ('outra-creator', 'indicacao', 'google', 'rede-social', 'anuncio', 'outro')),
  marketing_opt_in boolean not null default false,
  opt_in_at timestamptz,
  -- primeiro toque de atribuição (cookie vitri_ref): utm, ref de vitrine e domínio de origem. Sem IP nem URL completa.
  signup_source jsonb not null default '{}' check (jsonb_typeof(signup_source) = 'object' and pg_column_size(signup_source) <= 2000),
  -- 0 = conta anterior a este onboarding (não é perguntada); 1 = primeira versão das perguntas
  onboarding_version int not null default 1 check (onboarding_version >= 0),
  onboarded_at timestamptz,
  skipped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contas que já existiam não entram no onboarding: recebem a linha marcada como versão 0.
insert into public.profiles (user_id, onboarding_version)
select id, 0 from auth.users
on conflict (user_id) do nothing;

alter table public.profiles enable row level security;

create policy "dono lê o próprio perfil" on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));
create policy "dono cria o próprio perfil" on public.profiles for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "dono atualiza o próprio perfil" on public.profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- sem policy de delete: a linha sai junto com a conta (cascade em delete_my_account)

/*
 * Análise (não é API). O schema `analytics` não está exposto pelo PostgREST e não tem grants para
 * anon/authenticated: as views rodam com o dono e enxergam todas as contas, por isso só o SQL Editor
 * e roles de administração leem daqui. Não exponha este schema no painel da API.
 */
create schema if not exists analytics;
revoke all on schema analytics from public, anon, authenticated;

-- Uma linha por conta, com o que o onboarding respondeu e até onde a pessoa chegou.
create view analytics.account_activation as
select
  u.id as user_id,
  u.created_at as signed_up_at,
  p.onboarding_version,
  p.persona,
  p.onboarded_at,
  p.skipped_at,
  p.audience_band,
  p.niches,
  p.networks,
  p.heard_from,
  p.marketing_opt_in,
  p.signup_source ->> 'source' as utm_source,
  p.signup_source ->> 'medium' as utm_medium,
  p.signup_source ->> 'campaign' as utm_campaign,
  p.signup_source ->> 'ref' as ref,
  p.signup_source ->> 'referrer_host' as referrer_host,
  v.id is not null as has_vitrine,
  coalesce(items.total, 0) as items,
  ev.first_view_at,
  ev.first_click_at
from auth.users u
left join public.profiles p on p.user_id = u.id
left join public.vitrines v on v.owner_id = u.id
left join lateral (
  select (select count(*) from public.coupons c where c.vitrine_id = v.id)
       + (select count(*) from public.products pr where pr.vitrine_id = v.id) as total
) items on true
left join lateral (
  select min(e.created_at) filter (where e.kind = 'view') as first_view_at,
         min(e.created_at) filter (where e.kind <> 'view') as first_click_at
  from public.events e
  where e.vitrine_id = v.id
) ev on true;

-- Funil das contas criadas depois deste onboarding (versão 0 fica de fora).
create view analytics.funnel_steps as
with base as (
  select * from analytics.account_activation
  where onboarding_version is distinct from 0
)
select 1 as ord, 'Conta criada' as step, count(*) as total from base
union all select 2, 'Respondeu o onboarding', count(*) from base where onboarded_at is not null
union all select 3, 'Pulou o onboarding', count(*) from base where skipped_at is not null
union all select 4, 'Criou a vitrine', count(*) from base where has_vitrine
union all select 5, 'Adicionou cupom ou produto', count(*) from base where items > 0
union all select 6, 'Recebeu a 1ª visita', count(*) from base where first_view_at is not null
union all select 7, 'Teve o 1º clique', count(*) from base where first_click_at is not null;
