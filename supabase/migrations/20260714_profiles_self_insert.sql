-- Login com Google (OAuth): o primeiro acesso cria o profile no /auth/callback
-- (o signUp por email cria via metadata/trigger, mas o OAuth não passa por ele).
-- Esta policy permite o usuário autenticado inserir o PRÓPRIO profile.
-- Aplicar no Supabase (Studio → SQL, ou `supabase db push`).

alter table public.profiles enable row level security;

drop policy if exists "profiles self insert" on public.profiles;
create policy "profiles self insert" on public.profiles
  for insert with check (auth.uid() = id);
