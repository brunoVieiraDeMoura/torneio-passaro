'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import MestreWalker from '@/components/ui/mestre-walker'
import AdBanner from '@/components/ui/ad-banner'
import { AmpulhetaAnim, FinalTorneioAnim } from '@/components/ui/frame-anim'
import { formatDuration } from '@/lib/duration'

interface Torneio {
  id: string
  name: string
  start_at: string | null
  duration_secs: number
  status: string
  active_group: number
  divisions: number
  round?: number
  estilo_canto?: string | null
}

// "Primeira Marcação", "Segunda Marcação da Segunda Etapa"...
// grupo = marcação dentro do ciclo; ciclo (round) > 1 vira "Etapa"
const ORDINAIS = ['Primeira', 'Segunda', 'Terceira', 'Quarta', 'Quinta', 'Sexta', 'Sétima', 'Oitava']
function nomeMarcacao(group: number, round: number): string {
  const g = ORDINAIS[group - 1] ?? `${group}ª`
  const etapa = round > 1 ? ` da ${ORDINAIS[round - 1] ?? `${round}ª`} Etapa` : ''
  return `${g} Marcação${etapa}`
}

interface Participante {
  id: string
  user_name: string
  bird_name: string
  cage_number: number | null
  status: string
  round_group: number | null
  marks_participant_id?: string | null
  elimination_reason?: string | null
}

