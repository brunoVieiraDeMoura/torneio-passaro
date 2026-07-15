'use client'

import { useEffect, useRef, useState } from 'react'

export type RankItem = {
  id: string; bird_name: string; user_name: string; cage_number: number | null
  score: number; warns: number; round_group?: number | null
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

/* ── avisos de fraude: ⚠ + número ao lado dos cantos ── */
export function WarnBadge({ n, big = false }: { n: number; big?: boolean }) {
  if (n <= 0) return null
  return (
    <span title={`${n} aviso${n !== 1 ? 's' : ''} de marcação`} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
      background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 20,
      padding: big ? '4px 10px' : '3px 8px',
    }}>
      <svg width={big ? 14 : 12} height={big ? 14 : 12} viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-label="Avisos de marcação">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <span style={{ fontWeight: 800, fontSize: big ? '0.85rem' : '0.72rem', color: '#B91C1C' }}>{n}</span>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '14px 0' }}>
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

function Row({ p, i, moved, big }: { p: RankItem; i: number; moved?: 'up' | 'down'; big: boolean }) {
  return (
    <div
      className={moved === 'up' ? 'rank-row-up' : moved === 'down' ? 'rank-row-down' : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: big ? 14 : 12,
        background: i < 3 ? RANK_BG[i] : '#FAFAFA',
        borderRadius: 10, padding: big ? '11px 16px' : '10px 14px',
        border: `1px solid ${i < 3 ? 'rgba(0,0,0,0.06)' : '#F3F4F6'}`,
      }}
    >
      <span style={{ minWidth: big ? 30 : 26, fontWeight: 800, fontSize: big ? '0.8rem' : '0.72rem', letterSpacing: '0.06em', color: i < 3 ? RANK_COLORS[i] : '#D1D5DB', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
        {String(i + 1).padStart(2, '0')}
        {moved === 'up' && <span style={{ color: '#0D8F41', fontSize: '0.72rem' }}>▲</span>}
        {moved === 'down' && <span style={{ color: '#DC2626', fontSize: '0.72rem' }}>▼</span>}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: big ? '0.95rem' : '0.87rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.bird_name}{p.cage_number != null ? ` · Gaiola ${p.cage_number}` : ''}
        </p>
        <p style={{ margin: 0, fontSize: big ? '0.78rem' : '0.75rem', fontWeight: 600, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.user_name}
        </p>
      </div>
      <WarnBadge n={p.warns} big={big} />
      <span style={{ fontWeight: 800, fontSize: big ? '1.3rem' : '1rem', letterSpacing: '-0.04em', color: i === 0 ? '#B45309' : '#374151', flexShrink: 0 }}>
        {p.score.toLocaleString('pt-BR')}
      </span>
    </div>
  )
}

/* ── lista de ranking com animação de ultrapassagem ── */
export function AnimatedRanking({ items, big = false, emptyText = 'Nenhum participante.' }: {
  items: RankItem[]; big?: boolean; emptyText?: string
}) {
  const moved = useOvertakes(items)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <style>{OVERTAKE_CSS}</style>
      {items.length === 0 && <p style={{ margin: 0, color: '#9CA3AF', fontSize: '0.8rem' }}>{emptyText}</p>}
      {items.map((p, i) => <Row key={p.id} p={p} i={i} moved={moved[p.id]} big={big} />)}
    </div>
  )
}

/* ── Painel da marcação: "Próxima" antes de começar → "Marcação atual" na contagem →
      "Próxima marcação" de novo quando acabar (se houver outra) ── */
export function MarcacaoPanel({ startAt, durationSecs, activeGroup, divisions, current, next, big = false }: {
  startAt: string | null
  durationSecs: number
  activeGroup: number
  divisions: number
  current: RankItem[]
  next: RankItem[]
  big?: boolean
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
      <AnimatedRanking items={lista} big={big} emptyText="Aguardando definição das gaiolas." />
    </div>
  )
}
