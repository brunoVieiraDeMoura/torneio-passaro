// Admin Central — acesso restrito por email.
// Mantenha em sincronia com a policy de RLS em 20260711_admin_ban_fraud.sql.
export const ADMIN_EMAILS = ['bruno.moura.code@gmail.com']

export function isAdmin(email?: string | null): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase())
}
