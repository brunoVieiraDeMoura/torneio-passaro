'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Torneio {
  id: string
  name: string
  start_at: string | null
  duration_secs: number
  status: string
  active_group: number
  divisions: number
}

interface Participante {
  id: string
  user_name: string
  bird_name: string
  cage_number: number | null
  status: string
  round_group: number | null
}

function pad(n: number) { return String(n).padStart(2, '0') }

function formatMs(ms: number): string {
  const totalSecs = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

const RANK_COLORS = ['#B45309', '#6B7280', '#92400E']

function RankingList({ ranking, myId }: { ranking: { id: string; bird_name: string; user_name: string; cage_number: number | null; score: number }[]; myId: string }) {
  return (
    <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {ranking.length === 0 && <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: '0.8rem', margin: 0 }}>Sem participantes ainda.</p>}
      {ranking.map((p, i) => {
        const me = p.id === myId
        return (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, borderRadius: 10, padding: '10px 14px', background: me ? '#F0FDF4' : '#fff', border: `1px solid ${me ? '#0D8F41' : '#E5E7EB'}` }}>
            <span style={{ width: 24, textAlign: 'center', fontWeight: 800, fontSize: '0.9rem', color: i < 3 ? RANK_COLORS[i] : '#D1D5DB' }}>{i + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.bird_name}{me ? ' (você)' : ''}
              </p>
              <p style={{ margin: 0, fontSize: '0.7rem', color: '#9CA3AF' }}>{p.user_name}{p.cage_number ? ` · Gaiola ${p.cage_number}` : ''}</p>
            </div>
            <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0D8F41' }}>{p.score}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function ParticipanteClient({
  torneio,
  participante,
  initialCount,
}: {
  torneio: Torneio
  participante: Participante
  initialCount: number
}) {
  const [count, setCount] = useState(initialCount)
  // now começa null p/ evitar erro de hidratação (server e client renderizam igual);
  // só passa a valer após montar no cliente
  const [now, setNow] = useState<Date | null>(null)
  const [torneioStatus, setTorneioStatus] = useState(torneio.status)
  const [startAt, setStartAt] = useState<string | null>(torneio.start_at)
  const [durationSecs, setDurationSecs] = useState(torneio.duration_secs)
  const [activeGroup, setActiveGroup] = useState(torneio.active_group ?? 1)
  const [divisions, setDivisions] = useState(torneio.divisions ?? 1)
  const [roundGroup, setRoundGroup] = useState<number | null>(participante.round_group)
  const [participanteStatus, setParticipanteStatus] = useState(participante.status)
  const [clicking, setClicking] = useState(false)
  const pendingRef = useRef(0)     // cliques ainda não enviados ao servidor
  const flushingRef = useRef(false)

  // ranking ao vivo + total do pássaro (soma das marcações) p/ telas de espera e final
  const [ranking, setRanking] = useState<{ id: string; bird_name: string; user_name: string; cage_number: number | null; score: number; round_group: number | null }[]>([])
  const [historyTotal, setHistoryTotal] = useState<number | null>(null)

  // Clock tick
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 500)
    return () => clearInterval(id)
  }, [])

  // Realtime
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`participante:${torneio.id}:${participante.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tournaments', filter: `id=eq.${torneio.id}` },
        payload => {
          if (payload.new.status !== undefined) setTorneioStatus(payload.new.status)
          if (payload.new.start_at !== undefined) setStartAt(payload.new.start_at)
          if (payload.new.duration_secs !== undefined) setDurationSecs(payload.new.duration_secs)
          if (payload.new.active_group !== undefined) setActiveGroup(payload.new.active_group)
          if (payload.new.divisions !== undefined) setDivisions(payload.new.divisions)
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'participants', filter: `id=eq.${participante.id}` },
        payload => {
          if (payload.new.status !== undefined) setParticipanteStatus(payload.new.status)
          if (payload.new.round_group !== undefined) setRoundGroup(payload.new.round_group)
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores', filter: `participant_id=eq.${participante.id}` },
        payload => { if ('count' in payload.new) setCount((payload.new.count as number) + pendingRef.current) })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [torneio.id, participante.id])

  // Fallback (caso o realtime falhe): reflete QUALQUER mudança do Chefe de Roda em ≤2s
  // — início de marcação, pausa, mudança de grupo/duração, aprovação, finalização, etc.
  useEffect(() => {
    if (participanteStatus === 'rejected' || participanteStatus === 'eliminated') return
    if (torneioStatus === 'finished') return
    const supabase = createClient()
    let active = true
    const load = async () => {
      const [{ data: p }, { data: t }, { data: sc }] = await Promise.all([
        supabase.from('participants').select('status, round_group').eq('id', participante.id).single(),
        supabase.from('tournaments').select('status, start_at, duration_secs, active_group, divisions').eq('id', torneio.id).single(),
        supabase.from('scores').select('count').eq('participant_id', participante.id).eq('tournament_id', torneio.id).maybeSingle(),
      ])
      if (!active) return
      if (p) { setParticipanteStatus(p.status); setRoundGroup(p.round_group) }
      if (t) {
        setTorneioStatus(t.status); setStartAt(t.start_at); setDurationSecs(t.duration_secs)
        setActiveGroup(t.active_group ?? 1); setDivisions(t.divisions ?? 1)
      }
      // sincroniza o contador com o servidor (reseta quando o mestre zera no novo ciclo)
      // verdade do servidor + cliques ainda não enviados
      setCount((sc?.count ?? 0) + pendingRef.current)
    }
    load()
    const id = setInterval(load, 2000)
    return () => { active = false; clearInterval(id) }
  }, [participanteStatus, torneioStatus, participante.id, torneio.id])

  const nowMs = now ? now.getTime() : null
  const startAtMs = startAt ? new Date(startAt).getTime() : null
  const msUntilStart = startAtMs !== null && nowMs !== null ? startAtMs - nowMs : null
  const endMs = startAtMs !== null ? startAtMs + durationSecs * 1000 : null
  const msRemaining = endMs !== null && nowMs !== null ? endMs - nowMs : null

  // contagem é dirigida pelo tempo: quando start_at chega, vira contador sozinho
  // (não depende do mestre estar com a aba aberta p/ virar o status → 'running')
  const started = startAtMs !== null && nowMs !== null && nowMs >= startAtMs
  const isActive = torneioStatus === 'open' || torneioStatus === 'running' // nem draft, nem finished
  const isRunning = isActive && started
  // torneio só "termina" quando o Chefe de Roda finaliza — fim de uma marcação NÃO é fim do torneio
  const isFinished = torneioStatus === 'finished'
  const isCountingDown = isRunning && msRemaining !== null && msRemaining > 0
  // marcação dividida: só conta quem está no grupo ativo
  const isMyTurn = divisions <= 1 || roundGroup === activeGroup

  // telas do participante durante o torneio ativo
  const preStart = isMyTurn && !started               // minha marcação agendada, ainda não começou
  const counting = isMyTurn && started && isCountingDown // minha marcação em contagem → botão
  const showRankingScreen = !isFinished && !preStart && !counting // entre marcações / aguardando vez → ranking

  const myScore = ranking.find(r => r.id === participante.id)?.score ?? count
  const myPosition = ranking.findIndex(r => r.id === participante.id) + 1
  // quem está competindo agora (marcação/grupo ativo) — já vem ordenado por score
  const competingNow = ranking.filter(r => divisions <= 1 || r.round_group === activeGroup)

  // Airplane warning: 5min a 2min antes do start_at — SÓ p/ quem vai participar da marcação atual
  const showAirplane =
    isMyTurn &&
    (torneioStatus === 'open' || (isRunning && msUntilStart !== null && msUntilStart > 0)) &&
    msUntilStart !== null && msUntilStart <= 300_000 && msUntilStart > 120_000

  // Envia ao servidor o total de cliques acumulados (delta). Chamado no máx 1x/seg.
  const flush = useCallback(async () => {
    if (flushingRef.current) return
    const delta = pendingRef.current
    if (delta <= 0) return
    flushingRef.current = true
    pendingRef.current = 0
    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: participante.id, tournamentId: torneio.id, increment: delta }),
      })
      if (res.ok) {
        const data = await res.json()
        // verdade do servidor + cliques que chegaram durante a requisição
        setCount(data.count + pendingRef.current)
      } else {
        // falhou: devolve o delta pra reenviar no próximo ciclo (não perde contagem)
        pendingRef.current += delta
      }
    } catch {
      pendingRef.current += delta
    } finally {
      flushingRef.current = false
    }
  }, [participante.id, torneio.id])

  // Limitador: envia acumulado a cada 1s (conta todos os cliques, mesmo os rápidos)
  useEffect(() => {
    const id = setInterval(() => { void flush() }, 1000)
    return () => { clearInterval(id); void flush() }
  }, [flush])

  // Busca ranking + total do pássaro (soma das marcações) a cada 5s enquanto aprovado
  useEffect(() => {
    if (participanteStatus !== 'approved' || torneioStatus === 'draft') return
    const supabase = createClient()
    let active = true
    const load = async () => {
      const [{ data: parts }, { data: scs }, { data: hist }] = await Promise.all([
        supabase.from('participants').select('id, bird_name, user_name, cage_number, round_group').eq('tournament_id', torneio.id).eq('status', 'approved'),
        supabase.from('scores').select('participant_id, count').eq('tournament_id', torneio.id),
        supabase.from('round_scores').select('count').eq('participant_id', participante.id),
      ])
      if (!active) return
      const map: Record<string, number> = {}
      ;(scs ?? []).forEach(s => { map[s.participant_id] = s.count })
      const rank = (parts ?? []).map(p => ({ ...p, score: map[p.id] ?? 0 })).sort((a, b) => b.score - a.score)
      setRanking(rank)
      const histSum = (hist ?? []).reduce((a, h) => a + (h.count ?? 0), 0)
      setHistoryTotal(histSum + (map[participante.id] ?? 0)) // ciclos anteriores + marcação atual
    }
    load()
    const id = setInterval(load, 5000)
    return () => { active = false; clearInterval(id) }
  }, [participanteStatus, torneioStatus, torneio.id, participante.id])

  const handleClick = useCallback(() => {
    if (!isRunning || !isCountingDown) return
    if (participanteStatus !== 'approved') return
    if (!isMyTurn) return

    // sem debounce por clique — cada toque conta; o envio é agrupado a cada 1s
    pendingRef.current += 1
    setCount(prev => prev + 1)
    setClicking(true)
    setTimeout(() => setClicking(false), 100)
  }, [isRunning, isCountingDown, participanteStatus, isMyTurn])

  // ── Telas de estado ──

  if (participanteStatus === 'pending') {
    return (
      <main style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 24px', textAlign: 'center', background: '#fff' }}>
        <span style={{ fontSize: '3rem' }}>⏳</span>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Aguardando aprovação</h1>
        <p style={{ color: '#9CA3AF', fontSize: '0.85rem', margin: 0 }}>O mestre vai te aprovar em breve. Fique nessa tela.</p>
      </main>
    )
  }

  if (participanteStatus === 'rejected') {
    return (
      <main style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 24px', textAlign: 'center', background: '#fff' }}>
        <span style={{ fontSize: '3rem' }}>❌</span>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Inscrição recusada</h1>
      </main>
    )
  }

  if (participanteStatus === 'eliminated') {
    return (
      <main style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 24px', textAlign: 'center', background: '#fff' }}>
        <span style={{ fontSize: '3rem' }}>🏳️</span>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Eliminado</h1>
        <p style={{ color: '#9CA3AF', fontSize: '0.85rem', margin: 0 }}>Você não passou na vassourada. Obrigado por participar!</p>
      </main>
    )
  }

  if (isFinished) {
    const total = historyTotal ?? myScore
    return (
      <main style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, padding: '40px 20px', background: '#fff', overflowY: 'auto' }}>
        <span style={{ fontSize: '3rem' }}>🏁</span>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Fim do torneio!</h1>
        {myPosition > 0 && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '2.5rem', fontWeight: 900, color: '#0D8F41', lineHeight: 1 }}>{myPosition}º lugar</p>
            <p style={{ margin: '6px 0 0', color: '#6B7280', fontSize: '0.9rem' }}>Parabéns, {participante.bird_name}! 🎉</p>
          </div>
        )}
        <div style={{ background: '#F0FDF4', border: '1px solid #D1FAE5', borderRadius: 14, padding: '16px 22px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '0.78rem', color: '#065F46', fontWeight: 600 }}>Seu {participante.bird_name} fez</p>
          <p style={{ margin: '4px 0', fontSize: '2rem', fontWeight: 900, color: '#0D8F41' }}>{total} cantos</p>
          <p style={{ margin: 0, fontSize: '0.72rem', color: '#6B7280' }}>somados ao histórico e ranking do pássaro</p>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Classificação final</p>
        <RankingList ranking={ranking} myId={participante.id} />
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: showRankingScreen ? 'flex-start' : 'center', gap: showRankingScreen ? 16 : 32, padding: showRankingScreen ? '32px 20px' : '0 24px', userSelect: 'none', background: '#fff', overflowY: 'auto' }}>

      {/* ── Aviso modo avião ── */}
      {showAirplane && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.88)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}>
          <div style={{
            background: '#0A1F0E', borderRadius: 20,
            border: '1px solid rgba(13,143,65,0.3)',
            padding: '36px 32px', width: '100%', maxWidth: 420,
            boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
            display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'center',
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                <div style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: '#0D8F41',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 20px rgba(13,143,65,0.5)',
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/airplane.svg" alt="Modo avião" width={32} height={32} style={{ filter: 'brightness(0) invert(1)' }} />
                </div>
              </div>
              <p style={{ margin: 0, fontWeight: 900, fontSize: '1.3rem', color: '#fff', lineHeight: 1.2 }}>
                Coloque seu celular<br />em modo avião!
              </p>
              <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: '#4ADE80', fontWeight: 600 }}>
                Esta mensagem some automaticamente faltando 2 minutos
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
              {([
                'Arraste do canto superior direito da tela para baixo para abrir o painel rápido',
                <span key="s2">Toque no ícone{' '}<span style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', background: '#0D8F41', borderRadius: '50%', width: 20, height: 20, justifyContent: 'center', margin: '0 3px' }}><img src="/airplane.svg" alt="" width={11} height={11} style={{ filter: 'brightness(0) invert(1)' }} /></span>{' '}para ativar o modo avião</span>,
                'Nos apps de mensagem (WhatsApp, etc.) desative as notificações antes de começar',
              ] as React.ReactNode[]).map((text, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(13,143,65,0.2)', border: '1px solid rgba(13,143,65,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.75rem', fontWeight: 800, color: '#4ADE80' }}>{i + 1}</div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#9CA3AF', lineHeight: 1.55 }}>{text}</p>
                </div>
              ))}
            </div>

            {msUntilStart !== null && msUntilStart > 0 && (
              <div style={{ background: 'rgba(13,143,65,0.15)', border: '1px solid rgba(13,143,65,0.3)', borderRadius: 10, padding: '10px 16px' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '1.4rem', fontWeight: 800, color: '#4ADE80' }}>
                  {formatMs(msUntilStart)}
                </span>
                <span style={{ marginLeft: 8, fontSize: '0.7rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  para início
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info do pássaro */}
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: 0, color: '#6B7280', fontSize: '0.85rem' }}>{participante.bird_name}</p>
        {participante.cage_number && (
          <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#9CA3AF' }}>Gaiola {participante.cage_number}</p>
        )}
      </div>

      {/* Aguardando início da minha marcação — mostra countdown */}
      {preStart && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          {msUntilStart !== null && msUntilStart > 0 ? (
            <>
              <div style={{ background: '#FEF3C7', borderRadius: 14, padding: '14px 24px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 4px', fontFamily: 'monospace', fontSize: '2.2rem', fontWeight: 800, color: '#92400E', letterSpacing: '0.04em' }}>
                  {formatMs(msUntilStart)}
                </p>
                <p style={{ margin: 0, fontSize: '0.7rem', color: '#B45309', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  para início
                </p>
              </div>
              <p style={{ margin: 0, color: '#9CA3AF', fontSize: '0.8rem' }}>Aguardando o Chefe de Roda iniciar o torneio</p>
            </>
          ) : (
            <p style={{ margin: 0, color: '#9CA3AF', fontSize: '0.85rem' }}>Aguardando o Chefe de Roda iniciar o torneio...</p>
          )}
        </div>
      )}

      {/* Minha marcação em contagem */}
      {counting && (
        <>
          {isCountingDown && msRemaining !== null && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontFamily: 'monospace', fontSize: '3.5rem', fontWeight: 800, color: msRemaining < 120_000 ? '#DC2626' : '#111827', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {formatMs(msRemaining)}
              </p>
              <p style={{ margin: '4px 0 0', color: '#9CA3AF', fontSize: '0.75rem' }}>tempo restante</p>
            </div>
          )}

          <button
            onPointerDown={handleClick}
            style={{
              width: 256, height: 256, borderRadius: '50%',
              background: clicking ? '#16A34A' : '#0D8F41',
              color: '#fff', fontWeight: 800, fontSize: '3rem',
              border: 'none', cursor: 'pointer',
              boxShadow: clicking
                ? '0 4px 20px rgba(13,143,65,0.4)'
                : '0 12px 40px rgba(13,143,65,0.35)',
              transform: clicking ? 'scale(0.94)' : 'scale(1)',
              transition: 'transform 0.1s, box-shadow 0.1s, background 0.1s',
              userSelect: 'none', WebkitUserSelect: 'none',
              touchAction: 'manipulation',
            }}
          >
            {count}
          </button>

          <p style={{ margin: 0, color: '#9CA3AF', fontSize: '0.8rem' }}>Toque para contar o canto</p>
        </>
      )}

      {/* Entre marcações / aguardando a vez → ranking ao vivo */}
      {showRankingScreen && (
        <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem', color: '#111827' }}>
              {isMyTurn ? 'Sua marcação encerrou' : 'Aguarde a sua marcação'}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#9CA3AF' }}>
              {divisions > 1 ? `Em andamento: marcação ${activeGroup} de ${divisions}. ` : ''}
              Acompanhe o ranking abaixo.
            </p>
          </div>

          <div style={{ background: '#F0FDF4', borderRadius: 12, padding: '10px 18px' }}>
            <span style={{ fontWeight: 800, fontSize: '1.4rem', color: '#0D8F41' }}>{myScore}</span>
            <span style={{ marginLeft: 6, fontSize: '0.72rem', color: '#9CA3AF' }}>
              seus cantos{myPosition > 0 ? ` · ${myPosition}º lugar` : ''}
            </span>
          </div>

          {/* competindo agora — grupo/marcação ativa, rank ao vivo */}
          {divisions > 1 && competingNow.length > 0 && (
            <div style={{ width: '100%', maxWidth: 420, background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12, padding: '12px 12px 14px' }}>
              <p style={{ margin: '0 0 10px', fontSize: '0.68rem', fontWeight: 700, color: '#C2410C', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />
                Competindo agora · marcação {activeGroup}
              </p>
              <RankingList ranking={competingNow} myId={participante.id} />
            </div>
          )}

          <p style={{ margin: '4px 0 0', fontSize: '0.68rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {divisions > 1 ? 'Ranking geral' : 'Ranking dos passarinhos'}
          </p>
          <RankingList ranking={ranking} myId={participante.id} />

          <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: '#9CA3AF', textAlign: 'center', lineHeight: 1.5 }}>
            Aguarde as próximas marcações. Se você passar na vassourada, sua vez volta automaticamente.
          </p>
        </div>
      )}
    </main>
  )
}
