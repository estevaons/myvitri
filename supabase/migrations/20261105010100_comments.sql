-- Comentários na vitrine pública. Qualquer pessoa lê; quem entrou comenta; apaga quem escreveu ou a dona da vitrine.
-- Não há edição: para corrigir, a pessoa apaga e escreve de novo.
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  vitrine_id uuid not null references public.vitrines (id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- cópia do perfil na hora de comentar: auth.users não é legível pelo público
  author_name text not null default '' check (char_length(author_name) between 1 and 80),
  author_avatar_url text not null default '',
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index comments_vitrine_idx on public.comments (vitrine_id, created_at desc);
create index comments_author_idx on public.comments (author_id, created_at desc);

/*
 * O que identifica o comentário vem da sessão, nunca do cliente: a chave publicável é pública e dá para
 * chamar a API sem passar pelo app. Também segura enxurrada: até 5 comentários por minuto por pessoa.
 */
create function public.stamp_comment() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  meta jsonb := auth.jwt() -> 'user_metadata';
  avatar text := meta ->> 'avatar_url';
begin
  new.author_id := (select auth.uid());
  new.author_name := left(coalesce(nullif(btrim(meta ->> 'name'), ''), nullif(btrim(meta ->> 'full_name'), ''), 'Visitante'), 80);
  new.author_avatar_url := case when avatar like 'https://%' then avatar else '' end;
  new.body := btrim(new.body);
  new.created_at := now();
  if (select count(*) from public.comments c where c.author_id = new.author_id and c.created_at > now() - interval '1 minute') >= 5 then
    raise exception 'muitos comentários em pouco tempo' using errcode = 'VT429';
  end if;
  return new;
end;
$$;
revoke execute on function public.stamp_comment() from public, anon, authenticated;

create trigger comments_stamp before insert on public.comments
  for each row execute function public.stamp_comment();

alter table public.comments enable row level security;

create policy "comentários são públicos" on public.comments for select to anon, authenticated
  using (true);
create policy "quem entrou comenta" on public.comments for insert to authenticated
  with check (author_id = (select auth.uid()));
create policy "autor ou dona apaga comentário" on public.comments for delete to authenticated
  using (author_id = (select auth.uid()) or public.owns_vitrine(vitrine_id));
