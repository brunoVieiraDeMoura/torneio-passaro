-- Motivo da eliminação do participante (fraude / manual / vassourada).
-- (2026-07-13) — aplicar manualmente.
alter table public.participants
  add column if not exists elimination_reason text;
