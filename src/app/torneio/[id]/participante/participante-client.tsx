'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import MestreWalker from '@/components/ui/mestre-walker'
import AdBanner from '@/components/ui/ad-banner'
import { AmpulhetaAnim, FinalTorneioAnim } from '@/components/ui/frame-anim'

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
  elimination_reason?: string | null
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
  initialSuspicious = 0,
}: {
  torneio: Torneio
  participante: Participante
  initialCount: number
  initialSuspicious?: number
}) {
  const [count, setCount] = useState(initialCount)
  // avisos de velocidade já contabilizados pro Chefe de Roda (servidor + sessão)
  const [warnCount, setWarnCount] = useState(initialSuspicious)
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
  const [eliminationReason, setEliminationReason] = useState<string | null>(participante.elimination_reason ?? null)
  const router = useRouter()
  const [clicking, setClicking] = useState(false)
  const pendingRef = useRef(0)     // cliques ainda não enviados ao servidor
  const flushingRef = useRef(false)
  // anti-fraude: detecta cliques em < 1s
  const lastClickRef = useRef(0)
  const suspiciousPendingRef = useRef(0)   // suspeitas ainda não enviadas
  const fraudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [fraudWarning, setFraudWarning] = useState(false)
  const [fraudFlash, setFraudFlash] = useState(false)   // troca o nº do botão por ⚠ por 0.5s

  // O número do botão é PURAMENTE LOCAL. O participante é a única fonte dos próprios
  // cliques, então cada toque incrementa o contador na hora e NADA externo (realtime/
  // poll/flush) o move pra cima — isso elimina os glitches (ex.: 1 2 3 4 3 4), que vinham
  // de reconciliar `servidor + pendentes` em janelas onde esse valor ficava menor que os
  // cliques já mostrados. O servidor é só persistência (write-only) + valor inicial no load.
  // Reset só acontece quando começa uma NOVA marcação (novo start_at).
  const marcacaoKeyRef = useRef<string | null>(torneio.start_at)

  // ── Cache offline: cliques ainda não enviados sobrevivem a queda de internet,
  // crash ou reload do webapp. Salvos por marcação (start_at) e reenviados ao voltar.
  const storageKey = `aveum_pending_${participante.id}`
  const persistPending = useCallback(() => {
    try {
      if (pendingRef.current > 0 || suspiciousPendingRef.current > 0) {
        localStorage.setItem(storageKey, JSON.stringify({
          startAt: marcacaoKeyRef.current,
          pending: pendingRef.current,
          suspicious: suspiciousPendingRef.current,
        }))
      } else {
        localStorage.removeItem(storageKey)
      }
    } catch { /* storage indisponível: segue só em memória */ }
  }, [storageKey])

  // restaura cliques pendentes de um crash/reload DA MESMA marcação
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return
      const saved = JSON.parse(raw) as { startAt: string | null; pending: number; suspicious: number }
      if (saved.startAt === torneio.start_at && saved.pending > 0) {
        pendingRef.current += saved.pending
        suspiciousPendingRef.current += saved.suspicious ?? 0
        setCount(c => c + saved.pending) // initialCount (servidor) + o que ainda não foi enviado
      } else if (saved.startAt !== torneio.start_at) {
        localStorage.removeItem(storageKey) // marcação antiga: descarta
      }
    } catch { /* JSON corrompido: ignora */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (startAt !== marcacaoKeyRef.current) {
      marcacaoKeyRef.current = startAt
      if (startAt) {
        pendingRef.current = 0
        setCount(0)
        setWarnCount(0) // nova marcação: o mestre zera as suspeitas no servidor
        try { localStorage.removeItem(storageKey) } catch {}
      }
    }
  }, [startAt, storageKey])

  // ranking ao vivo + total do pássaro (soma das marcações) p/ telas de espera e final
  const [ranking, setRanking] = useState<{ id: string; bird_name: string; user_name: string; cage_number: number | null; score: number; round_group: number | null }[]>([])
  const [historyTotal, setHistoryTotal] = useState<number | null>(null)

  // Clock tick
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 500)
    return () => clearInterval(id)
  }, [])

  // voltou pra tela do torneio → apaga o cookie de saída (o middleware volta a travar)
  useEffect(() => {
    document.cookie = 'sair_torneio=; path=/; max-age=0'
  }, [])

  // "Sair da tela do torneio": seta o cookie que o middleware respeita e navega pro site.
  // Disponível sempre — mesmo que o torneio não seja encerrado em 2 horas.
  const sairDaTela = useCallback(() => {
    if (!window.confirm('Sair da tela do torneio? Você pode voltar a qualquer momento pela página do torneio.')) return
    document.cookie = `sair_torneio=${torneio.id}; path=/; max-age=43200`
    document.body.classList.remove('hide-site-header')
    // navegação completa (não router.push): o cache do router guardou os redirects
    // de quando o usuário estava travado e devolvia ele pra esta tela
    window.location.assign('/')
  }, [torneio.id])

  // limpa os timers de fraude ao desmontar
  useEffect(() => () => {
    if (fraudTimerRef.current) clearTimeout(fraudTimerRef.current)
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
  }, [])

  // eliminado → redireciona pro torneio em modo telespectador após 5s (tempo de ler o motivo)
  useEffect(() => {
    if (participanteStatus !== 'eliminated') return
    const id = setTimeout(() => router.push(`/torneio/${torneio.id}`), 5000)
    return () => clearTimeout(id)
  }, [participanteStatus, torneio.id, router])

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
          if (payload.new.elimination_reason !== undefined) setEliminationReason(payload.new.elimination_reason)
        })
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
      const [{ data: p }, { data: t }] = await Promise.all([
        supabase.from('participants').select('status, round_group, elimination_reason').eq('id', participante.id).single(),
        supabase.from('tournaments').select('status, start_at, duration_secs, active_group, divisions').eq('id', torneio.id).single(),
      ])
      if (!active) return
      if (p) { setParticipanteStatus(p.status); setRoundGroup(p.round_group); setEliminationReason((p as { elimination_reason?: string | null }).elimination_reason ?? null) }
      if (t) {
        setTorneioStatus(t.status); setStartAt(t.start_at); setDurationSecs(t.duration_secs)
        setActiveGroup(t.active_group ?? 1); setDivisions(t.divisions ?? 1)
      }
      // o contador NÃO é sincronizado aqui — é local; o reset vem da troca de start_at
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

  // Envia ao servidor os cliques acumulados. Chamado no máx 1x/seg. Envia no máximo
  // 30 por vez (teto anti-abuso do servidor) — um backlog offline grande é drenado
  // em lotes de 30/s até esvaziar.
  const flush = useCallback(async () => {
    if (flushingRef.current) return
    const delta = Math.min(30, pendingRef.current)
    if (delta <= 0) return
    flushingRef.current = true
    pendingRef.current -= delta
    const susp = Math.min(30, suspiciousPendingRef.current)
    suspiciousPendingRef.current -= susp
    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: participante.id, tournamentId: torneio.id, increment: delta, suspicious: susp }),
      })
      if (res.ok) {
        // sucesso: servidor persistiu. NÃO mexemos no contador (é local) — evita glitch.
      } else if (res.status >= 500) {
        // erro do servidor: devolve delta + suspeitas pra reenviar no próximo ciclo
        pendingRef.current += delta
        suspiciousPendingRef.current += susp
      } else {
        // 4xx (tempo esgotado / não é sua vez): descarta — reenviar nunca vai passar,
        // evita loop infinito de POST no fim da marcação. Limpa o cache offline junto.
        pendingRef.current = 0
        suspiciousPendingRef.current = 0
      }
    } catch {
      // falha de rede: devolve pra tentar de novo (e fica salvo no localStorage)
      pendingRef.current += delta
      suspiciousPendingRef.current += susp
    } finally {
      flushingRef.current = false
      persistPending()
    }
  }, [participante.id, torneio.id, persistPending])

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
      // torneio finalizado: a marcação final JÁ foi gravada no histórico (finalizeTorneio
      // insere antes de virar o status) — somar o score vivo de novo dobraria a última rodada
      const live = torneioStatus === 'finished' ? 0 : (map[participante.id] ?? 0)
      setHistoryTotal(histSum + live) // ciclos anteriores + marcação atual (se ainda não gravada)
    }
    load()
    const id = setInterval(load, 5000)
    return () => { active = false; clearInterval(id) }
  }, [participanteStatus, torneioStatus, torneio.id, participante.id])

  // Esconde o header/menu enquanto o participante está no torneio.
  // Volta a aparecer quando o torneio é concluído OU 2h após o início.
  const twoHoursAfterStart =
    startAtMs !== null && nowMs !== null && nowMs >= startAtMs + 2 * 3600 * 1000
  const hideHeader = participanteStatus === 'approved' && !isFinished && !twoHoursAfterStart
  useEffect(() => {
    document.body.classList.toggle('hide-site-header', hideHeader)
    return () => document.body.classList.remove('hide-site-header')
  }, [hideHeader])

  const handleClick = useCallback((e: React.PointerEvent) => {
    // multi-touch: só o toque primário conta — 2 dedos (ou a palma encostando)
    // disparavam 2 pointerdown e o contador pulava de 2 em 2
    if (!e.isPrimary) return
    if (!isRunning || !isCountingDown) return
    if (participanteStatus !== 'approved') return
    if (!isMyTurn) return

    // Anti-fraude: 2 cliques em menos de 1s → suspeita. Avisa o participante e
    // contabiliza pro Chefe de Roda (scores.suspicious_count).
    const t = Date.now()
    if (t - lastClickRef.current < 1000) {
      suspiciousPendingRef.current += 1
      setWarnCount(w => w + 1)
      // vibra ao tomar o aviso — sem permissão (Android/Chrome; iOS não suporta a API)
      try { navigator.vibrate?.(200) } catch {}
      setFraudWarning(true)
      if (fraudTimerRef.current) clearTimeout(fraudTimerRef.current)
      fraudTimerRef.current = setTimeout(() => setFraudWarning(false), 5000)
      // troca o número do botão pelo ícone de alerta por 0.5s
      setFraudFlash(true)
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
      flashTimerRef.current = setTimeout(() => setFraudFlash(false), 500)
    }
    lastClickRef.current = t

    // sem debounce por clique — cada toque conta; o envio é agrupado a cada 1s
    pendingRef.current += 1
    setCount(prev => prev + 1)
    persistPending() // backup offline a cada clique (sobrevive a queda/reload)
    setClicking(true)
    setTimeout(() => setClicking(false), 100)
  }, [isRunning, isCountingDown, participanteStatus, isMyTurn, persistPending])

  // ── Telas de estado ──

  // fixo embaixo à direita — não interfere no botão de marcação.
  // zIndex acima do overlay do modo avião (9999): sair continua clicável até 1min do início
  const sairBtn = (
    <button
      onClick={sairDaTela}
      style={{
        position: 'fixed', bottom: 14, right: 14, zIndex: 10000,
        display: 'flex', alignItems: 'center', gap: 6,
        background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20,
        padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit',
        fontSize: '0.72rem', fontWeight: 600, color: '#6B7280',
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
      Sair da tela do torneio
    </button>
  )

  if (participanteStatus === 'pending') {
    return (
      <main style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 24px', textAlign: 'center', background: '#fff' }}>
        <AmpulhetaAnim height={110} />
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Aguardando aprovação</h1>
        <p style={{ color: '#9CA3AF', fontSize: '0.85rem', margin: 0 }}>O mestre vai te aprovar em breve. Fique nessa tela.</p>
        {sairBtn}
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
    const elim =
      eliminationReason === 'fraud'
        ? { emoji: '🚫', title: 'Eliminado por fraude', msg: 'Você foi eliminado por violar as diretrizes do torneio.' }
      : eliminationReason === 'manual'
        ? { emoji: '🏳️', title: 'Você foi eliminado', msg: 'Peça mais informações ao Chefe de Roda sobre a sua eliminação.' }
        : { emoji: '🏳️', title: 'Não classificado', msg: 'Você não se classificou para a próxima fase. Obrigado por participar!' }
    return (
      <main style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 24px', textAlign: 'center', background: '#fff' }}>
        <span style={{ fontSize: '3rem' }}>{elim.emoji}</span>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{elim.title}</h1>
        <p style={{ color: '#6B7280', fontSize: '0.88rem', margin: 0, maxWidth: 340, lineHeight: 1.55 }}>{elim.msg}</p>
        <p style={{ color: '#9CA3AF', fontSize: '0.78rem', margin: '4px 0 0' }}>
          Redirecionando para o torneio em modo telespectador…
        </p>
        <button onClick={() => router.push(`/torneio/${torneio.id}`)}
          style={{ marginTop: 4, padding: '11px 22px', background: '#0D8F41', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          Assistir agora
        </button>
      </main>
    )
  }

  if (isFinished) {
    const total = historyTotal ?? myScore
    return (
      <main style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, padding: '40px 20px', background: '#fff', overflowY: 'auto' }}>
        {/* abaixo do header do site (56px) — não cobre o logo */}
        <Link href="/" style={{
          position: 'fixed', top: 70, left: 14, zIndex: 150,
          display: 'flex', alignItems: 'center', gap: 6,
          background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20,
          padding: '8px 14px', textDecoration: 'none',
          fontSize: '0.75rem', fontWeight: 600, color: '#6B7280',
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Home
        </Link>
        <FinalTorneioAnim maxWidth={320} />
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
    <main style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'safe center', gap: showRankingScreen ? 16 : 32, padding: showRankingScreen ? '32px 20px' : '0 24px', userSelect: 'none', background: '#fff', overflowY: 'auto' }}>

      {/* ── Aviso de fraude (toast fixo no topo — NÃO afeta o layout/botão) ── */}
      {fraudWarning && (
        <div style={{
          position: 'fixed', top: 12, left: 12, right: 12, zIndex: 9998,
          display: 'flex', justifyContent: 'center', pointerEvents: 'none',
        }}>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12,
            padding: '12px 14px', maxWidth: 380, width: '100%',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}>
            <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>⚠️</span>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#B91C1C', lineHeight: 1.45, fontWeight: 600 }}>
              Cuidado com a velocidade que está marcando. Isso pode comprometer a integridade e violar as regras.
            </p>
          </div>
        </div>
      )}

      {/* ── Dica: modo avião (tom leve, sem bloquear com cor pesada) ── */}
      {showAirplane && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(17,24,39,0.45)', backdropFilter: 'blur(2px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}>
          <div style={{
            background: '#fff', borderRadius: 20,
            border: '1px solid #E5E7EB',
            padding: '28px 26px', width: '100%', maxWidth: 420,
            boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
            display: 'flex', flexDirection: 'column', gap: 18, textAlign: 'center',
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: '#F0FDF4', border: '1px solid #D1FAE5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/airplane.svg" alt="Modo avião" width={26} height={26} />
                </div>
              </div>
              <p style={{ margin: '0 0 4px', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#0D8F41' }}>
                💡 Dica
              </p>
              <p style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem', color: '#111827', lineHeight: 1.3 }}>
                Que tal ativar o modo avião?
              </p>
              <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#6B7280', lineHeight: 1.5 }}>
                Evita ligações e notificações atrapalhando a sua marcação. Este aviso some sozinho faltando 2 minutos.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
              {([
                'Arraste do canto superior da tela para baixo para abrir o painel rápido',
                <span key="s2">Toque no ícone{' '}<span style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', background: '#F0FDF4', border: '1px solid #D1FAE5', borderRadius: '50%', width: 20, height: 20, justifyContent: 'center', margin: '0 3px' }}><img src="/airplane.svg" alt="" width={11} height={11} /></span>{' '}do modo avião</span>,
                'Se preferir, só silencie as notificações dos apps de mensagem',
              ] as React.ReactNode[]).map((text, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#F9FAFB', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.72rem', fontWeight: 800, color: '#6B7280' }}>{i + 1}</div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#6B7280', lineHeight: 1.55 }}>{text}</p>
                </div>
              ))}
            </div>

            {msUntilStart !== null && msUntilStart > 0 && (
              <div style={{ background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: 10, padding: '9px 16px' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: 800, color: '#111827' }}>
                  {formatMs(msUntilStart)}
                </span>
                <span style={{ marginLeft: 8, fontSize: '0.68rem', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
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

      {/* Banner no topo — aguardando início E tela de ranking entre marcações */}
      {(preStart || showRankingScreen) && <AdBanner />}
      {preStart && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' }}>
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
          <MestreWalker />
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

          {/* avisos de velocidade já enviados ao Chefe de Roda */}
          {warnCount > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: -12,
              background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 20,
              padding: '7px 14px',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#B91C1C' }}>
                {warnCount} aviso{warnCount !== 1 ? 's' : ''} enviado{warnCount !== 1 ? 's' : ''} ao Chefe de Roda
              </span>
            </div>
          )}

          <button
            onPointerDown={handleClick}
            style={{
              width: 256, height: 256, borderRadius: '50%',
              background: fraudFlash ? '#DC2626' : (clicking ? '#16A34A' : '#0D8F41'),
              color: '#fff', fontWeight: 800, fontSize: '3rem',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: fraudFlash
                ? '0 12px 40px rgba(220,38,38,0.45)'
                : clicking
                  ? '0 4px 20px rgba(13,143,65,0.4)'
                  : '0 12px 40px rgba(13,143,65,0.35)',
              transform: clicking ? 'scale(0.94)' : 'scale(1)',
              transition: 'transform 0.1s, box-shadow 0.1s, background 0.1s',
              userSelect: 'none', WebkitUserSelect: 'none',
              touchAction: 'manipulation',
            }}
          >
            {fraudFlash ? (
              <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Alerta de fraude">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            ) : count}
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

      {/* saída disponível — some faltando 1min pro início da minha marcação e durante a contagem */}
      {!(counting || (isMyTurn && isActive && msUntilStart !== null && msUntilStart > 0 && msUntilStart <= 60_000)) && sairBtn}
    </main>
  )
}
