'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type TorneioAtivo = { tid: string; pid: string } | null

// cache por load (TTL curto): vários cards na mesma página fazem 1 query só
let cache: { at: number; promise: Promise<TorneioAtivo> } | null = null
const TTL = 15_000

// Inscrição ativa (pendente/aprovada) do usuário logado em torneio aberto/ao vivo.
// Regra: só 1 torneio por vez — usado pra trocar "Participar" por "Voltar ao torneio".
export function fetchTorneioAtivo(): Promise<TorneioAtivo> {
  if (cache && Date.now() - cache.at < TTL) return cache.promise
  const promise = (async (): Promise<TorneioAtivo> => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      const { data } = await supabase
        .from('participants')
        .select('id, tournament_id, tournaments!inner(status)')
        .eq('user_id', user.id)
        .in('status', ['pending', 'approved'])
      const active = (data ?? []).find(p => {
        const rel = p.tournaments as unknown
        const t = (Array.isArray(rel) ? rel[0] : rel) as { status: string } | undefined
        return t?.status === 'open' || t?.status === 'running'
      })
      return active ? { tid: active.tournament_id, pid: active.id } : null
    } catch {
      return null
    }
  })()
  cache = { at: Date.now(), promise }
  return promise
}

export function useTorneioAtivo(): TorneioAtivo {
  const [ativo, setAtivo] = useState<TorneioAtivo>(null)
  useEffect(() => {
    let on = true
    fetchTorneioAtivo().then(a => { if (on) setAtivo(a) })
    return () => { on = false }
  }, [])
  return ativo
}
