-- Redes sociais da creator (Instagram, TikTok, YouTube, X), mostradas discretas logo abaixo da capa da vitrine.
-- Guardam o que ela digitou (@, usuário ou link); o app transforma em link (lib/vitrine/socials.ts).
alter table public.vitrines
  add column socials jsonb not null default '{}'
  check (jsonb_typeof(socials) = 'object' and pg_column_size(socials) <= 2000);

-- Mesma publish_vitrine de 20261110000000_posts.sql, agora gravando também as redes.
create or replace function public.publish_vitrine(content jsonb) returns timestamptz
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
  v_updated timestamptz;
  v_post_dates jsonb;
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
    socials = coalesce(content->'socials', '{}'),
    updated_at = now()
  where owner_id = (select auth.uid())
  returning id, updated_at into v_id, v_updated;

  if v_id is null then
    raise exception 'vitrine não encontrada' using errcode = 'P0002';
  end if;

  -- posts são reinseridos: guarda a data de publicação de cada um pelo id
  select coalesce(jsonb_object_agg(id::text, published_at), '{}') into v_post_dates
  from public.posts where vitrine_id = v_id;

  delete from public.posts where vitrine_id = v_id;
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

  -- conteúdo de antes desta versão do editor não tem 'posts': nada a inserir
  insert into public.posts (id, vitrine_id, position, photo_url, caption, product_ids, published_at)
  select (p->>'id')::uuid, v_id, i, p->>'photoUrl', coalesce(p->>'caption', ''),
         coalesce(array(select jsonb_array_elements_text(p->'productIds'))::uuid[], '{}'),
         coalesce((v_post_dates->>(p->>'id'))::timestamptz, now())
  from jsonb_array_elements(coalesce(content->'posts', '[]')) with ordinality as t(p, i);

  return v_updated;
end;
$$;
