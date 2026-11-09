-- Quantas pessoas favoritaram uma vitrine. A lista de favoritos continua privada (RLS): a função só devolve o
-- número, nunca quem favoritou.
create function public.favorite_count(target_handle text) returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::int
  from public.favorites f
  join public.vitrines v on v.id = f.vitrine_id
  where v.handle = target_handle
$$;
revoke execute on function public.favorite_count(text) from public;
grant execute on function public.favorite_count(text) to anon, authenticated;
