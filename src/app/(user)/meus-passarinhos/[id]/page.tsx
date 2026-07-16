import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import BirdReport from './bird-report'

export default async function BirdHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: bird } = await supabase
    .from('birds')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!bird) notFound()

  const { data: participations } = await supabase
    .from('participants')
    .select(`
      id, bird_name, status, created_at,
      tournaments(id, name, status, start_at, cidade, estado, club_id),
      scores(count)
    `)
    .eq('user_id', user.id)
    .eq('bird_name', bird.name)
    .order('created_at', { ascending: false })

  // soma dos cantos de TODAS as marcações (round_scores) por participação —
  // scores.count só reflete o último ciclo; o histórico precisa de tudo.
  const participantIds = (participations ?? []).map(p => p.id)
  const { data: roundRows } = participantIds.length > 0
    ? await supabase.from('round_scores').select('participant_id, count').in('participant_id', participantIds)
    : { data: [] }
  const roundSum: Record<string, number> = {}
  ;(roundRows ?? []).forEach(r => { roundSum[r.participant_id] = (roundSum[r.participant_id] ?? 0) + (r.count ?? 0) })

  type TRow = { id: string; name: string; status: string; start_at: string | null; cidade: string | null; estado: string | null; club_id: string | null } | null
  type SRow = { count: number }[] | null

  // torneio verificado = clube com selo (verde ou integridade) → conta na Liga.
  // Sem selo o torneio segue no registro do pássaro, marcado como não verificado.
  const clubIds = [...new Set((participations ?? [])
    .map(p => (p.tournaments as unknown as TRow)?.club_id)
    .filter((c): c is string => Boolean(c)))]
  const { data: clubsSel } = clubIds.length > 0
    ? await supabase.from('clubs').select('id, selo_verde, selo_integridade').in('id', clubIds)
    : { data: [] }
  const verifiedClubs = new Set((clubsSel ?? []).filter(c => c.selo_verde || c.selo_integridade).map(c => c.id))

  const history = (participations ?? []).map(p => {
    const t = p.tournaments as unknown as TRow
    const scores = p.scores as unknown as SRow
    const liveCount = scores?.[0]?.count ?? 0
    // todas as marcações somadas; fallback p/ contagem ao vivo se ainda sem histórico
    const total = roundSum[p.id] ?? 0
    return {
      verified: t?.club_id ? verifiedClubs.has(t.club_id) : false,
      participant_id: p.id,
      tournament_id: t?.id ?? '',
      tournament_name: t?.name ?? '—',
      tournament_status: t?.status ?? '',
      tournament_start_at: t?.start_at ?? null,
      tournament_cidade: t?.cidade ?? '',
      tournament_estado: t?.estado ?? '',
      score_count: total > 0 ? total : liveCount,
      joined_at: p.created_at,
      participant_status: p.status,
    }
  })

  return <BirdReport bird={bird} history={history} />
}
