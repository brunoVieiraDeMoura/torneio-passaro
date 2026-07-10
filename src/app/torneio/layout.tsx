import Header from '@/components/ui/header'
import { createClient } from '@/lib/supabase/server'

export default async function TorneioPublicoLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return (
    <>
      <Header initialUser={user} />
      {children}
    </>
  )
}
