-- Endurecimento depois da revisão OWASP Top 10 (2026-11-13).
--
-- A chave publicável é pública: qualquer conta logada chama o PostgREST direto, sem passar pelo Zod do app
-- (lib/vitrine/types.ts). Até aqui o banco só conferia o dono (RLS). Esta migração leva para o banco as regras
-- que protegem quem visita as vitrines:
--   1. URLs só http(s) e tamanhos máximos nas colunas que a vitrine pública mostra (as mesmas regras do Zod);
--   2. limite de itens por vitrine (100 cupons, 200 produtos, 30 posts);
--   3. datas que ordenam a home (`vitrines.updated_at`, `posts.published_at`) nunca no futuro, e
--      `created_at` da vitrine fixo; links reservados conferidos também aqui;
--   4. kits (legado, fora do app) deixam de aceitar insert e update;
--   5. `take_rate_limit`: ritmo por conta das ações que acessam sites de fora (importar produto, achar logo).
--
-- As checagens novas são NOT VALID: valem para toda linha inserida ou alterada daqui em diante, sem barrar a
-- migração por causa de linhas antigas. A leitura no app também descarta links que não sejam http(s).
--
-- Fica para depois (card "Segurança: proteger métricas e ranking contra eventos falsos (/api/t)" no Trello): o insert
-- anônimo em `events` continua aberto, porque a correção depende de TRACK_SALT na Vercel.

/* 1. URLs e tamanhos ---------------------------------------------------------------------------------------- */

-- Vazio ou http(s), até 2000 caracteres: a mesma regra de `link()` em lib/vitrine/types.ts.
create function public.is_http_url(u text) returns boolean
language sql immutable parallel safe set search_path = '' as $$
  select u is not null and char_length(u) <= 2000 and (u = '' or u ~* '^https?://')
$$;

alter table public.vitrines
  add constraint vitrines_avatar_url_check check (public.is_http_url(avatar_url)) not valid,
  add constraint vitrines_look_check check (
    jsonb_typeof(look) = 'object' and pg_column_size(look) <= 4000 and public.is_http_url(coalesce(look ->> 'bannerUrl', ''))
  ) not valid,
  add constraint vitrines_show_check check (jsonb_typeof(show) = 'object' and pg_column_size(show) <= 1000) not valid;

alter table public.coupons
  add constraint coupons_condition_len check (char_length(condition) <= 120) not valid,
  add constraint coupons_store_url_check check (public.is_http_url(store_url)) not valid,
  add constraint coupons_logo_url_check check (public.is_http_url(logo_url)) not valid;

alter table public.products
  add constraint products_brand_len check (char_length(brand) <= 60) not valid,
  add constraint products_category_len check (char_length(category) <= 30) not valid,
  add constraint products_url_check check (public.is_http_url(url)) not valid,
  add constraint products_image_url_check check (public.is_http_url(image_url)) not valid,
  add constraint products_affiliate_url_check check (public.is_http_url(affiliate_url)) not valid,
  add constraint products_video_url_check check (public.is_http_url(video_url)) not valid;

alter table public.posts
  -- "posts_photo_url_check" já existe: é o nome que o Postgres deu à checagem de tamanho de 20261110000000_posts.sql
  add constraint posts_photo_url_http check (public.is_http_url(photo_url)) not valid;

/* 2. Limite de itens por vitrine ---------------------------------------------------------------------------- */

-- `TG_ARGV[0]`: quantos itens a vitrine pode ter nesta tabela. publish_vitrine apaga tudo antes de reinserir,
-- então a contagem vale para a versão nova. Um gatilho BEFORE enxerga as linhas que o mesmo comando já inseriu.
create function public.enforce_item_limit() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  n int;
begin
  execute format('select count(*) from %I.%I where vitrine_id = $1', tg_table_schema, tg_table_name) into n using new.vitrine_id;
  if n >= tg_argv[0]::int then
    raise exception 'limite de itens da vitrine atingido em %', tg_table_name using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke execute on function public.enforce_item_limit() from public, anon, authenticated;

create trigger coupons_limit before insert on public.coupons for each row execute function public.enforce_item_limit('100');
create trigger products_limit before insert on public.products for each row execute function public.enforce_item_limit('200');
create trigger posts_limit before insert on public.posts for each row execute function public.enforce_item_limit('30');

/* 3. Datas e links reservados ------------------------------------------------------------------------------- */

-- A home ordena por `updated_at`: uma data no futuro deixaria a vitrine no topo para sempre.
-- Os links reservados são os de RESERVED_HANDLES (lib/vitrine/types.ts); só confere quando o link muda.
create function public.stamp_vitrine() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
  else
    new.created_at := old.created_at;
  end if;
  new.updated_at := least(coalesce(new.updated_at, now()), now());
  if (tg_op = 'INSERT' or new.handle is distinct from old.handle)
     and new.handle = any (array['admin', 'myvitri', 'vitri', 'suporte', 'support', 'ajuda', 'help', 'contato', 'oficial']) then
    raise exception 'link reservado' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke execute on function public.stamp_vitrine() from public, anon, authenticated;

create trigger vitrines_stamp before insert or update on public.vitrines for each row execute function public.stamp_vitrine();

-- publish_vitrine reinsere os posts com a data da primeira publicação (passado) ou now(): o futuro nunca é legítimo.
create function public.stamp_post() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.published_at := least(coalesce(new.published_at, now()), now());
  return new;
end;
$$;
revoke execute on function public.stamp_post() from public, anon, authenticated;

create trigger posts_stamp before insert or update on public.posts for each row execute function public.stamp_post();

/* 4. Kits (legado) ------------------------------------------------------------------------------------------ */

-- Saíram do app em 20261110000000_posts.sql; ninguém mais grava. Leitura e exclusão continuam.
drop policy if exists "dono insere kits" on public.kits;
drop policy if exists "dono edita kits" on public.kits;

/* 5. Ritmo por conta das ações que acessam sites de fora ---------------------------------------------------- */

-- Sem policies: ninguém lê nem grava direto; só take_rate_limit (security definer).
create table public.rate_hits (
  user_id uuid not null references auth.users (id) on delete cascade,
  bucket text not null,
  created_at timestamptz not null default now()
);
create index rate_hits_idx on public.rate_hits (user_id, bucket, created_at desc);
alter table public.rate_hits enable row level security;
revoke all on public.rate_hits from anon, authenticated;

/*
 * true = pode seguir (e conta esta vez). Os limites ficam aqui, não com quem chama: chamar a função direto só gasta
 * a cota da própria conta. 'import' = importar produto pelo link; 'logo' = procurar logo no site da loja.
 */
create function public.take_rate_limit(p_bucket text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  max_hits int;
  span interval;
begin
  case p_bucket
    when 'import' then max_hits := 30; span := interval '10 minutes';
    when 'logo' then max_hits := 30; span := interval '10 minutes';
    else raise exception 'bucket desconhecido' using errcode = '22023';
  end case;
  if uid is null then
    return false;
  end if;
  delete from public.rate_hits r where r.user_id = uid and r.bucket = p_bucket and r.created_at < now() - span;
  if (select count(*) from public.rate_hits r where r.user_id = uid and r.bucket = p_bucket) >= max_hits then
    return false;
  end if;
  insert into public.rate_hits (user_id, bucket) values (uid, p_bucket);
  return true;
end;
$$;
revoke execute on function public.take_rate_limit(text) from public, anon;
grant execute on function public.take_rate_limit(text) to authenticated;
