-- Posts: a creator posta uma foto usando um conjunto e lista embaixo as peças, que são produtos da vitrine.
-- Substituem os kits (o kit era a lista sem a foto). Seguem o caminho que os kits seguiam: o editor guarda no
-- rascunho, publish_vitrine reinsere e preserva published_at pelo id.
--
-- Os kits saem do app, mas a tabela fica: publish_vitrine para de apagar e reinserir kits, então os que já
-- existem continuam no banco, sem aparecer em lugar nenhum. Apagar a tabela fica para uma migração futura.

create table public.posts (
  id uuid primary key,
  vitrine_id uuid not null references public.vitrines(id) on delete cascade,
  position int not null,
  photo_url text not null check (char_length(photo_url) between 1 and 2000),
  caption text not null default '' check (char_length(caption) <= 300),
  -- IDs de products, na ordem da lista. Sem FK (array), como era em kits.product_ids.
  product_ids uuid[] not null default '{}' check (cardinality(product_ids) <= 8),
  published_at timestamptz not null default now()
);

create index posts_vitrine_idx on public.posts (vitrine_id, position);
create index posts_published_idx on public.posts (published_at desc);

alter table public.posts enable row level security;

create policy "posts são públicos" on public.posts for select to anon, authenticated using (true);
create policy "dono insere posts" on public.posts for insert to authenticated with check (public.owns_vitrine(vitrine_id));
create policy "dono edita posts" on public.posts for update to authenticated using (public.owns_vitrine(vitrine_id)) with check (public.owns_vitrine(vitrine_id));
create policy "dono remove posts" on public.posts for delete to authenticated using (public.owns_vitrine(vitrine_id));

-- Clique numa peça do post: além do 'buy' do produto, um 'post' com o id do post.
-- 'kit' continua aceito para os eventos antigos.
alter table public.events drop constraint events_kind_check;
alter table public.events add constraint events_kind_check check (kind in ('view', 'buy', 'copy', 'kit', 'video', 'post'));

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
