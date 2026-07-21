import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/public'

// Contagens públicas reais (participantes / torneios / clubes). Cacheado 60s,
// invalidado pelas tags 'stats' e 'torneios'. Usado na home e nas telas de auth.
export const getPublicStats = unstable_cache(
  async () => {
    const supabase = createPublicClient()
    const [{ count: totalParticipantes }, { count: totalTorneios }, { count: totalClubes }] = await Promise.all([
      supabase.from('participants').select('*', { count: 'exact', head: true }),
      supabase.from('tournaments').select('*', { count: 'exact', head: true }),
      supabase.from('clubs').select('*', { count: 'exact', head: true }),
    ])
    return {
      totalParticipantes: totalParticipantes ?? 0,
      totalTorneios: totalTorneios ?? 0,
      totalClubes: totalClubes ?? 0,
    }
  },
  ['public-stats'],
  { revalidate: 60, tags: ['stats', 'torneios'] },
)
