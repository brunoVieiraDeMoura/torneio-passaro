-- Selos de verificação de clubes + reports da liga (2026-07-16) — aplicar manualmente.
--
-- Selo verde       = clube vinculado ao passaros.org
-- Selo integridade = clube legalizado, quantidade mínima de participantes e
--                    aderente às diretrizes. Só torneios de clubes com selo
--                    (verde OU integridade) contam os cantos na Liga.

-- ── 1) Selos nos clubes ──
alter table public.clubs
  add column if not exists selo_verde boolean not null default false,
  add column if not exists selo_integridade boolean not null default false,
  add column if not exists selo_verde_request text not null default 'none',
  add column if not exists selo_integridade_request text not null default 'none',
  add column if not exists selo_requested_at timestamptz;

alter table public.clubs drop constraint if exists clubs_selo_verde_request_check;
alter table public.clubs add constraint clubs_selo_verde_request_check
  check (selo_verde_request in ('none','pending','approved','rejected'));

alter table public.clubs drop constraint if exists clubs_selo_integridade_request_check;
alter table public.clubs add constraint clubs_selo_integridade_request_check
  check (selo_integridade_request in ('none','pending','approved','rejected'));

-- ── 2) Proteção: dono do clube só SOLICITA selo (request → 'pending').
--       Conceder/revogar selo, status e ban são exclusivos do admin
--       (service role, onde auth.uid() é null). Sem isso a policy
--       "Clube gerenciado pelo dono" deixaria o dono se auto-aprovar.
create or replace function public.protect_club_admin_columns()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is not null then
    if new.selo_verde is distinct from old.selo_verde
       or new.selo_integridade is distinct from old.selo_integridade
       or new.status is distinct from old.status
       or new.banned is distinct from old.banned then
      raise exception 'somente o admin altera selos, status ou ban';
    end if;
    if new.selo_verde_request is distinct from old.selo_verde_request
       and new.selo_verde_request <> 'pending' then
      raise exception 'transição de selo inválida';
    end if;
    if new.selo_integridade_request is distinct from old.selo_integridade_request
       and new.selo_integridade_request <> 'pending' then
      raise exception 'transição de selo inválida';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_club_admin_columns on public.clubs;
create trigger protect_club_admin_columns
  before update on public.clubs
  for each row execute procedure public.protect_club_admin_columns();

-- ── 3) Reports (imagem ofensiva / suspeita de fraude / coligação com clubes) ──
create table if not exists public.reports (
  id            uuid primary key default gen_random_uuid(),
  target_type   text not null default 'bird' check (target_type in ('bird','user','club')),
  target_id     text not null,
  target_label  text,
  reason        text not null check (reason in ('imagem_ofensiva','fraude','coligacao','outro')),
  details       text,
  reporter_id   uuid references public.profiles(id) on delete set null,
  status        text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at    timestamptz not null default now()
);

-- RLS ligado SEM policies: cliente (anon/authenticated) não lê nem escreve.
-- Todo acesso passa pelas server actions (service role) — insert valida login
-- no servidor e leitura é só do admin.
alter table public.reports enable row level security;
