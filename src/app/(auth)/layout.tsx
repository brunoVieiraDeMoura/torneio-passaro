import Link from 'next/link'
import Header from '@/components/ui/header'
import { createClient } from '@/lib/supabase/server'

function BirdMark({ color = '#0D8F41', size = 22 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size * 16 / 22} viewBox="0 0 22 16" fill="none" aria-hidden="true">
      <path d="M1 8 Q5.5 1 11 8 Q16.5 15 21 8" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}

const stats = [
  { v: '327', l: 'Participantes' },
  { v: '48',  l: 'Torneios' },
  { v: '12',  l: 'Clubes' },
]

const features = [
  { icon: '⏱', text: 'Placar em tempo real durante o torneio' },
  { icon: '📋', text: 'Inscrições com aprovação pelo clube' },
  { icon: '🏆', text: 'Ranking nacional por temporada' },
]

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return (
    <div style={{ height: '100dvh', display: 'flex' }}>

      {/* ── LEFT PANEL (desktop only) ── */}
      <div
        className="auth-left"
        style={{
          width: 420,
          flexShrink: 0,
          background: '#0A1F0E',
          display: 'flex',
          flexDirection: 'column',
          padding: '40px 40px 36px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* decorative wave watermark */}
        <div style={{ position: 'absolute', right: -60, bottom: 40, opacity: 0.05, pointerEvents: 'none' }}>
          <svg width="520" height="360" viewBox="0 0 22 16" fill="none">
            <path d="M1 8 Q5.5 1 11 8 Q16.5 15 21 8" stroke="#fff" strokeWidth="1" strokeLinecap="round"/>
          </svg>
        </div>

        {/* logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 'auto' }}>
          <BirdMark color="#0D8F41" size={26} />
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff', letterSpacing: '-0.02em' }}>
            Cantorias
          </span>
        </Link>

        {/* main copy */}
        <div style={{ marginBottom: 40 }}>
          <p style={{ margin: '0 0 8px', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#4ADE80' }}>
            Plataforma oficial
          </p>
          <h2 style={{ margin: '0 0 14px', fontWeight: 800, fontSize: '1.8rem', color: '#fff', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
            Onde as melhores<br />
            <span style={{ color: '#4ADE80' }}>aves competem.</span>
          </h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#6B7280', lineHeight: 1.65 }}>
            Torneios de canto com placar ao vivo, ranking nacional e aprovação de inscrições.
          </p>
        </div>

        {/* features */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 40 }}>
          {features.map(f => (
            <div key={f.text} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: 'rgba(13,143,65,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontSize: '0.8rem',
              }}>
                {f.icon}
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#9CA3AF', lineHeight: 1.5, paddingTop: 5 }}>
                {f.text}
              </p>
            </div>
          ))}
        </div>

        {/* stats */}
        <div style={{ display: 'flex', gap: 28, paddingTop: 28, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          {stats.map(s => (
            <div key={s.l}>
              <p style={{ margin: '0 0 2px', fontWeight: 800, fontSize: '1.3rem', color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>
                {s.v}
              </p>
              <p style={{ margin: 0, fontSize: '0.65rem', color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {s.l}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#FAFAFA', minWidth: 0 }}>

        {/* mobile-only header */}
        <div className="auth-mobile-header" style={{ flexShrink: 0 }}>
          <Header initialUser={user} />
        </div>

        {/* form area */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 20px 48px' }}>
          <div style={{ width: '100%', maxWidth: 400 }}>
            {children}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 639px) {
          .auth-left          { display: none !important; }
          .auth-mobile-header { display: block !important; }
        }
        @media (min-width: 640px) {
          .auth-left          { display: flex !important; }
          .auth-mobile-header { display: none !important; }
        }
      `}</style>
    </div>
  )
}
