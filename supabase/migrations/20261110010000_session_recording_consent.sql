-- Consentimento para gravação de sessão (PostHog Session Replay) de quem entra no programa de testes.
-- A gravação só começa para quem marcou `recording_opt_in` no onboarding (lib/analytics/client.ts).

alter table public.profiles
  add column recording_opt_in boolean not null default false,
  add column recording_opt_in_at timestamptz;

-- A view ganha duas colunas no fim (create or replace só aceita isso); o funil não muda.
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
  p.other_answers,
  p.recording_opt_in
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
