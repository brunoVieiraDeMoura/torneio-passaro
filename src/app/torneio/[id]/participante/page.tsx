import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ParticipanteClient from './participante-client'

export default async function ParticipantePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ pid?: string }>
}) {
  const { id } = await params
  const { pid } = await searchParams
  if (!pid) notFound()

  const supabase = await createClient()

  const { data: torneio } = await supabase
    .from('tournaments')
    .select('id, name, start_at, duration_secs, status, active_group, divisions, round, estilo_canto')
    .eq('id', id)
    .single()

  const { data: participante } = await supabase
    .from('participants')
    .select('id, user_name, bird_name, cage_number, status, round_group, elimination_reason, marks_participant_id')
    .eq('id', pid)
    .single()

  if (!torneio || !participante) notFound()

  // Anti-roubo: este participante marca o passarinho de OUTRO (markTarget).
  // Quando há sorteio, a contagem/placar do botão é do ALVO (o que ele marca).
  let markTarget: {
    id: string; bird_name: string; cage_number: number | null; round_group: number | null; status: string
  } | null = null
  if (participante.marks_participant_id) {
    const { data: alvo } = await supabase
      .from('participants')
      .select('id, bird_name, cage_number, round_group, status')
      .eq('id', participante.marks_participant_id)
      .single()
    markTarget = alvo ?? null
  }

  // placar inicial do botão = do passarinho que ESTE participante marca (alvo);
  // sem sorteio (fallback), marca o próprio (comportamento antigo)
  const scoreOwnerId = markTarget?.id ?? pid
  const { data: score } = await supabase
    .from('scores')
    .select('count, suspicious_count')
    .eq('participant_id', scoreOwnerId)
    .eq('tournament_id', id)
    .single()

  return (
    <ParticipanteClient
      torneio={torneio}
      participante={participante}
      markTarget={markTarget}
      initialCount={score?.count ?? 0}
      initialSuspicious={(score as { suspicious_count?: number } | null)?.suspicious_count ?? 0}
    />
  )
}
