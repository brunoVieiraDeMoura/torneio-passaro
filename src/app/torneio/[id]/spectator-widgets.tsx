'use client'

import { useEffect, useRef, useState } from 'react'
import { formatDurationMinSec } from '@/lib/duration'

export type RankItem = {
  id: string; bird_name: string; user_name: string; cage_number: number | null
  score: number; warns: number; round_group?: number | null
  intervals?: { started_at: string; ended_at: string }[]
}

const RANK_COLORS = ['#B45309', '#6B7280', '#92400E']
const RANK_BG     = ['rgba(180,83,9,0.08)', 'rgba(107,114,128,0.06)', 'rgba(146,64,14,0.07)']

function pad(n: number) { return String(n).padStart(2, '0') }
function fmtHM(ms: number) { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}` }
function fmtCountdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`
}

function useNow(intervalMs = 1000): number | null {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

/* ── coluna com auto-scroll de telão (só desktop): 5s parada no topo,
      desce devagar até o fim, 2s no fim, volta ao topo e repete.
      Interação do usuário (scroll/toque) pausa e retoma sozinha. ── */
export function AutoScrollMain({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const mq = window.matchMedia('(min-width: 1024px)')

    const SPEED = 40          // px/s — descida vagarosa
    const PAUSE_TOP = 5000    // parada no topo
    const PAUSE_BOTTOM = 2000 // respiro no fim antes de voltar
    const RESUME = 8000       // retoma após interação do usuário

    let raf = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    let disposed = false

    const clear = () => { cancelAnimationFrame(raf); clearTimeout(timer) }
    const wait = (ms: number, next: () => void) => { timer = setTimeout(next, ms) }

    const descend = () => {
      let last: number | undefined
      const step = (t: number) => {
        if (disposed) return
        if (last === undefined) last = t
        const dt = (t - last) / 1000
        last = t
        const max = el.scrollHeight - el.clientHeight
        if (el.scrollTop >= max - 1) { wait(PAUSE_BOTTOM, ascend); return }
        el.scrollTop = Math.min(max, el.scrollTop + SPEED * dt)
        raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }

    const ascend = () => {
      el.scrollTo({ top: 0, behavior: 'smooth' })
      wait(PAUSE_TOP, cycle)
    }

    const cycle = () => {
      // fora do desktop ou conteúdo cabe na tela → só re-checa depois
      if (!mq.matches || el.scrollHeight - el.clientHeight <= 4) { wait(PAUSE_TOP, cycle); return }
      descend()
    }

    const onInput = () => { clear(); wait(RESUME, cycle) }
    el.addEventListener('wheel', onInput, { passive: true })
    el.addEventListener('touchstart', onInput, { passive: true })
    el.addEventListener('pointerdown', onInput, { passive: true })

    wait(PAUSE_TOP, cycle)

    return () => {
      disposed = true
      clear()
      el.removeEventListener('wheel', onInput)
      el.removeEventListener('touchstart', onInput)
      el.removeEventListener('pointerdown', onInput)
    }
  }, [])

  return <main ref={ref} className={className}>{children}</main>
}

/* ── avisos de fraude: ⚠ + número ao lado dos cantos ── */
export function WarnBadge({ n }: { n: number }) {
  if (n <= 0) return null
  return (
    <span title={`${n} aviso${n !== 1 ? 's' : ''} de marcação`} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
      background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 20,
      padding: 'var(--rk-warn-pad, 3px 8px)',
    }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-label="Avisos de marcação"
        style={{ width: 'var(--rk-warn-ico, 12px)', height: 'var(--rk-warn-ico, 12px)' }}>
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <span style={{ fontWeight: 800, fontSize: 'var(--rk-warn-fs, 0.72rem)', color: '#B91C1C' }}>{n}</span>
    </span>
  )
}

