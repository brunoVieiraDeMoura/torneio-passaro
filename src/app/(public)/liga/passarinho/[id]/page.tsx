import { ALL_LIGA } from '@/data/liga-data'
import { notFound } from 'next/navigation'
import LigaBirdProfile from './liga-bird-profile'

export default async function LigaBirdProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const entry = ALL_LIGA.find(e => e.id === id)
  if (!entry) notFound()

  const sameCategory = [...ALL_LIGA]
    .filter(e => e.tipo_ave === entry.tipo_ave && e.estilo_canto === entry.estilo_canto)
    .sort((a, b) => b.count - a.count)
  const position = sameCategory.findIndex(e => e.id === id) + 1
  const total = sameCategory.length

  return <LigaBirdProfile entry={entry} position={position} total={total} />
}
