'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function FinalizarTorneioButton({ torneioId }: { torneioId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleFinalize() {
    if (!confirm('Finalizar esse torneio? Essa ação encerra a contagem.')) return
    setLoading(true)
    const supabase = createClient()
    await supabase.from('tournaments').update({ status: 'finished' }).eq('id', torneioId)
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={handleFinalize}
      disabled={loading}
      style={{ fontSize: '0.78rem', fontWeight: 700, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '7px 14px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
    >
      {loading ? '...' : '■ Finalizar'}
    </button>
  )
}
