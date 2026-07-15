-- Cadastro de clube por email não funcionava: o trigger handle_new_user ignorava
-- o `role` passado no metadata do signUp, e todo profile nascia como 'user'.
-- O middleware então tratava a conta de clube como participante e bloqueava
-- /clube/* — parecia que "o clube não era criado".
-- (2026-07-15) — aplicar manualmente no Supabase (Studio → SQL, ou `supabase db push`).

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

-- Conserta contas de clube já criadas com role errado:
-- quem tem registro em clubs mas ficou com role 'user'.
update public.profiles p
set role = 'club'
from public.clubs c
where c.user_id = p.id and p.role <> 'club';
