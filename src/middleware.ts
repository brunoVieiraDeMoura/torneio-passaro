import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAdmin } from '@/lib/admin'

const AUTH_PATHS  = ['/login', '/cadastro', '/perdeu']
const CLUB_PATHS  = ['/clube', '/mestre']
const PUBLIC_PATHS = ['/', '/entrar', '/c', '/torneios', '/torneio', '/liga', '/contato', '/parceiros', '/configuracoes', '/faq', '/suporte']

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

  // Rotas de API validam as próprias regras (ex.: /api/score confere janela de tempo
  // e participante aprovado). Redirecionar pra /login devolvia HTML com status 200 ao
  // fetch — o participante com sessão expirada "enviava" cantos que nunca eram gravados.
  if (pathname.startsWith('/api/')) {
    return supabaseResponse
  }

  // /auth/callback: chega SEM sessão (o code ainda não foi trocado) — bloquear aqui
  // redirecionava todo login Google pra /login antes do exchange acontecer.
  if (pathname.startsWith('/auth/')) {
    return supabaseResponse
  }

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

  // logged in: fetch role + ban
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, banned')
    .eq('id', user.id)
    .single()

  const admin = isAdmin(user.email)

  // Admin Central: só o admin acessa /admin
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (!admin) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // usuário banido → trava tudo (exceto a própria tela de banido)
  if (profile?.banned && !admin) {
    if (pathname !== '/banido') {
      const url = request.nextUrl.clone()
      url.pathname = '/banido'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  const isClub   = profile?.role === 'club'
  const isClubPath   = CLUB_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
  const isAuthPath   = AUTH_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))

  // clube: precisa estar aprovado (e não banido) para usar o painel
  if (isClub && !admin) {
    const { data: clube } = await supabase
      .from('clubs')
      .select('status, banned')
      .eq('user_id', user.id)
      .single()

    if (clube?.banned) {
      if (pathname !== '/banido') {
        const url = request.nextUrl.clone()
        url.pathname = '/banido'
        return NextResponse.redirect(url)
      }
      return supabaseResponse
    }

    if (clube && clube.status !== 'approved') {
      // pendente/recusado: só a tela de aprovação + páginas de auth
      if (pathname !== '/aprovacao-pendente' && !isAuthPath) {
        const url = request.nextUrl.clone()
        url.pathname = '/aprovacao-pendente'
        return NextResponse.redirect(url)
      }
      return supabaseResponse
    }
  }

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
        .select('id, tournament_id, round_group, tournaments!inner(status, start_at, duration_secs, active_group, divisions)')
        .eq('user_id', user.id)
        .eq('status', 'approved')

      type TInfo = { status: string; start_at: string | null; duration_secs: number; active_group: number | null; divisions: number | null }
      const tinfo = (p: { tournaments: unknown }): TInfo | undefined => {
        const rel = p.tournaments as unknown
        return (Array.isArray(rel) ? rel[0] : rel) as TInfo | undefined
      }

      const actives = (participations ?? []).filter(p => {
        const t = tinfo(p)
        return t?.status === 'open' || t?.status === 'running'
      })

      // marcação do participante em contagem AGORA (é a vez do grupo dele)?
      const isCounting = (p: { round_group: number | null; tournaments: unknown }) => {
        const t = tinfo(p)
        if (!t?.start_at) return false
        const start = new Date(t.start_at).getTime()
        const end = start + (t.duration_secs ?? 0) * 1000
        const now = Date.now()
        if (now < start || now > end) return false
        return (t.divisions ?? 1) <= 1 || p.round_group === (t.active_group ?? 1)
      }
      const counting = actives.find(isCounting)

      // "Sair da tela do torneio": cookie setado pelo botão na tela do participante
      // libera a navegação mesmo com o torneio ainda ativo (voltar à página re-trava).
      // Compara contra TODAS as inscrições ativas — duplicata antiga em outro
      // torneio não pode re-travar o usuário que acabou de sair.
      // EXCEÇÃO: marcação dele em contagem → volta pra tela de marcação sempre.
      const saiuTid = request.cookies.get('sair_torneio')?.value
      const saiu = saiuTid != null && actives.some(p => p.tournament_id === saiuTid)
      const active = counting ?? actives[0]

      if (active && (!saiu || counting)) {
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
