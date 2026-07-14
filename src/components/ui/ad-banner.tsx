'use client'

import { useEffect, useState } from 'react'

// Banners de anúncio FICTÍCIOS exibidos no topo da tela de espera do participante.
// Apenas visual: alternam sozinhos, sem link e sem click (pointer-events: none).

interface Ad {
  emoji: string
  title: string
  subtitle: string
  bg: string       // gradiente de fundo
  color: string    // cor do título
  sub: string      // cor do subtítulo
}

const ADS: Ad[] = [
  {
    emoji: '🌾',
    title: 'Ração Canto Forte',
    subtitle: 'Ração premium para pássaros de canto — mais energia no torneio',
    bg: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
    color: '#92400E', sub: '#B45309',
  },
  {
    emoji: '🏠',
    title: 'Gaiolas do Vale',
    subtitle: 'Gaiolas artesanais de madeira nobre, feitas à mão',
    bg: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
    color: '#065F46', sub: '#0D8F41',
  },
  {
    emoji: '🐦',
    title: 'Criatório Bela Vista',
    subtitle: 'Filhotes de coleiro anilhados · linhagem de campeões',
    bg: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
    color: '#1E3A8A', sub: '#1D4ED8',
  },
  {
    emoji: '🌻',
    title: 'Sementes & Cia',
    subtitle: 'Painço, alpiste e níger selecionados — direto do produtor',
    bg: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
    color: '#7C2D12', sub: '#EA580C',
  },
  {
    emoji: '💊',
    title: 'AviVita Suplementos',
    subtitle: 'Vitaminas para muda de penas e canto vigoroso o ano todo',
    bg: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
    color: '#4C1D95', sub: '#7C3AED',
  },
]

const ROTATE_MS = 5000

export default function AdBanner() {
  const [i, setI] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setI(v => (v + 1) % ADS.length), ROTATE_MS)
    return () => clearInterval(id)
  }, [])

  const ad = ADS[i]

  return (
    <div aria-hidden="true" style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 150,
      display: 'flex', justifyContent: 'center', padding: '10px 12px',
      pointerEvents: 'none', userSelect: 'none',
    }}>
      <style>{`@keyframes ad-slide-in { from { opacity: 0; transform: translateY(-10px) } to { opacity: 1; transform: none } }`}</style>
      <div key={i} style={{
        width: '100%', maxWidth: 420, background: ad.bg,
        border: '1px solid rgba(0,0,0,0.06)', borderRadius: 12,
        padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: '0 4px 16px rgba(0,0,0,0.07)', position: 'relative',
        animation: 'ad-slide-in 0.45s ease',
      }}>
        <span style={{ fontSize: '1.6rem', lineHeight: 1, flexShrink: 0 }}>{ad.emoji}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: '0.82rem', color: ad.color, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {ad.title}
          </p>
          <p style={{ margin: '1px 0 0', fontSize: '0.7rem', color: ad.sub, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {ad.subtitle}
          </p>
        </div>
        <span style={{
          position: 'absolute', top: 4, right: 8,
          fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'rgba(0,0,0,0.32)',
        }}>
          Anúncio
        </span>
        {/* pontinhos de progresso da rotação */}
        <div style={{ position: 'absolute', bottom: 4, right: 10, display: 'flex', gap: 3 }}>
          {ADS.map((_, d) => (
            <span key={d} style={{
              width: 4, height: 4, borderRadius: '50%',
              background: d === i ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.12)',
            }} />
          ))}
        </div>
      </div>
    </div>
  )
}
