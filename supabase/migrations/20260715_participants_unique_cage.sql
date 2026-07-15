-- Gaiolas não podem repetir número dentro do mesmo torneio (entre inscrições
-- ativas: pendentes e aprovadas). Eliminados/recusados liberam o número.
-- (2026-07-15) — aplicar manualmente no Supabase (Studio → SQL, ou `supabase db push`).

-- 1) limpa duplicatas existentes: mantém o número na inscrição mais antiga,
--    zera a gaiola das demais (o mestre reatribui)
with dups as (
  select id,
         row_number() over (partition by tournament_id, cage_number order by created_at) as rn
  from public.participants
  where cage_number is not null
    and status in ('pending', 'approved')
)
update public.participants p
set cage_number = null
from dups d
where d.id = p.id and d.rn > 1;

-- 2) índice único parcial: 1 número de gaiola por torneio entre ativos
create unique index if not exists participants_unique_cage_per_tournament
  on public.participants (tournament_id, cage_number)
  where cage_number is not null and status in ('pending', 'approved');
