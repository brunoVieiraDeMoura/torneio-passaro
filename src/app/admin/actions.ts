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
