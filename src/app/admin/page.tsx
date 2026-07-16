import { isAdminSession } from '@/lib/admin-session'
import { createServiceClient } from '@/lib/supabase/service'
import AdminClient from './admin-client'
import AdminLogin from './admin-login'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  // login/senha do env (ADMIN_USER / ADMIN_PASSWORD) — sem sessão, mostra o login
  if (!(await isAdminSession())) return <AdminLogin />

  const db = createServiceClient()
  const [{ data: profiles }, { data: clubs }, { data: reports }] = await Promise.all([
    db.from('profiles')
      .select('id, name, email, role, banned')
      .order('created_at', { ascending: false }),
    db.from('clubs')
      .select('id, name, cidade, estado, status, banned, selo_verde, selo_integridade, selo_verde_request, selo_integridade_request, selo_requested_at')
      .order('created_at', { ascending: false }),
    db.from('reports')
      .select('id, target_type, target_id, target_label, reason, details, status, created_at')
      .order('created_at', { ascending: false }),
  ])

  return <AdminClient profiles={profiles ?? []} clubs={clubs ?? []} reports={reports ?? []} />
}
