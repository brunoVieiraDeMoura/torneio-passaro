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
    .select('id, name, start_at, duration_secs, status, active_group, divisions, round')
    .eq('id', id)
    .single()

  const { data: participante } = await supabase
    .from('participants')
    .select('id, user_name, bird_name, cage_number, status, round_group, elimination_reason')
    .eq('id', pid)
    .single()

  if (!torneio || !participante) notFound()

  const { data: score } = await supabase
    .from('scores')
    .select('count, suspicious_count')
    .eq('participant_id', pid)
    .eq('tournament_id', id)
    .single()

  return (
    <ParticipanteClient
      torneio={torneio}
      participante={participante}
      initialCount={score?.count ?? 0}
      initialSuspicious={(score as { suspicious_count?: number } | null)?.suspicious_count ?? 0}
    />
  )
}
