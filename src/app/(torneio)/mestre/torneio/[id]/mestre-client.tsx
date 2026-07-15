'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Participante {
  id: string
  user_name: string
  bird_name: string
  cage_number: number | null
  status: string
  user_id: string | null
  round_group: number | null
  elimination_reason?: string | null
}

interface Score { participant_id: string; count: number }
interface Torneio {
  id: string; status: string; duration_secs: number; start_at: string | null
  round: number; divisions: number; active_group: number
  finished_at: string | null
  manual_groups?: boolean
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')) // 00,05,10,...,55
const ELIM_OPTS = [25, 40, 50, 60, 75]

function pad(n: number) { return String(n).padStart(2, '0') }

// cor do alerta de fraude: verde até 5, amarelo 6–10, vermelho acima de 10
function fraudColor(n: number): { color: string; bg: string; border: string } {
  if (n > 10) return { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' }
  if (n > 5)  return { color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' }
  return { color: '#0D8F41', bg: '#F0FDF4', border: '#D1FAE5' }
}

function formatMs(ms: number): string {
  const totalSecs = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

function toEmbedUrl(url: string): string {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1`
  return url
}

// distribui a lista em n grupos, o mais igual possível (round-robin por ordem)
function splitGroups(list: Participante[], n: number): Record<string, number> {
  const map: Record<string, number> = {}
  list.forEach((p, i) => { map[p.id] = (i % n) + 1 })
  return map
}

// Card que agrupa botões de controle com título + descrição do que fazem
function CtrlCard({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <p style={{ margin: 0, fontWeight: 800, fontSize: '0.82rem', color: '#111827' }}>{title}</p>
        <p style={{ margin: '3px 0 0', fontSize: '0.72rem', color: '#9CA3AF', lineHeight: 1.5 }}>{desc}</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>{children}</div>
    </div>
  )
}

function ConfirmModal({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onCancel() }}
      style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: '24px 22px', width: '100%', maxWidth: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <p style={{ margin: '0 0 20px', fontWeight: 700, fontSize: '0.92rem', color: '#111827', lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onConfirm} style={{ flex: 1, background: '#0D8F41', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Confirmar</button>
          <button onClick={onCancel} style={{ flex: 1, background: '#fff', color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: 8, padding: '11px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

export default function MestreClient({
  torneio,
  participantesInitial,
  scoresInitial,
  qrDataUrl,
  qrUrl,
  streamUrlInitial,
  clubLogoUrl,
}: {
  torneio: Torneio
  participantesInitial: Participante[]
  scoresInitial: Score[]
  qrDataUrl: string | null
  qrUrl: string
  streamUrlInitial: string | null
  clubLogoUrl: string | null
}) {
  const router = useRouter()
  const [participantes, setParticipantes] = useState(participantesInitial)
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(scoresInitial.map(s => [s.participant_id, s.count]))
  )
  // suspeitas de fraude por participante (scores.suspicious_count)
  const [suspicious, setSuspicious] = useState<Record<string, number>>({})
  const [status, setStatus] = useState(torneio.status)
  const [finishedAt, setFinishedAt] = useState<string | null>(torneio.finished_at)
  const [startAt, setStartAt] = useState<string | null>(torneio.start_at)
  const [currentDurationSecs, setCurrentDurationSecs] = useState(torneio.duration_secs)
  const [loading, setLoading] = useState(false)
  const [now, setNow] = useState<Date | null>(null)
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null)

  // stream
  const [streamUrl, setStreamUrl] = useState<string | null>(streamUrlInitial)
  const [showStreamModal, setShowStreamModal] = useState(false)
  const [streamInput, setStreamInput] = useState(streamUrlInitial ?? '')

  // add-sem-app
  const [addOpen, setAddOpen] = useState(false)
  const [addName, setAddName] = useState('')
  const [addBird, setAddBird] = useState('')
  const [addCage, setAddCage] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  // marcações / divisões  (round = ciclo, activeGroup = marcação atual do ciclo)
  const [round, setRound] = useState(torneio.round ?? 1)
  const [divisions, setDivisions] = useState(torneio.divisions ?? 1)
  const [activeGroup, setActiveGroup] = useState(torneio.active_group ?? 1)

  // modal A: Configuração da Marcação (nº de marcações do ciclo)
  const [showMarcConfig, setShowMarcConfig] = useState(false)
  const [mcDivisions, setMcDivisions] = useState(1)
  const [mcNewCycle, setMcNewCycle] = useState(false)
  const [mcLoading, setMcLoading] = useState(false)
  // posição manual (torneio.manual_groups): pid → grupo escolhido (1..N-1);
  // quem não for escolhido cai automaticamente no último grupo
  const [mcAssign, setMcAssign] = useState<Record<string, number>>({})
  const manualGroups = torneio.manual_groups ?? false

  // modal B: Configurar marcação X-Y (duração + horário de um grupo)
  const [showMarcTiming, setShowMarcTiming] = useState(false)
  const [mtTarget, setMtTarget] = useState(1)
  const [mtDurationMin, setMtDurationMin] = useState(Math.round(torneio.duration_secs / 60))
  const [mtHour, setMtHour] = useState('')
  const [mtMin, setMtMin] = useState('00')
  const [mtLoading, setMtLoading] = useState(false)

  // modal C: Vassourada (opcional, ao fim do ciclo)
  const [showVassoura, setShowVassoura] = useState(false)
  const [vsPercent, setVsPercent] = useState<number | null>(null)
  const [vsLoading, setVsLoading] = useState(false)
  // vassourada já aplicada neste ciclo → só volta a aparecer no próximo ciclo
  const [vassouradaDone, setVassouradaDone] = useState(false)

  // modal: cantos dos participantes sem app
  const [cantosOpen, setCantosOpen] = useState(false)
  const [cantosInput, setCantosInput] = useState<Record<string, string>>({})
  const [cantosLoading, setCantosLoading] = useState(false)

  const autoStartedRef = useRef(false)

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!now || status !== 'open' || !startAt || autoStartedRef.current) return
    if (now >= new Date(startAt)) {
      autoStartedRef.current = true
      // NÃO faz router.refresh aqui — evita loop de refresh se o update racer/RLS
      updateStatus('running', false)
    }
  }, [now, status, startAt])

  // 1h após finalizar: fecha a live automaticamente e redireciona o mestre.
  const cleanupDoneRef = useRef(false)
  useEffect(() => {
    if (status !== 'finished' || !finishedAt || !now || cleanupDoneRef.current) return
    if (now.getTime() >= new Date(finishedAt).getTime() + 3600_000) {
      cleanupDoneRef.current = true
      const supabase = createClient()
      supabase.from('tournaments').update({ stream_url: null }).eq('id', torneio.id)
        .then(() => router.push('/clube/dashboard'))
    }
  }, [now, status, finishedAt, torneio.id, router])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`mestre:${torneio.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'participants', filter: `tournament_id=eq.${torneio.id}` },
        payload => setParticipantes(prev => [...prev, payload.new as Participante]))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'participants', filter: `tournament_id=eq.${torneio.id}` },
        payload => setParticipantes(prev => prev.map(p => p.id === payload.new.id ? payload.new as Participante : p)))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores', filter: `tournament_id=eq.${torneio.id}` },
        payload => {
          const s = payload.new as Score & { suspicious_count?: number }
          setScores(prev => ({ ...prev, [s.participant_id]: s.count }))
          if (s.suspicious_count !== undefined) setSuspicious(prev => ({ ...prev, [s.participant_id]: s.suspicious_count as number }))
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tournaments', filter: `id=eq.${torneio.id}` },
        payload => {
          if (payload.new.start_at !== undefined) setStartAt(payload.new.start_at)
          if (payload.new.duration_secs !== undefined) setCurrentDurationSecs(payload.new.duration_secs)
          if (payload.new.stream_url !== undefined) setStreamUrl(payload.new.stream_url)
          if (payload.new.round !== undefined) setRound(payload.new.round)
          if (payload.new.divisions !== undefined) setDivisions(payload.new.divisions)
          if (payload.new.active_group !== undefined) setActiveGroup(payload.new.active_group)
          if (payload.new.status !== undefined) setStatus(payload.new.status)
          if (payload.new.finished_at !== undefined) setFinishedAt(payload.new.finished_at)
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [torneio.id])

  async function updateStatus(newStatus: string, refresh = true) {
    setLoading(true)
    const supabase = createClient()
    // NUNCA reescreve start_at aqui: o auto-start dispara segundos DEPOIS do horário
    // agendado, e mover o start_at zerava o contador dos participantes no meio da
    // marcação (o reset deles é disparado pela troca de start_at) e deslocava o fim.
    await supabase.from('tournaments').update({ status: newStatus }).eq('id', torneio.id)
    setStatus(newStatus)
    setLoading(false)
    // refresh só em ações manuais (ex.: abrir inscrições) — nunca no auto-start (evita loop)
    if (refresh) router.refresh()
  }

  // Fallback de atualização do ranking (caso o realtime falhe) — recarrega scores + participantes a cada 5s
  useEffect(() => {
    if (status === 'draft' || status === 'finished') return
    const supabase = createClient()
    const poll = setInterval(async () => {
      const [{ data: parts }, { data: scs }] = await Promise.all([
        supabase.from('participants').select('id, user_name, bird_name, cage_number, status, user_id, round_group').eq('tournament_id', torneio.id).order('created_at', { ascending: true }),
        supabase.from('scores').select('participant_id, count, suspicious_count').eq('tournament_id', torneio.id),
      ])
      if (parts) setParticipantes(parts as Participante[])
      if (scs) {
        const rows = scs as (Score & { suspicious_count?: number })[]
        setScores(Object.fromEntries(rows.map(s => [s.participant_id, s.count])))
        setSuspicious(Object.fromEntries(rows.map(s => [s.participant_id, s.suspicious_count ?? 0])))
      }
    }, 5000)
    return () => clearInterval(poll)
  }, [status, torneio.id])

  async function saveStream() {
    const supabase = createClient()
    const val = streamInput.trim() || null
    await supabase.from('tournaments').update({ stream_url: val }).eq('id', torneio.id)
    setStreamUrl(val)
    setShowStreamModal(false)
  }

  async function updateParticipante(id: string, update: Partial<Participante>) {
    setParticipantes(prev => prev.map(p => p.id === id ? { ...p, ...update } : p))
    const supabase = createClient()
    await supabase.from('participants').update(update).eq('id', id)
  }

  // Envia os cantos de `parts` ao histórico (round_scores) do ciclo `roundNum`.
  // De-dup por (tournament, round, participant) — nunca conta a mesma marcação 2x.
  async function insertHistory(
    supabase: ReturnType<typeof createClient>,
    parts: Participante[],
    roundNum: number,
  ) {
    if (!parts.length) return
    const ids = parts.map(p => p.id)
    const { data: existing } = await supabase
      .from('round_scores').select('participant_id')
      .eq('tournament_id', torneio.id).eq('round', roundNum)
      .in('participant_id', ids)
    const done = new Set((existing ?? []).map(r => r.participant_id))
    const rows = parts.filter(p => !done.has(p.id)).map(p => ({
      tournament_id: torneio.id, participant_id: p.id, user_id: p.user_id ?? null,
      bird_name: p.bird_name, round: roundNum, round_group: p.round_group ?? null,
      count: scores[p.id] ?? 0,
    }))
    if (rows.length) await supabase.from('round_scores').insert(rows)
  }

  // Eliminar participante: grava os cantos no histórico e registra o motivo.
  // reason: 'fraud' (botão da área de fraudes) | 'manual' (lista de participantes)
  async function eliminarParticipante(p: Participante, reason: 'fraud' | 'manual' = 'manual') {
    const supabase = createClient()
    await insertHistory(supabase, [p], round)
    await updateParticipante(p.id, { status: 'eliminated', elimination_reason: reason })
  }

  // Finalizar torneio: grava os cantos da marcação final no histórico e marca a hora
  // do encerramento (usada p/ auto-fechar a live + redirecionar o mestre 1h depois).
  async function finalizeTorneio() {
    const supabase = createClient()
    const approved = participantes.filter(p => p.status === 'approved')
    await insertHistory(supabase, approved, round)
    const nowIso = new Date().toISOString()
    setLoading(true)
    await supabase.from('tournaments').update({ status: 'finished', finished_at: nowIso }).eq('id', torneio.id)
    setStatus('finished'); setFinishedAt(nowIso); setLoading(false)
    router.refresh()
  }

  async function addSemApp(e: React.FormEvent) {
    e.preventDefault()
    setAddLoading(true)
    const supabase = createClient()
    const cage = addCage ? parseInt(addCage) : null
    await supabase.from('participants').insert({
      tournament_id: torneio.id, user_id: null, user_name: addName, bird_name: addBird,
      cage_number: Number.isNaN(cage as number) ? null : cage, status: 'approved',
      // se já em andamento, entra no grupo ativo; senão fica sem grupo até configurar a rodada
      round_group: status === 'running' ? activeGroup : null,
    })
    // cantos são atribuídos ao fim de cada rodada (não na inscrição)
    setAddName(''); setAddBird(''); setAddCage('')
    setAddOpen(false); setAddLoading(false)
  }

  // Abrir inscrições (zera o horário: a contagem só começa após configurar as marcações)
  async function openInscricoes() {
    const supabase = createClient()
    await supabase.from('tournaments').update({ status: 'open', start_at: null }).eq('id', torneio.id)
    setStatus('open'); setStartAt(null)
    router.refresh()
  }

  // ── Modal A: Configuração da Marcação (define nº de marcações do ciclo e distribui grupos) ──
  function openMarcConfig(newCycle: boolean) {
    setMcNewCycle(newCycle)
    setMcDivisions(1)
    setMcAssign({})
    setShowMarcConfig(true)
  }

  async function applyMarcConfig() {
    setMcLoading(true)
    const supabase = createClient()
    const survivors = participantes.filter(p => p.status === 'approved')

    // início de novo ciclo: histórico + zera contagem dos sobreviventes
    if (mcNewCycle) {
      await insertHistory(supabase, survivors, round)
      if (survivors.length) {
        await supabase.from('scores').update({ count: 0, last_click_at: null })
          .in('participant_id', survivors.map(p => p.id)).eq('tournament_id', torneio.id)
        setScores(prev => { const n = { ...prev }; survivors.forEach(p => { n[p.id] = 0 }); return n })
      }
    }

    // distribui sobreviventes em mcDivisions marcações:
    // manual → grupos escolhidos pelo mestre (sem escolha = último grupo);
    // automático → round-robin
    const groupMap = manualGroups && mcDivisions > 1
      ? Object.fromEntries(survivors.map(p => {
          const g = mcAssign[p.id]
          return [p.id, g && g >= 1 && g < mcDivisions ? g : mcDivisions]
        }))
      : splitGroups(survivors, mcDivisions)
    for (let g = 1; g <= mcDivisions; g++) {
      const ids = survivors.filter(p => groupMap[p.id] === g).map(p => p.id)
      if (ids.length) await supabase.from('participants').update({ round_group: g }).in('id', ids)
    }
    setParticipantes(prev => prev.map(p => groupMap[p.id] ? { ...p, round_group: groupMap[p.id] } : p))

    const newRound = mcNewCycle ? round + 1 : round
    // sem horário ainda: cada marcação é configurada individualmente depois
    await supabase.from('tournaments').update({
      divisions: mcDivisions, active_group: 1, round: newRound, start_at: null, status: 'open',
    }).eq('id', torneio.id)
    setDivisions(mcDivisions); setActiveGroup(1); setRound(newRound); setStartAt(null); setStatus('open')
    autoStartedRef.current = false
    if (mcNewCycle) setVassouradaDone(false) // novo ciclo → vassourada disponível de novo
    setShowMarcConfig(false); setMcLoading(false)
    router.refresh()
  }

  // Aborta a marcação agendada (limpa o horário) → volta a permitir redefinir o início.
  async function abortarMarcacao() {
    const supabase = createClient()
    await supabase.from('tournaments').update({ start_at: null, status: 'open' }).eq('id', torneio.id)
    setStartAt(null); setStatus('open')
    autoStartedRef.current = false
    router.refresh()
  }

  // ── Modal B: Configurar marcação {round}-{target} (duração + horário) ──
  function openMarcTiming(target: number) {
    setMtTarget(target)
    setMtDurationMin(Math.round(currentDurationSecs / 60))
    setMtHour(''); setMtMin('00')
    setShowMarcTiming(true)
  }

  async function applyMarcTiming() {
    if (!mtHour) return
    setMtLoading(true)
    const supabase = createClient()
    // avançando para a próxima marcação do ciclo → grava o histórico da que acabou
    if (mtTarget > activeGroup) {
      const finishing = participantes.filter(p =>
        p.status === 'approved' && (divisions <= 1 || p.round_group === activeGroup))
      await insertHistory(supabase, finishing, round)
    }
    // nova marcação começando → zera as possíveis fraudes de todos os participantes
    await supabase.from('scores').update({ suspicious_count: 0 }).eq('tournament_id', torneio.id)
    setSuspicious({})

    const newDuration = mtDurationMin * 60
    const d = new Date()
    const newStartAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), parseInt(mtHour), parseInt(mtMin)).toISOString()
    await supabase.from('tournaments').update({
      active_group: mtTarget, start_at: newStartAt, duration_secs: newDuration, status: 'open',
    }).eq('id', torneio.id)
    setActiveGroup(mtTarget); setStartAt(newStartAt); setCurrentDurationSecs(newDuration); setStatus('open')
    autoStartedRef.current = false
    setShowMarcTiming(false); setMtLoading(false)
    router.refresh()
  }

