import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

// Canto Fibra: cada aperto (pressionar/soltar) vira um intervalo. Em vez de
// somar 1 canto por clique (como /api/score), soma a duração do intervalo
// (ms) ao scores.count — que passa a representar tempo total cantado.
export async function POST(req: Request) {
  const { participantId, markerId, tournamentId, startedAt, endedAt } = await req.json()

  if (!participantId || !tournamentId || !startedAt || !endedAt) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: torneio } = await supabase
    .from('tournaments')
    .select('status, start_at, duration_secs, active_group, divisions, estilo_canto, round')
    .eq('id', tournamentId)
    .single()

  if (!torneio || torneio.status === 'draft' || torneio.status === 'finished' || !torneio.start_at) {
    return NextResponse.json({ error: 'Torneio não está em contagem' }, { status: 403 })
  }
  if (torneio.estilo_canto !== 'Canto Fibra') {
    return NextResponse.json({ error: 'Torneio não é Canto Fibra' }, { status: 403 })
  }

  const windowStart = new Date(torneio.start_at).getTime()
  const windowEnd = windowStart + torneio.duration_secs * 1000
  const nowMs = Date.now()
  if (nowMs < windowStart) {
    return NextResponse.json({ error: 'A contagem ainda não começou' }, { status: 403 })
  }
  // 30s de tolerância após o fim, mesmo critério do /api/score (offline/latência)
  if (nowMs > windowEnd + 30_000) {
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
  if ((torneio.divisions ?? 1) > 1 && participante.round_group !== torneio.active_group) {
    return NextResponse.json({ error: 'Não é a vez do seu grupo' }, { status: 403 })
  }

  // anti-roubo: só o marcador designado (sorteio das gaiolas) pode pontuar este alvo
  const { data: assignedMarker } = await supabase
    .from('participants')
    .select('id')
    .eq('marks_participant_id', participantId)
    .eq('tournament_id', tournamentId)
    .maybeSingle()
  if (assignedMarker && assignedMarker.id !== markerId) {
    return NextResponse.json({ error: 'Você não é o marcador designado desta gaiola' }, { status: 403 })
  }

  // clampa o intervalo pra dentro da janela: cobre o toque que começou antes
  // do início oficial (raro) e, principalmente, o botão que ficou pressionado
  // além do fim da bateria — soma só até o fim, o resto é descartado.
  const startMs = Math.max(new Date(startedAt).getTime(), windowStart)
  const endMs = Math.min(new Date(endedAt).getTime(), windowEnd)
  const durationMs = endMs - startMs

  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return NextResponse.json({ error: 'Intervalo inválido' }, { status: 403 })
  }

  const { error: intervalError } = await supabase.from('fibra_intervals').insert({
    tournament_id: tournamentId,
    participant_id: participantId,
    round: torneio.round ?? 1,
    round_group: participante.round_group,
    started_at: new Date(startMs).toISOString(),
    ended_at: new Date(endMs).toISOString(),
    duration_ms: durationMs,
  })
  if (intervalError) {
    return NextResponse.json({ error: 'Falha ao gravar intervalo' }, { status: 500 })
  }

  const { data: existing } = await supabase
    .from('scores')
    .select('id, count')
    .eq('participant_id', participantId)
    .eq('tournament_id', tournamentId)
    .single()

  const now = new Date().toISOString()

  if (existing) {
    const { data: updated, error } = await supabase
      .from('scores')
      .update({ count: existing.count + durationMs, last_click_at: now })
      .eq('id', existing.id)
      .select('count')
      .single()
    if (error || !updated) {
      return NextResponse.json({ error: 'Falha ao gravar contagem' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, count: updated.count })
  }

  const { data: created, error } = await supabase
    .from('scores')
    .insert({ participant_id: participantId, tournament_id: tournamentId, count: durationMs, last_click_at: now })
    .select('count')
    .single()

  if (error || !created) {
    return NextResponse.json({ error: 'Falha ao gravar contagem' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, count: created.count })
}
