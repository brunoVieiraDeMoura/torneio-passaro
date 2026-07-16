import { isAdminSession } from '@/lib/admin-session'
import { createServiceClient } from '@/lib/supabase/service'
import AdminClient from './admin-client'
import AdminLogin from './admin-login'

export const dynamic = 'force-dynamic'

// mesmo slug de lib/liga.ts (id da entrada = r_<user_id>_<slug>)
function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
}
function parseBirdTarget(targetId: string): { ownerId: string; slug: string } | null {
  const m = targetId.match(/^r_([0-9a-fA-F-]{36})_(.+)$/)
  return m ? { ownerId: m[1], slug: m[2] } : null
}

export default async function AdminPage() {
  // login/senha do env (ADMIN_USER / ADMIN_PASSWORD) — sem sessão, mostra o login
  if (!(await isAdminSession())) return <AdminLogin />

  const db = createServiceClient()
  const [{ data: profiles }, { data: clubs }, { data: reports }, { data: usage }] = await Promise.all([
    db.from('profiles')
      .select('id, name, email, role, banned')
      .order('created_at', { ascending: false }),
    db.from('clubs')
      .select('id, name, cidade, estado, status, banned, selo_verde, selo_integridade, selo_verde_request, selo_integridade_request, selo_requested_at')
      .order('created_at', { ascending: false }),
    db.from('reports')
      .select('id, target_type, target_id, target_label, reason, details, status, created_at')
      .order('created_at', { ascending: false }),
    // uso do projeto (aba Settings) — null se a migration admin_usage não rodou
    db.rpc('admin_usage'),
  ])

  // enriquece os reports de pássaro: dono (perfil), foto própria do pássaro e
  // reincidência de moderação (nº de imagens removidas + nomes filtrados) —
  // a reincidência libera o botão de banimento p/ imagem/nome ofensivo.
  const rawReports = reports ?? []
  const ownerIds = [...new Set(rawReports
    .map(r => parseBirdTarget(r.target_id)?.ownerId)
    .filter((o): o is string => Boolean(o)))]

  const [{ data: ownerBirds }, { data: ownerAlerts }] = ownerIds.length > 0
    ? await Promise.all([
        db.from('birds').select('user_id, name, photo_url').in('user_id', ownerIds),
        db.from('user_alerts').select('user_id, type').in('user_id', ownerIds)
          .in('type', ['imagem_removida', 'nome_filtrado']),
      ])
    : [{ data: [] }, { data: [] }]

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))
  const modCount: Record<string, number> = {}
  for (const a of ownerAlerts ?? []) modCount[a.user_id] = (modCount[a.user_id] ?? 0) + 1

  const reportsEnriched = rawReports.map(r => {
    const target = parseBirdTarget(r.target_id)
    if (!target) {
      return { ...r, owner_id: null, owner_name: null, owner_banned: false, bird_photo_url: null, prior_moderations: 0 }
    }
    const owner = profileMap.get(target.ownerId)
    const bird = (ownerBirds ?? []).find(b => b.user_id === target.ownerId && slugify(b.name) === target.slug)
    return {
      ...r,
      owner_id: target.ownerId,
      owner_name: owner?.name ?? owner?.email ?? null,
      owner_banned: owner?.banned ?? false,
      bird_photo_url: bird?.photo_url ?? null,
      prior_moderations: modCount[target.ownerId] ?? 0,
    }
  })

  return <AdminClient profiles={profiles ?? []} clubs={clubs ?? []} reports={reportsEnriched} usage={usage ?? null} />
}
