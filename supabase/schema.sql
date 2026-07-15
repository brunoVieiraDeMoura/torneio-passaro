-- Habilita extensão para UUID
create extension if not exists "pgcrypto";

-- Perfis de usuário (ligado ao auth.users do Supabase)
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  email       text not null,
  role        text not null check (role in ('user', 'club')) default 'user',
  cidade      text,
  estado      text,
  created_at  timestamptz not null default now()
);

-- Clubes
create table public.clubs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  cidade      text,
  estado      text,
  created_at  timestamptz not null default now()
);

-- Pássaros do usuário
create table public.birds (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  name          text not null,
  raca          text,
  estilo_canto  text,
  created_at    timestamptz not null default now()
);

-- Torneios
create table public.tournaments (
  id            uuid primary key default gen_random_uuid(),
  club_id       uuid not null references public.clubs(id) on delete cascade,
  name          text not null,
  start_at      timestamptz,
  duration_secs integer not null default 900, -- 15 minutos
  status        text not null check (status in ('draft','open','running','finished')) default 'draft',
  qr_token      text not null unique default encode(gen_random_bytes(16), 'hex'),
  cidade        text,
  estado        text,
  created_at    timestamptz not null default now()
);

-- Participantes do torneio
create table public.participants (
  id             uuid primary key default gen_random_uuid(),
  tournament_id  uuid not null references public.tournaments(id) on delete cascade,
  user_id        uuid references public.profiles(id) on delete set null,
  user_name      text not null,
  bird_name      text not null,
  cage_number    integer,
  status         text not null check (status in ('pending','approved','rejected')) default 'pending',
  created_at     timestamptz not null default now()
);

-- Pontuação (uma linha por participante por torneio)
create table public.scores (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid not null references public.participants(id) on delete cascade,
  tournament_id   uuid not null references public.tournaments(id) on delete cascade,
  count           integer not null default 0,
  last_click_at   timestamptz,
  unique(participant_id, tournament_id)
);

-- RLS
alter table public.profiles    enable row level security;
alter table public.clubs       enable row level security;
alter table public.birds       enable row level security;
alter table public.tournaments enable row level security;
alter table public.participants enable row level security;
alter table public.scores      enable row level security;

-- Policies: profiles
create policy "Leitura própria" on public.profiles for select using (auth.uid() = id);
create policy "Atualização própria" on public.profiles for update using (auth.uid() = id);

-- Policies: clubs
create policy "Clube visível a todos" on public.clubs for select using (true);
create policy "Clube gerenciado pelo dono" on public.clubs for all using (auth.uid() = user_id);

-- Policies: birds
create policy "Pássaros visíveis a todos" on public.birds for select using (true);
create policy "Pássaros gerenciados pelo dono" on public.birds for all using (auth.uid() = user_id);

-- Policies: tournaments
create policy "Torneio visível a todos" on public.tournaments for select using (true);
create policy "Torneio gerenciado pelo clube" on public.tournaments for all
  using (club_id in (select id from public.clubs where user_id = auth.uid()));

-- Policies: participants
create policy "Participante visível a todos" on public.participants for select using (true);
create policy "Participante gerenciado pelo clube" on public.participants for update
  using (tournament_id in (
    select t.id from public.tournaments t
    join public.clubs c on c.id = t.club_id
    where c.user_id = auth.uid()
  ));
create policy "Participante inserido por qualquer um" on public.participants for insert with check (true);

-- Policies: scores
create policy "Score visível a todos" on public.scores for select using (true);
create policy "Score gerenciado pelo participante" on public.scores for all
  using (participant_id in (select id from public.participants where user_id = auth.uid()));

-- Realtime habilitado para scores (ranking ao vivo)
alter publication supabase_realtime add table public.scores;
alter publication supabase_realtime add table public.participants;

-- Trigger: cria perfil ao registrar usuário
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    case when new.raw_user_meta_data->>'role' = 'club' then 'club' else 'user' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
