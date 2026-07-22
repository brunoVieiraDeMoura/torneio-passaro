'use client'

import { useState, useEffect, useMemo } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Link from 'next/link'
import { LiveCard, OpenCard, UpcomingCard, FinishedCard } from './_cards'
import { isFutureDay, isLive, proximityScore, type Item } from './_utils'

const PREVIEW = 3

function sortByProx(list: Item[], cidade: string, estado: string): Item[] {
  if (!cidade && !estado) return list
  return [...list].sort((a, b) => {
    const pa = proximityScore(a, cidade, estado)
    const pb = proximityScore(b, cidade, estado)
    if (pa !== pb) return pa - pb
    const da = a.start_at ? new Date(a.start_at).getTime() : Infinity
    const db = b.start_at ? new Date(b.start_at).getTime() : Infinity
    return da - db
  })
}

function SectionHeader({
  eyebrow, eyebrowColor, title, count, slug, locationLabel,
}: {
  eyebrow: string; eyebrowColor: string; title: string
  count: number; slug: string; locationLabel: string | null
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mb: 2 }}>
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: eyebrowColor }}>
            {eyebrow}
          </Typography>
          {locationLabel && (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, bgcolor: '#F0FDF4', border: '1px solid #D1FAE5', borderRadius: '20px', px: '8px', py: '1px' }}>
              <Typography component="span" sx={{ fontSize: '0.58rem', lineHeight: 1 }}>📍</Typography>
              <Typography sx={{ fontSize: '0.6rem', fontWeight: 600, color: '#065F46', lineHeight: 1.5 }}>{locationLabel}</Typography>
            </Box>
          )}
        </Box>
        <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: '#111827', letterSpacing: '-0.02em' }}>
          {title}
        </Typography>
      </Box>
      {count > PREVIEW && (
        <Link href={`/torneios/${slug}`} style={{ fontSize: '0.78rem', fontWeight: 600, color: eyebrowColor === '#EF4444' ? '#0D8F41' : eyebrowColor, textDecoration: 'none' }}>
          Ver todos ({count}) →
        </Link>
      )}
    </Box>
  )
}

export default function GeoList({ all }: { all: Item[] }) {
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setCidade(localStorage.getItem('liga_cidade') ?? '')
    setEstado(localStorage.getItem('liga_estado') ?? '')
    setHydrated(true)
  }, [])

  const hasLocation = hydrated && (!!cidade || !!estado)
  const locationLabel = hasLocation
    ? cidade ? `${cidade}${estado ? `, ${estado}` : ''}` : estado
    : null

  const { live, open, upcoming, finished } = useMemo(() => {
    const sorted = sortByProx(all, cidade, estado)
    return {
      live:     sorted.filter(isLive),
      open:     sorted.filter(t => t.status === 'open' && !isLive(t) && !isFutureDay(t.start_at)),
      upcoming: sorted.filter(t => !isLive(t) && t.status !== 'finished' && isFutureDay(t.start_at)),
      // encerrados: do finalizado mais recente para o mais antigo
      finished: sorted.filter(t => t.status === 'finished').sort((a, b) => {
        const da = a.start_at ? new Date(a.start_at).getTime() : -Infinity
        const db = b.start_at ? new Date(b.start_at).getTime() : -Infinity
        return db - da
      }),
    }
  }, [all, cidade, estado])

  const empty = all.length === 0

  return (
    <>
      {empty && (
        <Typography sx={{ fontSize: '0.85rem', color: '#9CA3AF', py: 6, textAlign: 'center' }}>
          Nenhum torneio encontrado.
        </Typography>
      )}

      {live.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <SectionHeader eyebrow="Agora" eyebrowColor="#EF4444" title="Torneios ao vivo"
            count={live.length} slug="ao-vivo" locationLabel={locationLabel} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {live.slice(0, PREVIEW).map(t => <LiveCard key={t.id} t={t} />)}
          </Box>
        </Box>
      )}

      {open.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <SectionHeader eyebrow="Hoje" eyebrowColor="#0D8F41" title="Abertos agora"
            count={open.length} slug="abertos" locationLabel={locationLabel} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {open.slice(0, PREVIEW).map(t => <OpenCard key={t.id} t={t} />)}
          </Box>
        </Box>
      )}

      {upcoming.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <SectionHeader eyebrow="Em breve" eyebrowColor="#9CA3AF" title="Próximos campeonatos"
            count={upcoming.length} slug="proximos" locationLabel={locationLabel} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {upcoming.slice(0, PREVIEW).map(t => <UpcomingCard key={t.id} t={t} />)}
          </Box>
        </Box>
      )}

      {finished.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <SectionHeader eyebrow="Histórico" eyebrowColor="#9CA3AF" title="Encerrados"
            count={finished.length} slug="encerrados" locationLabel={null} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {finished.slice(0, PREVIEW).map(t => <FinishedCard key={t.id} t={t} />)}
          </Box>
        </Box>
      )}
    </>
  )
}
