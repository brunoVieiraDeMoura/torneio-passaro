import { createPublicClient } from '@/lib/supabase/public'
import { ALL_LIGA, type LigaEntry } from '@/data/liga-data'

// Ranking real da liga: soma os cantos de round_scores (histórico de todas as
// marcações) por pássaro (user_id + nome). Categoria (tipo/estilo) e localização
// vêm do torneio em que o pássaro competiu — tabelas com leitura pública (RLS).
export async function getRealLigaEntries(): Promise<LigaEntry[]> {
  const supabase = createPublicClient()

  const { data: rs } = await supabase
    .from('round_scores')
    .select('user_id, participant_id, bird_name, count, tournament_id, created_at')
    .not('user_id', 'is', null)

  if (!rs || rs.length === 0) return []

  const tids = [...new Set(rs.map(r => r.tournament_id))]
  const pids = [...new Set(rs.map(r => r.participant_id))]

  const [{ data: tours }, { data: parts }] = await Promise.all([
    supabase.from('tournaments').select('id, tipo_ave, estilo_canto, cidade, estado').in('id', tids),
    supabase.from('participants').select('id, user_name').in('id', pids),
  ])

  const tourMap = new Map((tours ?? []).map(t => [t.id, t]))
  const nameMap = new Map((parts ?? []).map(p => [p.id, p.user_name]))

  const byBird = new Map<string, LigaEntry & { _lastAt: string }>()
  for (const r of rs) {
    const key = `${r.user_id}::${r.bird_name.trim().toLowerCase()}`
    const tour = tourMap.get(r.tournament_id)
    const prev = byBird.get(key)
    if (prev) {
      prev.count += r.count ?? 0
      // torneio mais recente define categoria/local do pássaro
      if (r.created_at > prev._lastAt && tour) {
        prev._lastAt = r.created_at
        prev.tipo_ave = tour.tipo_ave ?? prev.tipo_ave
        prev.estilo_canto = tour.estilo_canto ?? prev.estilo_canto
        prev.cidade = tour.cidade ?? prev.cidade
        prev.estado = tour.estado ?? prev.estado
      }
    } else {
      const slug = r.bird_name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
      byBird.set(key, {
        id: `r_${r.user_id}_${slug}`,
        count: r.count ?? 0,
        user_name: nameMap.get(r.participant_id) ?? 'Participante',
        bird_name: r.bird_name,
        tipo_ave: tour?.tipo_ave ?? 'Outro',
        estilo_canto: tour?.estilo_canto ?? 'Outro',
        estado: tour?.estado ?? '',
        cidade: tour?.cidade ?? '',
        _lastAt: r.created_at,
      })
    }
  }

  return [...byBird.values()].map(entry => {
    const { _lastAt: _ignored, ...e } = entry
    void _ignored
    return e
  })
}

// Liga completa: pássaros reais + entradas de demonstração (mock)
export async function getMergedLiga(): Promise<LigaEntry[]> {
  const real = await getRealLigaEntries()
  return [...real, ...ALL_LIGA]
}
