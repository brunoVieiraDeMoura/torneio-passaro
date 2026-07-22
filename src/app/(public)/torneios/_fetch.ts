import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/public'
import type { Item } from './_utils'

type Club = { name: string; cidade: string; estado: string } | null

async function _fetchTorneios(q?: string, estado?: string): Promise<{ all: Item[] }> {
  const supabase = createPublicClient()
  let query = supabase
    .from('tournaments')
    .select('*, clubs(name, cidade, estado), participants(round_group, marks_participant_id)')
    .in('status', ['open', 'running', 'finished'])
    .order('start_at', { ascending: true, nullsFirst: true })
  if (estado) query = query.eq('estado', estado)
  if (q) query = query.ilike('name', `%${q}%`)
  const { data: torneios, error } = await query
  if (error) console.error('[torneios]', error)
  const all: Item[] = (torneios ?? []).map(t => {
    const c = t.clubs as unknown as Club
    const parts = (t.participants as unknown as { round_group: number | null; marks_participant_id: string | null }[] | null) ?? []
    // inscrições fechadas = já teve sorteio (marks) OU grupos definidos (round_group)
    const started = parts.some(p => p.round_group != null || p.marks_participant_id != null)
    return {
      id: t.id, name: t.name, qr_token: t.qr_token ?? null,
      status: t.status,
      n: parts.length,
      start_at: t.start_at ?? null,
      clube: c?.name ?? null, cidade: c?.cidade ?? null, estado: c?.estado ?? null,
      tipo_ave: (t as Record<string, unknown>).tipo_ave as string | null ?? null,
      estilo_canto: (t as Record<string, unknown>).estilo_canto as string | null ?? null,
      duration_secs: (t as Record<string, unknown>).duration_secs as number | null ?? null,
      started,
    }
  })
  return { all }
}

export const fetchTorneios = unstable_cache(
  _fetchTorneios,
  ['torneios-list'],
  { revalidate: 60, tags: ['torneios'] },
)
