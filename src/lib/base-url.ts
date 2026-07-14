import { headers } from 'next/headers'

// URL pública do app derivada do request (funciona em qualquer domínio/deploy).
// NEXT_PUBLIC_APP_URL vira só fallback — antes, sem a env em produção, o QR
// codificava "undefined/entrar/..." e o celular mostrava "unknown link".
export async function getBaseUrl(): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  if (host) {
    const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
    return `${proto}://${host}`
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}
