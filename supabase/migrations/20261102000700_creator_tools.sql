-- Ferramentas do divulgador: logo e "como usar" nos cupons, cupom agendado, link de afiliado,
-- review em vídeo, esgotado, data da última conferência de preço, UTM e métricas de cliques.

alter table public.coupons
  add column logo_url text not null default '',
  add column how_to text not null default '' check (char_length(how_to) <= 400),
  add column starts_at date;

alter table public.products
  add column affiliate_url text not null default '',
  add column video_url text not null default '',
  add column sold_out boolean not null default false,
  add column price_checked_at timestamptz;

-- Preferências dos links que saem da vitrine (UTM). jsonb: o app completa com os padrões.
alter table public.vitrines add column tracking jsonb not null default '{}' check (pg_column_size(tracking) <= 2000);

-- Eventos anônimos da vitrine pública. Qualquer visitante registra; só o dono lê.
create table public.events (
  id bigint generated always as identity primary key,
  vitrine_id uuid not null references public.vitrines (id) on delete cascade,
  kind text not null check (kind in ('view', 'buy', 'copy', 'kit', 'video')),
  item_id uuid,
  created_at timestamptz not null default now()
);
create index events_vitrine_idx on public.events (vitrine_id, created_at desc);

alter table public.events enable row level security;

create policy "visitante registra evento" on public.events for insert to anon, authenticated
  with check (created_at between now() - interval '1 minute' and now() + interval '1 minute' and exists (select 1 from public.vitrines v where v.id = vitrine_id));
create policy "dono lê os eventos" on public.events for select to authenticated
  using (public.owns_vitrine(vitrine_id));

-- Resumo dos últimos `days` dias da vitrine de quem chama: totais por dia e por item.
create function public.vitrine_stats(days int default 30) returns jsonb
language sql stable security invoker set search_path = '' as $$
  with mine as (
    select e.kind, e.item_id, (e.created_at at time zone 'America/Sao_Paulo')::date as day
    from public.events e
    join public.vitrines v on v.id = e.vitrine_id
    where v.owner_id = (select auth.uid())
      and e.created_at >= now() - make_interval(days => least(greatest(days, 1), 90))
  )
  select jsonb_build_object(
    'totals', coalesce((select jsonb_object_agg(kind, n) from (select kind, count(*) n from mine group by kind) t), '{}'),
    'days', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'views', views, 'clicks', clicks) order by day)
      from (select day, count(*) filter (where kind = 'view') views, count(*) filter (where kind <> 'view') clicks
            from mine group by day) t), '[]'),
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', item_id, 'kind', kind, 'n', n))
      from (select item_id, kind, count(*) n from mine where item_id is not null group by item_id, kind) t), '[]')
  );
$$;
revoke execute on function public.vitrine_stats(int) from public, anon;
grant execute on function public.vitrine_stats(int) to authenticated;

create or replace function public.publish_vitrine(content jsonb) returns timestamptz
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
  v_updated timestamptz;
begin
  update public.vitrines set
    handle = content->>'handle',
    name = content->>'name',
    avatar_url = coalesce(content->>'avatarUrl', ''),
    headline = coalesce(content->>'headline', ''),
    sub = coalesce(content->>'sub', ''),
    look = content->'look',
    show = content->'show',
    tracking = coalesce(content->'tracking', '{}'),
    updated_at = now()
  where owner_id = (select auth.uid())
  returning id, updated_at into v_id, v_updated;

  if v_id is null then
    raise exception 'vitrine não encontrada' using errcode = 'P0002';
  end if;

  delete from public.kits where vitrine_id = v_id;
  delete from public.products where vitrine_id = v_id;
  delete from public.coupons where vitrine_id = v_id;

  insert into public.coupons (id, vitrine_id, position, brand, code, kind, value, condition, expires_at, store_url, logo_url, how_to, starts_at)
  select (c->>'id')::uuid, v_id, i, c->>'brand', c->>'code', c->>'kind', (c->>'value')::int,
         coalesce(c->>'condition', ''), (c->>'expiresAt')::date, coalesce(c->>'storeUrl', ''),
         coalesce(c->>'logoUrl', ''), coalesce(c->>'howTo', ''), (c->>'startsAt')::date
  from jsonb_array_elements(content->'coupons') with ordinality as t(c, i);

  insert into public.products (id, vitrine_id, position, name, brand, category, price, coupon_id, url, image_url, icon,
                               affiliate_url, video_url, sold_out, price_checked_at)
  select (p->>'id')::uuid, v_id, i, p->>'name', coalesce(p->>'brand', ''), coalesce(p->>'category', ''),
         (p->>'price')::int, (p->>'couponId')::uuid, coalesce(p->>'url', ''), coalesce(p->>'imageUrl', ''), p->>'icon',
         coalesce(p->>'affiliateUrl', ''), coalesce(p->>'videoUrl', ''), coalesce((p->>'soldOut')::boolean, false),
         (p->>'priceCheckedAt')::timestamptz
  from jsonb_array_elements(content->'products') with ordinality as t(p, i);

  insert into public.kits (id, vitrine_id, position, name, description, signature, product_ids, style)
  select (k->>'id')::uuid, v_id, i, k->>'name', coalesce(k->>'description', ''),
         coalesce(k->>'signature', ''),
         coalesce(array(select jsonb_array_elements_text(k->'productIds'))::uuid[], '{}'),
         coalesce(k->'style', '{}')
  from jsonb_array_elements(content->'kits') with ordinality as t(k, i);

  return v_updated;
end;
$$;
