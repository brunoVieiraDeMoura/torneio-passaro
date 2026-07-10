-- Permite ao dono do clube gerenciar os scores do seu torneio.
-- Necessário para "Cantos sem app": os participantes sem app têm user_id null,
-- então a policy antiga (só o próprio participante) bloqueava o insert/update do mestre.
-- Aplicar no Supabase (Studio → SQL, ou `supabase db push`).

drop policy if exists "Score gerenciado pelo clube" on public.scores;
create policy "Score gerenciado pelo clube"
  on public.scores for all
  using (tournament_id in (
    select t.id from public.tournaments t
    join public.clubs c on c.id = t.club_id
    where c.user_id = auth.uid()
  ))
  with check (tournament_id in (
    select t.id from public.tournaments t
    join public.clubs c on c.id = t.club_id
    where c.user_id = auth.uid()
  ));
