'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid #E5E7EB',
  borderRadius: 8,
  padding: '11px 13px',
  fontSize: '0.88rem',
  outline: 'none',
  fontFamily: 'inherit',
  color: '#111827',
  background: '#fff',
  boxSizing: 'border-box',
}

export default function PerdeuPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    setSent(true)
    setLoading(false)
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: '32px 24px' }}>
      <h1 style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '1.5rem', color: '#111827', letterSpacing: '-0.025em' }}>
        Esqueceu a senha?
      </h1>
      <p style={{ margin: '0 0 28px', fontSize: '0.82rem', color: '#9CA3AF' }}>
        Informe seu email e enviaremos um link de recuperação.
      </p>

      {sent ? (
        <div style={{ textAlign: 'center', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
          <div style={{ width: 48, height: 48, background: '#F0FDF4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0D8F41" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: '0.95rem', color: '#111827' }}>Email enviado!</p>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#9CA3AF' }}>Verifique sua caixa de entrada.</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="seu@email.com"
              style={inputStyle}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? '#D1D5DB' : '#0D8F41',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '13px',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.15s',
              width: '100%',
            }}
          >
            {loading ? 'Enviando...' : 'Enviar link'}
          </button>
        </form>
      )}

      <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #F3F4F6' }}>
        <Link href="/login" style={{ fontSize: '0.8rem', color: '#9CA3AF', textDecoration: 'none' }}>
          ← Voltar ao login
        </Link>
      </div>
    </div>
  )
}
