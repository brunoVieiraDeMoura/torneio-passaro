-- Uso do projeto p/ a aba Settings da Admin Central (2026-07-16) — aplicar manualmente.
-- Retorna tamanho do banco, uso do storage e contagens. SECURITY DEFINER para
-- ler auth.users e storage.objects; execução revogada de anon/authenticated —
-- só a service role (Admin Central) chama.

create or replace function public.admin_usage()
returns json
language sql
security definer
set search_path = ''
as $$
  select json_build_object(
    'db_bytes',      pg_database_size(current_database()),
    'storage_bytes', coalesce((select sum((metadata->>'size')::bigint) from storage.objects), 0),
    'storage_files', (select count(*) from storage.objects),
    'users',         (select count(*) from auth.users),
    'birds',         (select count(*) from public.birds),
    'bird_photos',   (select count(*) from public.birds where photo_url is not null),
    'clubs',         (select count(*) from public.clubs),
    'tournaments',   (select count(*) from public.tournaments),
    'participants',  (select count(*) from public.participants),
    'round_scores',  (select count(*) from public.round_scores),
    'reports',       (select count(*) from public.reports)
  )
$$;

revoke execute on function public.admin_usage() from public;
revoke execute on function public.admin_usage() from anon;
revoke execute on function public.admin_usage() from authenticated;
