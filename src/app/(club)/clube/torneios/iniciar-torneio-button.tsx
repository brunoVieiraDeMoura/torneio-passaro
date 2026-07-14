'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// Atalho do card do torneio: abre as inscrições (mesmo efeito do "Abrir inscrições"
// da página do mestre) e já navega para o painel de gerenciamento.
export default function IniciarTorneioButton({ torneioId }: { torneioId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleStart() {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('tournaments').update({ status: 'open', start_at: null }).eq('id', torneioId)
    router.push(`/mestre/torneio/${torneioId}`)
  }

  return (
    <button
      onClick={handleStart}
      disabled={loading}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: '0.78rem', fontWeight: 700, color: '#fff',
        background: loading ? '#D1D5DB' : '#0D8F41', border: 'none', borderRadius: 8,
        padding: '7px 14px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
      {loading ? 'Iniciando...' : 'Iniciar Torneio'}
    </button>
  )
}
