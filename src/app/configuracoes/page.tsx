import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// /configuracoes é referenciada pelo nav (user e clube) e pelo footer, mas a única
// página de configurações real fica em /clube/configuracoes. Sem esta rota, o prefetch
// do nav dava GET /configuracoes 404. Aqui roteamos pelo papel do usuário:
//   sem sessão → login · clube → configurações do clube · usuário comum → meus pássaros
export default async function ConfiguracoesRedirect() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: clube } = await supabase
    .from('clubs')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  redirect(clube ? '/clube/configuracoes' : '/meus-passarinhos')
}
