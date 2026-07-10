'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function DeleteTorneioButton({ torneioId }: { torneioId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm('Deletar esse torneio?')) return
    setLoading(true)
    const supabase = createClient()
    await supabase.from('tournaments').delete().eq('id', torneioId)
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs text-red-500 hover:text-red-700 px-2 py-1.5 disabled:opacity-50"
    >
      {loading ? '...' : 'Deletar'}
    </button>
  )
}
