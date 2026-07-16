'use server'

// Ações do Admin Central — todas rodam com service role (ignora RLS) e são
// protegidas pela sessão do admin (cookie assinado, login/senha do env).
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import {
  ADMIN_COOKIE, ADMIN_SESSION_TTL_SECS,
  checkAdminCredentials, isAdminSession, makeAdminToken,
} from '@/lib/admin-session'

type ActionResult = { ok: true } | { ok: false; error: string }

async function guard(): Promise<ActionResult | null> {
  if (await isAdminSession()) return null
  return { ok: false, error: 'Sessão expirada — faça login de novo.' }
}

// ── Login / logout ──

export async function adminLogin(
  _prev: { error: string } | undefined,
  formData: FormData,
): Promise<{ error: string } | undefined> {
  const user = String(formData.get('user') ?? '')
  const password = String(formData.get('password') ?? '')
  if (!checkAdminCredentials(user, password)) {
    return { error: 'Login ou senha incorretos.' }
  }
  const jar = await cookies()
  jar.set(ADMIN_COOKIE, makeAdminToken(), {
    httpOnly: true, sameSite: 'lax', path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: ADMIN_SESSION_TTL_SECS,
  })
  redirect('/admin')
}

export async function adminLogout(): Promise<void> {
  const jar = await cookies()
  jar.delete(ADMIN_COOKIE)
  redirect('/admin')
}

// ── Clubes: selos, status, ban, exclusão ──

