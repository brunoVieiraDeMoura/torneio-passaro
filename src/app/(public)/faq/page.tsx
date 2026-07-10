'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Link from 'next/link'

const faqs = [
  {
    q: 'Como me inscrevo em um torneio?',
    a: 'Crie sua conta, cadastre seu pássaro em "Meus Pássaros" e leia o QR Code do torneio no local do evento. Sua inscrição ficará aguardando aprovação do clube organizador.',
  },
  {
    q: 'Como cadastro meu pássaro?',
    a: 'Acesse "Meus Pássaros" no menu após fazer login. Preencha o nome, espécie e demais informações. Você pode cadastrar quantos pássaros quiser.',
  },
  {
    q: 'Como funciona o sistema de pontuação?',
    a: 'Cada canto do pássaro é registrado pelo juiz durante o torneio. A pontuação é acumulada em tempo real e o placar fica visível para todos os participantes e espectadores.',
  },
  {
    q: 'Posso participar sem estar presente no local?',
    a: 'Não. A inscrição exige leitura do QR Code no local do evento, garantindo que o pássaro está presente fisicamente no torneio.',
  },
  {
    q: 'Como crio um torneio? (Clubes)',
    a: 'Crie uma conta do tipo Clube, acesse o painel do clube e clique em "Novo torneio". Configure nome, datas e regras. Um QR Code será gerado automaticamente para inscrições.',
  },
  {
    q: 'Como aprovar ou recusar inscrições?',
    a: 'No painel do clube, acesse o torneio e vá em "Inscrições pendentes". Você pode aprovar ou recusar cada participante individualmente.',
  },
  {
    q: 'O placar é atualizado em tempo real?',
    a: 'Sim. Assim que o juiz registra um canto, o placar atualiza instantaneamente para todos que estão acompanhando o torneio.',
  },
  {
    q: 'O cadastro é gratuito?',
    a: 'Sim, o cadastro como participante é completamente gratuito. Entre em contato para saber sobre planos para clubes organizadores.',
  },
]

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
    >
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

export default function FaqPage() {
  const [openIdx, setOpenIdx] = useState<number>(0)

  return (
    <Box sx={{ bgcolor: '#fff', minHeight: '100vh' }}>
      <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #F3F4F6', py: { xs: 5, sm: 8 } }}>
        <Container maxWidth={false} sx={{ maxWidth: 680 }}>
          <Typography sx={{ color: '#0D8F41', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', mb: 2 }}>
            Suporte
          </Typography>
          <Typography component="h1" sx={{ fontSize: { xs: '1.75rem', sm: '2.4rem' }, fontWeight: 800, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1.05, mb: 1.5 }}>
            Perguntas frequentes
          </Typography>
          <Typography sx={{ color: '#6B7280', fontSize: '0.9rem', lineHeight: 1.7 }}>
            Não encontrou o que procura?{' '}
            <Link href="mailto:contato@cantorias.com.br" style={{ color: '#0D8F41', fontWeight: 600 }}>
              Fale com a gente
            </Link>
            .
          </Typography>
        </Container>
      </Box>

      <Container maxWidth={false} sx={{ maxWidth: 680, py: { xs: 3, sm: 6 } }}>
        <Box sx={{ border: '1px solid #E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
          {faqs.map((item, i) => {
            const isOpen = openIdx === i
            return (
              <Box key={i} sx={{ borderBottom: i < faqs.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                <button
                  onClick={() => setOpenIdx(isOpen ? -1 : i)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 12, padding: '16px 20px', background: 'none', border: 'none',
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '0.9rem', fontWeight: isOpen ? 700 : 600, color: isOpen ? '#0D8F41' : '#111827', lineHeight: 1.4 }}>
                    {item.q}
                  </span>
                  <span style={{ color: isOpen ? '#0D8F41' : '#9CA3AF' }}>
                    <ChevronIcon open={isOpen} />
                  </span>
                </button>

                {isOpen && (
                  <Box sx={{ px: { xs: '20px', sm: '20px' }, pb: '16px' }}>
                    <Typography sx={{ fontSize: '0.875rem', color: '#6B7280', lineHeight: 1.75 }}>
                      {item.a}
                    </Typography>
                  </Box>
                )}
              </Box>
            )
          })}
        </Box>
      </Container>
    </Box>
  )
}
