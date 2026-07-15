-- Inscrição duplicada: sair da tela do torneio e ler o QR de novo criava uma
-- segunda inscrição do mesmo usuário no mesmo torneio. A página agora bloqueia,
-- e este índice garante no banco (protege contra clique duplo/corrida).
-- (2026-07-15) — aplicar manualmente no Supabase (Studio → SQL, ou `supabase db push`).

-- 1) limpa duplicatas existentes: mantém a inscrição ativa mais antiga,
--    as demais viram 'rejected'
with dups as (
  select id,
         row_number() over (partition by tournament_id, user_id order by created_at) as rn
  from public.participants
  where user_id is not null
    and status in ('pending', 'approved')
)
update public.participants p
set status = 'rejected'
from dups d
where d.id = p.id and d.rn > 1;

-- 2) índice único parcial: 1 inscrição ativa por usuário por torneio
--    (participantes sem app têm user_id null e ficam de fora; eliminados/recusados
--    não contam, permitindo nova inscrição se o clube recusar por engano)
create unique index if not exists participants_one_active_per_user
  on public.participants (tournament_id, user_id)
  where user_id is not null and status in ('pending', 'approved');