// Anti-roubo: o passarinho (de outra pessoa) que este participante vai marcar.
interface MarkTarget {
  id: string
  bird_name: string
  cage_number: number | null
  round_group: number | null
  status: string
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

function RankingList({ ranking, myId, timeMode = false }: { ranking: { id: string; bird_name: string; user_name: string; cage_number: number | null; score: number }[]; myId: string; timeMode?: boolean }) {
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
            <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0D8F41' }}>{timeMode ? formatDuration(p.score) : p.score}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function ParticipanteClient({
  torneio,
  participante,
  markTarget: markTargetInitial = null,
  initialCount,
  initialSuspicious = 0,
}: {
  torneio: Torneio
  participante: Participante
  markTarget?: MarkTarget | null
  initialCount: number
  initialSuspicious?: number
}) {
  const isFibra = torneio.estilo_canto === 'Canto Fibra'
  // Anti-roubo: o botão marca o passarinho do ALVO (markTarget). Sem sorteio
  // (fallback), marca o próprio — comportamento antigo. É STATE porque o sorteio
  // pode acontecer com o participante já na tela → atualiza em tempo real (poll).
  const [markTarget, setMarkTarget] = useState<MarkTarget | null>(markTargetInitial)
  const scoreTargetId = markTarget?.id ?? participante.id
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
  const [round, setRound] = useState(torneio.round ?? 1)
  // grupo do passarinho MARCADO (alvo) — decide quando é a vez de marcar.
  // sem sorteio (fallback), acompanha o próprio grupo.
  const [targetGroup, setTargetGroup] = useState<number | null>(markTarget?.round_group ?? participante.round_group)
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
  const [airplaneDismissed, setAirplaneDismissed] = useState(false) // dica do modo avião fechada no X

  // ── Canto Fibra: marcação por tempo (pressionar/soltar), sem penalidade ──
  const [pressing, setPressing] = useState(false)
  const pressStartRef = useRef<number | null>(null)
  const pendingIntervalsRef = useRef<{ startedAt: string; endedAt: string }[]>([])
  const flushingFibraRef = useRef(false)
  const fibraStorageKey = `aveum_pending_fibra_${participante.id}`

  const persistPendingFibra = useCallback(() => {
    try {
      const pressing = pressStartRef.current !== null
      if (pendingIntervalsRef.current.length > 0 || pressing) {
        localStorage.setItem(fibraStorageKey, JSON.stringify({
          startAt: marcacaoKeyRef.current,
          intervals: pendingIntervalsRef.current,
          // aperto EM ANDAMENTO: início + "último visto" (atualizado a cada tick).
          // se o app cair no meio do segurar, recupera até o último instante confirmado
          // vivo — não perde e não supervaloriza (erro máx = 1 tick).
          pressStartedAt: pressing ? new Date(pressStartRef.current!).toISOString() : null,
          pressLastAt: pressing ? new Date().toISOString() : null,
        }))
      } else {
        localStorage.removeItem(fibraStorageKey)
      }
    } catch { /* storage indisponível: segue só em memória */ }
  }, [fibraStorageKey])

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

  // restaura intervalos de Canto Fibra pendentes de um crash/reload DA MESMA marcação
  useEffect(() => {
    try {
      const raw = localStorage.getItem(fibraStorageKey)
      if (!raw) return
      const saved = JSON.parse(raw) as {
        startAt: string | null
        intervals: { startedAt: string; endedAt: string }[]
        pressStartedAt?: string | null; pressLastAt?: string | null
      }
      if (saved.startAt === torneio.start_at) {
        let somaMs = 0
        if (saved.intervals?.length > 0) {
          pendingIntervalsRef.current.push(...saved.intervals)
          somaMs += saved.intervals.reduce((a, iv) => a + (new Date(iv.endedAt).getTime() - new Date(iv.startedAt).getTime()), 0)
        }
        // aperto que estava em andamento no crash → fecha no "último visto" (não agora,
        // pra não contar tempo em que o app estava morto)
        if (saved.pressStartedAt) {
          const s = new Date(saved.pressStartedAt).getTime()
          const e = saved.pressLastAt ? new Date(saved.pressLastAt).getTime() : s
          if (e > s) {
            pendingIntervalsRef.current.push({ startedAt: saved.pressStartedAt, endedAt: new Date(e).toISOString() })
            somaMs += e - s
          }
        }
        if (somaMs > 0) setCount(c => c + somaMs)
        // regrava sem o pressStartedAt (já virou intervalo) — evita recontar num 2º reload
        persistPendingFibra()
      } else if (saved.startAt !== torneio.start_at) {
        localStorage.removeItem(fibraStorageKey)
      }
    } catch { /* JSON corrompido: ignora */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (startAt !== marcacaoKeyRef.current) {
      marcacaoKeyRef.current = startAt
      if (startAt) {
        pendingRef.current = 0
        pendingIntervalsRef.current = []
        pressStartRef.current = null
        setPressing(false)
        setCount(0)
        setWarnCount(0) // nova marcação: o mestre zera as suspeitas no servidor
        setAirplaneDismissed(false) // nova marcação → a dica do modo avião pode reaparecer
        try { localStorage.removeItem(storageKey); localStorage.removeItem(fibraStorageKey) } catch {}
      }
    }
  }, [startAt, storageKey, fibraStorageKey])

  // ranking ao vivo + total do pássaro (soma das marcações) p/ telas de espera e final
  const [ranking, setRanking] = useState<{ id: string; bird_name: string; user_name: string; cage_number: number | null; score: number; round_group: number | null }[]>([])
  const [historyTotal, setHistoryTotal] = useState<number | null>(null)

  // ── Sincronização de relógio: countdown roda em HORA DO SERVIDOR ──
  // Cada aparelho mede o offset (servidor − local) compensando a latência (RTT/2)
  // e usa a melhor amostra (menor RTT). Todos cruzam o 00:00 no mesmo instante
  // real, independente do relógio do celular estar certo.
  const serverOffsetRef = useRef(0)
  useEffect(() => {
    let on = true
    ;(async () => {
      try {
        let best: { offset: number; rtt: number } | null = null
        for (let i = 0; i < 3; i++) {
          const t0 = Date.now()
          const res = await fetch('/api/time', { cache: 'no-store' })
          const { now: server } = await res.json() as { now: number }
          const t1 = Date.now()
          const rtt = t1 - t0
          const offset = server + rtt / 2 - t1
          if (!best || rtt < best.rtt) best = { offset, rtt }
        }
        if (on && best) serverOffsetRef.current = best.offset
      } catch { /* sem sync: segue no relógio local */ }
    })()
    return () => { on = false }
  }, [])

  // Clock tick (250ms: início/fim da contagem alinham em ±125ms entre aparelhos)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date(Date.now() + serverOffsetRef.current)), 250)
    return () => clearInterval(id)
  }, [])

  // voltou pra tela do torneio → apaga o cookie de saída (o middleware volta a travar)
  useEffect(() => {
    document.cookie = 'sair_torneio=; path=/; max-age=0'
  }, [])

  // "Sair da tela do torneio": seta o cookie que o middleware respeita e navega pro site.
  // Confirmação via modal próprio — window.confirm é suprimido em PWA/webview mobile
  // (retornava false sem mostrar nada e o botão parecia morto).
  const [sairConfirm, setSairConfirm] = useState(false)
  const sairDaTela = useCallback(() => {
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
          if (payload.new.status !== undefined) {
            // 'finished' é definitivo e troca a tela inteira → confirma no banco antes
            // de aplicar (evita flash de "Fim do torneio" por evento espúrio/estado velho)
            if (payload.new.status === 'finished') {
              supabase.from('tournaments').select('status').eq('id', torneio.id).single()
                .then(({ data }) => { if (data?.status === 'finished') setTorneioStatus('finished') })
            } else {
              setTorneioStatus(payload.new.status)
            }
          }
          if (payload.new.start_at !== undefined) setStartAt(payload.new.start_at)
          if (payload.new.duration_secs !== undefined) setDurationSecs(payload.new.duration_secs)
          if (payload.new.active_group !== undefined) setActiveGroup(payload.new.active_group)
          if (payload.new.divisions !== undefined) setDivisions(payload.new.divisions)
          if (payload.new.round !== undefined) setRound(payload.new.round)
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'participants', filter: `id=eq.${participante.id}` },
        payload => {
          if (payload.new.status !== undefined) setParticipanteStatus(payload.new.status)
          // sem sorteio, a vez segue o próprio grupo; com sorteio, é o grupo do alvo
          if (payload.new.round_group !== undefined && !markTarget) setTargetGroup(payload.new.round_group)
          if (payload.new.elimination_reason !== undefined) setEliminationReason(payload.new.elimination_reason)
          // Sorteio em tempo real: alvo mudou → busca o passarinho e atualiza a gaiola a marcar
          if (payload.new.marks_participant_id !== undefined) {
            const newTid = payload.new.marks_participant_id as string | null
            if (newTid && newTid !== markTarget?.id) {
              supabase.from('participants').select('id, bird_name, cage_number, round_group, status').eq('id', newTid).single()
                .then(({ data }) => { if (data) { setMarkTarget(data as MarkTarget); setTargetGroup(data.round_group) } })
            } else if (!newTid) {
              setMarkTarget(null)
            }
          }
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [torneio.id, participante.id, markTarget])

  // Fallback (caso o realtime falhe): reflete QUALQUER mudança do Chefe de Roda em ≤2s
  // — início de marcação, pausa, mudança de grupo/duração, aprovação, finalização, etc.
  useEffect(() => {
    if (participanteStatus === 'rejected' || participanteStatus === 'eliminated') return
    if (torneioStatus === 'finished') return
    const supabase = createClient()
    let active = true
    const load = async () => {
      const [{ data: p }, { data: t }] = await Promise.all([
        supabase.from('participants').select('status, round_group, elimination_reason, marks_participant_id').eq('id', participante.id).single(),
        supabase.from('tournaments').select('status, start_at, duration_secs, active_group, divisions, round').eq('id', torneio.id).single(),
      ])
      if (!active) return
      if (p) { setParticipanteStatus(p.status); setEliminationReason((p as { elimination_reason?: string | null }).elimination_reason ?? null) }

      // Sorteio em TEMPO REAL: se o alvo (marks_participant_id) mudou, busca o novo
      // passarinho e atualiza qual gaiola marcar; se zerou (re-sorteio), limpa.
      const newTargetId = (p as { marks_participant_id?: string | null } | null)?.marks_participant_id ?? null
      const curTargetId = markTarget?.id ?? null
      if (newTargetId !== curTargetId) {
        if (newTargetId) {
          const { data: alvo } = await supabase
            .from('participants').select('id, bird_name, cage_number, round_group, status').eq('id', newTargetId).single()
          if (active && alvo) { setMarkTarget(alvo as MarkTarget); setTargetGroup(alvo.round_group) }
        } else {
          setMarkTarget(null)
          if (p) setTargetGroup(p.round_group)
        }
      } else if (markTarget) {
        // mesmo alvo: mantém o grupo do alvo sincronizado (decide a vez de marcar)
        const { data: tgt } = await supabase.from('participants').select('round_group').eq('id', markTarget.id).single()
        if (active && tgt) setTargetGroup((tgt as { round_group: number | null }).round_group)
      } else if (p) {
        setTargetGroup(p.round_group)
      }

      if (t) {
        setTorneioStatus(t.status); setStartAt(t.start_at); setDurationSecs(t.duration_secs)
        setActiveGroup(t.active_group ?? 1); setDivisions(t.divisions ?? 1)
        setRound((t as { round?: number }).round ?? 1)
      }
      // o contador NÃO é sincronizado aqui — é local; o reset vem da troca de start_at
    }
    load()
    const id = setInterval(load, 2000)
    return () => { active = false; clearInterval(id) }
  }, [participanteStatus, torneioStatus, participante.id, torneio.id, markTarget])

  const nowMs = now ? now.getTime() : null
  const startAtMs = startAt ? new Date(startAt).getTime() : null
  const msUntilStart = startAtMs !== null && nowMs !== null ? startAtMs - nowMs : null
  const endMs = startAtMs !== null ? startAtMs + durationSecs * 1000 : null
  const msRemaining = endMs !== null && nowMs !== null ? endMs - nowMs : null

  // Canto Fibra: tempo do aperto ATUAL (sobe enquanto segura, zera ao soltar).
  // O total (count) só recebe este intervalo quando o marcador solta.
  const pressElapsedMs = pressing && nowMs !== null && pressStartRef.current !== null
    ? Math.max(0, nowMs - pressStartRef.current)
    : 0

  // contagem é dirigida pelo tempo: quando start_at chega, vira contador sozinho
  // (não depende do mestre estar com a aba aberta p/ virar o status → 'running')
  const started = startAtMs !== null && nowMs !== null && nowMs >= startAtMs
  const isActive = torneioStatus === 'open' || torneioStatus === 'running' // nem draft, nem finished
  const isRunning = isActive && started
  // torneio só "termina" quando o Chefe de Roda finaliza — fim de uma marcação NÃO é fim do torneio
  const isFinished = torneioStatus === 'finished'
  const isCountingDown = isRunning && msRemaining !== null && msRemaining > 0
  // marcação dividida: só marca quem tem o passarinho-alvo no grupo ativo
  const isMyTurn = divisions <= 1 || targetGroup === activeGroup

  // telas do participante durante o torneio ativo
  const preStart = isMyTurn && !started               // minha marcação agendada, ainda não começou
  const counting = isMyTurn && started && isCountingDown // minha marcação em contagem → botão
  const showRankingScreen = !isFinished && !preStart && !counting // entre marcações / aguardando vez → ranking

  // a marcação ATIVA já terminou (começou e passou do fim)? vs ainda não começou
  const marcacaoEnded = started && msRemaining !== null && msRemaining <= 0
  // ciclo inteiro encerrado = última marcação definida já executada (só faz sentido com 2+)
  const cicloEncerrado = divisions > 1 && activeGroup >= divisions && marcacaoEnded

  // próprio pássaro (remetente) no ranking — placar dele vem de QUEM o marca (não é count,
  // que com sorteio é do ALVO). Sem sorteio, count é o próprio → fallback antigo.
  const myRankEntry = ranking.find(r => r.id === participante.id)
  const myScore = myRankEntry?.score ?? (markTarget ? 0 : count)
  const myGroup = myRankEntry?.round_group ?? null
  const myPosition = ranking.findIndex(r => r.id === participante.id) + 1
  // quem está competindo agora (marcação/grupo ativo) — já vem ordenado por score
  const competingNow = ranking.filter(r => divisions <= 1 || r.round_group === activeGroup)

  // Airplane warning: 5min a 2min antes do start_at — SÓ p/ quem vai participar da marcação atual.
  // Pode ser fechado no X (airplaneDismissed) — reaparece só na próxima marcação (reset no start_at).
  const showAirplane =
    !airplaneDismissed &&
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
        body: JSON.stringify({ participantId: scoreTargetId, markerId: participante.id, tournamentId: torneio.id, increment: delta, suspicious: susp }),
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
  }, [participante.id, scoreTargetId, torneio.id, persistPending])

  // Limitador: envia acumulado a cada 1s (conta todos os cliques, mesmo os rápidos)
  useEffect(() => {
    const id = setInterval(() => { void flush() }, 1000)
    return () => { clearInterval(id); void flush() }
  }, [flush])

  // Canto Fibra: envia os intervalos pendentes (um por request) a cada 1s.
  // Cada intervalo é raro (comparado a cliques), então não precisa de lote.
  const flushFibra = useCallback(async () => {
    if (flushingFibraRef.current) return
    const interval = pendingIntervalsRef.current[0]
    if (!interval) return
    flushingFibraRef.current = true
    try {
      const res = await fetch('/api/score-fibra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: scoreTargetId, markerId: participante.id, tournamentId: torneio.id, ...interval }),
      })
      if (res.ok || res.status < 500) {
        // sucesso OU 4xx (não recuperável, ex.: tempo esgotado) → descarta e segue
        pendingIntervalsRef.current.shift()
      }
      // 5xx: mantém na fila pra tentar de novo no próximo tick
    } catch {
      // falha de rede: mantém na fila (persistido no localStorage)
    } finally {
      flushingFibraRef.current = false
      persistPendingFibra()
    }
  }, [participante.id, scoreTargetId, torneio.id, persistPendingFibra])

  useEffect(() => {
    if (!isFibra) return
    const id = setInterval(() => { void flushFibra() }, 1000)
    return () => { clearInterval(id); void flushFibra() }
  }, [isFibra, flushFibra])

  // Canto Fibra: encerra o intervalo em curso, some ao acumulado local e enfileira pro servidor.
  const closeFibraInterval = useCallback((endMsOverride?: number) => {
    const start = pressStartRef.current
    if (start === null) return
    pressStartRef.current = null
    setPressing(false)
    const end = endMsOverride ?? Date.now()
    if (end > start) {
      setCount(c => c + (end - start))
      pendingIntervalsRef.current.push({ startedAt: new Date(start).toISOString(), endedAt: new Date(end).toISOString() })
    }
    // sempre grava: enfileira o intervalo (se houve) E limpa o pressStartedAt do storage
    persistPendingFibra()
  }, [persistPendingFibra])

  const handleFibraPressStart = useCallback((e: React.PointerEvent) => {
    if (!e.isPrimary) return
    if (!isRunning || !isCountingDown) return
    if (participanteStatus !== 'approved') return
    if (!isMyTurn) return
    if (pressStartRef.current !== null) return
    pressStartRef.current = Date.now()
    setPressing(true)
    persistPendingFibra() // grava o início na hora — crash 1ms depois já é recuperável
  }, [isRunning, isCountingDown, participanteStatus, isMyTurn, persistPendingFibra])

  const handleFibraPressEnd = useCallback(() => { closeFibraInterval() }, [closeFibraInterval])

  // enquanto o marcador está pressionado, atualiza o "último visto" no storage a cada
  // tick (250ms) — assim um crash no meio do aperto recupera até o instante mais recente
  useEffect(() => {
    if (!isFibra || !pressing) return
    persistPendingFibra()
  }, [isFibra, pressing, now, persistPendingFibra])

  // bateria acabou com o botão pressionado → fecha sozinho, cravando o fim da janela
  useEffect(() => {
    if (!isFibra) return
    if (pressStartRef.current !== null && !isCountingDown && endMs !== null) {
      closeFibraInterval(endMs)
    }
  }, [isFibra, isCountingDown, endMs, closeFibraInterval])

  // Busca ranking + total do pássaro (soma das marcações) a cada 5s enquanto aprovado
  useEffect(() => {
    if (participanteStatus !== 'approved' || torneioStatus === 'draft') return
    const supabase = createClient()
    let active = true
    const load = async () => {
      const [{ data: parts }, { data: scs }, { data: hist }] = await Promise.all([
        supabase.from('participants').select('id, bird_name, user_name, cage_number, round_group').eq('tournament_id', torneio.id).eq('status', 'approved'),
        supabase.from('scores').select('participant_id, count, suspicious_count').eq('tournament_id', torneio.id),
        supabase.from('round_scores').select('count').eq('participant_id', participante.id),
      ])
      if (!active) return
      // mestre descontou as fraudes (zerou no servidor) → some o aviso daqui também
      const meu = (scs ?? []).find(s => s.participant_id === participante.id) as { suspicious_count?: number } | undefined
      if (meu && (meu.suspicious_count ?? 0) === 0 && suspiciousPendingRef.current === 0) {
        setWarnCount(0)
      }
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
    <>
      <button
        onClick={() => setSairConfirm(true)}
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

      {/* modal de confirmação — padrão visual do site */}
      {sairConfirm && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setSairConfirm(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div style={{ background: '#fff', borderRadius: 14, padding: '24px 22px', width: '100%', maxWidth: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: '0.92rem', color: '#111827', lineHeight: 1.5 }}>
              Sair da tela do torneio?
            </p>
            <p style={{ margin: '0 0 20px', fontSize: '0.8rem', color: '#6B7280', lineHeight: 1.55 }}>
              Você pode voltar a qualquer momento tocando no botão{' '}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#0D8F41', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
                Voltar ao torneio
              </span>{' '}
              no topo do site, à direita.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={sairDaTela}
                style={{ flex: 1, background: '#0D8F41', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Sair
              </button>
              <button onClick={() => setSairConfirm(false)}
                style={{ flex: 1, background: '#fff', color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: 8, padding: '11px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
          Sair
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
          <p style={{ margin: 0, fontSize: '0.78rem', color: '#065F46', fontWeight: 600 }}>Seu {participante.bird_name} {isFibra ? 'cantou' : 'fez'}</p>
          <p style={{ margin: '4px 0', fontSize: '2rem', fontWeight: 900, color: '#0D8F41' }}>{isFibra ? formatDuration(total) : `${total} cantos`}</p>
          <p style={{ margin: 0, fontSize: '0.72rem', color: '#6B7280' }}>somados ao histórico e ranking do pássaro</p>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Classificação final</p>
        <RankingList ranking={ranking} myId={participante.id} timeMode={isFibra} />
      </main>
    )
  }

  // O AdBanner agora fica NO FLUXO (inline) no topo — a imagem real varia de altura,
  // então banner fixo escondia o conteúdo embaixo. Banner primeiro, resto abaixo.
  const temBanner = preStart || showRankingScreen
  return (
    <main style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', userSelect: 'none', background: '#fff', overflowY: 'auto' }}>

      {/* Anúncio no TOPO, em fluxo (sem position) — não sobrepõe nada; o resto do
          conteúdo é centralizado no espaço restante pelo wrapper flex:1 abaixo */}
      {temBanner && (
        <div style={{ width: '100%', padding: '12px 16px 0', boxSizing: 'border-box' }}>
          <AdBanner inline />
        </div>
      )}

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
            position: 'relative',
            background: '#fff', borderRadius: 20,
            border: '1px solid #E5E7EB',
            padding: '28px 26px', width: '100%', maxWidth: 420,
            boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
            display: 'flex', flexDirection: 'column', gap: 18, textAlign: 'center',
          }}>
            {/* fechar a dica */}
            <button type="button" onClick={() => setAirplaneDismissed(true)} aria-label="Fechar dica"
              style={{ position: 'absolute', top: 12, right: 12, background: '#F3F4F6', border: 'none', borderRadius: '50%', width: 30, height: 30, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6B7280', padding: 0, lineHeight: 0 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
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

      {/* Conteúdo (abaixo do anúncio) centralizado no espaço restante — flex:1 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'safe center', gap: showRankingScreen ? 16 : 32, padding: showRankingScreen ? '16px 20px 76px' : temBanner ? '16px 24px 76px' : '0 24px', width: '100%', boxSizing: 'border-box' }}>

      {/* Info do próprio pássaro — só sem sorteio (fallback). Com sorteio, o
          participante marca a gaiola de OUTRO, então o próprio pássaro some daqui. */}
      {!markTarget && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, color: '#6B7280', fontSize: '0.85rem' }}>{participante.bird_name}</p>
          {participante.cage_number && (
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#9CA3AF' }}>Gaiola {participante.cage_number}</p>
          )}
        </div>
      )}

      {preStart && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' }}>
          {/* Anti-roubo: você marca a gaiola de OUTRA pessoa — só o número, bem grande */}
          {markTarget && (
            <div style={{ background: '#F0FDF4', border: '1px solid #D1FAE5', borderRadius: 16, padding: '16px 26px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#0D8F41', lineHeight: 1.35 }}>Você vai marcar a gaiola de número</p>
              <p style={{ margin: '6px 0 0', fontFamily: 'monospace', fontSize: '4rem', fontWeight: 900, color: '#065F46', lineHeight: 1 }}>
                {markTarget.cage_number ?? '—'}
              </p>
            </div>
          )}
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
          {/* Anti-roubo: você marca a gaiola de OUTRA pessoa (nunca a sua) — só o número */}
          {markTarget && (
            <div style={{ background: '#F0FDF4', border: '1px solid #D1FAE5', borderRadius: 14, padding: '10px 22px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, color: '#0D8F41' }}>Você marca a gaiola de número</p>
              <p style={{ margin: '2px 0 0', fontFamily: 'monospace', fontWeight: 900, fontSize: '2rem', color: '#065F46', lineHeight: 1.1 }}>
                {markTarget.cage_number ?? '—'}
              </p>
            </div>
          )}
          {isCountingDown && msRemaining !== null && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontFamily: 'monospace', fontSize: '3.5rem', fontWeight: 800, color: msRemaining < 120_000 ? '#DC2626' : '#111827', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {formatMs(msRemaining)}
              </p>
              <p style={{ margin: '4px 0 0', color: '#9CA3AF', fontSize: '0.75rem' }}>tempo restante</p>
              {/* Canto Fibra: tempo total já marcado (soma dos apertos concluídos) */}
              {isFibra && (
                <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'baseline', gap: 6, background: '#F0FDF4', border: '1px solid #D1FAE5', borderRadius: 10, padding: '6px 14px' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '1.35rem', fontWeight: 800, color: '#0D8F41', letterSpacing: '0.02em' }}>{formatDuration(count)}</span>
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#0D8F41', textTransform: 'uppercase', letterSpacing: '0.08em' }}>total marcado</span>
                </div>
              )}
            </div>
          )}

          {/* avisos de velocidade já enviados ao Chefe de Roda — Canto Fibra não tem penalidade */}
          {!isFibra && warnCount > 0 && (
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
            onPointerDown={isFibra ? handleFibraPressStart : handleClick}
            onPointerUp={isFibra ? handleFibraPressEnd : undefined}
            onPointerCancel={isFibra ? handleFibraPressEnd : undefined}
            onPointerLeave={isFibra ? handleFibraPressEnd : undefined}
            style={{
              width: 256, height: 256, borderRadius: '50%',
              background: fraudFlash ? '#DC2626' : (isFibra ? (pressing ? '#DC2626' : '#0D8F41') : (clicking ? '#16A34A' : '#0D8F41')),
              color: '#fff', fontWeight: 800, fontSize: isFibra ? '2.2rem' : '3rem',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: fraudFlash
                ? '0 12px 40px rgba(220,38,38,0.45)'
                : isFibra
                  ? (pressing ? '0 4px 20px rgba(220,38,38,0.4)' : '0 12px 40px rgba(13,143,65,0.35)')
                  : clicking
                    ? '0 4px 20px rgba(13,143,65,0.4)'
                    : '0 12px 40px rgba(13,143,65,0.35)',
              transform: (isFibra ? pressing : clicking) ? 'scale(0.94)' : 'scale(1)',
              transition: 'transform 0.1s, box-shadow 0.1s, background 0.1s',
              userSelect: 'none', WebkitUserSelect: 'none',
              touchAction: isFibra ? 'none' : 'manipulation',
            }}
          >
            {fraudFlash ? (
              <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Alerta de fraude">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            ) : isFibra ? (
              /* Canto Fibra: cronômetro do aperto atual. Sobe enquanto segura (com
                 anel girando) e reseta pra 00:00 ao soltar — a soma vai pro total. */
              <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 200, height: 200 }}>
                <style>{`@keyframes fibra-spin { to { transform: rotate(360deg); } }`}</style>
                {pressing && (
                  <span aria-hidden="true" style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    border: '6px solid rgba(255,255,255,0.28)', borderTopColor: '#fff',
                    animation: 'fibra-spin 0.9s linear infinite',
                  }} />
                )}
                <span style={{ fontFamily: 'monospace', fontSize: '2.6rem', fontWeight: 800, letterSpacing: '0.02em' }}>
                  {formatMs(pressElapsedMs)}
                </span>
              </span>
            ) : count}
          </button>

          <p style={{ margin: 0, color: '#9CA3AF', fontSize: '0.8rem' }}>
            {isFibra ? 'Pressione e segure enquanto o pássaro canta' : 'Toque para contar o canto'}
          </p>
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
              {divisions > 1
                ? isCountingDown
                  ? `Em andamento: ${nomeMarcacao(activeGroup, round)}. Acompanhe o ranking abaixo.`
                  : marcacaoEnded
                    // a marcação ativa REALMENTE terminou (começou e passou do fim)
                    ? `${nomeMarcacao(activeGroup, round)} encerrada. ${activeGroup < divisions ? `Aguarde a ${nomeMarcacao(activeGroup + 1, round)}. ` : ''}Acompanhe o ranking abaixo.`
                    // ainda não começou (agendada/sem horário) → não dizer "encerrada"
                    : `Aguarde o início da ${nomeMarcacao(activeGroup, round)}. Acompanhe o ranking abaixo.`
                : 'Acompanhe o ranking abaixo.'}
            </p>
          </div>

          {/* aviso da vassourada — só ao ENCERRAR o ciclo (todas as marcações definidas
              já executadas). Com 1 marcação, nunca aparece. */}
          {cicloEncerrado && (
            <div style={{ width: '100%', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 14px' }}>
              <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: '#92400E', textAlign: 'center', lineHeight: 1.5 }}>
                🧹 Aguarde as próximas marcações. Se você passar na vassourada, sua vez volta automaticamente.
              </p>
            </div>
          )}

          {/* destaque do PRÓPRIO passarinho (remetente) — não o que ele marca */}
          {markTarget ? (
            <div style={{ width: '100%', maxWidth: 420, background: '#F0FDF4', border: '2px solid #0D8F41', borderRadius: 14, padding: '14px 18px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0D8F41' }}>Seu passarinho</p>
              <p style={{ margin: '4px 0 0', fontWeight: 800, fontSize: '1.05rem', color: '#065F46' }}>
                {participante.bird_name}{participante.cage_number != null ? ` · Gaiola ${participante.cage_number}` : ''}
              </p>
              {divisions > 1 && myGroup != null && (
                <p style={{ margin: '2px 0 0', fontSize: '0.72rem', fontWeight: 600, color: '#0D8F41' }}>{nomeMarcacao(myGroup, round)}</p>
              )}
              <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontWeight: 900, fontSize: '1.7rem', color: '#0D8F41' }}>{isFibra ? formatDuration(myScore) : myScore}</span>
                <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                  {isFibra ? 'seu tempo cantado' : 'seus cantos'}{myPosition > 0 ? ` · ${myPosition}º lugar` : ''}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ background: '#F0FDF4', borderRadius: 12, padding: '10px 18px' }}>
              <span style={{ fontWeight: 800, fontSize: '1.4rem', color: '#0D8F41' }}>{isFibra ? formatDuration(myScore) : myScore}</span>
              <span style={{ marginLeft: 6, fontSize: '0.72rem', color: '#9CA3AF' }}>
                {isFibra ? 'seu tempo cantado' : 'seus cantos'}{myPosition > 0 ? ` · ${myPosition}º lugar` : ''}
              </span>
            </div>
          )}

          {/* competindo agora — grupo/marcação ativa, rank ao vivo */}
          {divisions > 1 && competingNow.length > 0 && (
            <div style={{ width: '100%', maxWidth: 420, background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12, padding: '12px 12px 14px' }}>
              <p style={{ margin: '0 0 10px', fontSize: '0.68rem', fontWeight: 700, color: '#C2410C', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
                {isCountingDown && (
                  <span className="live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />
                )}
                {isCountingDown
                  ? `Competindo agora · ${nomeMarcacao(activeGroup, round)}`
                  : `Resultados da ${nomeMarcacao(activeGroup, round)}`}
              </p>
              <RankingList ranking={competingNow} myId={participante.id} timeMode={isFibra} />
            </div>
          )}

          <p style={{ margin: '4px 0 0', fontSize: '0.68rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {divisions > 1 ? 'Ranking geral' : 'Ranking dos passarinhos'}
          </p>
          <RankingList ranking={ranking} myId={participante.id} timeMode={isFibra} />

        </div>
      )}

      </div>

      {/* saída disponível — some faltando 1min pro início da minha marcação e durante a contagem */}
      {!(counting || (isMyTurn && isActive && msUntilStart !== null && msUntilStart > 0 && msUntilStart <= 60_000)) && sairBtn}
    </main>
  )
}
