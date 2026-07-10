import { Suspense } from 'react'
import Link from 'next/link'
import CadastroForm from './cadastro-form'

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
      <div style={{
        width: 22, height: 22,
        border: '2px solid #E5E7EB',
        borderTopColor: '#0D8F41',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

export default function CadastroPage() {
  return (
    <div style={{ padding: '8px 4px' }}>
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#6B7280', textDecoration: 'none', fontWeight: 600, marginBottom: 24 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        Voltar para o início
      </Link>

      <h1 style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '1.5rem', color: '#111827', letterSpacing: '-0.025em', textAlign: 'center' }}>
        Criar conta
      </h1>
      <p style={{ margin: '0 0 28px', fontSize: '0.82rem', color: '#9CA3AF', textAlign: 'center' }}>
        Já tem conta?{' '}
        <Link href="/login" style={{ color: '#0D8F41', fontWeight: 600, textDecoration: 'none' }}>
          Entrar
        </Link>
      </p>
      <Suspense fallback={<Spinner />}>
        <CadastroForm />
      </Suspense>
    </div>
  )
}
