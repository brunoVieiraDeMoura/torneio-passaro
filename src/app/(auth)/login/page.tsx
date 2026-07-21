import { redirect } from 'next/navigation'

// /login foi separado em /login/participante e /login/clubes. Mantém compat com links
// antigos: ?from=clube → clube; senão → participante. Preserva ?redirect (fluxo do QR).
export default async function LoginRedirect({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; redirect?: string }>
}) {
  const { from, redirect: red } = await searchParams
  const base = from === 'clube' ? '/login/clubes' : '/login/participante'
  redirect(red ? `${base}?redirect=${encodeURIComponent(red)}` : base)
}
