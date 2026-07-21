import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Entrou pelo login de CLUBE mas ainda não tem clube nesta conta → cria um clube com
// nome placeholder "NomeFiltrado(<id>)" e manda pras configurações pra ele ajustar.
// 1 email pode ser user e clube; aqui a conta "vira" clube.
// Só é alcançado por navegação real (login/callback redirecionam pra cá) — nunca por
// prefetch de <Link>, então o insert não roda à toa.
export default async function ClubeSetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login/clubes')

  const { data: clube } = await supabase
    .from('clubs').select('id').eq('user_id', user.id).maybeSingle()

  // já tem clube → dashboard (idempotente: refresh não recria)
  if (clube) redirect('/clube/dashboard')

  await supabase.from('clubs').insert({
    user_id: user.id,
    name: `NomeFiltrado(${user.id.slice(0, 8)})`,
  })
  // marca a conta como clube (RLS: atualização própria)
  await supabase.from('profiles').update({ role: 'club' }).eq('id', user.id)

  // vai preencher o nome/dados reais nas configurações
  redirect('/clube/configuracoes')
}
