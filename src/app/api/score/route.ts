import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

const MAX_INCREMENT = 30 // teto anti-abuso por envio (client agrupa cliques a cada 1s)

export async function POST(req: Request) {
  const { participantId, markerId, tournamentId, increment, suspicious } = await req.json()

  if (!participantId || !tournamentId) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
  }

  // quantidade de cantos deste envio (padrão 1); limitada p/ evitar abuso
  const inc = Math.min(MAX_INCREMENT, Math.max(1, Math.floor(Number(increment) || 1)))
  // suspeitas de fraude deste envio (cliques < 1s) — anti-abuso
  const susp = Math.min(MAX_INCREMENT, Math.max(0, Math.floor(Number(suspicious) || 0)))

  // service role: esta rota valida as regras de negócio (janela de tempo, participante
  // aprovado, grupo ativo) e precisa gravar SEMPRE — antes, com o client de cookie,
  // o RLS podia recusar o insert/update em silêncio e a rota respondia ok sem gravar.
  const supabase = createServiceClient()

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
  // 30s de tolerância após o fim: o client agrupa cliques (1 envio/s, máx 30 por envio)
  // e pode ter ficado offline — cliques feitos DENTRO da janela chegam atrasados e são
  // drenados em lotes ao reconectar. Sem isso o total do servidor ficava menor que o
  // número mostrado no botão do participante.
  if (nowMs > endsAt + 30_000) {
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

  // anti-roubo: se este passarinho tem um marcador designado (sorteio das gaiolas),
  // só ELE pode pontuar — nem o dono, nem terceiros. Sem sorteio, mantém o antigo.
  const { data: assignedMarker } = await supabase
    .from('participants')
    .select('id')
    .eq('marks_participant_id', participantId)
    .eq('tournament_id', tournamentId)
    .maybeSingle()
  if (assignedMarker && assignedMarker.id !== markerId) {
    return NextResponse.json({ error: 'Você não é o marcador designado desta gaiola' }, { status: 403 })
  }

  const { data: existing } = await supabase
    .from('scores')
    .select('id, count, suspicious_count')
    .eq('participant_id', participantId)
    .eq('tournament_id', tournamentId)
    .single()

  const now = new Date().toISOString()

  if (existing) {
    const { data: updated, error } = await supabase
      .from('scores')
      .update({
        count: existing.count + inc,
        suspicious_count: (existing.suspicious_count ?? 0) + susp,
        last_click_at: now,
      })
      .eq('id', existing.id)
      .select('count')
      .single()

    // erro OU zero linhas: nada foi gravado — 500 faz o client devolver os cliques
    // pro backlog e tentar de novo (antes respondia ok e os cantos sumiam)
    if (error || !updated) {
      return NextResponse.json({ error: 'Falha ao gravar contagem' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, count: updated.count })
  }

  const { data: created, error } = await supabase
    .from('scores')
    .insert({
      participant_id: participantId,
      tournament_id: tournamentId,
      count: inc,
      suspicious_count: susp,
      last_click_at: now,
    })
    .select('count')
    .single()

  if (error || !created) {
    return NextResponse.json({ error: 'Falha ao gravar contagem' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, count: created.count })
}
