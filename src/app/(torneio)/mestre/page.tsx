import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function MestrePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: clube } = await supabase
    .from('clubs')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!clube) redirect('/clube/dashboard')

  const { data: torneios } = await supabase
    .from('tournaments')
    .select('id, name, status, created_at')
    .eq('club_id', clube.id)
    .neq('status', 'finished')
    .order('created_at', { ascending: false })

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mestre de Roda</h1>
        <Link
          href="/clube/torneios"
          className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
        >
          + Novo torneio
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {torneios?.length === 0 && (
          <p className="text-zinc-500 text-sm">Nenhum torneio ativo. Crie um novo.</p>
        )}
        {torneios?.map(t => (
          <Link
            key={t.id}
            href={`/mestre/torneio/${t.id}`}
            className="border border-zinc-200 rounded-xl p-4 hover:border-green-400 transition flex items-center justify-between"
          >
            <div className="flex flex-col gap-1">
              <span className="font-semibold">{t.name}</span>
              <span className={`text-xs font-medium ${t.status === 'running' ? 'text-green-600' : 'text-zinc-400'}`}>
                {t.status === 'draft' ? 'Rascunho' : t.status === 'open' ? 'Aberto' : '● Ao vivo'}
              </span>
            </div>
            <span className="text-zinc-400">→</span>
          </Link>
        ))}
      </div>
    </main>
  )
}
