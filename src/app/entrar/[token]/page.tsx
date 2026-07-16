import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import EntrarForm from './entrar-form'
import { BirdMark, AveumWordmark } from '@/components/ui/bird-mark'
import ChromeRedirect from '@/components/ui/chrome-redirect'

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

  // primeira marcação definida (grupos atribuídos) → auto-inscrição encerrada
  // (quem já está inscrito neste torneio segue com o fluxo de "voltar")
  const { data: grouped } = await supabase
    .from('participants')
    .select('id')
    .eq('tournament_id', torneio.id)
    .eq('status', 'approved')
    .not('round_group', 'is', null)
    .limit(1)
  const inscricoesEncerradas = (grouped ?? []).length > 0

  const { data: { user } } = await supabase.auth.getUser()

  let profile: { name: string; email: string } | null = null
  let matchingBirds: { id: string; name: string; raca: string | null; estilo_canto: string | null }[] = []
  let existingPid: string | null = null
  let outroTorneio: { tid: string; pid: string } | null = null

  if (user) {
    // inscrição ativa em QUALQUER torneio aberto/rolando: neste → volta pra tela;
    // em outro → bloqueia (só 1 torneio por vez, até o encerramento)
    const { data: parts } = await supabase
      .from('participants')
      .select('id, tournament_id, tournaments!inner(status)')
      .eq('user_id', user.id)
      .in('status', ['pending', 'approved'])
    const active = (parts ?? []).find(p => {
      const rel = p.tournaments as unknown
      const t = (Array.isArray(rel) ? rel[0] : rel) as { status: string } | undefined
      return t?.status === 'open' || t?.status === 'running'
    })
    if (active) {
      if (active.tournament_id === torneio.id) existingPid = active.id
      else outroTorneio = { tid: active.tournament_id, pid: active.id }
    }
  }

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
      <ChromeRedirect />

      {/* header */}
      <div style={{
        padding: '0 20px', height: 56, background: '#fff',
        borderBottom: '1px solid #F3F4F6', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <BirdMark size={36} />
          <AveumWordmark style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em' }} />
        </Link>
        <Link href="/torneios" style={{ fontSize: '0.75rem', color: '#9CA3AF', textDecoration: 'none', fontWeight: 500 }}>
          Ver torneios →
        </Link>
      </div>

      {/* content — centraliza via margin:auto (alignItems:center cortava o topo
          quando o conteúdo era maior que a tela em celulares menores) */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', padding: '28px 20px 48px' }}>
        <div style={{ width: '100%', maxWidth: 400, margin: 'auto' }}>

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

          {/* form card — inscrições fecham quando a primeira marcação é definida */}
          {inscricoesEncerradas && !existingPid ? (
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: '24px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '1rem', color: '#111827' }}>
                Inscrições encerradas
              </p>
              <p style={{ margin: '0 0 18px', fontSize: '0.8rem', color: '#9CA3AF', lineHeight: 1.5 }}>
                A primeira marcação deste torneio já foi definida.
              </p>
              <Link href={`/torneio/${torneio.id}`} style={{
                display: 'block', textAlign: 'center', fontWeight: 700, fontSize: '0.88rem',
                textDecoration: 'none', padding: '12px', borderRadius: 10,
                background: '#0D8F41', color: '#fff',
              }}>
                Acompanhar o placar ao vivo →
              </Link>
            </div>
          ) : (
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
              existingPid={existingPid}
              outroTorneio={outroTorneio}
            />
          </div>
          )}

        </div>
      </div>
    </div>
  )
}
