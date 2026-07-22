import { notFound } from 'next/navigation'
import Container from '@mui/material/Container'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Link from 'next/link'
import { fetchTorneios } from '../_fetch'
import { LiveCard, OpenCard, UpcomingCard, FinishedCard } from '../_cards'
import { isFutureDay, isLive, type Item } from '../_utils'

const CAT_CONFIG = {
  'ao-vivo': {
    label: 'Torneios ao vivo',
    eyebrow: 'Agora',
    eyebrowColor: '#EF4444',
    filter: (all: Item[]) => all.filter(isLive),
  },
  abertos: {
    label: 'Abertos agora',
    eyebrow: 'Hoje',
    eyebrowColor: '#0D8F41',
    filter: (all: Item[]) => all.filter(t => t.status === 'open' && !isLive(t) && !isFutureDay(t.start_at)),
  },
  proximos: {
    label: 'Próximos campeonatos',
    eyebrow: 'Em breve',
    eyebrowColor: '#9CA3AF',
    filter: (all: Item[]) => all.filter(t => !isLive(t) && t.status !== 'finished' && isFutureDay(t.start_at)),
  },
  encerrados: {
    label: 'Encerrados',
    eyebrow: 'Histórico',
    eyebrowColor: '#9CA3AF',
    // do finalizado mais recente para o mais antigo
    filter: (all: Item[]) => all.filter(t => t.status === 'finished').sort((a, b) => {
      const da = a.start_at ? new Date(a.start_at).getTime() : -Infinity
      const db = b.start_at ? new Date(b.start_at).getTime() : -Infinity
      return db - da
    }),
  },
} as const

type Slug = keyof typeof CAT_CONFIG

export default async function CategoriaPage({
  params,
  searchParams,
}: {
  params: Promise<{ categoria: string }>
  searchParams: Promise<{ q?: string; estado?: string }>
}) {
  const { categoria } = await params
  const { q, estado } = await searchParams

  if (!(categoria in CAT_CONFIG)) notFound()
  const slug = categoria as Slug
  const cfg = CAT_CONFIG[slug]

  const { all } = await fetchTorneios(q, estado)
  const items = cfg.filter(all)

  return (
    <Box sx={{ bgcolor: '#FAFAFA', minHeight: '100vh' }}>
      <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #F3F4F6', pt: { xs: 2.5, sm: 5 }, pb: 3 }}>
        <Container maxWidth={false} sx={{ maxWidth: 1000 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Box component={Link} href="/torneios" sx={{ fontSize: '0.75rem', color: '#9CA3AF', textDecoration: 'none', '&:hover': { color: '#374151' } }}>
              Torneios
            </Box>
            <Typography sx={{ fontSize: '0.75rem', color: '#D1D5DB' }}>/</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: '#374151', fontWeight: 600 }}>
              {cfg.label}
            </Typography>
          </Box>
          <Typography sx={{ color: cfg.eyebrowColor, fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', mb: 0.75 }}>
            {cfg.eyebrow}
          </Typography>
          <Typography sx={{ color: '#111827', fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.1 }}>
            {cfg.label}
          </Typography>
        </Container>
      </Box>

      <Container maxWidth={false} sx={{ maxWidth: 1000 }}>
        <Box component="form" sx={{ display: 'flex', gap: 1.5, py: 1.5 }}>
          <Box component="input" name="q" defaultValue={q} placeholder="Buscar torneio ou clube..."
            sx={{ flex: 1, border: '1px solid #E5E7EB', borderRadius: '8px', px: '12px', py: '8px', fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit', color: '#0A0A0A', bgcolor: '#fff', '&:focus': { borderColor: '#0D8F41', outline: '2px solid rgba(13,143,65,0.15)' } }}
          />
          <Box component="button" type="submit"
            sx={{ bgcolor: '#0D8F41', color: '#fff', border: 'none', borderRadius: '8px', px: '16px', py: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', '&:hover': { bgcolor: '#0B7A36' } }}
          >
            Buscar
          </Box>
        </Box>

        {items.length === 0 && (
          <Typography sx={{ fontSize: '0.85rem', color: '#9CA3AF', py: 6, textAlign: 'center' }}>
            Nenhum torneio encontrado.
          </Typography>
        )}

        {items.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography sx={{ fontSize: '0.72rem', color: '#9CA3AF', mb: 2 }}>
              {items.length} torneio{items.length !== 1 ? 's' : ''}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: slug === 'encerrados' ? 1 : 1.5 }}>
              {slug === 'ao-vivo'    && items.map(t => <LiveCard key={t.id} t={t} />)}
              {slug === 'abertos'   && items.map(t => <OpenCard key={t.id} t={t} />)}
              {slug === 'proximos'  && items.map(t => <UpcomingCard key={t.id} t={t} />)}
              {slug === 'encerrados' && items.map(t => <FinishedCard key={t.id} t={t} />)}
            </Box>
          </Box>
        )}
      </Container>
    </Box>
  )
}
