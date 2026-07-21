'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { LigaEntry } from '@/data/liga-mock'
import ReportButton from './report-button'
import { formatDuration } from '@/lib/duration'

const BREED_STYLE: Record<string, { color: string; bg: string }> = {
  'Coleiro':          { color: '#1F2937', bg: '#F8FAFC' },
  'Canário belga':    { color: '#D97706', bg: '#FEFCE8' },
  'Canário da terra': { color: '#EAB308', bg: '#FFFBEB' },
  'Curió':            { color: '#92400E', bg: '#FEF3C7' },
  'Bicudo':           { color: '#374151', bg: '#F1F5F9' },
  'Patativa':         { color: '#6B7280', bg: '#F9FAFB' },
  'Galo campina':     { color: '#DC2626', bg: '#FEF2F2' },
  'Sabiá laranjeira': { color: '#EA580C', bg: '#FFF7ED' },
  'Pintassilgo':      { color: '#CA8A04', bg: '#FEFCE8' },
  'Trinca Ferro':     { color: '#64748B', bg: '#F8FAFC' },
  'Azulão':           { color: '#2563EB', bg: '#EFF6FF' },
  'Bigodinho':        { color: '#475569', bg: '#F9FAFB' },
  'Pássaro Preto':    { color: '#111827', bg: '#F1F5F9' },
  'Sanhaço':          { color: '#4338CA', bg: '#EEF2FF' },
  'Tiziu':            { color: '#0F766E', bg: '#F0FDFA' },
}
const DEFAULT_BS = { color: '#6B7280', bg: '#F3F4F6' }

const BIRD_PHOTO: Record<string, string> = {
  'Coleiro':          '/passarinhos-img/coleiro.jpg',
  'Canário belga':    '/passarinhos-img/canario-belga.jpg',
  'Canário da terra': '/passarinhos-img/canario-da-terra.jpg',
  'Curió':            '/passarinhos-img/curio.jpg',
  'Bicudo':           '/passarinhos-img/bicudo.jpg',
  'Patativa':         '/passarinhos-img/patativa.jpg',
  'Galo campina':     '/passarinhos-img/galo-campina.jpg',
  'Sabiá laranjeira': '/passarinhos-img/sabia-laranjeira.jpg',
  'Pintassilgo':      '/passarinhos-img/pintassilgo.jpg',
  'Trinca Ferro':     '/passarinhos-img/trinca-ferro.jpg',
  'Azulão':           '/passarinhos-img/azulao.jpg',
  'Bigodinho':        '/passarinhos-img/bigodinho.jpg',
  'Sanhaço':          '/passarinhos-img/sanhaco.jpg',
  'Tiziu':            '/passarinhos-img/tiziu.jpg',
}

const PODIUM_COLOR = ['#B45309', '#6B7280', '#92400E']

function BirdSvg({ color, size = 32 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 7h.01"/>
      <path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20"/>
      <path d="m20 7 2 .5-2 .5"/>
      <path d="M10 18v3"/>
      <path d="M14 17.75v3.25"/>
      <path d="M7 18a6 6 0 0 0 3.84-10.61"/>
    </svg>
  )
}

interface Props {
  entry: LigaEntry
  position: number
  total: number
  photoUrl?: string | null
}

