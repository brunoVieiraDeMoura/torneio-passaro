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
}

interface Score { participant_id: string; count: number }
interface Torneio {
  id: string; status: string; duration_secs: number; start_at: string | null
  round: number; divisions: number; active_group: number
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')) // 00,05,10,...,55
const ELIM_OPTS = [25, 40, 50, 60, 75]

function pad(n: number) { return String(n).padStart(2, '0') }

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
  const [status, setStatus] = useState(torneio.status)
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

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`mestre:${torneio.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'participants', filter: `tournament_id=eq.${torneio.id}` },
        payload => setParticipantes(prev => [...prev, payload.new as Participante]))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'participants', filter: `tournament_id=eq.${torneio.id}` },
        payload => setParticipantes(prev => prev.map(p => p.id === payload.new.id ? payload.new as Participante : p)))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores', filter: `tournament_id=eq.${torneio.id}` },
        payload => { const s = payload.new as Score; setScores(prev => ({ ...prev, [s.participant_id]: s.count })) })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tournaments', filter: `id=eq.${torneio.id}` },
        payload => {
          if (payload.new.start_at !== undefined) setStartAt(payload.new.start_at)
          if (payload.new.duration_secs !== undefined) setCurrentDurationSecs(payload.new.duration_secs)
          if (payload.new.stream_url !== undefined) setStreamUrl(payload.new.stream_url)
          if (payload.new.round !== undefined) setRound(payload.new.round)
          if (payload.new.divisions !== undefined) setDivisions(payload.new.divisions)
          if (payload.new.active_group !== undefined) setActiveGroup(payload.new.active_group)
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [torneio.id])

  async function updateStatus(newStatus: string, refresh = true) {
    setLoading(true)
    const supabase = createClient()
    const body: Record<string, string> = { status: newStatus }
    if (newStatus === 'running') body.start_at = new Date().toISOString()
    await supabase.from('tournaments').update(body).eq('id', torneio.id)
    if (newStatus === 'running') setStartAt(new Date().toISOString())
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
        supabase.from('scores').select('participant_id, count').eq('tournament_id', torneio.id),
      ])
      if (parts) setParticipantes(parts as Participante[])
      if (scs) setScores(Object.fromEntries((scs as Score[]).map(s => [s.participant_id, s.count])))
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
    setShowMarcConfig(true)
  }

  async function applyMarcConfig() {
    setMcLoading(true)
    const supabase = createClient()
    const survivors = participantes.filter(p => p.status === 'approved')

    // início de novo ciclo: histórico + zera contagem dos sobreviventes
    if (mcNewCycle) {
      const snapshot = survivors.map(p => ({
        tournament_id: torneio.id, participant_id: p.id, user_id: p.user_id ?? null,
        bird_name: p.bird_name, round, round_group: p.round_group ?? null, count: scores[p.id] ?? 0,
      }))
      if (snapshot.length) await supabase.from('round_scores').insert(snapshot)
      if (survivors.length) {
        await supabase.from('scores').update({ count: 0, last_click_at: null })
          .in('participant_id', survivors.map(p => p.id)).eq('tournament_id', torneio.id)
        setScores(prev => { const n = { ...prev }; survivors.forEach(p => { n[p.id] = 0 }); return n })
      }
    }

    // distribui sobreviventes em mcDivisions marcações (round-robin)
    const groupMap = splitGroups(survivors, mcDivisions)
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
    setShowMarcConfig(false); setMcLoading(false)
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
    if (eliminate.length) {
      // histórico: envia os cantos de cada eliminado pro histórico do pássaro (user_id vincula ao usuário cadastrado)
      const snapshot = eliminate.map(p => ({
        tournament_id: torneio.id, participant_id: p.id, user_id: p.user_id ?? null,
        bird_name: p.bird_name, round, round_group: p.round_group ?? null, count: scores[p.id] ?? 0,
      }))
      await supabase.from('round_scores').insert(snapshot)
      await supabase.from('participants').update({ status: 'eliminated' }).in('id', eliminate.map(p => p.id))
      setParticipantes(prev => prev.map(p => eliminate.find(e => e.id === p.id) ? { ...p, status: 'eliminated' } : p))
    }
    setShowVassoura(false); setVsLoading(false)
    router.refresh()
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

  // ranking — only approved (not eliminated)
  const ranking = [...participantes]
    .filter(p => p.status === 'approved')
    .sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0))

  // todas as marcações do ciclo terminaram → habilita vassourada / novo ciclo
  const allGroupsDone = roundPhase === 'done' && activeGroup >= divisions

  // marcações já configuradas neste ciclo (algum aprovado com grupo definido)
  const groupsAssigned = participantes.some(p => p.status === 'approved' && p.round_group != null)
  // configurou as marcações mas ainda falta agendar o horário da marcação atual
  const awaitingTiming = (status === 'open' || status === 'running') && !startAt && groupsAssigned
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

  const inp: React.CSSProperties = {
    width: '100%', border: '1px solid #E5E7EB', borderRadius: 8,
    padding: '9px 11px', fontSize: '0.85rem', outline: 'none',
    fontFamily: 'inherit', color: '#111827', background: '#fff', boxSizing: 'border-box',
  }
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#6B7280',
    marginBottom: 5, letterSpacing: '0.06em', textTransform: 'uppercase',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {confirm && <ConfirmModal message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}

      {/* ── Relógio ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ background: '#111827', borderRadius: 10, padding: '10px 18px', display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '0.04em' }}>{clockStr}</span>
          <span style={{ fontSize: '0.65rem', color: '#6B7280', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>agora</span>
        </div>

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

      {/* ── QR Code (só enquanto inscrições abertas, some 10min antes) ── */}
      {showQR && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '20px 24px' }}>
          <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 600, color: '#9CA3AF' }}>QR Code para participantes</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl!} alt="QR Code do torneio" width={192} height={192} />
          <p style={{ margin: 0, fontSize: '0.65rem', color: '#D1D5DB', wordBreak: 'break-all', textAlign: 'center', maxWidth: 280 }}>{qrUrl}</p>
        </div>
      )}

      {/* ── Live / Logo (substitui o QR quando inscrições fecham) ── */}
      {!showQR && status !== 'finished' && (
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

      {/* ── Controles ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {status === 'draft' && (
          <button onClick={() => ask('Tem certeza que deseja abrir as inscrições?', openInscricoes)} disabled={loading}
            style={{ background: '#1D4ED8', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Abrir inscrições
          </button>
        )}

        {/* Inscrições abertas, marcações ainda não configuradas → Configuração da Marcação */}
        {status === 'open' && !groupsAssigned && (
          <button onClick={() => openMarcConfig(false)}
            style={{ background: '#0D8F41', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Configuração da Marcação
          </button>
        )}

        {/* Marcações configuradas, falta agendar o horário da marcação atual */}
        {awaitingTiming && roundPhase !== 'counting' && roundPhase !== 'waiting' && (
          <button onClick={() => openMarcTiming(activeGroup)}
            style={{ background: '#0D8F41', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            ▶ Configurar marcação {marcLabel}
          </button>
        )}

        {/* Fim de uma marcação, mas ainda há marcações no ciclo → cantos sem app + configurar a próxima */}
        {roundPhase === 'done' && !allGroupsDone && (
          <>
            {semAppAtuais.length > 0 && (
              <button onClick={() => setCantosOpen(true)}
                style={{ background: '#F3E8FF', color: '#7C3AED', border: '1px solid #E9D5FF', borderRadius: 8, padding: '10px 18px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cantos sem app · marcação {marcLabel}
              </button>
            )}
            <button onClick={() => openMarcTiming(activeGroup + 1)}
              style={{ background: '#1D4ED8', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              ▶ Configurar marcação {round}-{activeGroup + 1}
            </button>
          </>
        )}

        {/* Fim do ciclo → cantos sem app + (se dividido) vassourada + nova configuração + finalizar */}
        {allGroupsDone && (
          <>
            {semAppAtuais.length > 0 && (
              <button onClick={() => setCantosOpen(true)}
                style={{ background: '#F3E8FF', color: '#7C3AED', border: '1px solid #E9D5FF', borderRadius: 8, padding: '10px 18px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cantos sem app · marcação {marcLabel}
              </button>
            )}
            {/* mais marcações/vassourada só quando o ciclo teve +1 marcação; 1 marcação = rodada final */}
            {divisions > 1 && (
              <>
                <button onClick={openVassoura}
                  style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  🧹 Vassourada
                </button>
                <button onClick={() => openMarcConfig(true)}
                  style={{ background: '#0D8F41', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Configuração da Marcação
                </button>
              </>
            )}
            <button onClick={() => ask('Tem certeza que deseja finalizar o torneio?', () => updateStatus('finished'))} disabled={loading}
              style={{ background: '#111827', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              ■ Finalizar torneio
            </button>
          </>
        )}

        {/* Iniciar/Encerrar live — disponível desde a criação do torneio */}
        {status !== 'finished' && (
          <button onClick={() => { setStreamInput(streamUrl ?? ''); setShowStreamModal(true) }}
            style={{
              background: streamUrl ? '#FEF2F2' : '#111827', color: streamUrl ? '#DC2626' : '#fff',
              border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: '0.85rem', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
            }}>
            {streamUrl ? '✕ Encerrar live' : '📡 Iniciar live'}
          </button>
        )}

        {/* Adicionar sem app — SÓ antes de começar (inscrições, antes de configurar as marcações) */}
        {(status === 'draft' || status === 'open') && !groupsAssigned && (
          <button onClick={() => setAddOpen(true)}
            style={{ background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            + Adicionar sem app
          </button>
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
                {mcDivisions > 1 && (
                  <p style={{ margin: '8px 0 0', fontSize: '0.72rem', color: '#9CA3AF' }}>
                    {approvedByScore.length} gaiolas divididas em {mcDivisions} marcações (~{Math.round(100 / mcDivisions)}% / ~{Math.ceil(approvedByScore.length / mcDivisions)} gaiolas cada).
                  </p>
                )}
              </div>

              <button onClick={applyMarcConfig} disabled={mcLoading}
                style={{
                  background: mcLoading ? '#D1D5DB' : '#0D8F41',
                  color: '#fff', border: 'none', borderRadius: 8, padding: '13px',
                  fontSize: '0.88rem', fontWeight: 700, cursor: mcLoading ? 'not-allowed' : 'pointer',
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

      {/* ── Ranking ao vivo ── */}
      {ranking.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#111827' }}>Ranking · Marcação {marcLabel}{divisions > 1 ? ` (${divisions} marcações)` : ''}</p>
          {ranking.map((p, i) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #E5E7EB', borderRadius: 10, padding: '12px 14px', background: '#fff' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: i < 3 ? ['#B45309','#6B7280','#92400E'][i] : '#D1D5DB', width: 28, textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: '#111827' }}>{p.bird_name}</p>
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

      {/* ── Participantes ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#111827' }}>Participantes</p>
        {participantes.length === 0 && (
          <p style={{ fontSize: '0.85rem', color: '#9CA3AF', margin: 0 }}>Nenhum ainda. Compartilhe o QR code.</p>
        )}
        {participantes.map(p => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #E5E7EB', borderRadius: 10, padding: '12px 14px', background: p.status === 'eliminated' ? '#FAFAFA' : '#fff', opacity: p.status === 'eliminated' ? 0.5 : 1 }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: '#111827' }}>{p.bird_name}</p>
              <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#9CA3AF' }}>
                {p.user_name}
                {!p.user_id && <span style={{ marginLeft: 6, fontWeight: 700, color: '#7C3AED' }}>· fora do app</span>}
                {p.status === 'eliminated' && <span style={{ marginLeft: 6, fontWeight: 700, color: '#DC2626' }}>· eliminado</span>}
              </p>
            </div>
            {p.status === 'pending' && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                <input type="number" placeholder="Gaiola" style={{ width: 72, border: '1px solid #E5E7EB', borderRadius: 7, padding: '5px 8px', fontSize: '0.8rem', fontFamily: 'inherit', outline: 'none' }}
                  onBlur={e => { const n = parseInt(e.target.value); if (!isNaN(n)) updateParticipante(p.id, { cage_number: n }) }} />
                <button onClick={() => updateParticipante(p.id, { status: 'approved' })}
                  style={{ background: '#0D8F41', color: '#fff', border: 'none', borderRadius: 7, padding: '6px 11px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Aprovar
                </button>
                <button onClick={() => updateParticipante(p.id, { status: 'rejected' })}
                  style={{ background: '#FEF2F2', color: '#DC2626', border: 'none', borderRadius: 7, padding: '6px 11px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Recusar
                </button>
              </div>
            )}
            {p.status === 'approved' && (
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0D8F41', background: '#F0FDF4', borderRadius: 20, padding: '4px 10px', flexShrink: 0 }}>
                Aprovado{p.cage_number ? ` · G${p.cage_number}` : ''}
              </span>
            )}
            {p.status === 'rejected' && <span style={{ fontSize: '0.72rem', color: '#EF4444', flexShrink: 0 }}>Recusado</span>}
            {p.status === 'eliminated' && <span style={{ fontSize: '0.72rem', color: '#DC2626', flexShrink: 0 }}>Eliminado</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
