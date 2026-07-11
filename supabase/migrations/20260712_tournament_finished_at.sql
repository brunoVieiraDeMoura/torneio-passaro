-- Marca quando o torneio foi finalizado (para auto-encerrar a live e redirecionar
-- o mestre 1h depois). (2026-07-12) — aplicar manualmente.
alter table public.tournaments
  add column if not exists finished_at timestamptz;