export default function LigaBirdProfile({ entry, position, total, photoUrl = null }: Props) {
  const bs = BREED_STYLE[entry.tipo_ave] ?? DEFAULT_BS
  const isFibra = entry.estilo_canto === 'Canto Fibra'
  // foto própria do pássaro primeiro; sem ela, a foto padrão da raça
  const photo = photoUrl ?? BIRD_PHOTO[entry.tipo_ave]
  const [imgError, setImgError] = useState(false)

  useEffect(() => { window.scrollTo(0, 0) }, [])

  const rankColor = position <= 3 ? PODIUM_COLOR[position - 1] : '#374151'
  const medalEmoji = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : null
  const rankLabel = position === 1 ? 'Líder nacional' : position === 2 ? '2º lugar nacional' : position === 3 ? '3º lugar nacional' : null

  return (
    <div style={{ background: '#FAFAFA', minHeight: '100vh' }}>

      {/* header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #F3F4F6', padding: '14px 0' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p style={{ margin: '0 0 3px', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#0D8F41' }}>
              Perfil · Liga 2025
            </p>
            <Link href="/liga" style={{ fontSize: '0.78rem', color: '#6B7280', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Voltar para a Liga
            </Link>
          </div>
          {/* imagem ofensiva / suspeita de fraude / coligação com clubes */}
          <ReportButton targetId={entry.id} targetLabel={`${entry.bird_name} (${entry.user_name})`} />
        </div>
      </div>

      <style>{`
        .lbp-hero { display: flex; align-items: center; gap: 20px; }
        .lbp-hero-pills { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .lbp-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
        @media (min-width: 640px) {
          .lbp-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 479px) {
          .lbp-hero { flex-direction: column; text-align: center; }
          .lbp-hero-pills { justify-content: center; }
        }
      `}</style>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 16px 60px' }}>

        {/* bird header card */}
        <div className="lbp-hero" style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: '24px', marginBottom: 12 }}>
          <div style={{
            width: 88, height: 88, borderRadius: 22, flexShrink: 0,
            overflow: 'hidden',
            background: (photo && !imgError) ? 'transparent' : '#F0FDF4',
            border: (photo && !imgError) ? '2px solid #D1FAE5' : '1.5px solid #D1FAE5',
            boxSizing: 'border-box',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {(photo && !imgError)
              ? <img src={photo} alt={entry.tipo_ave} onError={() => setImgError(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              : <BirdSvg color={bs.color} size={44} />
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: '0 0 6px', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#0D8F41' }}>
              Perfil do Pássaro
            </p>
            <h1 style={{ margin: '0 0 8px', fontWeight: 800, fontSize: 'clamp(1.35rem, 5vw, 1.6rem)', color: '#111827', letterSpacing: '-0.025em', lineHeight: 1.1, overflowWrap: 'break-word' }}>
              {entry.bird_name}
            </h1>
            <div className="lbp-hero-pills">
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: bs.color, background: bs.bg, borderRadius: 20, padding: '3px 10px' }}>
                {entry.tipo_ave}
              </span>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#374151', background: '#F3F4F6', borderRadius: 20, padding: '3px 10px' }}>
                {entry.estilo_canto}
              </span>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '0.72rem', color: '#9CA3AF' }}>
              {entry.user_name} · {entry.cidade}, {entry.estado}
            </p>
          </div>
        </div>

        {/* destaque: cantos + ranking */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 12 }}>
          <div style={{ background: '#F0FDF4', border: '1px solid #D1FAE5', borderRadius: 14, padding: '18px 14px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 'clamp(1.5rem, 6vw, 1.9rem)', fontWeight: 800, color: '#0D8F41', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              {isFibra ? formatDuration(entry.count) : entry.count.toLocaleString('pt-BR')}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '0.65rem', fontWeight: 700, color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {isFibra ? 'Tempo cantado na temporada' : 'Cantos na temporada'}
            </p>
          </div>
          <div style={{ background: position <= 3 ? '#FFFBEB' : '#fff', border: `1px solid ${position <= 3 ? '#FDE68A' : '#E5E7EB'}`, borderRadius: 14, padding: '18px 14px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 'clamp(1.5rem, 6vw, 1.9rem)', fontWeight: 800, color: rankColor, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              {medalEmoji ? `${medalEmoji} ` : ''}{position}º
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '0.65rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              de {total} na categoria
            </p>
          </div>
        </div>

        {/* stats grid — 1 coluna no mobile, 2 no desktop */}
        <div className="lbp-grid">

          {/* temporada */}
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '20px' }}>
            <p style={{ margin: '0 0 14px', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0D8F41' }}>
              Temporada 2025
            </p>
            {[
              { label: isFibra ? 'Tempo cantado na temporada' : 'Cantos na temporada', value: isFibra ? formatDuration(entry.count) : entry.count.toLocaleString('pt-BR') },
              { label: 'Ranking nacional',    value: `${position}º de ${total}` },
              { label: 'Tipo de ave',         value: entry.tipo_ave },
              { label: 'Estilo de canto',     value: entry.estilo_canto },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #F9FAFB' }}>
                <span style={{ fontSize: '0.8rem', color: '#6B7280', flexShrink: 0 }}>{s.label}</span>
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', textAlign: 'right', overflowWrap: 'break-word', minWidth: 0 }}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* proprietário */}
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '20px' }}>
            <p style={{ margin: '0 0 14px', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0D8F41' }}>
              Proprietário
            </p>
            {[
              { label: 'Nome',   value: entry.user_name },
              { label: 'Cidade', value: entry.cidade },
              { label: 'Estado', value: entry.estado },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #F9FAFB' }}>
                <span style={{ fontSize: '0.8rem', color: '#6B7280', flexShrink: 0 }}>{s.label}</span>
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', textAlign: 'right', overflowWrap: 'break-word', minWidth: 0 }}>{s.value}</span>
              </div>
            ))}

            {medalEmoji && (
              <div style={{ marginTop: 16, padding: '14px', background: position === 1 ? '#FFFBEB' : '#F9FAFB', border: `1px solid ${position === 1 ? '#FDE68A' : '#F3F4F6'}`, borderRadius: 10, textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '1.75rem', lineHeight: 1 }}>{medalEmoji}</p>
                <p style={{ margin: '6px 0 0', fontSize: '0.72rem', fontWeight: 700, color: rankColor }}>{rankLabel}</p>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '0.68rem', color: '#D1D5DB' }}>
            aveum · Temporada 2025
          </p>
        </div>
      </div>
    </div>
  )
}
