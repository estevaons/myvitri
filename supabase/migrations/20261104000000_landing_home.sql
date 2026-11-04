-- Landing e home: data de publicação dos kits, visitante anônimo nos eventos,
-- ranking público dos creators do dia (só a ordem) e busca sem acento.

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- Minúsculas e sem acento. immutable (dicionário explícito) para poder entrar em índice.
create function public.fold(t text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(t, '')))
$$;

create index vitrines_name_trgm on public.vitrines using gin (public.fold(name) extensions.gin_trgm_ops);
create index vitrines_handle_trgm on public.vitrines using gin (handle extensions.gin_trgm_ops);
create index coupons_brand_trgm on public.coupons using gin (public.fold(brand) extensions.gin_trgm_ops);
create index products_name_trgm on public.products using gin (public.fold(name) extensions.gin_trgm_ops);

-- Primeira publicação do kit; publish_vitrine preserva pelo id.
alter table public.kits add column published_at timestamptz not null default now();
-- kits que já existiam: a melhor aproximação é a última publicação da vitrine
update public.kits k set published_at = v.updated_at from public.vitrines v where v.id = k.vitrine_id;
create index kits_published_idx on public.kits (published_at desc);

-- Hash diário anônimo do visitante (calculado em /api/t, sem guardar IP): deduplica cliques no ranking.
alter table public.events add column visitor text check (visitor is null or visitor ~ '^[0-9a-f]{16}$');
create index events_day_idx on public.events (created_at desc) where kind <> 'view';

create or replace function public.publish_vitrine(content jsonb) returns timestamptz
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
  v_updated timestamptz;
  v_kit_dates jsonb;
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

  -- kits são reinseridos: guarda a data de publicação de cada um pelo id
  select coalesce(jsonb_object_agg(id::text, published_at), '{}') into v_kit_dates
  from public.kits where vitrine_id = v_id;

  delete from public.kits where vitrine_id = v_id;
  delete from public.products where vitrine_id = v_id;
  delete from public.coupons where vitrine_id = v_id;

  insert into public.coupons (id, vitrine_id, position, brand, code, kind, value, condition, expires_at, store_url, logo_url, how_to, starts_at, color)
  select (c->>'id')::uuid, v_id, i, c->>'brand', c->>'code', c->>'kind', (c->>'value')::int,
         coalesce(c->>'condition', ''), (c->>'expiresAt')::date, coalesce(c->>'storeUrl', ''),
         coalesce(c->>'logoUrl', ''), coalesce(c->>'howTo', ''), (c->>'startsAt')::date,
         coalesce(c->'color', '"auto"')
  from jsonb_array_elements(content->'coupons') with ordinality as t(c, i);

  insert into public.products (id, vitrine_id, position, name, brand, category, price, coupon_id, url, image_url, icon,
                               affiliate_url, video_url, sold_out, price_checked_at)
  select (p->>'id')::uuid, v_id, i, p->>'name', coalesce(p->>'brand', ''), coalesce(p->>'category', ''),
         (p->>'price')::int, (p->>'couponId')::uuid, coalesce(p->>'url', ''), coalesce(p->>'imageUrl', ''), p->>'icon',
         coalesce(p->>'affiliateUrl', ''), coalesce(p->>'videoUrl', ''), coalesce((p->>'soldOut')::boolean, false),
         (p->>'priceCheckedAt')::timestamptz
  from jsonb_array_elements(content->'products') with ordinality as t(p, i);

  insert into public.kits (id, vitrine_id, position, name, description, signature, product_ids, style, published_at)
  select (k->>'id')::uuid, v_id, i, k->>'name', coalesce(k->>'description', ''),
         coalesce(k->>'signature', ''),
         coalesce(array(select jsonb_array_elements_text(k->'productIds'))::uuid[], '{}'),
         coalesce(k->'style', '{}'),
         coalesce((v_kit_dates->>(k->>'id'))::timestamptz, now())
  from jsonb_array_elements(content->'kits') with ordinality as t(k, i);

  return v_updated;
end;
$$;

