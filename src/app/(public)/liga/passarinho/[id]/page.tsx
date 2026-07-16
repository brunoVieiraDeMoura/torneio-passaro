import { getMergedLiga } from '@/lib/liga'
import { createPublicClient } from '@/lib/supabase/public'
import { notFound } from 'next/navigation'
import LigaBirdProfile from './liga-bird-profile'

// mesmo slug de lib/liga.ts (id real = r_<user_id>_<slug>)
function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

export default async function LigaBirdProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const decoded = decodeURIComponent(id)
  const all = await getMergedLiga()
  const entry = all.find(e => e.id === decoded)
  if (!entry) notFound()

  // entrada real → busca a foto própria do pássaro (upload do dono)
  let photoUrl: string | null = null
  const real = decoded.match(/^r_([0-9a-fA-F-]{36})_(.+)$/)
  if (real) {
    const supabase = createPublicClient()
    const { data: birds } = await supabase
      .from('birds').select('name, photo_url').eq('user_id', real[1])
    photoUrl = (birds ?? []).find(b => slugify(b.name) === real[2])?.photo_url ?? null
  }

  const sameCategory = all
    .filter(e => e.tipo_ave === entry.tipo_ave && e.estilo_canto === entry.estilo_canto)
    .sort((a, b) => b.count - a.count)
  const position = sameCategory.findIndex(e => e.id === entry.id) + 1
  const total = sameCategory.length

  return <LigaBirdProfile entry={entry} position={position} total={total} photoUrl={photoUrl} />
}
