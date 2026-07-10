import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BirdForm from './bird-form'
import BirdCard from './bird-card'

const RACAS = [
  'Coleiro','Canário belga','Canário da terra','Curió','Bicudo',
  'Patativa','Galo campina','Sabiá laranjeira','Pintassilgo',
  'Trinca Ferro','Azulão','Bigodinho','Pássaro Preto','Sanhaço',
]
const ESTILOS = ['Canto clássico','Canto rolado','Canto livre','Canto regional','Canto nativo']

export default async function MeusPassarinhos() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: birds } = await supabase
    .from('birds')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // fetch all participants for this user with scores + tournament data
  const { data: participations } = await supabase
    .from('participants')
    .select(`
      id, bird_name, status, created_at,
      tournaments(id, name, status, start_at),
      scores(count)
    `)
    .eq('user_id', user.id)
    .in('status', ['approved', 'pending'])
    .order('created_at', { ascending: false })

  type TRow = { id: string; name: string; status: string; start_at: string | null } | null
  type SRow = { count: number }[] | null

  function historyForBird(birdName: string) {
    if (!participations) return []
    return participations
      .filter(p => p.bird_name === birdName)
      .map(p => {
        const t = p.tournaments as unknown as TRow
        const scores = p.scores as unknown as SRow
        return {
          participant_id: p.id,
          tournament_name: t?.name ?? '—',
          tournament_status: t?.status ?? '',
          tournament_start_at: t?.start_at ?? null,
          score_count: scores?.[0]?.count ?? 0,
          joined_at: p.created_at,
        }
      })
  }

  const totalCantos = (birdName: string) =>
    historyForBird(birdName).reduce((sum, h) => sum + h.score_count, 0)

  const sortedBirds = birds
    ? [...birds].sort((a, b) => totalCantos(b.name) - totalCantos(a.name))
    : []

  return (
    <div style={{ background: '#FAFAFA', minHeight: '100vh' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #F3F4F6', padding: '20px 0 20px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 16px' }}>
          <p style={{ margin: '0 0 6px', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#0D8F41' }}>
            Minha coleção
          </p>
          <h1 style={{ margin: 0, fontWeight: 800, fontSize: '1.7rem', color: '#111827', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
            Meus Pássaros
          </h1>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>
        <BirdForm userId={user.id} />

        {sortedBirds.length > 0 ? (
          <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {sortedBirds.map(b => (
              <BirdCard
                key={b.id}
                bird={b}
                history={historyForBird(b.name)}
                RACAS={RACAS}
                ESTILOS={ESTILOS}
              />
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 48, textAlign: 'center', color: '#9CA3AF' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🐦</div>
            <p style={{ margin: '0 0 4px', fontSize: '0.9rem', fontWeight: 600, color: '#374151' }}>Nenhum pássaro cadastrado ainda.</p>
            <p style={{ margin: 0, fontSize: '0.78rem' }}>Adicione seu primeiro pássaro acima.</p>
          </div>
        )}
      </div>
    </div>
  )
}
