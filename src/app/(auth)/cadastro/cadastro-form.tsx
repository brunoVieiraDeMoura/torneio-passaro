'use client'

import { useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import MUNICIPIOS from '@/data/municipios.json'

const ESTADOS = Object.keys(MUNICIPIOS as Record<string, string[]>).sort()

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

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.72rem',
  fontWeight: 700,
  color: '#6B7280',
  marginBottom: 6,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
}

export default function CadastroForm() {
  const router = useRouter()
  const params = useSearchParams()
  const tipo = params.get('tipo') === 'clube' ? 'club' : 'user'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [estado, setEstado] = useState('')
  const [cidade, setCidade] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const cidades = useMemo(() => (MUNICIPIOS as Record<string, string[]>)[estado] ?? [], [estado])

  function handleEstado(uf: string) { setEstado(uf); setCidade('') }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()

      // build redirectTo with club data encoded (for email confirmation flow)
      const next = tipo === 'club'
        ? `/clube/setup?estado=${encodeURIComponent(estado)}&cidade=${encodeURIComponent(cidade)}&clubName=${encodeURIComponent(name)}`
        : '/torneios'
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, role: tipo }, emailRedirectTo: redirectTo },
      })
      if (error) { setError(error.message); return }

      if (data.session && data.user) {
        // no email confirmation needed — create club record right now
        if (tipo === 'club') {
          await supabase.from('clubs').insert({
            user_id: data.user.id,
            name,
            cidade: cidade || null,
            estado: estado || null,
          })
        }
        router.push(tipo === 'club' ? '/clube/dashboard' : '/torneios')
        router.refresh()
      } else {
        setEmailSent(true)
      }
    } catch {
      setError('Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div style={{ textAlign: 'center', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        <div style={{ width: 52, height: 52, background: '#F0FDF4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D8F41" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>
        <div>
          <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: '1rem', color: '#111827' }}>Verifique seu email</p>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#9CA3AF', maxWidth: 280 }}>
            Enviamos um link para <strong style={{ color: '#374151' }}>{email}</strong>. Clique para ativar.
          </p>
        </div>
        <Link href="/login" style={{ marginTop: 4, padding: '10px 24px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, color: '#374151', textDecoration: 'none' }}>
          Ir para o login
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* tipo toggle */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 4 }}>
        {(['user', 'club'] as const).map(t => (
          <a key={t} href={t === 'club' ? '/cadastro?tipo=clube' : '/cadastro'} style={{
            padding: '9px 12px', borderRadius: 8,
            border: `1.5px solid ${tipo === t ? '#0D8F41' : '#E5E7EB'}`,
            background: tipo === t ? '#F0FDF4' : '#fff',
            color: tipo === t ? '#0D8F41' : '#6B7280',
            fontSize: '0.78rem', fontWeight: tipo === t ? 700 : 500,
            textAlign: 'center', textDecoration: 'none', transition: 'all 0.15s',
          }}>
            {t === 'user' ? 'Participante' : 'Clube'}
          </a>
        ))}
      </div>

      <div>
        <label style={labelStyle}>{tipo === 'club' ? 'Nome do clube' : 'Seu nome'}</label>
        <input
          type="text" value={name} onChange={e => setName(e.target.value)}
          required autoComplete="name"
          placeholder={tipo === 'club' ? 'Canários do Vale SC' : 'João Silva'}
          style={inputStyle}
        />
      </div>

      {/* estado + cidade — apenas para clube */}
      {tipo === 'club' && (<>
        <div>
          <label style={labelStyle}>Estado</label>
          <select
            style={{ ...inputStyle, color: estado ? '#111827' : '#9CA3AF' }}
            value={estado} onChange={e => handleEstado(e.target.value)} required
          >
            <option value="">Selecionar estado...</option>
            {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Cidade</label>
          <select
            style={{ ...inputStyle, color: cidade ? '#111827' : '#9CA3AF' }}
            value={cidade} onChange={e => setCidade(e.target.value)}
            required disabled={!estado}
          >
            <option value="">{estado ? 'Selecionar cidade...' : 'Selecione o estado primeiro'}</option>
            {cidades.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </>)}

      <div>
        <label style={labelStyle}>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" placeholder="seu@email.com" style={inputStyle} />
      </div>

      <div>
        <label style={labelStyle}>Senha</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" placeholder="Mínimo 6 caracteres" style={inputStyle} />
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 13px', fontSize: '0.8rem', color: '#DC2626' }}>
          {error}
        </div>
      )}

      <button type="submit" disabled={loading} style={{
        background: loading ? '#D1D5DB' : '#0D8F41', color: '#fff',
        border: 'none', borderRadius: 8, padding: '13px',
        fontSize: '0.88rem', fontWeight: 700,
        cursor: loading ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit', marginTop: 4, transition: 'background 0.15s', width: '100%',
      }}>
        {loading ? 'Criando...' : 'Criar conta'}
      </button>
    </form>
  )
}
