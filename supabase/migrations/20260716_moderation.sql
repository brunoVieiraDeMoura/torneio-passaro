-- Moderação de reports (2026-07-16) — aplicar manualmente.
-- Imagem própria do pássaro (moderável), motivo "nome ofensivo" e
-- avisos de moderação para o dono (user_alerts).

-- ── 1) Foto própria do pássaro (upload futuro; admin pode desvincular) ──
alter table public.birds
  add column if not exists photo_url text;

-- ── 2) Novo motivo de report: nome ofensivo ──
alter table public.reports drop constraint if exists reports_reason_check;
alter table public.reports add constraint reports_reason_check
  check (reason in ('imagem_ofensiva','nome_ofensivo','fraude','coligacao','outro'));

-- ── 3) Avisos de moderação para o usuário ──
-- Criados APENAS pelo admin (service role — sem policy de insert).
-- O dono lê e marca como lido. type conta reincidência p/ liberar banimento.
create table if not exists public.user_alerts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null check (type in ('imagem_removida','nome_filtrado','aviso')),
  message     text not null,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.user_alerts enable row level security;

drop policy if exists "dono le os proprios avisos" on public.user_alerts;
create policy "dono le os proprios avisos" on public.user_alerts
  for select using (auth.uid() = user_id);

drop policy if exists "dono marca aviso como lido" on public.user_alerts;
create policy "dono marca aviso como lido" on public.user_alerts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
