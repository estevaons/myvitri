-- Quem está logado apaga a própria conta. O resto vai junto pelos "on delete cascade":
-- vitrine, cupons, produtos, kits, eventos e rascunho.
-- security definer porque só o dono do schema auth pode apagar de auth.users.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then
    raise exception 'não autenticado' using errcode = '42501';
  end if;
  delete from auth.users where id = (select auth.uid());
end;
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
