'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { LigaEntry } from '@/data/liga-mock'

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
}

export default function LigaBirdProfile({ entry, position, total }: Props) {
  const bs = BREED_STYLE[entry.tipo_ave] ?? DEFAULT_BS
  const photo = BIRD_PHOTO[entry.tipo_ave]
  const [imgError, setImgError] = useState(false)

  useEffect(() => { window.scrollTo(0, 0) }, [])

  const rankColor = position <= 3 ? PODIUM_COLOR[position - 1] : '#374151'
  const medalEmoji = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : null
  const rankLabel = position === 1 ? 'Líder nacional' : position === 2 ? '2º lugar nacional' : position === 3 ? '3º lugar nacional' : null

  return (
    <div style={{ background: '#FAFAFA', minHeight: '100vh' }}>

      {/* header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #F3F4F6', padding: '14px 0' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 16px' }}>
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
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 16px 60px' }}>

        {/* bird header card */}
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: '24px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 18, flexShrink: 0,
            overflow: 'hidden',
            background: (photo && !imgError) ? 'transparent' : '#fff',
            border: (photo && !imgError) ? 'none' : '1.5px solid #E5E7EB',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {(photo && !imgError)
              ? <img src={photo} alt={entry.tipo_ave} onError={() => setImgError(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              : <BirdSvg color={bs.color} size={38} />
            }
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 6px', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#0D8F41' }}>
              Perfil do Pássaro
            </p>
            <h1 style={{ margin: '0 0 8px', fontWeight: 800, fontSize: '1.5rem', color: '#111827', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
              {entry.bird_name}
            </h1>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: bs.color, background: bs.bg, borderRadius: 20, padding: '3px 10px' }}>
                {entry.tipo_ave}
              </span>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#374151', background: '#F3F4F6', borderRadius: 20, padding: '3px 10px' }}>
                {entry.estilo_canto}
              </span>
              <span style={{ fontSize: '0.7rem', color: '#9CA3AF', padding: '3px 0' }}>
                {entry.user_name} · {entry.cidade}, {entry.estado}
              </span>
            </div>
          </div>
        </div>

        {/* stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>

          {/* temporada */}
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '20px' }}>
            <p style={{ margin: '0 0 14px', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9CA3AF' }}>
              Temporada 2025
            </p>
            {[
              { label: 'Cantos na temporada', value: entry.count.toLocaleString('pt-BR') },
              { label: 'Ranking nacional',    value: `${position}º de ${total}` },
              { label: 'Tipo de ave',         value: entry.tipo_ave },
              { label: 'Estilo de canto',     value: entry.estilo_canto },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F9FAFB' }}>
                <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>{s.label}</span>
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* proprietário */}
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '20px' }}>
            <p style={{ margin: '0 0 14px', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9CA3AF' }}>
              Proprietário
            </p>
            {[
              { label: 'Nome',   value: entry.user_name },
              { label: 'Cidade', value: entry.cidade },
              { label: 'Estado', value: entry.estado },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F9FAFB' }}>
                <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>{s.label}</span>
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>{s.value}</span>
              </div>
            ))}

            {medalEmoji && (
              <div style={{ marginTop: 16, padding: '14px', background: position === 1 ? '#FFFBEB' : '#F9FAFB', borderRadius: 10, textAlign: 'center' }}>
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
