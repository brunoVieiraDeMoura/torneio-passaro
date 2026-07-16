'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  clubId: string
  seloVerde: boolean
  seloIntegridade: boolean
  verdeRequest: string
  integridadeRequest: string
}

const chip = (color: string, bg: string, border: string): React.CSSProperties => ({
  fontSize: '0.68rem', fontWeight: 700, color, background: bg,
  border: `1px solid ${border}`, borderRadius: 20, padding: '3px 10px', flexShrink: 0,
})

// Card de verificação do clube: mostra o estado dos 2 selos e permite
// solicitar ao admin (a concessão é feita na Admin Central).
export default function SelosCard({ clubId, seloVerde, seloIntegridade, verdeRequest, integridadeRequest }: Props) {
  const [reqs, setReqs] = useState({ verde: verdeRequest, integridade: integridadeRequest })
  const [busy, setBusy] = useState<string | null>(null)

  async function solicitar(selo: 'verde' | 'integridade') {
    setBusy(selo)
    const supabase = createClient()
    const patch = selo === 'verde'
      ? { selo_verde_request: 'pending', selo_requested_at: new Date().toISOString() }
      : { selo_integridade_request: 'pending', selo_requested_at: new Date().toISOString() }
    const { error } = await supabase.from('clubs').update(patch).eq('id', clubId)
    if (!error) setReqs(prev => ({ ...prev, [selo]: 'pending' }))
    setBusy(null)
  }

  const rows = [
    {
      key: 'verde' as const, icon: '🟢', nome: 'Selo verde',
      desc: 'Para clubes vinculados ao passaros.org.',
      has: seloVerde, request: reqs.verde,
    },
    {
      key: 'integridade' as const, icon: '🛡', nome: 'Selo de integridade',
      desc: 'Clube legalizado, com quantidade mínima de participantes e dentro das diretrizes.',
      has: seloIntegridade, request: reqs.integridade,
    },
  ]

  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '20px', marginBottom: 28 }}>
      <p style={{ margin: '0 0 4px', fontSize: '0.68rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Verificação do clube
      </p>
      <p style={{ margin: '0 0 12px', fontSize: '0.75rem', color: '#6B7280', lineHeight: 1.5 }}>
        Só torneios de clubes verificados têm os cantos contabilizados na Liga.
        Solicite a verificação e o admin fará a análise.
      </p>

      {rows.map(r => (
        <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '10px 0', borderTop: '1px solid #F3F4F6' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#111827' }}>{r.icon} {r.nome}</p>
            <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#9CA3AF' }}>{r.desc}</p>
          </div>

          {r.has ? (
            <span style={chip('#0D8F41', '#F0FDF4', '#D1FAE5')}>✓ Verificado</span>
          ) : r.request === 'pending' ? (
            <span style={chip('#B45309', '#FFFBEB', '#FDE68A')}>● Em análise</span>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {r.request === 'rejected' && <span style={chip('#DC2626', '#FEF2F2', '#FECACA')}>Recusado</span>}
              <button
                disabled={busy === r.key}
                onClick={() => solicitar(r.key)}
                style={{
                  background: '#0D8F41', color: '#fff', border: 'none', borderRadius: 8,
                  padding: '8px 14px', fontSize: '0.75rem', fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit', opacity: busy === r.key ? 0.7 : 1,
                }}>
                {r.request === 'rejected' ? 'Solicitar novamente' : 'Solicitar verificação'}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
