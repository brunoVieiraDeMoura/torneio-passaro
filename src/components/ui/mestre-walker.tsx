'use client'

import { useEffect, useState } from 'react'

// Animação da tela de espera do participante: o mestre de roda passeia em frente
// às gaiolas — anda da esquerda até a direita, para (vira de costas olhando os
// pássaros), volta espelhado, para de novo e recomeça.

const WALK_MS = 6000   // duração de uma travessia
const PAUSE_MS = 2000  // parada em cada ponta
const FRAME_MS = 220   // troca de frame da caminhada

const CHAR_W = 46
const CHAR_H = 64

type Phase = 'pauseLeft' | 'right' | 'pauseRight' | 'left'
const NEXT: Record<Phase, Phase> = {
  pauseLeft: 'right', right: 'pauseRight', pauseRight: 'left', left: 'pauseLeft',
}

export default function MestreWalker() {
  const [phase, setPhase] = useState<Phase>('pauseLeft')
  const [step, setStep] = useState(0)

  // máquina de fases: pausa → anda → pausa → volta → ...
  useEffect(() => {
    const dur = phase === 'right' || phase === 'left' ? WALK_MS : PAUSE_MS
    const id = setTimeout(() => setPhase(p => NEXT[p]), dur)
    return () => clearTimeout(id)
  }, [phase])

  // alterna os frames da caminhada
  useEffect(() => {
    const id = setInterval(() => setStep(s => (s + 1) % 2), FRAME_MS)
    return () => clearInterval(id)
  }, [])

  const walking = phase === 'right' || phase === 'left'
  const src = walking
    ? (step === 0 ? '/animation/walk-1-right.png' : '/animation/walk-2-right.png')
    : phase === 'pauseRight'
      ? '/animation/idle-back-right.png'   // chegou na ponta: vira e olha as gaiolas
      : '/animation/idle-front-right.png'  // na esquerda: de frente, pronto pra andar
  // indo/estando à direita o personagem fica na ponta direita; senão na esquerda
  const atRight = phase === 'right' || phase === 'pauseRight'
  const flip = phase === 'left' // sprites olham pra direita → espelha na volta

  return (
    <div aria-hidden="true" style={{ width: '100%', maxWidth: 420, position: 'relative', userSelect: 'none', pointerEvents: 'none' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/animation/background-animation.png" alt="" draggable={false}
        style={{ width: '100%', height: 'auto', display: 'block' }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" draggable={false} style={{
        position: 'absolute', bottom: '2%',
        left: atRight ? `calc(100% - ${CHAR_W}px)` : '0px',
        width: CHAR_W, height: CHAR_H,
        transform: flip ? 'scaleX(-1)' : 'none',
        transition: `left ${WALK_MS}ms linear`,
        imageRendering: 'auto', display: 'block',
      }} />
    </div>
  )
}
