import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/torneios'

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)

    const { data: { user } } = await supabase.auth.getUser()

    const isClubSetup = next.startsWith('/clube/setup')

    // primeiro login via OAuth (Google): o signUp por email cria o profile via
    // metadata, mas o OAuth não passa por ele — garante o profile aqui
    if (user) {
      const { data: prof } = await supabase.from('profiles').select('id, role').eq('id', user.id).maybeSingle()
      if (!prof) {
        await supabase.from('profiles').insert({
          id: user.id,
          name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'Participante',
          email: user.email ?? '',
          role: isClubSetup ? 'club' : 'user',
        })
      } else if (isClubSetup && prof.role !== 'club') {
        // trigger antigo criava o profile sem ler o role do metadata → corrige aqui
        await supabase.from('profiles').update({ role: 'club' }).eq('id', user.id)
      }
    }

    // if club signup: create clubs record from encoded params in next URL
    if (isClubSetup) {
      const nextUrl = new URL(next, origin)
      const clubName = nextUrl.searchParams.get('clubName') ?? ''
      const cidade   = nextUrl.searchParams.get('cidade') ?? null
      const estado   = nextUrl.searchParams.get('estado') ?? null

      if (user && clubName) {
        const { data: existing } = await supabase.from('clubs').select('id').eq('user_id', user.id).maybeSingle()
        if (!existing) {
          await supabase.from('clubs').insert({ user_id: user.id, name: clubName, cidade, estado })
        }
      }
      // clube novo entra pendente de aprovação do admin
      return NextResponse.redirect(`${origin}/aprovacao-pendente`)
    }
  }

  return NextResponse.redirect(`${origin}${next}`)
}
