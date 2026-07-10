import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClubSidebar from '@/components/ui/club-sidebar'

export default async function ClubLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: clube }, { data: profile }] = await Promise.all([
    supabase.from('clubs').select('id, name').eq('user_id', user.id).single(),
    supabase.from('profiles').select('name').eq('id', user.id).single(),
  ])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#FAFAFA' }}>
      <ClubSidebar clubName={clube?.name ?? 'Meu Clube'} userName={profile?.name ?? ''} />
      <style>{`
        .club-content { padding-top: 56px; }
        @media (min-width: 768px) { .club-content { margin-left: 220px; padding-top: 0; } }
      `}</style>
      <main className="club-content" style={{ flex: 1, minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}
