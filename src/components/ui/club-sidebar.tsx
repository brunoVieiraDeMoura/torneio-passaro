'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BirdMark, AveumWordmark } from '@/components/ui/bird-mark'

interface Props {
  clubName: string
  userName: string
}

const NAV = [
  {
    href: '/clube/dashboard', label: 'Dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    href: '/clube/torneios', label: 'Torneios',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
        <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
      </svg>
    ),
  },
  {
    href: '/clube/participantes', label: 'Participantes',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    href: '/clube/ranking', label: 'Ranking',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
  {
    href: '/clube/historico', label: 'Histórico',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5"/>
      </svg>
    ),
  },
  {
    href: '/clube/configuracoes', label: 'Configurações',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
  {
    href: '/clube/tutorial', label: 'Tutorial',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
        <path d="M12 17h.01"/>
      </svg>
    ),
  },
]

export default function ClubSidebar({ clubName, userName }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const sidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #F3F4F6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <BirdMark size={32} />
          <AveumWordmark style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.02em' }} />
        </div>
        <div style={{ background: '#F0FDF4', border: '1px solid #D1FAE5', borderRadius: 8, padding: '8px 10px' }}>
          <p style={{ margin: 0, fontSize: '0.68rem', fontWeight: 700, color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Clube</p>
          <p style={{ margin: '2px 0 0', fontSize: '0.82rem', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{clubName}</p>
        </div>
      </div>

      {/* nav */}
      <nav style={{ flex: 1, padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(item => {
          const active = pathname === item.href || (item.href !== '/clube/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8, textDecoration: 'none',
                background: active ? '#F0FDF4' : 'transparent',
                color: active ? '#0D8F41' : '#6B7280',
                fontWeight: active ? 700 : 500,
                fontSize: '0.85rem',
                transition: 'background 0.12s, color 0.12s',
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* user + logout */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid #F3F4F6' }}>
        <div style={{ padding: '8px 12px', marginBottom: 4 }}>
          <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            width: '100%', padding: '8px 12px', borderRadius: 8,
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#9CA3AF', fontSize: '0.82rem', fontFamily: 'inherit',
            transition: 'color 0.12s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sair
        </button>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        .club-sidebar {
          position: fixed; top: 0; right: 0; bottom: 0; left: auto; width: 220px;
          background: #fff; border-left: 1px solid #F3F4F6;
          z-index: 200; overflow-y: auto;
          transform: translateX(100%); transition: transform 0.25s ease;
        }
        .club-sidebar.open { transform: translateX(0); }
        .club-topbar {
          display: flex; position: fixed; top: 0; left: 0; right: 0; height: 56px;
          background: #fff; border-bottom: 1px solid #F3F4F6;
          z-index: 100; align-items: center; justify-content: space-between; padding: 0 16px; gap: 12px;
        }
        .club-overlay {
          display: none; position: fixed; inset: 0;
          background: rgba(0,0,0,0.35); z-index: 150;
        }
        .club-overlay.open { display: block; }
        @media (min-width: 768px) {
          .club-sidebar {
            left: 0; right: auto; border-left: none; border-right: 1px solid #F3F4F6;
            transform: translateX(0) !important;
          }
          .club-topbar { display: none !important; }
          .club-overlay { display: none !important; }
        }
      `}</style>

      {/* mobile top bar */}
      <div className="club-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <BirdMark size={30} />
          <AveumWordmark style={{ fontWeight: 800, fontSize: '0.9rem', letterSpacing: '-0.02em' }} />
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, lineHeight: 0 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </div>

      {/* overlay */}
      <div className={`club-overlay${open ? ' open' : ''}`} onClick={() => setOpen(false)} />

      {/* sidebar */}
      <div className={`club-sidebar${open ? ' open' : ''}`}>
        {sidebarContent}
      </div>
    </>
  )
}
