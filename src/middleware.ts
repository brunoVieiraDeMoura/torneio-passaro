import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const AUTH_PATHS  = ['/login', '/cadastro', '/perdeu']
const CLUB_PATHS  = ['/clube', '/mestre']
const PUBLIC_PATHS = ['/', '/entrar', '/torneios', '/torneio', '/liga', '/contato', '/parceiros', '/configuracoes', '/faq', '/suporte']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // not logged in: allow auth + public paths, redirect rest to login
  if (!user) {
    const allowed = [...AUTH_PATHS, ...PUBLIC_PATHS].some(p => pathname === p || pathname.startsWith(p + '/'))
    if (!allowed) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // logged in: fetch role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isClub   = profile?.role === 'club'
  const isClubPath   = CLUB_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
  const isAuthPath   = AUTH_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))

  // club user trying to access non-club pages → dashboard
  if (isClub && !isClubPath && !isAuthPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/clube/dashboard'
    return NextResponse.redirect(url)
  }

  // normal user trying to access club pages → home
  if (!isClub && isClubPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/torneios'
    return NextResponse.redirect(url)
  }

  // non-club user: if actively participating in an open/running tournament, lock to participante page
  if (!isClub && !isAuthPath) {
    const isParticipantePage = /^\/torneio\/[^/]+\/participante(\/.*)?$/.test(pathname)
    if (!isParticipantePage && !pathname.startsWith('/api/')) {
      const { data: participations } = await supabase
        .from('participants')
        .select('id, tournament_id, tournaments!inner(status)')
        .eq('user_id', user.id)
        .eq('status', 'approved')

      const active = (participations ?? []).find(p => {
        const rel = p.tournaments as unknown
        const t = (Array.isArray(rel) ? rel[0] : rel) as { status: string } | undefined
        return t?.status === 'open' || t?.status === 'running'
      })

      if (active) {
        const url = request.nextUrl.clone()
        url.pathname = `/torneio/${active.tournament_id}/participante`
        url.search = `?pid=${active.id}` // participante page exige o pid
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|manifest.webmanifest|passarinhos-img|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|txt|webmanifest)$).*)'],
}
