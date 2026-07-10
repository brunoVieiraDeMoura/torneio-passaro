import Header from '@/components/ui/header'
import FirstBirdPrompt from '@/components/ui/first-bird-prompt'
import { createClient } from '@/lib/supabase/server'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return (
    <>
      <Header initialUser={user} />
      <FirstBirdPrompt />
      {children}
    </>
  )
}
