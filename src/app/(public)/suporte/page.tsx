'use client'

import { useState, type FormEvent } from 'react'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'

const CONTACT_EMAIL = 'contato@aveum.com.br'

export default function SuportePage() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [assunto, setAssunto] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [sent, setSent] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const subject = encodeURIComponent(`[Suporte] ${assunto || 'Reportar problema'}`)
    const body = encodeURIComponent(
      `Nome: ${nome}\nEmail: ${email}\n\n${mensagem}`
    )
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`
    setSent(true)
  }

  const inputStyle = {
    width: '100%', boxSizing: 'border-box' as const,
    border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 14px',
    fontSize: '0.875rem', fontFamily: 'inherit', color: '#111827',
    background: '#fff', outline: 'none',
  }

  return (
    <Box sx={{ bgcolor: '#fff', minHeight: '100vh' }}>
      <Box sx={{ borderBottom: '1px solid #F3F4F6', py: { xs: 5, sm: 8 } }}>
        <Container maxWidth={false} sx={{ maxWidth: 560 }}>
          <Typography sx={{ color: '#0D8F41', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', mb: 2 }}>
            Suporte
          </Typography>
          <Typography component="h1" sx={{ fontSize: { xs: '1.75rem', sm: '2.2rem' }, fontWeight: 800, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1.1, mb: 1.5 }}>
            Reportar problema
          </Typography>
          <Typography sx={{ color: '#6B7280', fontSize: '0.9rem', lineHeight: 1.7 }}>
            Preencha os campos abaixo e clique em enviar.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth={false} sx={{ maxWidth: 560, py: { xs: 4, sm: 6 } }}>
        {sent ? (
          <Box sx={{ border: '1px solid #D1FAE5', bgcolor: '#F0FDF4', borderRadius: 2, p: 3 }}>
            <Typography sx={{ fontWeight: 700, color: '#065F46', fontSize: '0.95rem', mb: 0.75 }}>
              Pronto! Seu cliente de email foi aberto.
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', color: '#374151', lineHeight: 1.7 }}>
              Se não abriu automaticamente, envie sua mensagem diretamente para{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#0D8F41', fontWeight: 600 }}>
                {CONTACT_EMAIL}
              </a>
              .
            </Typography>
          </Box>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Nome
                </label>
                <input
                  required
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Seu nome"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Email para resposta
                </label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  style={inputStyle}
                />
              </div>
            </Box>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Assunto
              </label>
              <input
                required
                value={assunto}
                onChange={e => setAssunto(e.target.value)}
                placeholder="Descreva o problema em poucas palavras"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Mensagem
              </label>
              <textarea
                required
                value={mensagem}
                onChange={e => setMensagem(e.target.value)}
                placeholder="Descreva o problema com o máximo de detalhes possível..."
                rows={6}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
              />
            </div>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                Ou escreva direto para{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#0D8F41', fontWeight: 500 }}>
                  {CONTACT_EMAIL}
                </a>
              </Typography>
              <button type="submit" style={{
                background: '#0D8F41', color: '#fff', border: 'none',
                borderRadius: 8, padding: '10px 24px',
                fontSize: '0.875rem', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Enviar →
              </button>
            </Box>
          </form>
        )}
      </Container>
    </Box>
  )
}
