import { getMergedLiga } from '@/lib/liga'
import { notFound } from 'next/navigation'
import LigaBirdProfile from './liga-bird-profile'

export default async function LigaBirdProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const decoded = decodeURIComponent(id)
  const all = await getMergedLiga()
  const entry = all.find(e => e.id === decoded)
  if (!entry) notFound()

  const sameCategory = all
    .filter(e => e.tipo_ave === entry.tipo_ave && e.estilo_canto === entry.estilo_canto)
    .sort((a, b) => b.count - a.count)
  const position = sameCategory.findIndex(e => e.id === entry.id) + 1
  const total = sameCategory.length

  return <LigaBirdProfile entry={entry} position={position} total={total} />
}
