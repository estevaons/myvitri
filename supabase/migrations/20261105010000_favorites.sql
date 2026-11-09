-- Vitrines favoritas de cada conta. Lista privada: só a própria pessoa lê e altera.
create table public.favorites (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  vitrine_id uuid not null references public.vitrines (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, vitrine_id)
);
-- a chave primária já cobre "as favoritas de alguém"; este índice serve à cascata ao apagar a vitrine
create index favorites_vitrine_idx on public.favorites (vitrine_id);

alter table public.favorites enable row level security;

create policy "dono lê favoritos" on public.favorites for select to authenticated
  using (user_id = (select auth.uid()));
create policy "dono adiciona favorito" on public.favorites for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "dono remove favorito" on public.favorites for delete to authenticated
  using (user_id = (select auth.uid()));
