-- Kit passa a ter um nome só (antes: "nome curto" nos botões + "título" na seção).
-- Quando os dois existiam, fica o título.
alter table public.kits drop constraint kits_tab_check;
alter table public.kits rename column tab to name;
update public.kits set name = left(title, 60) where title <> '';
alter table public.kits drop column title;
alter table public.kits add constraint kits_name_check check (char_length(name) between 1 and 60);

-- Rascunhos guardados no formato antigo.
update public.vitrine_drafts d
set content = jsonb_set(d.content, '{kits}', (
  select coalesce(jsonb_agg(
    (k - 'tab' - 'title') || jsonb_build_object('name', left(coalesce(nullif(k->>'title', ''), k->>'tab', ''), 60))
    order by i), '[]'::jsonb)
  from jsonb_array_elements(d.content->'kits') with ordinality as t(k, i)
))
where jsonb_typeof(d.content->'kits') = 'array';

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

  insert into public.kits (id, vitrine_id, position, name, description, signature, product_ids)
  select (k->>'id')::uuid, v_id, i, k->>'name', coalesce(k->>'description', ''),
         coalesce(k->>'signature', ''),
         coalesce(array(select jsonb_array_elements_text(k->'productIds'))::uuid[], '{}')
  from jsonb_array_elements(content->'kits') with ordinality as t(k, i);

  return v_updated;
end;
$$;
