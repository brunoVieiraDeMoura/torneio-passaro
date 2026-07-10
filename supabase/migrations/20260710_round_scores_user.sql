-- Vincula o histórico de contagem (round_scores) ao usuário/pássaro,
-- para que os cantos do pássaro eliminado na vassourada entrem no histórico dele.
-- Aplicar no Supabase (Studio → SQL, ou `supabase db push`).

alter table public.round_scores
  add column if not exists user_id uuid references public.profiles(id) on delete set null;

create index if not exists round_scores_user_id_idx on public.round_scores (user_id);
