-- ⚠️⚠️⚠️  APAGA TODOS OS DADOS DO BANCO  ⚠️⚠️⚠️
-- Clubes, usuários (contas de auth), pássaros criados, torneios, participações,
-- pontuações, histórico, reports e alertas. NÃO dá pra desfazer.
--
-- Mantém: schema, RLS/policies, functions, triggers, migrations (só zera os DADOS).
-- NÃO remove os "pássaros fakes" da Liga — esses são mock em CÓDIGO (src/data/liga-*.ts),
-- controlados pela flag NEXT_PUBLIC_SHOW_LIGA_MOCK (ver getMergedLiga em src/lib/liga.ts).
--
-- Como rodar: Supabase Dashboard → SQL Editor → cole tudo → Run.
-- Faça isso só no projeto certo. Confirme o projeto no topo do dashboard antes.

begin;

-- zera as tabelas de dados (CASCADE resolve as FKs entre elas)
truncate table
  public.scores,
  public.fibra_intervals,
  public.round_scores,
  public.participants,
  public.tournaments,
  public.reports,
  public.user_alerts,
  public.birds,
  public.clubs,
  public.profiles
restart identity cascade;

-- remove as contas de autenticação (profiles são recriados no cadastro via trigger)
delete from auth.users;

commit;

-- Confira que zerou:
--   select
--     (select count(*) from public.profiles)     as profiles,
--     (select count(*) from public.clubs)         as clubs,
--     (select count(*) from public.birds)         as birds,
--     (select count(*) from public.tournaments)   as tournaments,
--     (select count(*) from auth.users)           as auth_users;
