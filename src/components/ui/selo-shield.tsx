// Ícone dos selos de verificação: escudo preenchido + check branco.
// Selo verde = verde do site; selo de integridade = amarelo mostarda.
export const SELO_VERDE_COLOR = '#0D8F41'
export const SELO_INTEGRIDADE_COLOR = '#CA8A04'

export function SeloShield({ color, size = 15 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
      style={{ flexShrink: 0, display: 'inline-block', verticalAlign: '-2px' }}>
      <path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        fill={color} stroke={color} strokeWidth="1.5" strokeLinejoin="round"
      />
      <path
        d="M8.6 12l2.4 2.4 4.4-4.8"
        fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}