/* ── Relógios do telão: agora / próxima marcação / tempo restante ── */
export function SpectatorClock({ startAt, durationSecs, onDark = false }: {
  startAt: string | null; durationSecs: number; onDark?: boolean
}) {
  const now = useNow(1000)
  if (now === null) return null

  const start = startAt ? new Date(startAt).getTime() : null
  const end = start !== null ? start + durationSecs * 1000 : null
  const counting = start !== null && end !== null && now >= start && now <= end
  const upcoming = start !== null && now < start

  const chip: React.CSSProperties = {
    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10,
    background: onDark ? 'rgba(255,255,255,0.06)' : '#F9FAFB',
    border: `1px solid ${onDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6'}`,
    borderRadius: 10, padding: '8px 12px',
  }
  const lbl: React.CSSProperties = {
    margin: 0, fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: onDark ? 'rgba(255,255,255,0.4)' : '#9CA3AF',
  }
  const val = (color: string): React.CSSProperties => ({
    margin: 0, fontFamily: 'monospace', fontSize: '1.05rem', fontWeight: 800,
    letterSpacing: '0.04em', color,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '14px 0 0' }}>
      <div style={chip}>
        <p style={lbl}>Agora</p>
        <p style={val(onDark ? '#fff' : '#111827')}>{new Date(now).toLocaleTimeString('pt-BR')}</p>
      </div>
      {upcoming && start !== null && (
        <div style={chip}>
          <p style={lbl}>Próxima marcação</p>
          <p style={val(onDark ? '#FBBF24' : '#B45309')}>{fmtHM(start)} · {fmtCountdown(start - now)}</p>
        </div>
      )}
      {counting && end !== null && (
        <div style={chip}>
          <p style={lbl}>Termina em</p>
          <p style={val(end - now < 120_000 ? '#F87171' : (onDark ? '#4ADE80' : '#0D8F41'))}>{fmtCountdown(end - now)}</p>
        </div>
      )}
    </div>
  )
}

