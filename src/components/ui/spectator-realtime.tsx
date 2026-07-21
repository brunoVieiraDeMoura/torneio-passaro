'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Mantém a tela do espectador atualizada: escuta em tempo real mudanças de
 * scores e participants do torneio e recarrega os dados do servidor (router.refresh).
 * Fallback por polling a cada `pollMs` caso o realtime falhe no projeto.
 */
export default function SpectatorRealtime({ tournamentId, pollMs = 5000 }: { tournamentId: string; pollMs?: number }) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    let raf = 0
    const refresh = () => {
      // agrupa rajadas de eventos em um único refresh
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => router.refresh())
    }

    const channel = supabase
      .channel(`spectator:${tournamentId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores', filter: `tournament_id=eq.${tournamentId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `tournament_id=eq.${tournamentId}` }, refresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tournaments', filter: `id=eq.${tournamentId}` }, refresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fibra_intervals', filter: `tournament_id=eq.${tournamentId}` }, refresh)
      .subscribe()

    const poll = setInterval(() => router.refresh(), pollMs)

    return () => { cancelAnimationFrame(raf); clearInterval(poll); supabase.removeChannel(channel) }
  }, [tournamentId, pollMs, router])

  return null
}
