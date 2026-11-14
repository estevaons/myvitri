-- Notificações da dona da vitrine: novo seguidor e novo comentário (ou resposta) na vitrine dela.
--
-- Quem grava são os gatilhos de `favorites` e `comments` (security definer): a pessoa que segue ou comenta não
-- consegue escrever na lista de outra conta, e ninguém grava direto pela API (sem policy de insert). A dona lê as
-- próprias e só pode mudar `read_at` (marcar como lida).
--
-- Quem segue deixa de ser anônimo para a dona: a notificação guarda nome e foto de quem seguiu (a política de
-- privacidade foi atualizada junto). A lista "vitrines que eu sigo" continua privada.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('follow', 'comment')),
  actor_id uuid not null references auth.users (id) on delete cascade,
  -- cópias da hora do evento, como em `comments` (auth.users não é legível pelo app)
  actor_name text not null check (char_length(actor_name) between 1 and 80),
  actor_avatar_url text not null default '' check (actor_avatar_url = '' or actor_avatar_url like 'https://%'),
  vitrine_id uuid not null references public.vitrines (id) on delete cascade,
  -- apagar o comentário apaga a notificação dele
  comment_id uuid references public.comments (id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check ((kind = 'comment') = (comment_id is not null))
);

-- a lista e o contador de não lidas
create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
create index notifications_unread_idx on public.notifications (recipient_id) where read_at is null;
-- seguir, deixar de seguir e seguir de novo não empilha: uma notificação de seguidor por pessoa e vitrine
create unique index notifications_follow_key on public.notifications (vitrine_id, actor_id) where kind = 'follow';
-- cascatas
create index notifications_actor_idx on public.notifications (actor_id);
create index notifications_comment_idx on public.notifications (comment_id) where comment_id is not null;

alter table public.notifications enable row level security;

create policy "dona lê notificações" on public.notifications for select to authenticated
  using (recipient_id = (select auth.uid()));
create policy "dona marca notificação" on public.notifications for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

-- só a coluna de lida pode mudar
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

/* Gatilhos -------------------------------------------------------------------------------------------------- */

-- Novo seguidor. Nome e foto vêm da sessão de quem seguiu (as mesmas regras de stamp_comment). Seguir a própria
-- vitrine não notifica.
create function public.notify_follow() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := auth.jwt() -> 'user_metadata';
  avatar text := meta ->> 'avatar_url';
  owner uuid;
begin
  select v.owner_id into owner from public.vitrines v where v.id = new.vitrine_id;
  if owner is null or owner = new.user_id then
    return null;
  end if;
  insert into public.notifications (recipient_id, kind, actor_id, actor_name, actor_avatar_url, vitrine_id)
  values (
    owner, 'follow', new.user_id,
    left(coalesce(nullif(btrim(meta ->> 'name'), ''), nullif(btrim(meta ->> 'full_name'), ''), 'Visitante'), 80),
    case when avatar like 'https://%' then left(avatar, 2000) else '' end,
    new.vitrine_id
  )
  on conflict (vitrine_id, actor_id) where kind = 'follow' do nothing;
  return null;
end;
$$;
revoke execute on function public.notify_follow() from public, anon, authenticated;

create trigger favorites_notify after insert on public.favorites for each row execute function public.notify_follow();

-- Deixou de seguir: a notificação sai junto (seguir de novo cria outra, sem duplicar).
create function public.unnotify_follow() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.notifications n where n.kind = 'follow' and n.vitrine_id = old.vitrine_id and n.actor_id = old.user_id;
  return null;
end;
$$;
revoke execute on function public.unnotify_follow() from public, anon, authenticated;

create trigger favorites_unnotify after delete on public.favorites for each row execute function public.unnotify_follow();

-- Novo comentário ou resposta. Autor, nome e foto já foram preenchidos por stamp_comment (before insert).
-- A dona comentando na própria vitrine não notifica.
create function public.notify_comment() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  owner uuid;
begin
  select v.owner_id into owner from public.vitrines v where v.id = new.vitrine_id;
  if owner is null or owner = new.author_id then
    return null;
  end if;
  insert into public.notifications (recipient_id, kind, actor_id, actor_name, actor_avatar_url, vitrine_id, comment_id)
  values (owner, 'comment', new.author_id, new.author_name, new.author_avatar_url, new.vitrine_id, new.id);
  return null;
end;
$$;
revoke execute on function public.notify_comment() from public, anon, authenticated;

create trigger comments_notify after insert on public.comments for each row execute function public.notify_comment();
