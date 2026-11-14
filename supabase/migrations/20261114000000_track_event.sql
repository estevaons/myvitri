-- Eventos da vitrine pública pela função `track_event`, com o visitante assinado pelo servidor (passo 1 de 2).
--
-- Hoje qualquer um insere em `events` direto com a chave publicável (policy "visitante registra evento"), sem limite e
-- com o `visitor` que quiser: dá para inflar as métricas de qualquer vitrine e pô-la no ranking do dia. A correção:
--   1. (esta migração, aditiva) `track_event` grava o evento só se `p_sig` for o HMAC-SHA256 do visitante com o segredo
--      `track_salt` do Vault, o mesmo valor de TRACK_SALT, que só o servidor e o banco conhecem; e limita cada visitante
--      a 60 eventos a cada 10 minutos. Não muda nada para o /api/t antigo, que continua inserindo direto.
--   2. (20261114000100_events_lockdown.sql, depois do deploy do app que chama track_event) remove o insert anônimo e
--      faz o ranking contar só eventos com visitante.
--
-- ⚠ Antes do passo 2, grave o segredo no Vault (SQL Editor), com o mesmo valor de TRACK_SALT da Vercel:
--     select vault.create_secret('<valor de TRACK_SALT>', 'track_salt');
--   Sem ele, track_event recusa todo evento (erro VT500, que o /api/t loga como "track").

create extension if not exists pgcrypto with schema extensions;

-- Para o ritmo por visitante.
create index if not exists events_visitor_idx on public.events (visitor, created_at desc) where visitor is not null;

/*
 * `p_visitor`: código anônimo do dia calculado no /api/t (HMAC de dia + vitrine + IP + navegador com TRACK_SALT; o IP
 * não é guardado), o mesmo de 20261113000100_view_once_per_day.sql. `p_sig`: HMAC-SHA256 do visitante com o mesmo
 * segredo, em hex: sem o segredo não dá para inventar visitantes. Vitrine inexistente, tipo inválido, ritmo estourado e
 * segunda visita do dia (índice events_view_once) são ignorados sem erro.
 */
create function public.track_event(p_vitrine uuid, p_kind text, p_item uuid, p_visitor text, p_sig text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  secret text;
begin
  select s.decrypted_secret into secret from vault.decrypted_secrets s where s.name = 'track_salt' limit 1;
  if secret is null then
    raise exception 'segredo track_salt ausente no Vault' using errcode = 'VT500';
  end if;
  if p_visitor is null or p_visitor !~ '^[0-9a-f]{16}$' or p_sig is null
     or p_sig <> encode(extensions.hmac(p_visitor, secret, 'sha256'), 'hex') then
    raise exception 'visitante sem assinatura válida' using errcode = '42501';
  end if;
  if p_kind is null or p_kind not in ('view', 'buy', 'copy', 'video', 'post') then
    return;
  end if;
  if not exists (select 1 from public.vitrines v where v.id = p_vitrine) then
    return;
  end if;
  if (select count(*) from public.events e where e.visitor = p_visitor and e.created_at > now() - interval '10 minutes') >= 60 then
    return;
  end if;
  insert into public.events (vitrine_id, kind, item_id, visitor) values (p_vitrine, p_kind, p_item, p_visitor);
exception
  -- segunda visita do mesmo visitante no dia (events_view_once): já foi contada
  when unique_violation then
    return;
end;
$$;
revoke execute on function public.track_event(uuid, text, uuid, text, text) from public;
grant execute on function public.track_event(uuid, text, uuid, text, text) to anon, authenticated;
