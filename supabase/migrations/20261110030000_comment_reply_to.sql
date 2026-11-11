-- Resposta a uma resposta: continua na mesma conversa (parent_id = comentário original), mas agora guarda
-- também qual resposta ela responde, para a lista mostrar "@Nome" no começo. Se essa resposta for apagada,
-- a referência some e a resposta fica como uma resposta comum da conversa.
alter table public.comments
  add column reply_to_id uuid references public.comments (id) on delete set null;
create index comments_reply_to_idx on public.comments (reply_to_id) where reply_to_id is not null;

/*
 * Igual à de 20261109000000_comment_replies.sql, e agora também preenche `reply_to_id`: quem decide é o banco,
 * a partir do `parent_id` que veio. Só fica preenchido quando a pessoa respondeu a uma resposta; responder ao
 * comentário original não precisa de indicação (ele é o topo da conversa).
 */
create or replace function public.stamp_comment() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  meta jsonb := auth.jwt() -> 'user_metadata';
  avatar text := meta ->> 'avatar_url';
  root uuid;
  root_vitrine uuid;
begin
  new.author_id := (select auth.uid());
  new.author_name := left(coalesce(nullif(btrim(meta ->> 'name'), ''), nullif(btrim(meta ->> 'full_name'), ''), 'Visitante'), 80);
  new.author_avatar_url := case when avatar like 'https://%' then avatar else '' end;
  new.body := btrim(new.body);
  new.created_at := now();
  new.reply_to_id := null;
  if new.parent_id is not null then
    select coalesce(c.parent_id, c.id), c.vitrine_id into root, root_vitrine from public.comments c where c.id = new.parent_id;
    if root is null then
      raise exception 'o comentário respondido não existe mais' using errcode = 'VT404';
    end if;
    if root <> new.parent_id then
      new.reply_to_id := new.parent_id;
    end if;
    new.parent_id := root;
    new.vitrine_id := root_vitrine;
  end if;
  if (select count(*) from public.comments c where c.author_id = new.author_id and c.created_at > now() - interval '1 minute') >= 5 then
    raise exception 'muitos comentários em pouco tempo' using errcode = 'VT429';
  end if;
  return new;
end;
$$;
revoke execute on function public.stamp_comment() from public, anon, authenticated;
