import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ConfigForm from './config-form'

export default async function ClubeConfiguracoes() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: clube }, { data: profile }] = await Promise.all([
    supabase.from('clubs').select('id, name, cidade, estado, logo_url').eq('user_id', user.id).single(),
    supabase.from('profiles').select('name, email').eq('id', user.id).single(),
  ])
  if (!clube) redirect('/clube/dashboard')

  return (
    <div style={{ padding: '32px 24px', maxWidth: 560, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ margin: '0 0 4px', fontSize: '0.68rem', fontWeight: 700, color: '#0D8F41', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Clube</p>
        <h1 style={{ margin: 0, fontWeight: 800, fontSize: '1.4rem', color: '#111827', letterSpacing: '-0.025em' }}>Configurações</h1>
      </div>
      <ConfigForm
        clubId={clube.id}
        initialClubName={clube.name}
        initialCidade={clube.cidade ?? ''}
        initialEstado={clube.estado ?? ''}
        initialUserName={profile?.name ?? ''}
        email={profile?.email ?? user.email ?? ''}
        initialLogoUrl={(clube as Record<string, unknown>).logo_url as string | null ?? null}
      />
    </div>
  )
}
