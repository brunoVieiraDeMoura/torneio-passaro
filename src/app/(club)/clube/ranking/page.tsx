import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PaginatedList from '@/components/ui/paginated-list'

const PODIUM = ['#B45309', '#6B7280', '#92400E']

export default async function ClubeRanking() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: clube } = await supabase.from('clubs').select('id, name').eq('user_id', user.id).single()
  if (!clube) redirect('/clube/dashboard')

  const { data: torneios } = await supabase
    .from('tournaments')
    .select('id, name')
    .eq('club_id', clube.id)
    .eq('status', 'finished')

  const torneioIds = (torneios ?? []).map(t => t.id)

  const { data: scores } = torneioIds.length > 0
    ? await supabase
        .from('scores')
        .select('participant_id, count, tournament_id')
        .in('tournament_id', torneioIds)
    : { data: [] }

  const { data: participantes } = torneioIds.length > 0
    ? await supabase
        .from('participants')
        .select('id, user_name, bird_name, tournament_id')
        .in('tournament_id', torneioIds)
        .eq('status', 'approved')
    : { data: [] }

  // aggregate: sum cantos per bird_name + user_name across all club tournaments
  const partMap = Object.fromEntries((participantes ?? []).map(p => [p.id, p]))

  const aggregated: Record<string, { bird_name: string; user_name: string; total: number; participacoes: number }> = {}
  for (const s of scores ?? []) {
    const p = partMap[s.participant_id]
    if (!p) continue
    const key = `${p.bird_name}__${p.user_name}`
    if (!aggregated[key]) aggregated[key] = { bird_name: p.bird_name, user_name: p.user_name, total: 0, participacoes: 0 }
    aggregated[key].total += s.count
    aggregated[key].participacoes += 1
  }

  const ranking = Object.values(aggregated).sort((a, b) => b.total - a.total)

  return (
    <div style={{ padding: 'clamp(20px, 4vw, 32px) clamp(14px, 3vw, 24px)', maxWidth: 800, margin: '0 auto' }}>
      <style>{`
        .crk-podium { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
        .crk-card   { background: #fff; border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px; text-align: center; min-width: 0; }
        .crk-bird   { margin: 0 0 2px; font-weight: 800; font-size: 0.88rem; color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .crk-owner  { margin: 0 0 8px; font-size: 0.72rem; color: #9CA3AF; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .crk-total  { margin: 0; font-weight: 800; font-size: 1.25rem; letter-spacing: -0.02em; }
        @media (max-width: 480px) {
          .crk-podium { gap: 8px; }
          .crk-card   { padding: 12px 8px; }
          .crk-bird   { font-size: 0.78rem; }
          .crk-owner  { font-size: 0.65rem; }
          .crk-total  { font-size: 1.05rem; }
        }
      `}</style>
      <div style={{ marginBottom: 24 }}>
        <p style={{ margin: '0 0 4px', fontSize: '0.68rem', fontWeight: 700, color: '#0D8F41', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Clube</p>
        <h1 style={{ margin: 0, fontWeight: 800, fontSize: '1.4rem', color: '#111827', letterSpacing: '-0.025em' }}>Ranking Interno</h1>
        <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#9CA3AF' }}>
          Baseado em todos os torneios finalizados de {clube.name}
        </p>
      </div>

      {ranking.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF', fontSize: '0.85rem' }}>
          Nenhum torneio finalizado ainda.
        </div>
      )}

      {/* podium top 3 */}
      {ranking.length >= 3 && (
        <div className="crk-podium">
          {ranking.slice(0, 3).map((r, i) => (
            <div key={i} className="crk-card" style={{ borderTop: `3px solid ${PODIUM[i]}` }}>
              <p style={{ margin: '0 0 6px', fontSize: '1.3rem' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</p>
              <p className="crk-bird">{r.bird_name}</p>
              <p className="crk-owner">{r.user_name}</p>
              <p className="crk-total" style={{ color: PODIUM[i] }}>
                {r.total.toLocaleString('pt-BR')}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '0.62rem', color: '#9CA3AF' }}>cantos</p>
            </div>
          ))}
        </div>
      )}

      {/* full list */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto', gap: 12, padding: '10px 18px', background: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
          {['#', 'Pássaro', 'Cantos'].map(h => (
            <p key={h} style={{ margin: 0, fontSize: '0.62rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</p>
          ))}
        </div>
        <PaginatedList pageSize={10}>
        {ranking.map((r, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '40px minmax(0, 1fr) auto',
            gap: 12, padding: '12px 16px', alignItems: 'center',
            borderBottom: i < ranking.length - 1 ? '1px solid #F9FAFB' : 'none',
          }}>
            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: i < 3 ? PODIUM[i] : '#D1D5DB', textAlign: 'center' }}>{i + 1}</span>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.bird_name}</p>
              <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.user_name} · {r.participacoes} torneio{r.participacoes !== 1 ? 's' : ''}</p>
            </div>
            <span style={{ fontWeight: 800, fontSize: '1rem', color: '#111827', letterSpacing: '-0.02em' }}>
              {r.total.toLocaleString('pt-BR')}
            </span>
          </div>
        ))}
        </PaginatedList>
      </div>
    </div>
  )
}
