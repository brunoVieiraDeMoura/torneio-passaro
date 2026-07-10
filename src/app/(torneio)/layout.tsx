import Header from '@/components/ui/header'
import { createClient } from '@/lib/supabase/server'

export default async function TorneioLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isClub = false
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    isClub = profile?.role === 'club'
  }

  return (
    <>
      {!isClub && <Header initialUser={user} />}
      {children}
    </>
  )
}
