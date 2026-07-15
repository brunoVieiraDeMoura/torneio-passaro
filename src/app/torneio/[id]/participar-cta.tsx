'use client'

import Link from 'next/link'
import { useTorneioAtivo } from '@/lib/use-torneio-ativo'

const base: React.CSSProperties = {
  display: 'block', textAlign: 'center', fontWeight: 700,
  fontSize: '0.88rem', textDecoration: 'none',
  padding: '12px', borderRadius: 10, marginBottom: 20,
}

// CTA do espectador: "Participar" vira "Voltar ao torneio" se o usuário já está
// neste torneio; desativa se ele participa de OUTRO (1 torneio por vez).
export default function ParticiparCta({ tournamentId, qrToken }: { tournamentId: string; qrToken: string }) {
  const ativo = useTorneioAtivo()

  if (ativo?.tid === tournamentId) {
    return (
      <Link href={`/torneio/${tournamentId}/participante?pid=${ativo.pid}`}
        style={{ ...base, background: '#0D8F41', color: '#fff' }}>
        ● Voltar ao torneio
      </Link>
    )
  }

  if (ativo) {
    return (
      <div style={{ ...base, background: '#F9FAFB', color: '#9CA3AF', border: '1px solid #F3F4F6', cursor: 'not-allowed' }}>
        Você já está participando de outro torneio
      </div>
    )
  }

  return (
    <Link href={`/entrar/${qrToken}`} style={{ ...base, background: '#0D8F41', color: '#fff' }}>
      Participar deste torneio →
    </Link>
  )
}
