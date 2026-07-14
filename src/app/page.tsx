import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Link from 'next/link'
import Header from '@/components/ui/header'
import { BirdMark, AveumWordmark } from '@/components/ui/bird-mark'
import RankingPreview from '@/components/ui/ranking-preview'
import TorneiosPreview from '@/components/ui/torneios-preview'
import { createClient } from '@/lib/supabase/server'
import { createPublicClient } from '@/lib/supabase/public'
import { unstable_cache } from 'next/cache'
import type { Item } from '@/app/(public)/torneios/_utils'

const steps = [
  { n: '01', title: 'Clube cria o torneio',   desc: 'Configura nome, duração e gera o código QR de entrada.' },
  { n: '02', title: 'Inscreva seu pássaro',   desc: 'Leia o QR, selecione seu pássaro e aguarde aprovação.' },
  { n: '03', title: 'Toque e pontue ao vivo', desc: 'Cada toque registra um canto. Placar atualiza em tempo real para todos.' },
]

type Club = { name: string; cidade: string; estado: string } | null

const getPublicStats = unstable_cache(
  async () => {
    const supabase = createPublicClient()
    const [{ count: totalParticipantes }, { count: totalTorneios }, { count: totalClubes }] = await Promise.all([
      supabase.from('participants').select('*', { count: 'exact', head: true }),
      supabase.from('tournaments').select('*', { count: 'exact', head: true }),
      supabase.from('clubs').select('*', { count: 'exact', head: true }),
    ])
    return { totalParticipantes: totalParticipantes ?? 0, totalTorneios: totalTorneios ?? 0, totalClubes: totalClubes ?? 0 }
  },
  ['public-stats'],
  { revalidate: 60, tags: ['stats', 'torneios'] },
)

