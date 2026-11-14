-- Visitas únicas por dia: /api/t passa a gravar em `visitor` um código anônimo que muda todo dia e é diferente
-- em cada vitrine (HMAC de IP + navegador + dia + vitrine com o TRACK_SALT; o IP não é guardado). Por isso basta
-- (vitrine_id, visitor) ser único entre os "view": a mesma pessoa abrindo a vitrine de novo no mesmo dia é
-- recusada no insert (o /api/t ignora o erro 23505), e vitrine_stats, o funil e o resto continuam contando linhas.
-- Eventos antigos e os gravados sem TRACK_SALT têm visitor null e não entram no índice: contam um a um.
create unique index events_view_once on public.events (vitrine_id, visitor)
  where kind = 'view' and visitor is not null;