export async function setClubSelo(
  clubId: string,
  selo: 'verde' | 'integridade',
  grant: boolean,
): Promise<ActionResult> {
  const denied = await guard(); if (denied) return denied
  const db = createServiceClient()
  const patch = selo === 'verde'
    ? { selo_verde: grant, selo_verde_request: grant ? 'approved' : 'rejected' }
    : { selo_integridade: grant, selo_integridade_request: grant ? 'approved' : 'rejected' }
  const { error } = await db.from('clubs').update(patch).eq('id', clubId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin')
  return { ok: true }
}

export async function setClubStatus(clubId: string, status: 'approved' | 'rejected'): Promise<ActionResult> {
  const denied = await guard(); if (denied) return denied
  const db = createServiceClient()
  const { error } = await db.from('clubs').update({ status }).eq('id', clubId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin')
  return { ok: true }
}

export async function setClubBanned(clubId: string, banned: boolean): Promise<ActionResult> {
  const denied = await guard(); if (denied) return denied
  const db = createServiceClient()
  const { error } = await db.from('clubs').update({ banned }).eq('id', clubId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin')
  return { ok: true }
}

// Excluir clube: cascade apaga torneios → participantes → scores/round_scores.
export async function deleteClub(clubId: string): Promise<ActionResult> {
  const denied = await guard(); if (denied) return denied
  const db = createServiceClient()
  const { error } = await db.from('clubs').delete().eq('id', clubId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin')
  return { ok: true }
}

// ── Usuários: ban, exclusão ──

export async function setUserBanned(userId: string, banned: boolean): Promise<ActionResult> {
  const denied = await guard(); if (denied) return denied
  const db = createServiceClient()
  const { error } = await db.from('profiles').update({ banned }).eq('id', userId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin')
  return { ok: true }
}

// Excluir usuário: apaga a conta no auth → cascade em profiles → clubs/birds;
// participações ficam com user_id null (on delete set null).
export async function deleteUser(userId: string): Promise<ActionResult> {
  const denied = await guard(); if (denied) return denied
  const db = createServiceClient()
  const { error } = await db.auth.admin.deleteUser(userId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin')
  return { ok: true }
}

// ── Reports ──

export async function setReportStatus(reportId: string, status: 'resolved' | 'dismissed' | 'open'): Promise<ActionResult> {
  const denied = await guard(); if (denied) return denied
  const db = createServiceClient()
  const { error } = await db.from('reports').update({ status }).eq('id', reportId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin')
  return { ok: true }
}

// ── Moderação a partir de um report de pássaro da liga ──
// target_id real tem o formato r_<user_id>_<slug-do-nome> (ver lib/liga.ts);
// ids de demonstração (mock) não têm dono e não são moderáveis.

// mesmo slug usado em lib/liga.ts p/ montar o id da entrada
function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function parseBirdTarget(targetId: string): { ownerId: string; slug: string } | null {
  const m = targetId.match(/^r_([0-9a-fA-F-]{36})_(.+)$/)
  return m ? { ownerId: m[1], slug: m[2] } : null
}

type Db = ReturnType<typeof createServiceClient>

type LoadedReport =
  | { ok: false; error: string }
  | { ok: true; ownerId: string; slug: string }

async function loadBirdReport(db: Db, reportId: string): Promise<LoadedReport> {
  const { data: report } = await db.from('reports')
    .select('id, target_id, target_label').eq('id', reportId).single()
  if (!report) return { ok: false, error: 'Report não encontrado.' }
  const target = parseBirdTarget(report.target_id)
  if (!target) return { ok: false, error: 'Perfil de demonstração — sem dono real para moderar.' }
  return { ok: true, ...target }
}

async function findBird(db: Db, ownerId: string, slug: string) {
  const { data: birds } = await db.from('birds')
    .select('id, name, photo_url').eq('user_id', ownerId)
  return (birds ?? []).find(b => slugify(b.name) === slug) ?? null
}

async function sendAlert(db: Db, userId: string, type: 'imagem_removida' | 'nome_filtrado' | 'aviso', message: string) {
  await db.from('user_alerts').insert({ user_id: userId, type, message })
}

// Remove a imagem do pássaro (desvincula) + avisa o dono.
export async function moderateRemoveImage(reportId: string): Promise<ActionResult> {
  const denied = await guard(); if (denied) return denied
  const db = createServiceClient()
  const loaded = await loadBirdReport(db, reportId)
  if (!loaded.ok) return loaded

  const bird = await findBird(db, loaded.ownerId, loaded.slug)
  if (!bird) return { ok: false, error: 'Pássaro não encontrado no cadastro do dono.' }
  if (!bird.photo_url) return { ok: false, error: 'Este pássaro não tem imagem própria — o perfil usa a foto padrão da raça.' }

  const { error } = await db.from('birds').update({ photo_url: null }).eq('id', bird.id)
  if (error) return { ok: false, error: error.message }

  await sendAlert(db, loaded.ownerId, 'imagem_removida',
    `A imagem do seu pássaro "${bird.name}" foi removida pela administração por conteúdo impróprio. ` +
    `Colocar imagens desse tipo poderá resultar em banimento permanente da conta.`)
  await db.from('reports').update({ status: 'resolved' }).eq('id', reportId)
  revalidatePath('/admin')
  return { ok: true }
}

// Troca o nome ofensivo por "Nomefiltrado(<id único>)" em birds, participants
// e round_scores (o nome na liga vem de round_scores) + avisa o dono.
export async function moderateFilterName(reportId: string): Promise<ActionResult> {
  const denied = await guard(); if (denied) return denied
  const db = createServiceClient()
  const loaded = await loadBirdReport(db, reportId)
  if (!loaded.ok) return loaded

  const bird = await findBird(db, loaded.ownerId, loaded.slug)
  // nome original: cadastro do pássaro ou, sem cadastro, o histórico de cantos
  let oldName = bird?.name ?? null
  if (!oldName) {
    const { data: rows } = await db.from('round_scores')
      .select('bird_name').eq('user_id', loaded.ownerId)
    oldName = (rows ?? []).map(r => r.bird_name).find(n => slugify(n) === loaded.slug) ?? null
  }
  if (!oldName) return { ok: false, error: 'Não achei o nome original do pássaro.' }

  const newName = `Nomefiltrado(${String(Date.now()).slice(-6)})`

  if (bird) await db.from('birds').update({ name: newName }).eq('id', bird.id)
  await db.from('participants').update({ bird_name: newName })
    .eq('user_id', loaded.ownerId).eq('bird_name', oldName)
  await db.from('round_scores').update({ bird_name: newName })
    .eq('user_id', loaded.ownerId).eq('bird_name', oldName)

  await sendAlert(db, loaded.ownerId, 'nome_filtrado',
    `O nome do seu pássaro "${oldName}" foi considerado ofensivo e alterado para "${newName}" pela administração. ` +
    `Reincidência poderá resultar em banimento permanente da conta.`)
  await db.from('reports').update({ status: 'resolved' }).eq('id', reportId)
  revalidatePath('/admin')
  return { ok: true }
}

// Bane o dono do perfil reportado e resolve o report.
export async function banReportedOwner(reportId: string): Promise<ActionResult> {
  const denied = await guard(); if (denied) return denied
  const db = createServiceClient()
  const loaded = await loadBirdReport(db, reportId)
  if (!loaded.ok) return loaded

  const { error } = await db.from('profiles').update({ banned: true }).eq('id', loaded.ownerId)
  if (error) return { ok: false, error: error.message }
  await db.from('reports').update({ status: 'resolved' }).eq('id', reportId)
  revalidatePath('/admin')
  return { ok: true }
}
