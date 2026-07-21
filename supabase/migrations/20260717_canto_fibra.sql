-- Canto Fibra: guarda os intervalos (início/fim de cada aperto) do modo de
-- marcação por tempo. O placar em si continua em scores.count (milissegundos
-- acumulados quando o torneio é Canto Fibra) — esta tabela só alimenta o
-- carrossel visual de intervalos do chefe de roda e do telão público.
-- Aplicar no Supabase (Studio → SQL, ou `supabase db push`).

create table if not exists public.fibra_intervals (
  id             uuid primary key default gen_random_uuid(),
  tournament_id  uuid not null references public.tournaments(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  round          int  not null,
  round_group    int,
  started_at     timestamptz not null,
  ended_at       timestamptz not null,
  duration_ms    int  not null,
  created_at     timestamptz not null default now()
);

create index if not exists fibra_intervals_tournament_idx on public.fibra_intervals (tournament_id);
create index if not exists fibra_intervals_participant_idx on public.fibra_intervals (participant_id);

alter table public.fibra_intervals enable row level security;

drop policy if exists "fibra_intervals visível a todos" on public.fibra_intervals;
create policy "fibra_intervals visível a todos"
  on public.fibra_intervals for select using (true);

drop policy if exists "fibra_intervals gerenciado pelo clube" on public.fibra_intervals;
create policy "fibra_intervals gerenciado pelo clube"
  on public.fibra_intervals for all
  using (tournament_id in (
    select t.id from public.tournaments t
    join public.clubs c on c.id = t.club_id
    where c.user_id = auth.uid()
  ));

alter publication supabase_realtime add table public.fibra_intervals;
