-- Página /metricas: a comparação com o período anterior. vitrine_stats continua devolvendo o mesmo
-- (totals, days, items) e ganha 'previous': os totais por kind dos `days` dias imediatamente anteriores
-- à janela atual, mais 'buy_coupon' (cliques em produto que tem cupom, que também copiam o código),
-- para a variação de "Cupons copiados" usar a mesma conta do período atual.

create or replace function public.vitrine_stats(days int default 30) returns jsonb
language sql stable security invoker set search_path = '' as $$
  with win as (
    select make_interval(days => least(greatest(days, 1), 90)) as span
  ),
  -- as duas janelas de uma vez: a atual e a anterior, de mesma duração
  own as (
    select e.kind, e.item_id, e.created_at
    from public.events e
    join public.vitrines v on v.id = e.vitrine_id
    where v.owner_id = (select auth.uid())
      and e.created_at >= now() - 2 * (select span from win)
  ),
  mine as (
    select o.kind, o.item_id, (o.created_at at time zone 'America/Sao_Paulo')::date as day
    from own o
    where o.created_at >= now() - (select span from win)
  ),
  prev as (
    select o.kind, o.item_id
    from own o
    where o.created_at < now() - (select span from win)
  )
  select jsonb_build_object(
    'totals', coalesce((select jsonb_object_agg(kind, n) from (select kind, count(*) n from mine group by kind) t), '{}'),
    'days', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'views', views, 'clicks', clicks) order by day)
      from (select day, count(*) filter (where kind = 'view') views, count(*) filter (where kind <> 'view') clicks
            from mine group by day) t), '[]'),
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', item_id, 'kind', kind, 'n', n))
      from (select item_id, kind, count(*) n from mine where item_id is not null group by item_id, kind) t), '[]'),
    'previous', coalesce((select jsonb_object_agg(kind, n) from (select kind, count(*) n from prev group by kind) t), '{}')
      || jsonb_build_object('buy_coupon', (
        select count(*) from prev p
        where p.kind = 'buy'
          and exists (select 1 from public.products x where x.id = p.item_id and x.coupon_id is not null)
      ))
  );
$$;
revoke execute on function public.vitrine_stats(int) from public, anon;
grant execute on function public.vitrine_stats(int) to authenticated;
