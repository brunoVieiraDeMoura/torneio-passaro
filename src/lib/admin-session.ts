// Sessão do Admin Central — login/senha vêm do env (ADMIN_USER / ADMIN_PASSWORD),
// sessão em cookie httpOnly assinado com HMAC. Node-only (crypto + next/headers):
// NÃO importar no middleware (edge) nem em componente client.
import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

export const ADMIN_COOKIE = 'aveum_admin'
export const ADMIN_SESSION_TTL_SECS = 12 * 3600 // 12h

function safeEq(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

function sign(payload: string): string {
  return createHmac('sha256', `aveum-admin:${process.env.ADMIN_PASSWORD ?? ''}`)
    .update(payload)
    .digest('hex')
}

export function checkAdminCredentials(user: string, password: string): boolean {
  const envUser = process.env.ADMIN_USER
  const envPass = process.env.ADMIN_PASSWORD
  if (!envUser || !envPass) return false
  return safeEq(user, envUser) && safeEq(password, envPass)
}

// token = "<expira-em-ms>.<hmac>"
export function makeAdminToken(): string {
  const exp = Date.now() + ADMIN_SESSION_TTL_SECS * 1000
  return `${exp}.${sign(String(exp))}`
}

export function isValidAdminToken(token?: string | null): boolean {
  if (!token || !process.env.ADMIN_PASSWORD) return false
  const dot = token.indexOf('.')
  if (dot <= 0) return false
  const expStr = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const exp = Number(expStr)
  if (!Number.isFinite(exp) || Date.now() > exp) return false
  return safeEq(sig, sign(expStr))
}

export async function isAdminSession(): Promise<boolean> {
  const jar = await cookies()
  return isValidAdminToken(jar.get(ADMIN_COOKIE)?.value)
}