-- Creators com mais cliques hoje (horário de Brasília). Só a ordem sai daqui:
-- contagens e eventos continuam visíveis apenas para o dono (RLS de events).
create function public.top_creators_today(lim int default 12) returns table (handle text)
language sql stable security definer set search_path = '' as $$
  with clicks as (
    select e.vitrine_id,
           -- o mesmo visitante clicando de novo no mesmo item conta uma vez; eventos sem visitor contam um a um
           count(distinct coalesce(e.visitor, e.id::text) || ':' || e.kind || ':' || coalesce(e.item_id::text, '')) as n
    from public.events e
    where e.kind in ('buy', 'copy', 'kit', 'video')
      and e.created_at >= ((now() at time zone 'America/Sao_Paulo')::date::timestamp at time zone 'America/Sao_Paulo')
    group by e.vitrine_id
  )
  select v.handle
  from clicks c
  join public.vitrines v on v.id = c.vitrine_id
  where exists (select 1 from public.coupons x where x.vitrine_id = v.id)
     or exists (select 1 from public.products p where p.vitrine_id = v.id)
  order by c.n desc, v.updated_at desc
  limit least(greatest(lim, 1), 50)
$$;
revoke execute on function public.top_creators_today(int) from public;
grant execute on function public.top_creators_today(int) to anon, authenticated;

-- Busca pública de creators, marcas (cupons) e produtos. Lê só o que já é público (RLS de leitura).
-- Ordem: igual, começa com, contém; depois por semelhança.
create function public.search_catalog(q text, lim int default 5) returns jsonb
language sql stable security invoker set search_path = '' as $$
  with term as (
    select t, replace(replace(replace(t, '\', '\\'), '%', '\%'), '_', '\_') as esc, least(greatest(lim, 1), 20) as n
    from (select public.fold(btrim(coalesce(q, ''))) as t) s
  ),
  creators as (
    select v.handle, v.name, v.avatar_url,
           case when public.fold(v.name) = term.t or v.handle = term.t then 0
                when public.fold(v.name) like term.esc || '%' or v.handle like term.esc || '%' then 1
                else 2 end as rk,
           extensions.similarity(public.fold(v.name), term.t) as sim
    from public.vitrines v, term
    where char_length(term.t) >= 2
      and (public.fold(v.name) like '%' || term.esc || '%' or v.handle like '%' || term.esc || '%')
    order by rk, sim desc
    limit (select n from term)
  ),
  coupons as (
    select to_jsonb(c) - 'vitrine_id' - 'position' || jsonb_build_object('handle', v.handle, 'creator', v.name) as item,
           case when public.fold(c.brand) = term.t then 0 when public.fold(c.brand) like term.esc || '%' then 1 else 2 end as rk,
           extensions.similarity(public.fold(c.brand), term.t) as sim
    from public.coupons c
    join public.vitrines v on v.id = c.vitrine_id, term
    where char_length(term.t) >= 2 and public.fold(c.brand) like '%' || term.esc || '%'
    order by rk, sim desc
    limit (select n * 6 from term)
  ),
  products as (
    select to_jsonb(p) - 'vitrine_id' - 'position'
           || jsonb_build_object('handle', v.handle, 'creator', v.name, 'coupon', to_jsonb(c) - 'vitrine_id' - 'position') as item,
           case when public.fold(p.name) = term.t then 0 when public.fold(p.name) like term.esc || '%' then 1 else 2 end as rk,
           extensions.similarity(public.fold(p.name), term.t) as sim
    from public.products p
    join public.vitrines v on v.id = p.vitrine_id
    left join public.coupons c on c.id = p.coupon_id, term
    where char_length(term.t) >= 2 and public.fold(p.name) like '%' || term.esc || '%'
    order by rk, sim desc
    limit (select n * 6 from term)
  )
  select jsonb_build_object(
    'creators', coalesce((select jsonb_agg(jsonb_build_object('handle', handle, 'name', name, 'avatar_url', avatar_url) order by rk, sim desc) from creators), '[]'),
    'coupons', coalesce((select jsonb_agg(item order by rk, sim desc) from coupons), '[]'),
    'products', coalesce((select jsonb_agg(item order by rk, sim desc) from products), '[]')
  )
$$;
grant execute on function public.search_catalog(text, int) to anon, authenticated;