const getActiveTorneios = unstable_cache(
  async (): Promise<Item[]> => {
    const supabase = createPublicClient()
    const { data } = await supabase
      .from('tournaments')
      .select('id, name, status, tipo_ave, estilo_canto, clubs(name, cidade, estado), participants(count)')
      .in('status', ['open', 'running'])
      .order('status', { ascending: false })
    return (data ?? []).map(t => {
      const c = t.clubs as unknown as Club
      return {
        id: t.id, name: t.name, status: t.status,
        qr_token: (t as Record<string, unknown>).qr_token as string | null ?? null,
        clube: c?.name ?? null, cidade: c?.cidade ?? null, estado: c?.estado ?? null,
        n: (t.participants as unknown as { count: number }[] | null)?.[0]?.count ?? null,
        start_at: (t as Record<string, unknown>).start_at as string | null ?? null,
        tipo_ave: (t as Record<string, unknown>).tipo_ave as string | null ?? null,
        estilo_canto: (t as Record<string, unknown>).estilo_canto as string | null ?? null,
      }
    })
  },
  ['active-torneios'],
  { revalidate: 60, tags: ['torneios'] },
)

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let userBirdEstilo: string | null = null
  if (user) {
    const { data: birds } = await supabase
      .from('birds')
      .select('estilo_canto')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)
    if (birds && birds.length > 0) userBirdEstilo = birds[0].estilo_canto ?? null
  }

  const [{ totalParticipantes, totalTorneios, totalClubes }, torneios] = await Promise.all([
    getPublicStats(),
    getActiveTorneios(),
  ])

  return (
    <>
    <style>{`
      @keyframes pageIn {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes pulseDot {
        0%, 100% { opacity: 1; transform: scale(1);   }
        50%       { opacity: .5; transform: scale(1.5); }
      }
      .page-in  { animation: pageIn .45s ease both; }
      .live-dot { animation: pulseDot 1.6s ease-in-out infinite; }
    `}</style>
    <Header initialUser={user} />
    <Box className="page-in" sx={{ bgcolor: '#fff' }}>

      {/* ── HERO ── */}
      <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #F3F4F6', py: { xs: 8, sm: 10 } }}>
        <Container maxWidth={false} sx={{ maxWidth: 1000 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'center', sm: 'center' }, textAlign: 'center' }}>
          <Typography
  
            sx={{
              color: '#0D8F41',
              fontSize: '0.62rem',
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              mb: 3,
            }}
          >
            Torneio de passarinhos
          </Typography>

          <Typography
            component="h1"
  
            sx={{
              fontSize: { xs: '2.4rem', sm: '3.2rem' },
              fontWeight: 800,
              color: '#111827',
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
              mb: 2.5,
            }}
          >
            Onde as melhores<br />
            <Box component="span" sx={{ color: '#0D8F41' }}>aves competem.</Box>
          </Typography>

          <Typography
  
            sx={{
              color: '#6B7280',
              fontSize: '0.95rem',
              lineHeight: 1.7,
              mb: 6,
              maxWidth: 380,
            }}
          >
            Plataforma de torneios de canto de pássaro com placar em tempo real,
            aprovação de inscrições e ranking nacional.
          </Typography>

          {/* dual CTA grid */}
          <Box

            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 2,
              maxWidth: 440,
              width: '100%',
            }}
          >
            {/* participante */}
            <Box
              sx={{
                border: '1px solid #E5E7EB',
                borderRadius: 2,
                p: 2.5,
              }}
            >
              <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9CA3AF', mb: 1.5 }}>
                Participante
              </Typography>
              <Button
                component={Link}
                href="/cadastro"
                variant="contained"
                fullWidth
                sx={{ bgcolor: '#0D8F41', fontWeight: 700, mb: 1, fontSize: '0.82rem', '&:hover': { bgcolor: '#0B7A36' } }}
              >
                Criar conta
              </Button>
              <Typography
                component={Link}
                href="/login"
                sx={{
                  display: 'block',
                  textAlign: 'center',
                  fontSize: '0.78rem',
                  color: '#0D8F41',
                  fontWeight: 500,
                  textDecoration: 'none',
                  py: 0.5,
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Já tenho conta →
              </Typography>
            </Box>

            {/* clube */}
            <Box
              sx={{
                border: '1px solid #E5E7EB',
                borderRadius: 2,
                p: 2.5,
              }}
            >
              <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9CA3AF', mb: 1.5 }}>
                Clube
              </Typography>
              <Button
                component={Link}
                href="/cadastro?tipo=clube"
                variant="outlined"
                fullWidth
                sx={{
                  borderColor: '#0D8F41',
                  color: '#0D8F41',
                  fontWeight: 700,
                  mb: 1,
                  fontSize: '0.82rem',
                  '&:hover': { bgcolor: '#F0FDF4', borderColor: '#0B7A36' },
                }}
              >
                Criar clube
              </Button>
              <Typography
                component={Link}
                href="/login?from=clube"
                sx={{
                  display: 'block',
                  textAlign: 'center',
                  fontSize: '0.78rem',
                  color: '#0D8F41',
                  fontWeight: 500,
                  textDecoration: 'none',
                  py: 0.5,
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Já tenho conta →
              </Typography>
            </Box>
          </Box>

          {/* observar link */}
          <Typography
            component={Link}
            href="/torneios"

            sx={{
              display: 'block',
              textAlign: 'center',
              fontSize: '0.75rem',
              color: '#9CA3AF',
              textDecoration: 'none',
              mt: 2,
              '&:hover': { color: '#0D8F41' },
            }}
          >
            ou observe os torneios sem cadastro →
          </Typography>

          {/* stats */}
          <Box

            sx={{
              display: 'flex',
              gap: { xs: 4, sm: 6 },
              mt: 6,
              pt: 5,
              borderTop: '1px solid #F3F4F6',
              justifyContent: 'center',
              width: '100%',
            }}
          >
            {[
              { v: String(totalParticipantes ?? 0), l: 'Participantes' },
              { v: String(totalTorneios ?? 0),      l: 'Torneios' },
              { v: String(totalClubes ?? 0),        l: 'Clubes' },
            ].map(s => (
              <Box key={s.l}>
                <Typography sx={{ color: '#111827', fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {s.v}
                </Typography>
                <Typography sx={{ color: '#9CA3AF', fontSize: '0.68rem', mt: 0.5, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {s.l}
                </Typography>
              </Box>
            ))}
          </Box>
          </Box>
        </Container>
      </Box>

      {/* ── RANKING + TORNEIOS ── */}
      <Box sx={{ bgcolor: '#FAFAFA', py: { xs: 7, md: 9 } }}>
        <Container maxWidth={false} sx={{ maxWidth: 1000 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: 6, md: 5 }, alignItems: 'start' }}>

            {/* Torneios */}
            <TorneiosPreview torneios={torneios} />

            {/* Ranking */}
            <RankingPreview userBirdEstilo={userBirdEstilo} />

          </Box>
        </Container>
      </Box>

      {/* ── COMO FUNCIONA ── */}
      <Box sx={{ bgcolor: '#fff', py: { xs: 7, md: 9 } }}>
        <Container maxWidth={false} sx={{ maxWidth: 680 }}>
          <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#0D8F41', mb: 1, textAlign: 'center' }}>
            Simples assim
          </Typography>
          <Typography sx={{ fontSize: { xs: '1.55rem', sm: '1.9rem' }, fontWeight: 800, letterSpacing: '-0.025em', color: '#111827', mb: 4, lineHeight: 1.15, textAlign: 'center' }}>
            Como funciona
          </Typography>

          <Box>
            {steps.map((step, i) => (
              <Box key={i}>
                <Box sx={{ display: 'flex', gap: 3, py: 3 }}>
                  <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', color: '#0D8F41', mt: 0.4, minWidth: 24 }}>
                    {step.n}
                  </Typography>
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', mb: 0.6, color: '#111827' }}>
                      {step.title}
                    </Typography>
                    <Typography sx={{ fontSize: '0.85rem', color: '#6B7280', lineHeight: 1.65 }}>
                      {step.desc}
                    </Typography>
                  </Box>
                </Box>
                {i < steps.length - 1 && <Divider sx={{ borderColor: '#F3F4F6' }} />}
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* ── CTA FINAL ── */}
      <Box sx={{ bgcolor: '#fff', borderTop: '1px solid #F3F4F6', py: { xs: 8, md: 10 }, position: 'relative', overflow: 'hidden' }}>
        {/* decorative wave */}
        <Box sx={{ position: 'absolute', right: { xs: -40, sm: 0 }, top: '50%', transform: 'translateY(-50%)', opacity: 0.04, pointerEvents: 'none' }}>
          <svg width="480" height="340" viewBox="0 0 22 16" fill="none">
            <path d="M1 8 Q5.5 1 11 8 Q16.5 15 21 8" stroke="#0D8F41" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </Box>
        <Container maxWidth={false} sx={{ maxWidth: 680, position: 'relative' }}>
          <Box sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: { xs: 'center', sm: 'center' } }}>
          <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#0D8F41', mb: 2 }}>
            Comece agora
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: '2rem', sm: '2.6rem' },
              fontWeight: 800,
              color: '#111827',
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
              mb: 2,
            }}
          >
            Pronto para{' '}
            <Box component="span" sx={{ color: '#0D8F41' }}>competir?</Box>
          </Typography>
          <Typography sx={{ color: '#6B7280', fontSize: '0.9rem', lineHeight: 1.7, mb: 5, maxWidth: 380 }}>
            Cadastro grátis. Inscreva seu pássaro ou organize seu próprio torneio.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: { xs: 'center', sm: 'center' } }}>
            <Button
              component={Link}
              href="/cadastro"
              variant="contained"
              size="large"
              sx={{ bgcolor: '#0D8F41', color: '#fff', fontWeight: 700, px: 4, '&:hover': { bgcolor: '#0B7A36' } }}
            >
              Sou participante
            </Button>
            <Button
              component={Link}
              href="/cadastro?tipo=clube"
              variant="outlined"
              size="large"
              sx={{
                borderColor: '#E5E7EB',
                color: '#374151',
                fontWeight: 600,
                px: 4,
                '&:hover': { borderColor: '#0D8F41', color: '#0D8F41', bgcolor: '#F0FDF4' },
              }}
            >
              Sou clube
            </Button>
          </Box>
          </Box>
        </Container>
      </Box>

      {/* ── FOOTER ── */}
      <Box component="footer" sx={{ bgcolor: '#111827', pt: 6, pb: 5 }}>
        <Container maxWidth={false} sx={{ maxWidth: 680 }}>
          {/* top grid: brand full + explorar/conta side-by-side mobile / 3 col desktop */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', sm: '2fr 1fr 1fr' },
              gap: { xs: 4, sm: 6 },
              mb: 5,
              textAlign: { xs: 'center', sm: 'left' },
            }}
          >
            {/* brand — full width on mobile */}
            <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' }, display: 'flex', flexDirection: 'column', alignItems: { xs: 'center', sm: 'flex-start' }, gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <BirdMark size={36} />
                <Typography sx={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em' }}>
                  <AveumWordmark onDark />
                </Typography>
              </Box>
              <Typography sx={{ fontSize: '0.78rem', color: '#6B7280', lineHeight: 1.6, maxWidth: 220 }}>
                Torneios de canto de pássaro com placar em tempo real.
              </Typography>
            </Box>

            {/* explorar */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, alignItems: { xs: 'center', sm: 'flex-start' } }}>
              <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Explorar
              </Typography>
              {[
                { href: '/torneios', label: 'Torneios' },
                { href: '/liga',     label: 'Liga' },
              ].map(l => (
                <Link key={l.href} href={l.href} style={{ fontSize: '0.82rem', color: '#9CA3AF', textDecoration: 'none' }}>
                  {l.label}
                </Link>
              ))}
            </Box>

            {/* conta */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, alignItems: { xs: 'center', sm: 'flex-start' } }}>
              <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#4B5563', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Conta
              </Typography>
              {[
                { href: '/login',         label: 'Entrar' },
                { href: '/cadastro',      label: 'Criar conta' },
                { href: '/configuracoes', label: 'Configurações' },
              ].map(l => (
                <Link key={l.href} href={l.href} style={{ fontSize: '0.82rem', color: '#9CA3AF', textDecoration: 'none' }}>
                  {l.label}
                </Link>
              ))}
            </Box>
          </Box>

          {/* bottom row */}
          <Box sx={{
            borderTop: '1px solid #1F2937',
            pt: 3,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: { xs: 'center', sm: 'space-between' },
            alignItems: 'center',
            gap: 1.5,
            textAlign: { xs: 'center', sm: 'left' },
          }}>
            <Typography sx={{ fontSize: '0.72rem', color: '#4B5563' }}>
              © 2025 aveum. Todos os direitos reservados.
            </Typography>
            <Link href="mailto:contato@aveum.com.br" style={{ fontSize: '0.72rem', color: '#4B5563', textDecoration: 'none' }}>
              contato@aveum.com.br
            </Link>
          </Box>
        </Container>
      </Box>

    </Box>
    </>
  )
}
