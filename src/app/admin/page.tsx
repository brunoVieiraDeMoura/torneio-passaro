import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/admin'
import AdminClient from './admin-client'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) redirect('/')

  const [{ data: profiles }, { data: clubs }] = await Promise.all([
    supabase.from('profiles').select('id, name, email, role, banned'),
    supabase.from('clubs').select('id, name, cidade, estado, status, banned'),
  ])

  return <AdminClient profiles={profiles ?? []} clubs={clubs ?? []} />
}
