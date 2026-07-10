-- Sistema de rodadas divididas + vassourada + histórico de contagem
-- Aplicar no Supabase (Studio → SQL, ou `supabase db push`).

-- ── tournaments: rodada atual, nº de contagens (grupos) e grupo ativo ──
alter table public.tournaments
  add column if not exists round        int not null default 1,
  add column if not exists divisions    int not null default 1,
  add column if not exists active_group int not null default 1;

-- ── participants: a qual sub-rodada (grupo) o participante pertence ──
alter table public.participants
  add column if not exists round_group int;

-- permitir status 'eliminated' (usado na vassourada)
alter table public.participants drop constraint if exists participants_status_check;
alter table public.participants
  add constraint participants_status_check
  check (status in ('pending','approved','rejected','eliminated'));

-- ── histórico: snapshot da contagem de cada participante por rodada ──
-- gravado antes de zerar os scores para a próxima rodada
create table if not exists public.round_scores (
  id             uuid primary key default gen_random_uuid(),
  tournament_id  uuid not null references public.tournaments(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  bird_name      text not null,
  round          int  not null,
  round_group    int,
  count          int  not null default 0,
  created_at     timestamptz not null default now()
);

alter table public.round_scores enable row level security;

drop policy if exists "round_scores visível a todos" on public.round_scores;
create policy "round_scores visível a todos"
  on public.round_scores for select using (true);

drop policy if exists "round_scores gerenciado pelo clube" on public.round_scores;
create policy "round_scores gerenciado pelo clube"
  on public.round_scores for all
  using (tournament_id in (
    select t.id from public.tournaments t
    join public.clubs c on c.id = t.club_id
    where c.user_id = auth.uid()
  ));
