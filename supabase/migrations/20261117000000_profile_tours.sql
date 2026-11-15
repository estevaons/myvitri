-- Tour guiado da plataforma: quais tours a pessoa já viu (concluiu ou pulou) e quando.
-- Chave = id do tour ('home' = /inicio, 'editor' = /editor); valor = data ISO de quando terminou.
-- Sem a chave, o tour abre sozinho na primeira visita à página (lib/onboarding/tours.ts).
-- O "Ver tour da plataforma" do menu da conta abre de novo a qualquer hora, sem depender desta coluna.
alter table public.profiles
  add column tours jsonb not null default '{}'
  check (jsonb_typeof(tours) = 'object' and pg_column_size(tours) <= 1000);

-- Quem já usava a plataforma antes do tour não o recebe sozinho: as linhas existentes ficam marcadas como vistas.
-- (Contas novas ganham a linha no onboarding, com `tours` vazio.)
update public.profiles
set tours = jsonb_build_object('home', now(), 'editor', now())
where tours = '{}';

-- Marca um tour como visto sem ler a linha antes (merge do jsonb no próprio banco).
-- security invoker: quem grava é a própria pessoa, e a RLS de update de `profiles` confere o dono.
create or replace function public.mark_tour_seen(tour text)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.profiles
  set tours = tours || jsonb_build_object(tour, now()),
      updated_at = now()
  where user_id = (select auth.uid())
    and tour in ('home', 'editor');
$$;

revoke all on function public.mark_tour_seen(text) from public, anon;
grant execute on function public.mark_tour_seen(text) to authenticated;
