'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import GoogleButton, { OrDivider } from '@/components/ui/google-button'

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #E5E7EB', borderRadius: 8,
  padding: '11px 13px', fontSize: '0.88rem', outline: 'none',
  fontFamily: 'inherit', color: '#111827', background: '#fff', boxSizing: 'border-box',
}

// Formulário de login compartilhado. mode decide a INTENÇÃO:
//  • 'participante' → entra no fluxo de participante (/torneios)
//  • 'clube'        → entra como clube (dashboard); sem clube ainda → cria em /clube/setup
// 1 email pode ser os dois — o caminho do login (/login/participante vs /login/clubes) decide.
export default function LoginForm({ mode }: { mode: 'participante' | 'clube' }) {
  const router = useRouter()
  const params = useSearchParams()
  const redirect = params.get('redirect')
  const isClubLogin = mode === 'clube'
  const googleNext = redirect ?? (isClubLogin ? '/clube/dashboard' : '/torneios')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    // redirect (QR) vence; senão, roteia pela intenção do login.
    // clube sem clube nesta conta → /clube/setup cria um placeholder e leva às configurações.
    let dest = redirect ?? '/torneios'
    if (!redirect && isClubLogin) {
      const { data: ownsClub } = await supabase
        .from('clubs').select('id').eq('user_id', data.user.id).maybeSingle()
      dest = ownsClub ? '/clube/dashboard' : '/clube/setup'
    }
    router.push(dest)
    router.refresh()
  }

  return (
    <div style={{ padding: '8px 4px' }}>
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#6B7280', textDecoration: 'none', fontWeight: 600, marginBottom: 24 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        Voltar para o início
      </Link>

      <p style={{ margin: '0 0 6px', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#0D8F41', textAlign: 'center' }}>
        {isClubLogin ? 'Área do clube' : 'Participante'}
      </p>
      <h1 style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '1.5rem', color: '#111827', letterSpacing: '-0.025em', textAlign: 'center' }}>
        {isClubLogin ? 'Entrar como clube' : 'Entrar'}
      </h1>
      <p style={{ margin: '0 0 20px', fontSize: '0.82rem', color: '#9CA3AF', textAlign: 'center' }}>
        {isClubLogin ? 'É participante? ' : 'É um clube? '}
        <Link href={isClubLogin ? '/login/participante' : '/login/clubes'} style={{ color: '#0D8F41', fontWeight: 600, textDecoration: 'none' }}>
          {isClubLogin ? 'Entrar como participante' : 'Entrar como clube'}
        </Link>
      </p>

      <GoogleButton next={googleNext} label={isClubLogin ? 'Entrar como clube com Google' : 'Entrar com Google'} />
      <OrDivider />

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
            Email
          </label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" placeholder="seu@email.com" style={inputStyle} />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
              Senha
            </label>
            <Link href="/perdeu" style={{ fontSize: '0.73rem', color: '#9CA3AF', textDecoration: 'none' }}>
              Esqueci a senha
            </Link>
          </div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" placeholder="••••••" style={inputStyle} />
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 13px', fontSize: '0.8rem', color: '#DC2626' }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} style={{
          background: loading ? '#D1D5DB' : '#0D8F41', color: '#fff', border: 'none',
          borderRadius: 8, padding: '13px', fontSize: '0.88rem', fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          marginTop: 4, transition: 'background 0.15s', width: '100%',
        }}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <p style={{ margin: '20px 0 0', fontSize: '0.82rem', color: '#9CA3AF', textAlign: 'center' }}>
        Não tem conta?{' '}
        <Link href={isClubLogin ? '/cadastro?tipo=clube' : '/cadastro'} style={{ color: '#0D8F41', fontWeight: 600, textDecoration: 'none' }}>
          Criar conta
        </Link>
      </p>
    </div>
  )
}
