-- Rascunho do editor: salvo automaticamente a cada mudança, apagado ao publicar.
-- Tabela separada de vitrines porque lá a leitura é pública e o rascunho é só do dono.
create table public.vitrine_drafts (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  content jsonb not null check (pg_column_size(content) <= 500000),
  updated_at timestamptz not null default now()
);

alter table public.vitrine_drafts enable row level security;

create policy "dono lê o rascunho" on public.vitrine_drafts for select to authenticated using (owner_id = (select auth.uid()));
create policy "dono cria o rascunho" on public.vitrine_drafts for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "dono edita o rascunho" on public.vitrine_drafts for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "dono apaga o rascunho" on public.vitrine_drafts for delete to authenticated using (owner_id = (select auth.uid()));
