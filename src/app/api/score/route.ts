import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MAX_INCREMENT = 30 // teto anti-abuso por envio (client agrupa cliques a cada 1s)

export async function POST(req: Request) {
  const { participantId, tournamentId, increment } = await req.json()

  if (!participantId || !tournamentId) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
  }

  // quantidade de cantos deste envio (padrão 1); limitada p/ evitar abuso
  const inc = Math.min(MAX_INCREMENT, Math.max(1, Math.floor(Number(increment) || 1)))

  const supabase = await createClient()

  const { data: torneio } = await supabase
    .from('tournaments')
    .select('status, start_at, duration_secs, active_group, divisions')
    .eq('id', tournamentId)
    .single()

  // aceita contagem dirigida pelo tempo: basta estar 'open'/'running' e dentro da janela
  // (não exige que o mestre já tenha virado o status → 'running')
  if (!torneio || torneio.status === 'draft' || torneio.status === 'finished' || !torneio.start_at) {
    return NextResponse.json({ error: 'Torneio não está em contagem' }, { status: 403 })
  }

  const startAt = new Date(torneio.start_at).getTime()
  const endsAt = startAt + torneio.duration_secs * 1000
  const nowMs = Date.now()
  if (nowMs < startAt) {
    return NextResponse.json({ error: 'A contagem ainda não começou' }, { status: 403 })
  }
  if (nowMs > endsAt) {
    return NextResponse.json({ error: 'Tempo esgotado' }, { status: 403 })
  }

  const { data: participante } = await supabase
    .from('participants')
    .select('status, round_group')
    .eq('id', participantId)
    .single()

  if (!participante || participante.status !== 'approved') {
    return NextResponse.json({ error: 'Participante não aprovado' }, { status: 403 })
  }

  // rodada dividida: só o grupo ativo pode contar agora
  if ((torneio.divisions ?? 1) > 1 && participante.round_group !== torneio.active_group) {
    return NextResponse.json({ error: 'Não é a vez do seu grupo' }, { status: 403 })
  }

  const { data: existing } = await supabase
    .from('scores')
    .select('id, count')
    .eq('participant_id', participantId)
    .eq('tournament_id', tournamentId)
    .single()

  const now = new Date().toISOString()

  if (existing) {
    const { data: updated } = await supabase
      .from('scores')
      .update({ count: existing.count + inc, last_click_at: now })
      .eq('id', existing.id)
      .select('count')
      .single()

    return NextResponse.json({ ok: true, count: updated?.count ?? existing.count + inc })
  }

  const { data: created } = await supabase
    .from('scores')
    .insert({
      participant_id: participantId,
      tournament_id: tournamentId,
      count: inc,
      last_click_at: now,
    })
    .select('count')
    .single()

  return NextResponse.json({ ok: true, count: created?.count ?? inc })
}
