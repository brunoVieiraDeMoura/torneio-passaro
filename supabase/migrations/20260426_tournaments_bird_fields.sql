alter table public.tournaments
  add column if not exists tipo_ave     text,
  add column if not exists estilo_canto text;
