-- Posição manual das gaiolas: switch no criar torneio. Quando ligado, o mestre
-- define quem vai pro grupo 1 (e 2, 3... até N-1) na Configuração da Marcação;
-- quem sobra cai automaticamente no último grupo. Desligado = round-robin (atual).
-- (2026-07-15) — aplicar manualmente no Supabase (Studio → SQL, ou `supabase db push`).

alter table public.tournaments
  add column if not exists manual_groups boolean not null default false;
