'use client'

import { useEffect, useState } from 'react'

// Animação por sequência de frames (PNG). Pré-carrega tudo pra não piscar
// na primeira volta e troca o frame num intervalo fixo.
function useFrameLoop(frames: string[], intervalMs: number) {
  const [i, setI] = useState(0)
  useEffect(() => {
    frames.forEach(src => { const img = new Image(); img.src = src })
    const id = setInterval(() => setI(v => (v + 1) % frames.length), intervalMs)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, frames.join('|')])
  return frames[i]
}

// Ampulheta girando — tela de "aguardando aprovação".
// Só a imagem idle, rotacionando +45° por passo (0 → 45 → 90 → ...).
export function AmpulhetaAnim({ height = 96 }: { height?: number }) {
  const [deg, setDeg] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setDeg(d => d + 45), 700)
    return () => clearInterval(id)
  }, [])
  return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/anim/ampulheta-idle.png"
        alt="Aguardando aprovação"
        style={{
          maxHeight: '100%', maxWidth: '100%', objectFit: 'contain',
          transform: `rotate(${deg}deg)`,
          transition: 'transform 0.35s ease-in-out',
        }}
      />
    </div>
  )
}

const FINAL_FRAMES = ['/anim/final-1.png', '/anim/final-2.png', '/anim/final-3.png', '/anim/final-4.png']

// Pódio com os pássaros comemorando — tela de fim do torneio
export function FinalTorneioAnim({ maxWidth = 300 }: { maxWidth?: number }) {
  const src = useFrameLoop(FINAL_FRAMES, 420)
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Fim do torneio"
      style={{ width: '100%', maxWidth, height: 'auto', display: 'block' }}
    />
  )
}
