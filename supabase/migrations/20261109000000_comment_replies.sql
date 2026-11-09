-- Respostas a comentários: um nível só. Responder a uma resposta entra na mesma conversa, embaixo do
-- comentário original. Apagar o comentário original apaga as respostas junto.
alter table public.comments
  add column parent_id uuid references public.comments (id) on delete cascade;
create index comments_parent_idx on public.comments (parent_id, created_at) where parent_id is not null;

/*
 * Além de carimbar autor, nome, foto e data a partir da sessão (veja 20261105010100_comments.sql), acerta a
 * resposta: sobe para o comentário original quando a pessoa responde a uma resposta e copia a vitrine dele,
 * para uma resposta nunca ficar em outra vitrine.
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
  if new.parent_id is not null then
    select coalesce(c.parent_id, c.id), c.vitrine_id into root, root_vitrine from public.comments c where c.id = new.parent_id;
    if root is null then
      raise exception 'o comentário respondido não existe mais' using errcode = 'VT404';
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