  // ── Modal C: Vassourada (opcional, ao fim do ciclo de marcações) ──
  function openVassoura() {
    setVsPercent(null)
    setShowVassoura(true)
  }

  async function applyVassourada() {
    if (vsPercent === null) return
    setVsLoading(true)
    const supabase = createClient()
    const byScore = [...participantes].filter(p => p.status === 'approved').sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0))
    const keep = Math.ceil(byScore.length * (1 - vsPercent / 100))
    const eliminate = byScore.slice(keep)
    // histórico da marcação que acabou (de-dup evita contar a mesma marcação 2x)
    await insertHistory(supabase, byScore, round)
    if (eliminate.length) {
      await supabase.from('participants').update({ status: 'eliminated', elimination_reason: 'vassourada' }).in('id', eliminate.map(p => p.id))
      setParticipantes(prev => prev.map(p => eliminate.find(e => e.id === p.id) ? { ...p, status: 'eliminated', elimination_reason: 'vassourada' } : p))
    }
    setVassouradaDone(true) // esconde o botão até o próximo ciclo terminar
    setShowVassoura(false); setVsLoading(false)
    // sem router.refresh(): recarregar reiniciaria vassouradaDone e reexibiria o botão
  }

  // Salva os cantos dos participantes sem app (contagem atribuída ao fim da marcação).
  async function saveCantosSemApp() {
    setCantosLoading(true)
    const supabase = createClient()
    const entries = Object.entries(cantosInput).filter(([, v]) => v !== '' && !isNaN(parseInt(v)))
    let failed = false
    for (const [pid, v] of entries) {
      const { error } = await supabase.from('scores').upsert(
        { participant_id: pid, tournament_id: torneio.id, count: parseInt(v) },
        { onConflict: 'participant_id,tournament_id' },
      )
      if (error) failed = true
    }
    if (failed) {
      setCantosLoading(false)
      alert('Não foi possível salvar os cantos. Aplique a migration de RLS de scores (20260710_scores_club_policy.sql).')
      return
    }
    setScores(prev => { const n = { ...prev }; entries.forEach(([pid, v]) => { n[pid] = parseInt(v) }); return n })
    setCantosInput({}); setCantosOpen(false); setCantosLoading(false)
    router.refresh()
  }

  function ask(message: string, action: () => void) {
    setConfirm({ message, onConfirm: () => { setConfirm(null); action() } })
  }

  // ── Derived round state ──
  const roundPhase = useMemo((): 'idle' | 'waiting' | 'counting' | 'done' => {
    if (!now || status !== 'running') return 'idle'
    if (!startAt) return 'counting'
    const start = new Date(startAt).getTime()
    const end = start + currentDurationSecs * 1000
    const t = now.getTime()
    if (t < start) return 'waiting'
    if (t < end) return 'counting'
    return 'done'
  }, [status, startAt, currentDurationSecs, now])

  const msUntilStart = now && startAt ? new Date(startAt).getTime() - now.getTime() : null

  const msRemaining = useMemo(() => {
    if (!now || roundPhase !== 'counting' || !startAt) return null
    return new Date(startAt).getTime() + currentDurationSecs * 1000 - now.getTime()
  }, [roundPhase, startAt, currentDurationSecs, now])

  const clockStr = now ? `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}` : '--:--:--'

  // QR visible only when inscriptions are open and more than 10 min to start
  const showQR = qrDataUrl && (
    status === 'draft' ||
    (status === 'open' && (msUntilStart === null || msUntilStart >= 600_000))
  )

  // ranking — só aprovados da marcação (grupo) ATUAL em andamento
  const ranking = [...participantes]
    .filter(p => p.status === 'approved' && (divisions <= 1 || p.round_group === activeGroup))
    .sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0))

  // possíveis fraudes da marcação atual (só acima de 5 suspeitas — abaixo disso é
  // ruído de dedo rápido), do maior p/ o menor nº de suspeitas
  const fraudList = ranking
    .filter(p => (suspicious[p.id] ?? 0) > 5)
    .sort((a, b) => (suspicious[b.id] ?? 0) - (suspicious[a.id] ?? 0))

  // ranking geral — todos os aprovados (todas as marcações do ciclo)
  const rankingGeral = [...participantes]
    .filter(p => p.status === 'approved')
    .sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0))

  // todas as marcações do ciclo terminaram → habilita vassourada / novo ciclo
  const allGroupsDone = roundPhase === 'done' && activeGroup >= divisions

  // marcações já configuradas neste ciclo (algum aprovado com grupo definido)
  const groupsAssigned = participantes.some(p => p.status === 'approved' && p.round_group != null)
  // configurou as marcações mas ainda falta agendar o horário da marcação atual
  const awaitingTiming = (status === 'open' || status === 'running') && !startAt && groupsAssigned
  // marcação agendada mas ainda não começou (contagem regressiva rolando) → pode abortar
  const awaitingStart = startAt !== null && msUntilStart !== null && msUntilStart > 0 &&
    (status === 'open' || roundPhase === 'waiting')
  // rótulo "Marcação {ciclo}-{grupo}"
  const marcLabel = divisions > 1 ? `${round}-${activeGroup}` : `${round}`

  // participantes sem app SÓ da marcação (grupo) atual
  const semAppAtuais = participantes.filter(p =>
    p.status === 'approved' && !p.user_id &&
    (divisions <= 1 || p.round_group === activeGroup)
  )

  // preview da vassourada
  const approvedByScore = useMemo(() =>
    [...participantes].filter(p => p.status === 'approved').sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0)),
    [participantes, scores]
  )
  const keepCount = vsPercent !== null ? Math.ceil(approvedByScore.length * (1 - vsPercent / 100)) : approvedByScore.length
  const advancing = approvedByScore.slice(0, keepCount)
  const eliminating = approvedByScore.slice(keepCount)

  // posição manual das gaiolas (Modal A): lista por gaiola + contagem por grupo
  const mcManualActive = manualGroups && mcDivisions > 1
  const mcApproved = useMemo(() =>
    [...participantes].filter(p => p.status === 'approved')
      .sort((a, b) => (a.cage_number ?? 999999) - (b.cage_number ?? 999999)),
    [participantes]
  )
  const mcGroupCount = (g: number) => mcApproved.filter(p => {
    const chosen = mcAssign[p.id]
    const eff = chosen && chosen >= 1 && chosen < mcDivisions ? chosen : mcDivisions
    return eff === g
  }).length
  // todo grupo precisa de pelo menos 1 gaiola
  const mcManualInvalid = mcManualActive &&
    Array.from({ length: mcDivisions }, (_, i) => i + 1).some(g => mcGroupCount(g) === 0)

  const inp: React.CSSProperties = {
    width: '100%', border: '1px solid #E5E7EB', borderRadius: 8,
    padding: '9px 11px', fontSize: '0.85rem', outline: 'none',
    fontFamily: 'inherit', color: '#111827', background: '#fff', boxSizing: 'border-box',
  }
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#6B7280',
    marginBottom: 5, letterSpacing: '0.06em', textTransform: 'uppercase',
  }

  // botões de controle: célula inteira do grid, alvo de toque grande (mobile)
  const ctrlBtn = (bg: string, color: string, border = 'none'): React.CSSProperties => ({
    background: bg, color, border, borderRadius: 10, padding: '14px 16px',
    fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    width: '100%', minHeight: 52, display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: 6, textAlign: 'center',
  })

  // tempo restante p/ auto-fechar a live e sair (1h após finalizar)
  const finishedCloseMsLeft = (status === 'finished' && finishedAt && now)
    ? new Date(finishedAt).getTime() + 3600_000 - now.getTime()
    : null

  const pendentes = participantes.filter(p => p.status === 'pending').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {confirm && <ConfirmModal message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}

      {/* ── Notificação: participantes aguardando aprovação (click → rola até a lista) ── */}
      {pendentes > 0 && status !== 'finished' && (
        <div style={{ position: 'fixed', top: 10, left: 0, right: 0, zIndex: 350, display: 'flex', justifyContent: 'center', padding: '0 12px', pointerEvents: 'none' }}>
          <button
            onClick={() => document.getElementById('secao-aprovacao')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            style={{
              pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 10,
              background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 30,
              padding: '9px 18px', cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
            }}>
            <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>🙋</span>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#92400E' }}>
              {pendentes} participante{pendentes !== 1 ? 's' : ''} aguardando aprovação
            </span>
            <span style={{
              background: '#D97706', color: '#fff', borderRadius: '50%', minWidth: 22, height: 22,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.72rem', fontWeight: 800, padding: '0 5px',
            }}>
              {pendentes}
            </span>
          </button>
        </div>
      )}

      {/* ── Torneio finalizado ── */}
      {status === 'finished' && (
        <div style={{ background: '#F0FDF4', border: '1px solid #D1FAE5', borderRadius: 12, padding: '16px 18px' }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem', color: '#065F46', display: 'flex', alignItems: 'center', gap: 8 }}>
            🏁 Torneio finalizado
          </p>
          <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: '#047857', lineHeight: 1.5 }}>
            {streamUrl ? 'Você ainda pode encerrar a live. ' : ''}
            A live é encerrada e você é redirecionado automaticamente
            {finishedCloseMsLeft !== null && finishedCloseMsLeft > 0
              ? <> em <strong>{formatMs(finishedCloseMsLeft)}</strong>.</>
              : ' em breve.'}
          </p>
        </div>
      )}

      {/* ── Relógio + live na mesma linha (live estica até o fim); demais chips abaixo ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 12 }}>
          <div style={{ background: '#111827', borderRadius: 10, padding: '10px 18px', display: 'inline-flex', alignItems: 'baseline', gap: 6, flexShrink: 0 }}>
            <span style={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '0.04em' }}>{clockStr}</span>
            <span style={{ fontSize: '0.65rem', color: '#6B7280', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>agora</span>
          </div>

          {/* Iniciar/Encerrar live — mesma altura do relógio, ocupa o resto da linha */}
          {streamUrl ? (
            <button onClick={() => { setStreamInput(streamUrl ?? ''); setShowStreamModal(true) }}
              style={{
                background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
                borderRadius: 10, padding: '10px 18px', fontSize: '0.85rem', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center',
                justifyContent: 'center', gap: 6, flex: 1, minHeight: 51,
              }}>
              ✕ Encerrar live
            </button>
          ) : status !== 'finished' && (
            <button onClick={() => { setStreamInput(''); setShowStreamModal(true) }}
              style={{
                background: '#111827', color: '#fff', border: 'none',
                borderRadius: 10, padding: '10px 18px', fontSize: '0.85rem', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center',
                justifyContent: 'center', gap: 6, flex: 1, minHeight: 51,
              }}>
              📡 Iniciar live
            </button>
          )}
        </div>

        {(((status === 'open' || roundPhase === 'waiting') && msUntilStart !== null && msUntilStart > 0) ||
          (roundPhase === 'counting' && msRemaining !== null) ||
          roundPhase === 'done') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {(status === 'open' || roundPhase === 'waiting') && msUntilStart !== null && msUntilStart > 0 && (
              <div style={{ background: '#FEF3C7', borderRadius: 10, padding: '10px 18px', display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: 800, color: '#92400E', letterSpacing: '0.04em' }}>{formatMs(msUntilStart)}</span>
                <span style={{ fontSize: '0.65rem', color: '#B45309', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  para Marcação {marcLabel}
                </span>
              </div>
            )}

            {roundPhase === 'counting' && msRemaining !== null && (
              <div style={{ background: msRemaining < 120_000 ? '#FEF2F2' : '#F0FDF4', borderRadius: 10, padding: '10px 18px', display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: 800, color: msRemaining < 120_000 ? '#DC2626' : '#0D8F41', letterSpacing: '0.04em' }}>{formatMs(msRemaining)}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: msRemaining < 120_000 ? '#DC2626' : '#0D8F41' }}>
                  Marcação {marcLabel}
                </span>
              </div>
            )}

            {roundPhase === 'done' && (
              <div style={{ background: '#F3F4F6', borderRadius: 10, padding: '10px 18px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151' }}>
                  {allGroupsDone ? `Ciclo ${round} encerrado` : `Marcação ${marcLabel} encerrada`}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── QR Code (só enquanto inscrições abertas, some 10min antes) ── */}
      {showQR && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '20px 24px' }}>
          <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 600, color: '#9CA3AF' }}>QR Code para participantes</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl!} alt="QR Code do torneio" width={192} height={192} />
          <p style={{ margin: 0, fontSize: '0.65rem', color: '#D1D5DB', wordBreak: 'break-all', textAlign: 'center', maxWidth: 280 }}>{qrUrl}</p>
        </div>
      )}

      {/* ── Live / Logo — com stream ativa aparece SEMPRE (até em rascunho/inscrições,
           junto do QR); sem stream, só substitui o QR quando as inscrições fecham ── */}
      {(streamUrl || !showQR) && status !== 'finished' && (
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
          {streamUrl ? (
            <div style={{ position: 'relative', paddingTop: '56.25%' }}>
              <iframe
                src={toEmbedUrl(streamUrl)}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          ) : clubLogoUrl ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px', minHeight: 180 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={clubLogoUrl} alt="Logo do clube" style={{ maxWidth: 200, maxHeight: 160, objectFit: 'contain' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px', minHeight: 180 }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#D1D5DB', textAlign: 'center' }}>
                Adicione uma transmissão ao vivo<br />ou logo do clube nas configurações
              </p>
            </div>
          )}

          {/* status da transmissão */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 10 }}>
            <p style={{ margin: 0, fontSize: '0.72rem', color: '#9CA3AF' }}>
              {streamUrl ? 'Transmissão ativa' : 'Sem transmissão'}
            </p>
          </div>
        </div>
      )}

      {/* ── Modal: stream URL ── */}
      {showStreamModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowStreamModal(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', width: '100%', maxWidth: 440, boxSizing: 'border-box', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <p style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '0.95rem', color: '#111827' }}>Transmissão ao vivo</p>
            <p style={{ margin: '0 0 16px', fontSize: '0.75rem', color: '#9CA3AF' }}>
              Cole o link do YouTube ao vivo (youtube.com/watch?v=...) ou qualquer URL de embed.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={lbl}>URL da transmissão</label>
                <input
                  style={inp}
                  placeholder="https://youtube.com/watch?v=..."
                  value={streamInput}
                  onChange={e => setStreamInput(e.target.value)}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={saveStream}
                  style={{ flex: 1, background: '#111827', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {streamInput.trim() ? 'Ativar live' : 'Remover live'}
                </button>
                <button onClick={() => setShowStreamModal(false)}
                  style={{ flex: 1, background: '#fff', color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: 8, padding: '11px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Controles — cards com descrição, agrupados por função ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: 12 }}>

        {/* Inscrições */}
        {status === 'draft' && (
          <CtrlCard title="📋 Inscrições" desc="Abre as inscrições: o QR code fica visível e os participantes podem se inscrever pelo celular.">
            <button onClick={() => ask('Tem certeza que deseja abrir as inscrições?', openInscricoes)} disabled={loading}
              style={ctrlBtn('#1D4ED8', '#fff')}>
              Abrir inscrições
            </button>
          </CtrlCard>
        )}

        {/* Marcações — é aqui que o torneio começa de fato */}
        {((status === 'open' && !groupsAssigned) ||
          (awaitingTiming && roundPhase !== 'counting' && roundPhase !== 'waiting') ||
          awaitingStart ||
          (roundPhase === 'done' && !allGroupsDone) ||
          (allGroupsDone && divisions > 1)) && (
          <CtrlCard title="▶ Marcações" desc="É aqui que o torneio inicia: defina em quantas marcações (grupos de gaiolas) o ciclo será dividido e agende a duração e o horário de cada uma.">
            {status === 'open' && !groupsAssigned && (
              <button onClick={() => openMarcConfig(false)}
                style={ctrlBtn('#0D8F41', '#fff')}>
                Configuração da Marcação
              </button>
            )}
            {awaitingTiming && roundPhase !== 'counting' && roundPhase !== 'waiting' && (
              <button onClick={() => openMarcTiming(activeGroup)}
                style={ctrlBtn('#0D8F41', '#fff')}>
                ▶ Configurar marcação {marcLabel}
              </button>
            )}
            {awaitingStart && (
              <button onClick={() => ask(`Abortar a marcação ${marcLabel} e redefinir o horário de início?`, abortarMarcacao)}
                style={ctrlBtn('#FEF2F2', '#DC2626', '1px solid #FECACA')}>
                ✕ Abortar marcação {marcLabel}
              </button>
            )}
            {roundPhase === 'done' && !allGroupsDone && (
              <button onClick={() => openMarcTiming(activeGroup + 1)}
                style={ctrlBtn('#1D4ED8', '#fff')}>
                ▶ Configurar marcação {round}-{activeGroup + 1}
              </button>
            )}
            {allGroupsDone && divisions > 1 && (
              <button onClick={() => openMarcConfig(true)}
                style={ctrlBtn('#0D8F41', '#fff')}>
                Configuração da Marcação (novo ciclo)
              </button>
            )}
          </CtrlCard>
        )}

        {/* Participantes fora do app */}
        {(((status === 'draft' || status === 'open') && !groupsAssigned) ||
          (roundPhase === 'done' && semAppAtuais.length > 0)) && (
          <CtrlCard title="👤 Participante sem App" desc="Adicione quem participa sem celular. Os cantos deles (catraca) são informados por você ao fim de cada marcação.">
            {(status === 'draft' || status === 'open') && !groupsAssigned && (
              <button onClick={() => setAddOpen(true)}
                style={ctrlBtn('#7C3AED', '#fff')}>
                Adicionar Participante sem App
              </button>
            )}
            {roundPhase === 'done' && semAppAtuais.length > 0 && (
              <button onClick={() => setCantosOpen(true)}
                style={ctrlBtn('#F3E8FF', '#7C3AED', '1px solid #E9D5FF')}>
                Cantos sem app · marcação {marcLabel}
              </button>
            )}
          </CtrlCard>
        )}

        {/* Vassourada */}
        {allGroupsDone && divisions > 1 && !vassouradaDone && (
          <CtrlCard title="🧹 Vassourada" desc="Opcional, ao fim do ciclo: elimina uma porcentagem das gaiolas com menos cantos. Quem passa avança para o próximo ciclo.">
            <button onClick={openVassoura}
              style={ctrlBtn('#DC2626', '#fff')}>
              🧹 Vassourada
            </button>
          </CtrlCard>
        )}

        {/* Encerramento */}
        {allGroupsDone && (
          <CtrlCard title="🏁 Encerrar torneio" desc="Grava a marcação final no histórico dos pássaros e finaliza o torneio. Ação definitiva — não dá pra reabrir.">
            <button onClick={() => ask('Tem certeza que deseja finalizar o torneio?', finalizeTorneio)} disabled={loading}
              style={ctrlBtn('#111827', '#fff')}>
              ■ Finalizar torneio
            </button>
          </CtrlCard>
        )}
      </div>

      {/* ── Modal A: Configuração da Marcação (nº de marcações) ── */}
      {showMarcConfig && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowMarcConfig(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', width: '100%', maxWidth: 480, boxSizing: 'border-box', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <div>
                <p style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: '#111827' }}>Configuração da Marcação</p>
                <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#0D8F41' }}>
                  {mcNewCycle ? `Novo ciclo (marcação ${round + 1})` : 'Defina as marcações do ciclo'}
                </p>
              </div>
              <button type="button" onClick={() => setShowMarcConfig(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4, lineHeight: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={lbl}>Dividir em quantas Marcações?</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[1, 2, 3, 4, 5, 6].map(n => (
                    <button key={n} type="button" onClick={() => setMcDivisions(n)}
                      style={{
                        width: 44, height: 44, borderRadius: 8, fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                        border: `2px solid ${mcDivisions === n ? '#0D8F41' : '#E5E7EB'}`,
                        background: mcDivisions === n ? '#F0FDF4' : '#fff',
                        color: mcDivisions === n ? '#0D8F41' : '#374151',
                      }}>
                      {n}
                    </button>
                  ))}
                </div>
                {mcDivisions > 1 && !mcManualActive && (
                  <p style={{ margin: '8px 0 0', fontSize: '0.72rem', color: '#9CA3AF' }}>
                    {approvedByScore.length} gaiolas divididas em {mcDivisions} marcações (~{Math.round(100 / mcDivisions)}% / ~{Math.ceil(approvedByScore.length / mcDivisions)} gaiolas cada).
                  </p>
                )}
              </div>

              {/* posição manual: mestre escolhe os grupos 1..N-1; o resto cai no último */}
              {mcManualActive && (
                <div>
                  <label style={lbl}>Posição das gaiolas (manual)</label>
                  <p style={{ margin: '0 0 10px', fontSize: '0.72rem', color: '#9CA3AF', lineHeight: 1.5 }}>
                    Escolha o grupo de cada gaiola{mcDivisions > 2 ? ` (1 a ${mcDivisions - 1})` : ' (1)'}.
                    Quem não for escolhido vai automaticamente para a marcação {mcDivisions}.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
                    {mcApproved.map(p => {
                      const chosen = mcAssign[p.id]
                      const eff = chosen && chosen >= 1 && chosen < mcDivisions ? chosen : mcDivisions
                      return (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #F3F4F6', borderRadius: 8, padding: '8px 10px' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.8rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.cage_number != null ? `G${p.cage_number} · ` : ''}{p.bird_name}
                            </p>
                            <p style={{ margin: 0, fontSize: '0.66rem', color: eff === mcDivisions && !chosen ? '#9CA3AF' : '#0D8F41', fontWeight: 600 }}>
                              marcação {eff}{eff === mcDivisions && !chosen ? ' (automático)' : ''}
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            {Array.from({ length: mcDivisions - 1 }, (_, i) => i + 1).map(g => (
                              <button key={g} type="button"
                                onClick={() => setMcAssign(prev => {
                                  const n = { ...prev }
                                  if (n[p.id] === g) delete n[p.id]  // clicar de novo → volta pro automático
                                  else n[p.id] = g
                                  return n
                                })}
                                style={{
                                  width: 34, height: 34, borderRadius: 8, fontSize: '0.82rem', fontWeight: 800,
                                  cursor: 'pointer', fontFamily: 'inherit',
                                  border: `2px solid ${chosen === g ? '#0D8F41' : '#E5E7EB'}`,
                                  background: chosen === g ? '#F0FDF4' : '#fff',
                                  color: chosen === g ? '#0D8F41' : '#6B7280',
                                }}>
                                {g}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <p style={{ margin: '10px 0 0', fontSize: '0.72rem', fontWeight: 600, color: mcManualInvalid ? '#DC2626' : '#6B7280' }}>
                    {Array.from({ length: mcDivisions }, (_, i) => i + 1)
                      .map(g => `Marcação ${g}: ${mcGroupCount(g)} gaiola${mcGroupCount(g) !== 1 ? 's' : ''}`)
                      .join(' · ')}
                    {mcManualInvalid ? ' — toda marcação precisa de pelo menos 1 gaiola' : ''}
                  </p>
                </div>
              )}

              <button onClick={applyMarcConfig} disabled={mcLoading || mcManualInvalid}
                style={{
                  background: (mcLoading || mcManualInvalid) ? '#D1D5DB' : '#0D8F41',
                  color: '#fff', border: 'none', borderRadius: 8, padding: '13px',
                  fontSize: '0.88rem', fontWeight: 700, cursor: (mcLoading || mcManualInvalid) ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', marginTop: 4,
                }}>
                {mcLoading ? 'Aplicando...' : 'Aplicar Marcação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal B: Configurar marcação {round}-{target} (duração + horário) ── */}
      {showMarcTiming && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowMarcTiming(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', width: '100%', maxWidth: 460, boxSizing: 'border-box', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <div>
                <p style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: '#111827' }}>
                  Configurar marcação {divisions > 1 ? `${round}-${mtTarget}` : `${round}`}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#1D4ED8' }}>Duração e horário de início</p>
              </div>
              <button type="button" onClick={() => setShowMarcTiming(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4, lineHeight: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={lbl}>Duração da contagem (minutos)</label>
                <input style={inp} type="number" min={1} max={120} value={mtDurationMin} onChange={e => setMtDurationMin(Number(e.target.value))} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={lbl}>Hora de início</label>
                  <select style={{ ...inp, color: mtHour ? '#111827' : '#9CA3AF' }} value={mtHour} onChange={e => setMtHour(e.target.value)}>
                    <option value="" style={{ color: '#9CA3AF' }}>--</option>
                    {HOURS.map(h => <option key={h} value={h} style={{ color: '#111827' }}>{h}h</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Minuto</label>
                  <select style={{ ...inp, color: '#111827' }} value={mtMin} onChange={e => setMtMin(e.target.value)}>
                    {MINS.map(m => <option key={m} value={m} style={{ color: '#111827' }}>{m}min</option>)}
                  </select>
                </div>
              </div>

              <button onClick={applyMarcTiming} disabled={!mtHour || mtLoading}
                style={{
                  background: (!mtHour || mtLoading) ? '#D1D5DB' : '#1D4ED8',
                  color: '#fff', border: 'none', borderRadius: 8, padding: '13px',
                  fontSize: '0.88rem', fontWeight: 700, cursor: (!mtHour || mtLoading) ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', marginTop: 4,
                }}>
                {mtLoading ? 'Agendando...' : 'Agendar início da marcação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal C: Vassourada (opcional, ao fim do ciclo) ── */}
      {showVassoura && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowVassoura(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', width: '100%', maxWidth: 480, boxSizing: 'border-box', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <div>
                <p style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: '#111827' }}>Vassourada</p>
                <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#DC2626' }}>Eliminar gaiolas (opcional)</p>
              </div>
              <button type="button" onClick={() => setShowVassoura(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4, lineHeight: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={lbl}>Vassourada — eliminar gaiolas</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {ELIM_OPTS.map(pct => (
                    <button key={pct} type="button" onClick={() => setVsPercent(pct)}
                      style={{
                        padding: '8px 14px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                        border: `2px solid ${vsPercent === pct ? '#DC2626' : '#E5E7EB'}`,
                        background: vsPercent === pct ? '#FEF2F2' : '#fff',
                        color: vsPercent === pct ? '#DC2626' : '#374151',
                      }}>
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {vsPercent !== null && (
                <div style={{ background: '#FAFAFA', borderRadius: 10, padding: '12px 14px', fontSize: '0.78rem' }}>
                  <p style={{ margin: '0 0 8px', fontWeight: 700, color: '#111827' }}>
                    Avançam: <span style={{ color: '#0D8F41' }}>{advancing.length} gaiolas</span>
                    {' · '}
                    Eliminados: <span style={{ color: '#DC2626' }}>{eliminating.length} gaiolas</span>
                  </p>
                  {eliminating.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <p style={{ margin: '0 0 4px', fontSize: '0.68rem', fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Serão eliminados:</p>
                      {eliminating.map(p => (
                        <p key={p.id} style={{ margin: 0, color: '#DC2626' }}>
                          {p.bird_name} <span style={{ color: '#9CA3AF' }}>({p.user_name}) · {scores[p.id] ?? 0} cantos</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button onClick={applyVassourada} disabled={vsPercent === null || vsLoading}
                style={{
                  background: (vsPercent === null || vsLoading) ? '#D1D5DB' : '#DC2626',
                  color: '#fff', border: 'none', borderRadius: 8, padding: '13px',
                  fontSize: '0.88rem', fontWeight: 700, cursor: (vsPercent === null || vsLoading) ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', marginTop: 4,
                }}>
                {vsLoading ? 'Aplicando...' : 'Aplicar vassourada'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: cantos dos participantes sem app ── */}
      {cantosOpen && (
        <div onClick={e => { if (e.target === e.currentTarget) setCantosOpen(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', width: '100%', maxWidth: 440, boxSizing: 'border-box', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: '#111827' }}>Cantos sem app</p>
              <button type="button" onClick={() => setCantosOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4, lineHeight: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: '0.75rem', color: '#9CA3AF' }}>
              Informe o número de cantos (catraca) de cada participante fora do app.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {semAppAtuais.length === 0 && (
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#9CA3AF' }}>Nenhum participante sem app nesta marcação.</p>
              )}
              {semAppAtuais.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>{p.bird_name}</p>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#9CA3AF' }}>
                      {p.user_name}{p.cage_number ? ` · Gaiola ${p.cage_number}` : ''}{divisions > 1 && p.round_group ? ` · marcação ${round}-${p.round_group}` : ''}
                    </p>
                  </div>
                  <input style={{ ...inp, width: 90, flexShrink: 0 }} type="number" min={0}
                    placeholder={String(scores[p.id] ?? 0)}
                    value={cantosInput[p.id] ?? ''}
                    onChange={e => setCantosInput(prev => ({ ...prev, [p.id]: e.target.value }))} />
                </div>
              ))}
            </div>
            <button onClick={saveCantosSemApp} disabled={cantosLoading || semAppAtuais.length === 0}
              style={{
                background: (cantosLoading || semAppAtuais.length === 0) ? '#D1D5DB' : '#7C3AED',
                color: '#fff', border: 'none', borderRadius: 8, padding: '12px', width: '100%',
                fontSize: '0.88rem', fontWeight: 700, cursor: (cantosLoading || semAppAtuais.length === 0) ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', marginTop: 16,
              }}>
              {cantosLoading ? 'Salvando...' : 'Salvar cantos'}
            </button>
          </div>
        </div>
      )}

      {/* ── Modal: adicionar sem app ── */}
      {addOpen && (
        <div onClick={e => { if (e.target === e.currentTarget) setAddOpen(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', width: '100%', maxWidth: 400, boxSizing: 'border-box', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <p style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem', color: '#111827' }}>Adicionar participante</p>
                <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#7C3AED' }}>Fora do aplicativo</p>
              </div>
              <button type="button" onClick={() => setAddOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4, lineHeight: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form onSubmit={addSemApp} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div>
                <label style={lbl}>Nome do dono</label>
                <input style={inp} placeholder="João da Silva" value={addName} onChange={e => setAddName(e.target.value)} required autoFocus />
              </div>
              <div>
                <label style={lbl}>Nome do pássaro</label>
                <input style={inp} placeholder="Canário Dourado" value={addBird} onChange={e => setAddBird(e.target.value)} required />
              </div>
              <div>
                <label style={lbl}>Número da gaiola</label>
                <input style={inp} type="number" min={0} placeholder="Ex: 12" value={addCage} onChange={e => setAddCage(e.target.value)} />
              </div>
              <p style={{ margin: 0, fontSize: '0.7rem', color: '#9CA3AF', lineHeight: 1.4 }}>
                Os cantos serão atribuídos ao fim de cada rodada.
              </p>
              <button type="submit" disabled={addLoading}
                style={{ background: addLoading ? '#D1D5DB' : '#7C3AED', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: '0.88rem', fontWeight: 700, cursor: addLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: 4 }}>
                {addLoading ? 'Adicionando...' : 'Adicionar participante'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Possíveis fraudes da marcação atual ── */}
      {fraudList.length > 0 && (
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: '0.9rem', color: '#92400E', display: 'flex', alignItems: 'center', gap: 8 }}>
            ⚠ Possíveis fraudes · Marcação {marcLabel}
          </p>
          <p style={{ margin: 0, fontSize: '0.72rem', color: '#B45309' }}>
            Participantes marcando rápido demais (cliques &lt; 1s). Verifique quem pode estar burlando.
          </p>
          {fraudList.map(p => {
            const n = suspicious[p.id] ?? 0
            const fc = fraudColor(n)
            return (
              <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 8, background: '#fff', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {p.cage_number != null && (
                    <span title="Número da gaiola" style={{ flexShrink: 0, background: '#111827', color: '#fff', borderRadius: 8, padding: '4px 10px', fontSize: '1.05rem', fontWeight: 900, letterSpacing: '-0.02em', minWidth: 38, textAlign: 'center' }}>
                      G{p.cage_number}
                    </span>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.bird_name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.user_name} · {scores[p.id] ?? 0} cantos
                    </p>
                  </div>
                  <span title={`${n} marcações suspeitas`} style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4, background: fc.bg, color: fc.color, border: `1px solid ${fc.border}`, borderRadius: 20, padding: '4px 10px', fontSize: '0.78rem', fontWeight: 800 }}>
                    ⚠ {n}
                  </span>
                </div>
                {status !== 'finished' && (
                  <button onClick={() => ask(`Eliminar ${p.bird_name} por fraude?`, () => eliminarParticipante(p, 'fraud'))}
                    style={{ width: '100%', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 8, padding: '9px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Eliminar por fraude
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Ranking ao vivo ── */}
      {ranking.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#111827' }}>Ranking · Marcação {marcLabel}{divisions > 1 ? ` (${divisions} marcações)` : ''}</p>
          {ranking.map((p, i) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #E5E7EB', borderRadius: 10, padding: '12px 14px', background: '#fff' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: i < 3 ? ['#B45309','#6B7280','#92400E'][i] : '#D1D5DB', width: 28, textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {p.bird_name}
                  {(suspicious[p.id] ?? 0) > 5 && (() => {
                    const fc = fraudColor(suspicious[p.id])
                    return (
                      <span title={`${suspicious[p.id]} marcações suspeitas (cliques rápidos demais)`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: fc.bg, color: fc.color, border: `1px solid ${fc.border}`, borderRadius: 20, padding: '1px 7px', fontSize: '0.68rem', fontWeight: 800 }}>
                        ⚠ {suspicious[p.id]}
                      </span>
                    )
                  })()}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#9CA3AF' }}>
                  {p.user_name}
                  {p.cage_number ? ` · Gaiola ${p.cage_number}` : ''}
                  {!p.user_id && <span style={{ marginLeft: 6, color: '#7C3AED', fontWeight: 700 }}>· fora do app</span>}
                </p>
              </div>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0D8F41', letterSpacing: '-0.02em' }}>{scores[p.id] ?? 0}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Ranking geral (todos os participantes) ── */}
      {divisions > 1 && rankingGeral.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#111827' }}>Ranking geral</p>
          {rankingGeral.map((p, i) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #E5E7EB', borderRadius: 10, padding: '12px 14px', background: '#fff' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: i < 3 ? ['#B45309','#6B7280','#92400E'][i] : '#D1D5DB', width: 28, textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {p.bird_name}
                  {(suspicious[p.id] ?? 0) > 5 && (() => {
                    const fc = fraudColor(suspicious[p.id])
                    return (
                      <span title={`${suspicious[p.id]} marcações suspeitas (cliques rápidos demais)`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: fc.bg, color: fc.color, border: `1px solid ${fc.border}`, borderRadius: 20, padding: '1px 7px', fontSize: '0.68rem', fontWeight: 800 }}>
                        ⚠ {suspicious[p.id]}
                      </span>
                    )
                  })()}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#9CA3AF' }}>
                  {p.user_name}
                  {p.cage_number ? ` · Gaiola ${p.cage_number}` : ''}
                  {divisions > 1 && p.round_group ? ` · marcação ${round}-${p.round_group}` : ''}
                  {!p.user_id && <span style={{ marginLeft: 6, color: '#7C3AED', fontWeight: 700 }}>· fora do app</span>}
                </p>
              </div>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0D8F41', letterSpacing: '-0.02em' }}>{scores[p.id] ?? 0}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Participantes (recusados/eliminados somem da lista na hora) ── */}
      <div id="secao-aprovacao" style={{ display: 'flex', flexDirection: 'column', gap: 8, scrollMarginTop: 64 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#111827' }}>Participantes</p>
        {participantes.length === 0 && (
          <p style={{ fontSize: '0.85rem', color: '#9CA3AF', margin: 0 }}>Nenhum ainda. Compartilhe o QR code.</p>
        )}
        {participantes.filter(p => p.status !== 'rejected' && p.status !== 'eliminated').map(p => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #E5E7EB', borderRadius: 10, padding: '12px 14px', background: '#fff', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 150px', minWidth: 150 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: '#111827' }}>{p.bird_name}</p>
              <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#9CA3AF' }}>
                {p.user_name}
                {!p.user_id && <span style={{ marginLeft: 6, fontWeight: 700, color: '#7C3AED' }}>· fora do app</span>}
              </p>
            </div>
            {p.status === 'pending' && (
              // quebra pra linha própria em telas estreitas; alvos de toque grandes
              <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', flex: '1 1 300px', minWidth: 0 }}>
                <input
                  type="number" inputMode="numeric" placeholder="Nº gaiola"
                  style={{
                    flex: '1 1 90px', minWidth: 76, boxSizing: 'border-box',
                    border: '1.5px solid #D1D5DB', borderRadius: 8, padding: '10px 10px',
                    fontSize: '1rem', fontWeight: 700, textAlign: 'center',
                    fontFamily: 'inherit', outline: 'none', minHeight: 44,
                  }}
                  onBlur={e => { const n = parseInt(e.target.value); if (!isNaN(n)) updateParticipante(p.id, { cage_number: n }) }}
                />
                <button onClick={() => updateParticipante(p.id, { status: 'approved' })}
                  style={{ flex: '1 1 auto', background: '#0D8F41', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', minHeight: 44 }}>
                  Aprovar
                </button>
                <button onClick={() => updateParticipante(p.id, { status: 'rejected' })}
                  style={{ flex: '1 1 auto', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', minHeight: 44 }}>
                  Recusar
                </button>
              </div>
            )}
            {p.status === 'approved' && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0D8F41', background: '#F0FDF4', borderRadius: 20, padding: '4px 10px' }}>
                  Aprovado{p.cage_number ? ` · G${p.cage_number}` : ''}
                </span>
                {status !== 'finished' && (
                  <button onClick={() => ask(`Eliminar ${p.bird_name} do torneio?`, () => eliminarParticipante(p, 'manual'))}
                    style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 7, padding: '5px 10px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Eliminar
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
