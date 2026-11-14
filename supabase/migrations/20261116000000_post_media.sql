-- Galeria do outfit: o mesmo post passa a ter várias fotos e vídeos. Vídeo é um Reels, TikTok ou YouTube que a creator
-- já postou: ela cola o link, a Server Action importVideoAction busca a capa na rede e a creator confirma o recorte 4:5.
-- Na vitrine, a galeria passa de mídia em mídia e tocar na capa de um vídeo abre o player oficial da rede ali mesmo.
--
-- `media`: [{ id, photoUrl, videoUrl }] na ordem da galeria (no vídeo, photoUrl é a capa; videoUrl vazio = foto).
-- `photo_url` continua obrigatória e passa a ser a capa do post (a foto da primeira mídia): é o que os cards da home e
-- as métricas mostram, sem ler a lista. Posts de antes desta migração ficam com `media` vazia e a leitura do app monta
-- a mídia a partir de `photo_url` (readPostMedia em lib/vitrine/types.ts).
alter table public.posts
  add column media jsonb not null default '[]';

-- As mesmas regras do Zod (postSchema): lista de até 10 objetos, links vazios ou http(s) de até 2000 caracteres.
-- Função porque uma CHECK não aceita subconsulta; is_http_url vem de 20261113010000_security_hardening.sql.
create function public.is_post_media(m jsonb) returns boolean
language sql immutable parallel safe set search_path = '' as $$
  select jsonb_typeof(m) = 'array'
     and jsonb_array_length(m) <= 10
     and pg_column_size(m) <= 50000
     and not exists (
       select 1 from jsonb_array_elements(m) e
       where jsonb_typeof(e) <> 'object'
          or not public.is_http_url(coalesce(e ->> 'photoUrl', ''))
          or not public.is_http_url(coalesce(e ->> 'videoUrl', ''))
     )
$$;

alter table public.posts
  add constraint posts_media_check check (public.is_post_media(media));

-- Mesma publish_vitrine de 20261113000000_product_favorite.sql, agora gravando a galeria de cada post.
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