/* ── animação de ultrapassagem: marca quem subiu/desceu desde o último refresh ── */
function useOvertakes(items: RankItem[]) {
  const prevRef = useRef<Record<string, number>>({})
  const [moved, setMoved] = useState<Record<string, 'up' | 'down'>>({})
  const key = items.map(p => p.id).join('|')
  useEffect(() => {
    const prev = prevRef.current
    const flags: Record<string, 'up' | 'down'> = {}
    items.forEach((p, i) => {
      const old = prev[p.id]
      if (old !== undefined && old !== i) flags[p.id] = i < old ? 'up' : 'down'
    })
    prevRef.current = Object.fromEntries(items.map((p, i) => [p.id, i]))
    if (Object.keys(flags).length) {
      setMoved(flags)
      const t = setTimeout(() => setMoved({}), 1800)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return moved
}

const OVERTAKE_CSS = `
@keyframes rank-up {
  0%   { transform: translateY(12px); background: #DCFCE7; box-shadow: 0 0 0 2px rgba(13,143,65,0.35); }
  60%  { transform: none; background: #DCFCE7; }
  100% { transform: none; }
}
@keyframes rank-down {
  0%   { transform: translateY(-12px); background: #FEF2F2; }
  100% { transform: none; }
}
.rank-row-up   { animation: rank-up 1.6s ease; }
.rank-row-down { animation: rank-down 1.6s ease; }
`

/* ── Canto Fibra: carrossel horizontal (loop contínuo, puro CSS) com o início–fim de cada intervalo ── */
// slider de marcações: só minuto:segundo (sem hora/milésimos)
function fmtClock(iso: string) {
  const d = new Date(iso)
  return `${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function IntervalTicker({ intervals }: { intervals: { started_at: string; ended_at: string }[] }) {
  if (intervals.length === 0) return null
  const chips = intervals.map((iv, i) => (
    <span key={i} style={{
      flexShrink: 0, background: '#F3F4F6', borderRadius: 20, padding: '2px 8px',
      fontSize: '0.62rem', fontWeight: 700, color: '#6B7280', whiteSpace: 'nowrap',
    }}>
      {fmtClock(iv.started_at)}–{fmtClock(iv.ended_at)}
    </span>
  ))
  return (
    <div style={{ overflow: 'hidden', width: '100%', marginTop: 4 }}>
      <style>{`
        @keyframes fibra-ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .fibra-ticker-track { animation: fibra-ticker 18s linear infinite; }
      `}</style>
      <div className="fibra-ticker-track" style={{ display: 'flex', gap: 6, width: 'max-content' }}>
        {chips}{chips}
      </div>
    </div>
  )
}

/* tamanhos vêm de CSS vars (--rk-*) — o telão desktop define valores maiores */
function Row({ p, i, moved, timeMode = false }: { p: RankItem; i: number; moved?: 'up' | 'down'; timeMode?: boolean }) {
  return (
    <div
      className={moved === 'up' ? 'rank-row-up' : moved === 'down' ? 'rank-row-down' : undefined}
      style={{
        display: 'flex', flexDirection: 'column', gap: 4,
        background: i < 3 ? RANK_BG[i] : '#FAFAFA',
        borderRadius: 10, padding: 'var(--rk-pad, 10px 14px)',
        border: `1px solid ${i < 3 ? 'rgba(0,0,0,0.06)' : '#F3F4F6'}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--rk-gap, 12px)' }}>
        <span style={{ minWidth: 'var(--rk-pos-w, 26px)', fontWeight: 800, fontSize: 'var(--rk-pos-fs, 0.72rem)', letterSpacing: '0.06em', color: i < 3 ? RANK_COLORS[i] : '#D1D5DB', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          {String(i + 1).padStart(2, '0')}
          {moved === 'up' && <span style={{ color: '#0D8F41', fontSize: '0.72rem' }}>▲</span>}
          {moved === 'down' && <span style={{ color: '#DC2626', fontSize: '0.72rem' }}>▼</span>}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 'var(--rk-name-fs, 0.87rem)', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.bird_name}{p.cage_number != null ? ` · Gaiola ${p.cage_number}` : ''}
          </p>
          <p style={{ margin: 0, fontSize: 'var(--rk-sub-fs, 0.75rem)', fontWeight: 600, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.user_name}
          </p>
        </div>
        <WarnBadge n={p.warns} />
        <span style={{ fontWeight: 800, fontSize: 'var(--rk-score-fs, 1rem)', letterSpacing: '-0.04em', color: i === 0 ? '#B45309' : '#374151', flexShrink: 0 }}>
          {timeMode ? formatDurationMinSec(p.score) : p.score.toLocaleString('pt-BR')}
        </span>
      </div>
      {timeMode && p.intervals && p.intervals.length > 0 && <IntervalTicker intervals={p.intervals} />}
    </div>
  )
}

/* ── lista de ranking com animação de ultrapassagem ── */
export function AnimatedRanking({ items, emptyText = 'Nenhum participante.', timeMode = false }: {
  items: RankItem[]; emptyText?: string; timeMode?: boolean
}) {
  const moved = useOvertakes(items)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <style>{OVERTAKE_CSS}</style>
      {items.length === 0 && <p style={{ margin: 0, color: '#9CA3AF', fontSize: '0.8rem' }}>{emptyText}</p>}
      {items.map((p, i) => <Row key={p.id} p={p} i={i} moved={moved[p.id]} timeMode={timeMode} />)}
    </div>
  )
}

/* ── Painel da marcação: "Próxima" antes de começar → "Marcação atual" na contagem →
      "Próxima marcação" de novo quando acabar (se houver outra) ── */
export function MarcacaoPanel({ startAt, durationSecs, activeGroup, divisions, current, next, timeMode = false }: {
  startAt: string | null
  durationSecs: number
  activeGroup: number
  divisions: number
  current: RankItem[]
  next: RankItem[]
  timeMode?: boolean
}) {
  const now = useNow(1000)
  if (now === null) return null

  const start = startAt ? new Date(startAt).getTime() : null
  const end = start !== null ? start + durationSecs * 1000 : null
  const counting = start !== null && end !== null && now >= start && now <= end
  const upcoming = start !== null && now < start

  let titulo: string
  let cor: string
  let sub: string | null = null
  let lista: RankItem[]
  let live = false

  if (counting) {
    titulo = 'Marcação atual'
    cor = '#C2410C'
    lista = current
    live = true
  } else if (upcoming && start !== null) {
    titulo = 'Próxima marcação'
    cor = '#B45309'
    sub = `começa às ${fmtHM(start)}`
    lista = current
  } else if (activeGroup < divisions) {
    // marcação encerrou e ainda há outra no ciclo (horário a definir)
    titulo = 'Próxima marcação'
    cor = '#B45309'
    sub = 'horário a definir'
    lista = next
  } else {
    titulo = 'Marcações do ciclo encerradas'
    cor = '#6B7280'
    sub = 'aguardando o Chefe de Roda'
    lista = []
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <p style={{ margin: '0 0 4px', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: cor, display: 'flex', alignItems: 'center', gap: 6 }}>
        {live && <span className="live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />}
        {titulo}
        {sub && <span style={{ fontWeight: 600, textTransform: 'none', letterSpacing: 0, color: '#9CA3AF' }}>· {sub}</span>}
      </p>
      <AnimatedRanking items={lista} emptyText="Aguardando definição das gaiolas." timeMode={timeMode} />
    </div>
  )
}
