import LogoutButton from '../aprovacao-pendente/logout-button'

export const dynamic = 'force-dynamic'

export default function BanidoPage() {
  return (
    <main style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '0 24px', textAlign: 'center', background: '#fff' }}>
      <span style={{ fontSize: '3rem' }}>🚫</span>
      <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#111827' }}>Acesso suspenso</h1>
      <p style={{ color: '#6B7280', fontSize: '0.88rem', margin: 0, maxWidth: 360, lineHeight: 1.55 }}>
        Sua conta foi suspensa pela administração. Se você acredita que isso é um engano,
        entre em contato pelo suporte.
      </p>
      <LogoutButton />
    </main>
  )
}
