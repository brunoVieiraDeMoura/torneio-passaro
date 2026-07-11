-- Admin Central: ban de usuários/clubes, aprovação de clubes e contador de fraude.
-- (2026-07-11) — aplicar manualmente.

-- ── 1) Ban de usuários ──
alter table public.profiles
  add column if not exists banned boolean not null default false;

-- ── 2) Clubes: aprovação pelo admin + ban ──
alter table public.clubs
  add column if not exists status text not null default 'pending',
  add column if not exists banned boolean not null default false;

-- clubes já existentes contam como aprovados (grandfather).
-- Novos cadastros entram como 'pending' via default.
update public.clubs set status = 'approved' where status = 'pending';

alter table public.clubs drop constraint if exists clubs_status_check;
alter table public.clubs
  add constraint clubs_status_check check (status in ('pending','approved','rejected'));

-- ── 3) Anti-fraude: contador de marcações suspeitas (cliques < 1s) ──
alter table public.scores
  add column if not exists suspicious_count integer not null default 0;

-- ── 4) RLS: admin (por email) lê/atualiza todos os perfis e clubes ──
-- troque o email caso o admin mude.
drop policy if exists "admin select profiles" on public.profiles;
create policy "admin select profiles" on public.profiles
  for select using ((auth.jwt() ->> 'email') = 'bruno.moura.code@gmail.com');

drop policy if exists "admin update profiles" on public.profiles;
create policy "admin update profiles" on public.profiles
  for update using ((auth.jwt() ->> 'email') = 'bruno.moura.code@gmail.com');

drop policy if exists "admin select clubs" on public.clubs;
create policy "admin select clubs" on public.clubs
  for select using ((auth.jwt() ->> 'email') = 'bruno.moura.code@gmail.com');

drop policy if exists "admin update clubs" on public.clubs;
create policy "admin update clubs" on public.clubs
  for update using ((auth.jwt() ->> 'email') = 'bruno.moura.code@gmail.com');
