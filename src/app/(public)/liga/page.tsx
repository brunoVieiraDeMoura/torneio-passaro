import { getMergedLiga } from '@/lib/liga'
import LigaClient from './liga-client'

export default async function LigaPage() {
  // pássaros reais (round_scores somados por pássaro) + entradas de demonstração
  const entries = await getMergedLiga()
  return <LigaClient entries={entries} />
}
