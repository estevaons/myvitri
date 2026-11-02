-- Visual do card de cada kit (cor, arranjo dos produtos, selo de economia, etiqueta).
-- jsonb porque são só preferências de exibição; o app completa com os padrões.
alter table public.kits add column style jsonb not null default '{}' check (pg_column_size(style) <= 2000);

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
    updated_at = now()
  where owner_id = (select auth.uid())
  returning id, updated_at into v_id, v_updated;

  if v_id is null then
    raise exception 'vitrine não encontrada' using errcode = 'P0002';
  end if;

  delete from public.kits where vitrine_id = v_id;
  delete from public.products where vitrine_id = v_id;
  delete from public.coupons where vitrine_id = v_id;

  insert into public.coupons (id, vitrine_id, position, brand, code, kind, value, condition, expires_at, store_url)
  select (c->>'id')::uuid, v_id, i, c->>'brand', c->>'code', c->>'kind', (c->>'value')::int,
         coalesce(c->>'condition', ''), (c->>'expiresAt')::date, coalesce(c->>'storeUrl', '')
  from jsonb_array_elements(content->'coupons') with ordinality as t(c, i);

  insert into public.products (id, vitrine_id, position, name, brand, category, price, coupon_id, url, image_url, icon)
  select (p->>'id')::uuid, v_id, i, p->>'name', coalesce(p->>'brand', ''), coalesce(p->>'category', ''),
         (p->>'price')::int, (p->>'couponId')::uuid, coalesce(p->>'url', ''), coalesce(p->>'imageUrl', ''), p->>'icon'
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
