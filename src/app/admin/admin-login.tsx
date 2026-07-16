'use client'

import { useActionState } from 'react'
import { adminLogin } from './actions'

const inp: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '11px 12px',
  border: '1px solid #E5E7EB', borderRadius: 8, fontSize: '0.9rem',
  fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#111827',
}
const lbl: React.CSSProperties = {
  display: 'block', marginBottom: 6, fontSize: '0.72rem', fontWeight: 700,
  color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em',
}

export default function AdminLogin() {
  const [state, action, pending] = useActionState(adminLogin, undefined)

  return (
    <main style={{ minHeight: '100dvh', background: '#0A1F0E', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <form action={action} style={{ background: '#fff', borderRadius: 16, padding: '32px 28px', width: '100%', maxWidth: 380, boxSizing: 'border-box', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>
        <p style={{ margin: '0 0 4px', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#0D8F41' }}>
          Admin Central
        </p>
        <h1 style={{ margin: '0 0 20px', fontWeight: 800, fontSize: '1.25rem', color: '#111827', letterSpacing: '-0.02em' }}>
          Acesso restrito
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={lbl} htmlFor="admin-user">Login</label>
            <input id="admin-user" name="user" autoComplete="username" required style={inp} />
          </div>
          <div>
            <label style={lbl} htmlFor="admin-pass">Senha</label>
            <input id="admin-pass" name="password" type="password" autoComplete="current-password" required style={inp} />
          </div>

          {state?.error && (
            <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 600, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '9px 12px' }}>
              {state.error}
            </p>
          )}

          <button type="submit" disabled={pending} style={{
            background: '#0D8F41', color: '#fff', border: 'none', borderRadius: 8,
            padding: '12px', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', opacity: pending ? 0.7 : 1,
          }}>
            {pending ? 'Entrando…' : 'Entrar'}
          </button>
        </div>
      </form>
    </main>
  )
}
