import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PaginatedList from '@/components/ui/paginated-list'

export default async function ClubeParticipantes() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: clube } = await supabase.from('clubs').select('id').eq('user_id', user.id).single()
  if (!clube) redirect('/clube/dashboard')

  const { data: torneios } = await supabase
    .from('tournaments')
    .select('id, name, status')
    .eq('club_id', clube.id)
    .in('status', ['open', 'running', 'finished'])
    .order('created_at', { ascending: false })

  const torneioIds = (torneios ?? []).map(t => t.id)
  const torneioMap = Object.fromEntries((torneios ?? []).map(t => [t.id, t]))

  const { data: participantes } = torneioIds.length > 0
    ? await supabase
        .from('participants')
        .select('id, user_name, bird_name, cage_number, status, user_id, tournament_id, created_at')
        .in('tournament_id', torneioIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const total = participantes?.length ?? 0
  const aprovados = participantes?.filter(p => p.status === 'approved').length ?? 0
  const pendentes = participantes?.filter(p => p.status === 'pending').length ?? 0
  const manuais = participantes?.filter(p => !p.user_id).length ?? 0

  return (
    <div style={{ padding: '32px 24px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ margin: '0 0 4px', fontSize: '0.68rem', fontWeight: 700, color: '#0D8F41', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Clube</p>
        <h1 style={{ margin: 0, fontWeight: 800, fontSize: '1.4rem', color: '#111827', letterSpacing: '-0.025em' }}>Participantes</h1>
      </div>

      {/* stats */}
      <div className="club-stats-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total',     value: total,     color: '#374151', bg: '#F9FAFB', border: '#E5E7EB' },
          { label: 'Aprovados', value: aprovados, color: '#0D8F41', bg: '#F0FDF4', border: '#D1FAE5' },
          { label: 'Pendentes', value: pendentes, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
          { label: 'Fora do app', value: manuais, color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: '14px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: s.color, letterSpacing: '-0.03em' }}>{s.value}</p>
            <p style={{ margin: '3px 0 0', fontSize: '0.65rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* list */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
        {/* header */}
        <div className="club-phead" style={{ padding: '10px 18px', background: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
          {['Pássaro / Dono', 'Torneio', 'Status', ''].map(h => (
            <p key={h} style={{ margin: 0, fontSize: '0.62rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</p>
          ))}
        </div>

        {(!participantes || participantes.length === 0) && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF', fontSize: '0.85rem' }}>
            Nenhum participante ainda.
          </div>
        )}

        <PaginatedList pageSize={10}>
        {participantes?.map((p, i) => {
          const torneio = torneioMap[p.tournament_id]
          const isManual = !p.user_id
          const statusStyle =
            p.status === 'approved' ? { color: '#0D8F41', bg: '#F0FDF4' } :
            p.status === 'pending'  ? { color: '#D97706', bg: '#FFFBEB' } :
                                      { color: '#EF4444', bg: '#FEF2F2' }
          const statusLabel = p.status === 'approved' ? 'Aprovado' : p.status === 'pending' ? 'Pendente' : 'Recusado'

          return (
            <div key={p.id} className="club-prow" style={{
              padding: '13px 18px', alignItems: 'center',
              borderBottom: i < participantes.length - 1 ? '1px solid #F9FAFB' : 'none',
            }}>
              <div className="cell-bird">
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>{p.bird_name}</p>
                <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#9CA3AF' }}>{p.user_name}</p>
              </div>
              <div className="cell-torneio">
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#6B7280' }}>
                  <span className="club-plabel">Torneio:</span>{torneio?.name ?? '—'}
                </p>
                {p.cage_number && <p style={{ margin: '2px 0 0', fontSize: '0.68rem', color: '#9CA3AF' }}>Gaiola {p.cage_number}</p>}
              </div>
              <span className="cell-status" style={{ fontSize: '0.72rem', fontWeight: 600, color: statusStyle.color, background: statusStyle.bg, borderRadius: 20, padding: '4px 10px', display: 'inline-block', width: 'fit-content' }}>
                {statusLabel}
              </span>
              {isManual && (
                <span className="cell-manual" style={{ fontSize: '0.65rem', fontWeight: 700, color: '#7C3AED', background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 20, padding: '3px 8px', display: 'inline-block', width: 'fit-content' }}>
                  Fora do app
                </span>
              )}
            </div>
          )
        })}
        </PaginatedList>
      </div>
    </div>
  )
}
