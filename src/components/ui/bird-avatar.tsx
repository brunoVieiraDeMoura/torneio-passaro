'use client'

import { useState } from 'react'

// Foto da raça (mesma base do perfil da Liga) com fallback em SVG verde.
export const BIRD_PHOTO: Record<string, string> = {
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

function BirdSvg({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#0D8F41" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 7h.01"/>
      <path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20"/>
      <path d="m20 7 2 .5-2 .5"/>
      <path d="M10 18v3"/>
      <path d="M14 17.75v3.25"/>
      <path d="M7 18a6 6 0 0 0 3.84-10.61"/>
    </svg>
  )
}

export default function BirdAvatar({ tipoAve, photoUrl = null, size = 40, radius = 10 }: {
  tipoAve: string; photoUrl?: string | null; size?: number; radius?: number
}) {
  const [err, setErr] = useState(false)
  // foto própria do pássaro primeiro; sem ela, a foto padrão da raça
  const photo = photoUrl ?? BIRD_PHOTO[tipoAve]
  return (
    <div style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0,
      overflow: 'hidden', boxSizing: 'border-box',
      background: (photo && !err) ? 'transparent' : '#F0FDF4',
      border: '1.5px solid #D1FAE5',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {(photo && !err)
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={photo} alt={tipoAve} onError={() => setErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : <BirdSvg size={Math.round(size * 0.55)} />
      }
    </div>
  )
}
