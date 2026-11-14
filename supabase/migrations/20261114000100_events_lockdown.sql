-- Eventos da vitrine pública só por `track_event` (passo 2 de 2; o passo 1 é 20261114000000_track_event.sql).
--
-- ⚠ Aplique só depois que o app com o /api/t que chama track_event estiver no ar, e com o segredo `track_salt` no
--   Vault: o /api/t antigo insere direto em `events` e pararia de registrar.

-- Sem insert direto: quem chama a API com a chave publicável não grava mais eventos (nem visitante inventado).
drop policy if exists "visitante registra evento" on public.events;

-- Igual à de 20261104000000_landing_home.sql, contando só eventos com visitante (os que passaram por track_event).
-- Eventos antigos, sem visitante, deixam de contar: o ranking é só do dia, então isso vale até a meia-noite.
create or replace function public.top_creators_today(lim int default 12) returns table (handle text)
language sql stable security definer set search_path = '' as $$
  with clicks as (
    select e.vitrine_id,
           -- o mesmo visitante clicando de novo no mesmo item conta uma vez
           count(distinct e.visitor || ':' || e.kind || ':' || coalesce(e.item_id::text, '')) as n
    from public.events e
    where e.kind in ('buy', 'copy', 'kit', 'video')
      and e.visitor is not null
      and e.created_at >= ((now() at time zone 'America/Sao_Paulo')::date::timestamp at time zone 'America/Sao_Paulo')
    group by e.vitrine_id
  )
  select v.handle
  from clicks c
  join public.vitrines v on v.id = c.vitrine_id
  where exists (select 1 from public.coupons x where x.vitrine_id = v.id)
     or exists (select 1 from public.products p where p.vitrine_id = v.id)
  order by c.n desc, v.updated_at desc
  limit least(greatest(lim, 1), 50)
$$;
revoke execute on function public.top_creators_today(int) from public;
grant execute on function public.top_creators_today(int) to anon, authenticated;
