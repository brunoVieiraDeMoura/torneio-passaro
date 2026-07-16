import Container from '@mui/material/Container'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Link from 'next/link'
import GeoList from './geo-list'
import { fetchTorneios } from './_fetch'
import { isFutureDay } from './_utils'

const PILLS = [
  { label: 'Todos',                slug: undefined,    accent: '#6B7280' },
  { label: 'Ao vivo',              slug: 'ao-vivo',    accent: '#EF4444' },
  { label: 'Abertos agora',        slug: 'abertos',    accent: '#0D8F41' },
  { label: 'Próximos campeonatos', slug: 'proximos',   accent: '#9CA3AF' },
  { label: 'Encerrados',           slug: 'encerrados', accent: '#9CA3AF' },
] as const

export default async function TorneiosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string }>
}) {
  const { q, estado } = await searchParams
  const { all } = await fetchTorneios(q, estado)

  const live     = all.filter(t => t.status === 'running').length
  const open     = all.filter(t => t.status === 'open' && !isFutureDay(t.start_at)).length
  const upcoming = all.filter(t => t.status !== 'finished' && t.status !== 'running' && isFutureDay(t.start_at)).length
  const finished = all.filter(t => t.status === 'finished').length

  const counts: Record<string, number> = {
    'ao-vivo': live, abertos: open, proximos: upcoming, encerrados: finished,
  }

  return (
    <Box sx={{ bgcolor: '#FAFAFA', minHeight: '100vh' }}>
      <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #F3F4F6', pt: { xs: 2.5, sm: 5 }, pb: 3 }}>
        <Container maxWidth={false} sx={{ maxWidth: 1000 }}>
          <Typography sx={{ color: '#0D8F41', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', mb: 0.75 }}>
            Participe
          </Typography>
          <Typography sx={{ color: '#111827', fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.1 }}>
            Torneios
          </Typography>
        </Container>
      </Box>

      <Container maxWidth={false} sx={{ maxWidth: 1000 }}>
        {/* pills */}
        <Box sx={{ display: 'flex', gap: 1, pt: 2.5, pb: 1, overflowX: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
          {PILLS.filter(p => p.slug === undefined || counts[p.slug] > 0).map(({ label, slug }) => {
            const isActive = slug === undefined
            const count = slug ? counts[slug] : null
            return (
              <Box key={label} component={Link} href={slug ? `/torneios/${slug}` : '/torneios'}
                sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 0.75,
                  px: '12px', py: '7px', borderRadius: '8px',
                  fontSize: '0.75rem', fontWeight: isActive ? 700 : 600, whiteSpace: 'nowrap',
                  textDecoration: 'none', flexShrink: 0, border: '1px solid',
                  bgcolor: isActive ? '#0D8F41' : '#fff',
                  borderColor: isActive ? '#0D8F41' : '#E5E7EB',
                  color: isActive ? '#fff' : '#6B7280',
                  transition: 'all 0.15s',
                  '&:hover': isActive ? {} : { borderColor: '#0D8F41', color: '#0D8F41' },
                }}
              >
                {label}
                {count != null && (
                  <Box component="span" sx={{ fontSize: '0.65rem', fontWeight: 700, px: '5px', py: '1px', borderRadius: '6px', bgcolor: isActive ? 'rgba(255,255,255,0.2)' : '#F3F4F6', color: isActive ? '#fff' : '#9CA3AF' }}>
                    {count}
                  </Box>
                )}
              </Box>
            )
          })}
        </Box>

        {/* search */}
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

        <GeoList all={all} />
      </Container>
    </Box>
  )
}
