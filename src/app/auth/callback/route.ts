import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/torneios'

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)

    // if club signup: create clubs record from encoded params in next URL
    if (next.startsWith('/clube/setup')) {
      const nextUrl = new URL(next, origin)
      const clubName = nextUrl.searchParams.get('clubName') ?? ''
      const cidade   = nextUrl.searchParams.get('cidade') ?? null
      const estado   = nextUrl.searchParams.get('estado') ?? null

      const { data: { user } } = await supabase.auth.getUser()
      if (user && clubName) {
        const { data: existing } = await supabase.from('clubs').select('id').eq('user_id', user.id).single()
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
