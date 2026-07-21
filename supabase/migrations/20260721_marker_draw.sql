-- Sorteio de gaiolas (anti-roubo): cada participante marca o passarinho de OUTRO.
-- marks_participant_id = o participante (pássaro) que ESTE participante vai marcar.
-- Nunca aponta pra si mesmo (garantido pelo sorteio no app — derangement/ciclo).
alter table public.participants
  add column if not exists marks_participant_id uuid
    references public.participants(id) on delete set null;

-- índice p/ lookups do alvo (quem marca quem)
create index if not exists participants_marks_target_idx
  on public.participants(marks_participant_id);
