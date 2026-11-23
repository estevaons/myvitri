-- Tamanho e presença da frase de destaque e do texto de apoio no topo da vitrine. A creator escolhe pequeno, médio ou
-- grande para cada um e pode tirá-los da vitrine sem apagar o texto (a frase vazia mostra a frase padrão, por isso
-- tirar precisa de um campo à parte).
--
-- `heading`: { headlineSize, subSize: 's' | 'm' | 'l', headlineHidden, subHidden: boolean }. Vazio vale o padrão (os dois
-- médios, nada escondido): é o que a leitura do app completa (readHeading em lib/vitrine/types.ts).
alter table public.vitrines
  add column heading jsonb not null default '{}',
  add constraint vitrines_heading_check check (jsonb_typeof(heading) = 'object' and pg_column_size(heading) <= 1000);

-- Mesma publish_vitrine de 20261116000000_post_media.sql, agora gravando o `heading`.
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
    heading = coalesce(content->'heading', '{}'),
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
                               affiliate_url, video_url, sold_out, favorite, price_checked_at)
  select (p->>'id')::uuid, v_id, i, p->>'name', coalesce(p->>'brand', ''), coalesce(p->>'category', ''),
         (p->>'price')::int, (p->>'couponId')::uuid, coalesce(p->>'url', ''), coalesce(p->>'imageUrl', ''), p->>'icon',
         coalesce(p->>'affiliateUrl', ''), coalesce(p->>'videoUrl', ''), coalesce((p->>'soldOut')::boolean, false),
         coalesce((p->>'favorite')::boolean, false),
         (p->>'priceCheckedAt')::timestamptz
  from jsonb_array_elements(content->'products') with ordinality as t(p, i);

  -- conteúdo de antes desta versão do editor não tem 'posts': nada a inserir
  -- a capa (photo_url) é a foto da primeira mídia; conteúdo de antes da galeria ainda manda 'photoUrl'
  insert into public.posts (id, vitrine_id, position, photo_url, media, caption, product_ids, published_at)
  select (p->>'id')::uuid, v_id, i, coalesce(p->'media'->0->>'photoUrl', p->>'photoUrl'), coalesce(p->'media', '[]'),
         coalesce(p->>'caption', ''),
         coalesce(array(select jsonb_array_elements_text(p->'productIds'))::uuid[], '{}'),
         coalesce((v_post_dates->>(p->>'id'))::timestamptz, now())
  from jsonb_array_elements(coalesce(content->'posts', '[]')) with ordinality as t(p, i);

  return v_updated;
end;
$$;
