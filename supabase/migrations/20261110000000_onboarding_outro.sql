-- Onboarding v2: "Como você conheceu" lista as redes (não mais "rede social"), a faixa de audiência ganha
-- "outro", e cada "Outro" aceita um texto livre guardado em `other_answers` (chave = nome da pergunta).
-- Os valores de heard_from e audience_band são conferidos aqui; as listas continuam conferidas pelo Zod.

-- 'rede-social' saiu das opções: quem tinha essa resposta fica sem resposta (a rede exata não foi informada).
update public.profiles set heard_from = null where heard_from = 'rede-social';

alter table public.profiles drop constraint if exists profiles_heard_from_check;
alter table public.profiles add constraint profiles_heard_from_check check (heard_from in (
  'outra-creator', 'indicacao', 'google', 'anuncio',
  'instagram', 'tiktok', 'youtube', 'kwai', 'pinterest', 'whatsapp', 'telegram', 'blog',
  'outro'
));

alter table public.profiles drop constraint if exists profiles_audience_band_check;
alter table public.profiles add constraint profiles_audience_band_check check (audience_band in (
  'menos-1k', '1k-10k', '10k-50k', '50k-200k', '200k-1m', 'acima-1m', 'outro'
));

-- Texto livre das opções "Outro" (até 60 caracteres por pergunta, no máximo 5 perguntas).
alter table public.profiles add column other_answers jsonb not null default '{}'
  check (jsonb_typeof(other_answers) = 'object' and pg_column_size(other_answers) <= 1000);

-- A view ganha uma coluna no fim (create or replace só aceita isso); o funil não muda.
create or replace view analytics.account_activation as
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
  ev.first_click_at,
  p.other_answers
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
