import { getMergedLiga } from '@/lib/liga'
import { createClient } from '@/lib/supabase/server'
import LigaClient from './liga-client'

export default async function LigaPage() {
  // pássaros reais (round_scores somados por pássaro) + entradas de demonstração
  const entries = await getMergedLiga()
  // logado: destaca os pássaros do próprio usuário no ranking
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return <LigaClient entries={entries} currentUserId={user?.id ?? null} />
}
