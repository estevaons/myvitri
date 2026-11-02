-- Vitrines de creators: perfil + aparência, com cupons, produtos e kits.
-- Leitura pública; escrita apenas pelo dono (auth.uid()).

create table public.vitrines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid unique references auth.users (id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9_.]{3,30}$'),
  name text not null check (char_length(name) between 1 and 60),
  avatar_url text not null default '',
  headline text not null default '' check (char_length(headline) <= 90),
  sub text not null default '' check (char_length(sub) <= 240),
  look jsonb not null default '{"theme":"vibrante","accent":"#FF5A36","font":"moderna","radius":"arredondado","layout":"grade"}',
  show jsonb not null default '{"ticker":true,"products":true,"coupons":true,"kits":true,"cta":true}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.coupons (
  id uuid primary key,
  vitrine_id uuid not null references public.vitrines (id) on delete cascade,
  position int not null,
  brand text not null check (char_length(brand) between 1 and 60),
  code text not null check (char_length(code) between 1 and 40),
  kind text not null check (kind in ('percent', 'fixed')),
  value int not null check (value > 0 and (kind = 'fixed' or value <= 100)),
  condition text not null default '',
  expires_at date,
  store_url text not null default ''
);
create index coupons_vitrine_idx on public.coupons (vitrine_id, position);

create table public.products (
  id uuid primary key,
  vitrine_id uuid not null references public.vitrines (id) on delete cascade,
  position int not null,
  name text not null check (char_length(name) between 1 and 80),
  brand text not null default '',
  category text not null default '',
  price int not null default 0 check (price >= 0),
  coupon_id uuid references public.coupons (id) on delete set null,
  url text not null default '',
  image_url text not null default '',
  icon text not null default 'Bag'
);
create index products_vitrine_idx on public.products (vitrine_id, position);
create index products_coupon_idx on public.products (coupon_id);

create table public.kits (
  id uuid primary key,
  vitrine_id uuid not null references public.vitrines (id) on delete cascade,
  position int not null,
  tab text not null check (char_length(tab) between 1 and 30),
  title text not null default '',
  description text not null default '',
  signature text not null default '',
  product_ids uuid[] not null default '{}'
);
create index kits_vitrine_idx on public.kits (vitrine_id, position);

alter table public.vitrines enable row level security;
alter table public.coupons enable row level security;
alter table public.products enable row level security;
alter table public.kits enable row level security;

create policy "vitrines são públicas" on public.vitrines for select to anon, authenticated using (true);
create policy "dono cria a vitrine" on public.vitrines for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "dono edita a vitrine" on public.vitrines for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create function public.owns_vitrine(v uuid) returns boolean
language sql stable security invoker set search_path = '' as $$
  select exists (select 1 from public.vitrines where id = v and owner_id = (select auth.uid()));
$$;
revoke execute on function public.owns_vitrine(uuid) from public, anon;

create policy "cupons são públicos" on public.coupons for select to anon, authenticated using (true);
create policy "dono gerencia cupons" on public.coupons for all to authenticated
  using (public.owns_vitrine(vitrine_id)) with check (public.owns_vitrine(vitrine_id));

create policy "produtos são públicos" on public.products for select to anon, authenticated using (true);
create policy "dono gerencia produtos" on public.products for all to authenticated
  using (public.owns_vitrine(vitrine_id)) with check (public.owns_vitrine(vitrine_id));

create policy "kits são públicos" on public.kits for select to anon, authenticated using (true);
create policy "dono gerencia kits" on public.kits for all to authenticated
  using (public.owns_vitrine(vitrine_id)) with check (public.owns_vitrine(vitrine_id));

-- Publica o rascunho inteiro de uma vez (o editor envia o estado completo).
-- security invoker: tudo passa pelas policies acima.
create function public.publish_vitrine(content jsonb) returns timestamptz
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

  insert into public.kits (id, vitrine_id, position, tab, title, description, signature, product_ids)
  select (k->>'id')::uuid, v_id, i, k->>'tab', coalesce(k->>'title', ''), coalesce(k->>'description', ''),
         coalesce(k->>'signature', ''),
         coalesce(array(select jsonb_array_elements_text(k->'productIds'))::uuid[], '{}')
  from jsonb_array_elements(content->'kits') with ordinality as t(k, i);

  return v_updated;
end;
$$;
revoke execute on function public.publish_vitrine(jsonb) from public, anon;
grant execute on function public.publish_vitrine(jsonb) to authenticated;
