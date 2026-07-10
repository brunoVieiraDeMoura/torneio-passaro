import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Link from 'next/link'
import Header from '@/components/ui/header'
import { createClient } from '@/lib/supabase/server'

export default async function NotFound() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return (
    <>
      <Header initialUser={user} />
      <Box sx={{ bgcolor: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
        <Container maxWidth={false} sx={{ maxWidth: 680, py: { xs: 8, sm: 12 }, px: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'flex-start', sm: 'center' }, textAlign: { xs: 'left', sm: 'center' } }}>

            <Typography sx={{
              color: '#0D8F41',
              fontSize: '0.62rem',
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              mb: 3,
            }}>
              Torneio de aves
            </Typography>

            <Typography component="h1" sx={{
              fontSize: { xs: '2.4rem', sm: '3.2rem' },
              fontWeight: 800,
              color: '#111827',
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
              mb: 2.5,
            }}>
              Página não<br />
              <Box component="span" sx={{ color: '#0D8F41' }}>encontrada.</Box>
            </Typography>

            <Typography sx={{
              color: '#6B7280',
              fontSize: '0.95rem',
              lineHeight: 1.7,
              mb: 6,
              maxWidth: 340,
            }}>
              O endereço que você acessou não existe ou foi removido.
            </Typography>

            <Button
              component={Link}
              href="/"
              variant="contained"
              size="large"
              sx={{ bgcolor: '#0D8F41', color: '#fff', fontWeight: 700, px: 5, '&:hover': { bgcolor: '#0B7A36' } }}
            >
              Voltar ao início
            </Button>

          </Box>
        </Container>
      </Box>
    </>
  )
}
