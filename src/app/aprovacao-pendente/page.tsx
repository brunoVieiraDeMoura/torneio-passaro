import Link from 'next/link'
import LogoutButton from './logout-button'

export const dynamic = 'force-dynamic'

export default function AprovacaoPendentePage() {
  return (
    <main style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '0 24px', textAlign: 'center', background: '#fff' }}>
      <span style={{ fontSize: '3rem' }}>⏳</span>
      <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#111827' }}>Clube aguardando aprovação</h1>
      <p style={{ color: '#6B7280', fontSize: '0.88rem', margin: 0, maxWidth: 360, lineHeight: 1.55 }}>
        Seu cadastro de clube foi recebido e está em análise pela administração.
        Assim que for aprovado, você terá acesso ao painel do clube.
      </p>
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <Link href="/" style={{ padding: '10px 20px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, color: '#374151', textDecoration: 'none' }}>
          Página inicial
        </Link>
        <LogoutButton />
      </div>
    </main>
  )
}
