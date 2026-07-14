'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

// Login/cadastro com Google (Supabase OAuth). `next` = para onde ir após o callback.
export default function GoogleButton({ next = '/torneios', label = 'Continuar com Google' }: { next?: string; label?: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGoogle() {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    })
    // sucesso redireciona a página inteira; só volta aqui em erro
    if (error) {
      setError('Não foi possível conectar com o Google. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <>
      <button type="button" onClick={handleGoogle} disabled={loading} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        width: '100%', padding: '12px', background: '#fff',
        border: '1px solid #E5E7EB', borderRadius: 8,
        fontSize: '0.88rem', fontWeight: 600, color: '#374151',
        cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit',
        opacity: loading ? 0.7 : 1, transition: 'opacity 0.15s',
      }}>
        <GoogleIcon />
        {loading ? 'Conectando...' : label}
      </button>
      {error && (
        <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: '#DC2626', textAlign: 'center' }}>{error}</p>
      )}
    </>
  )
}

// Divisor "ou" usado entre o botão Google e o formulário de email/senha
export function OrDivider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
      <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>ou</span>
      <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
    </div>
  )
}
