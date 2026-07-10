import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import EntrarForm from './entrar-form'

type Club = { name: string } | null

export default async function EntrarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  const { data: torneio } = await supabase
    .from('tournaments')
    .select('id, name, status, cidade, estado, tipo_ave, estilo_canto, clubs(name)')
    .eq('qr_token', token)
    .single()

  if (!torneio || torneio.status === 'finished') notFound()

  const clube = (torneio.clubs as unknown as Club)?.name
  const isLive = torneio.status === 'running'

  const { data: { user } } = await supabase.auth.getUser()

  let profile: { name: string; email: string } | null = null
  let matchingBirds: { id: string; name: string; raca: string | null; estilo_canto: string | null }[] = []

  if (user) {
    const { data: p } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', user.id)
      .single()
    profile = p

    const { data: allBirds } = await supabase
      .from('birds')
      .select('id, name, raca, estilo_canto')
      .eq('user_id', user.id)

    matchingBirds = (allBirds ?? []).filter(b => {
      if (torneio.tipo_ave && b.raca !== torneio.tipo_ave) return false
      if (torneio.estilo_canto && b.estilo_canto !== torneio.estilo_canto) return false
      return true
    })
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#FAFAFA' }}>

      {/* header */}
      <div style={{
        padding: '0 20px', height: 56, background: '#fff',
        borderBottom: '1px solid #F3F4F6', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
            <path d="M1 8 Q5.5 1 11 8 Q16.5 15 21 8" stroke="#0D8F41" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          <span style={{ fontWeight: 800, fontSize: '1rem', color: '#111827', letterSpacing: '-0.02em' }}>
            Cantorias
          </span>
        </Link>
        <Link href="/torneios" style={{ fontSize: '0.75rem', color: '#9CA3AF', textDecoration: 'none', fontWeight: 500 }}>
          Ver torneios →
        </Link>
      </div>

      {/* content */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '28px 20px 48px' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* torneio info card */}
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: '24px', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ margin: 0, fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#0D8F41' }}>
                Inscrição
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {isLive && (
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} className="live-dot" />
                )}
                <span style={{
                  fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: isLive ? '#0D8F41' : '#9CA3AF',
                }}>
                  {isLive ? 'Ao vivo' : 'Aberto'}
                </span>
              </div>
            </div>

            <h1 style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '1.25rem', color: '#111827', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {torneio.name}
            </h1>
            <p style={{ margin: '0 0 (torneio.tipo_ave ? 10px : 0)', fontSize: '0.78rem', color: '#9CA3AF' }}>
              {[clube, torneio.cidade && torneio.estado ? `${torneio.cidade}, ${torneio.estado}` : null].filter(Boolean).join(' · ')}
            </p>
            {(torneio.tipo_ave || torneio.estilo_canto) && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                {torneio.tipo_ave && (
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#065F46', background: '#F0FDF4', border: '1px solid #D1FAE5', borderRadius: 20, padding: '3px 10px' }}>
                    {torneio.tipo_ave}
                  </span>
                )}
                {torneio.estilo_canto && (
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#374151', background: '#F3F4F6', borderRadius: 20, padding: '3px 10px' }}>
                    {torneio.estilo_canto}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* form card */}
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: '24px' }}>
            <h2 style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '1.1rem', color: '#111827', letterSpacing: '-0.02em' }}>
              Inscrever pássaro
            </h2>
            <p style={{ margin: '0 0 22px', fontSize: '0.8rem', color: '#9CA3AF' }}>
              Após envio, aguarde a aprovação do clube.
            </p>
            <EntrarForm
              tournamentId={torneio.id}
              tipoAve={torneio.tipo_ave ?? null}
              estiloCanto={torneio.estilo_canto ?? null}
              isLoggedIn={!!user}
              profile={profile}
              matchingBirds={matchingBirds}
              returnPath={`/entrar/${token}`}
            />
          </div>

        </div>
      </div>
    </div>
  )
}
