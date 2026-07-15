'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { BirdMark, AveumWordmark } from '@/components/ui/bird-mark'

const navLinks = [
  {
    href: '/torneios', label: 'Torneios', authOnly: false,
    icon: (color: string) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/>
        <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
        <path d="M18 2H6v7a6 6 0 0012 0V2z"/>
      </svg>
    ),
  },
  {
    href: '/liga', label: 'Liga', authOnly: false,
    icon: (color: string) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
  {
    href: '/meus-passarinhos', label: 'Meus Pássaros', authOnly: true,
    icon: (color: string) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 7h.01"/>
        <path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20"/>
        <path d="m20 7 2 .5-2 .5"/>
        <path d="M10 18v3"/>
        <path d="M14 17.75v3.25"/>
        <path d="M7 18a6 6 0 0 0 3.84-10.61"/>
      </svg>
    ),
  },
]

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  )
}

function SignOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}


function HelpIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <path d="M12 17h.01"/>
    </svg>
  )
}

function MessageIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

function initials(user: User): string {
  const name: string = user.user_metadata?.full_name || user.user_metadata?.name || user.email || '?'
  return name.split(/\s+/).slice(0, 2).map((p: string) => p[0]?.toUpperCase() ?? '').join('')
}

function Avatar({ user, size = 32 }: { user: User; size?: number }) {
  const avatarUrl: string | undefined = user.user_metadata?.avatar_url
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarUrl} alt="avatar" width={size} height={size} style={{ borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: '#0D8F41', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, letterSpacing: '-0.02em', flexShrink: 0, userSelect: 'none',
    }}>
      {initials(user)}
    </div>
  )
}

const dropdownItemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '9px 16px', fontSize: '0.85rem', fontWeight: 500,
  color: '#374151', textDecoration: 'none', width: '100%',
  background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
}

export default function Header({ initialUser }: { initialUser?: User | null }) {
  const [open, setOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [user, setUser] = useState<User | null>(initialUser ?? null)
  // participação ativa (aguardando/participando) em torneio aberto/rolando → botão "Voltar ao torneio"
  const [torneioAtivo, setTorneioAtivo] = useState<{ tid: string; pid: string } | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { setOpen(false); setDropdownOpen(false) }, [pathname])

  // checa se o usuário tem inscrição (pendente ou aprovada) em torneio aberto/ao vivo.
  // Se a marcação do grupo dele estiver em CONTAGEM, redireciona pra tela de marcação
  // na hora (mesmo que ele tenha saído da tela) — poll de 10s pega o início sozinho.
  useEffect(() => {
    if (!user) { setTorneioAtivo(null); return }
    const naTelaDoTorneio = /^\/torneio\/[^/]+\/participante/.test(pathname)
    let cancelled = false
    const supabase = createClient()
    async function check() {
      const { data } = await supabase
        .from('participants')
        .select('id, tournament_id, status, round_group, tournaments!inner(status, start_at, duration_secs, active_group, divisions)')
        .eq('user_id', user!.id)
        .in('status', ['pending', 'approved'])
      if (cancelled) return
      type TInfo = { status: string; start_at: string | null; duration_secs: number; active_group: number | null; divisions: number | null }
      const tinfo = (p: { tournaments: unknown }): TInfo | undefined => {
        const rel = p.tournaments as unknown
        return (Array.isArray(rel) ? rel[0] : rel) as TInfo | undefined
      }
      const actives = (data ?? []).filter(p => {
        const t = tinfo(p)
        return t?.status === 'open' || t?.status === 'running'
      })
      const counting = actives.find(p => {
        if (p.status !== 'approved') return false
        const t = tinfo(p)
        if (!t?.start_at) return false
        const start = new Date(t.start_at).getTime()
        const end = start + (t.duration_secs ?? 0) * 1000
        const now = Date.now()
        // 1min antes do início já puxa de volta pra tela de marcação
        if (now < start - 60_000 || now > end) return false
        return (t.divisions ?? 1) <= 1 || p.round_group === (t.active_group ?? 1)
      })
      if (counting && !naTelaDoTorneio) {
        window.location.assign(`/torneio/${counting.tournament_id}/participante?pid=${counting.id}`)
        return
      }
      const active = actives[0]
      setTorneioAtivo(active ? { tid: active.tournament_id, pid: active.id } : null)
    }
    check()
    const id = setInterval(check, 10_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [user, pathname])

  const voltarBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    background: '#0D8F41', color: '#fff', textDecoration: 'none',
    borderRadius: 20, padding: '7px 13px',
    fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0,
  }
  const voltarBtn = torneioAtivo && (
    <Link href={`/torneio/${torneioAtivo.tid}/participante?pid=${torneioAtivo.pid}`} style={voltarBtnStyle}>
      <span className="live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
      Voltar ao torneio
    </Link>
  )

  useEffect(() => {
    if (!dropdownOpen) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setDropdownOpen(false)
    router.push('/')
    router.refresh()
  }

  const displayName: string =
    user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || ''

  const visibleLinks = navLinks.filter(l => !l.authOnly || user)

  return (
    <>
      <header className="site-header" style={{ position: 'sticky', top: 0, zIndex: 200, background: '#fff', borderBottom: '1px solid #F3F4F6' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', gap: 8 }}>

          {/* logo */}
          <button
            onClick={() => {
              setOpen(false)
              if (pathname === '/') {
                window.scrollTo({ top: 0, behavior: 'smooth' })
              } else {
                router.push('/')
              }
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginRight: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <BirdMark size={36} />
            <AveumWordmark style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em', lineHeight: 1 }} />
          </button>

          {/* desktop nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="desktop-nav">
            {visibleLinks.map(link => {
              const active = pathname === link.href || pathname.startsWith(link.href + '/')
              return (
                <Link key={link.href} href={link.href} style={{
                  fontSize: '0.82rem', fontWeight: active ? 600 : 500,
                  color: active ? '#0D8F41' : '#6B7280',
                  textDecoration: 'none', padding: '6px 12px', borderRadius: 8, transition: 'color 0.15s',
                }}>
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* participando de torneio ativo → atalho de volta (fica ao lado do hamburguer no mobile) */}
          {voltarBtn}

          {/* desktop auth */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }} className="desktop-auth" ref={dropdownRef}>
            {user ? (
              <>
                <button
                  onClick={() => setDropdownOpen(v => !v)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0, padding: 0, borderRadius: '50%' }}
                  aria-label="Menu do usuário"
                >
                  <Avatar user={user} size={32} />
                </button>

                {/* avatar dropdown */}
                {dropdownOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                    background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.1)', minWidth: 230,
                    overflow: 'hidden', zIndex: 300,
                  }}>
                    {/* user info */}
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar user={user} size={34} />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {displayName}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {user.email}
                        </p>
                      </div>
                    </div>

                    {/* suporte */}
                    <div style={{ borderTop: '1px solid #F3F4F6', padding: '6px 0' }}>
                      <p style={{ margin: 0, padding: '4px 16px 6px', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9CA3AF' }}>
                        Suporte
                      </p>
                      <Link href="/faq" onClick={() => setDropdownOpen(false)} style={dropdownItemStyle}>
                        <HelpIcon />
                        Perguntas frequentes
                      </Link>
                      <a
                        href="/suporte"
                        onClick={() => setDropdownOpen(false)}
                        style={{ ...dropdownItemStyle, display: 'flex', boxSizing: 'border-box' }}
                      >
                        <MessageIcon />
                        Reportar problema
                      </a>
                    </div>

                    {/* sign out */}
                    <div style={{ borderTop: '1px solid #F3F4F6', padding: '6px 0' }}>
                      <button onClick={handleSignOut} style={{ ...dropdownItemStyle, color: '#DC2626', fontWeight: 600 }}>
                        <SignOutIcon />
                        Sair
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <Link href="/login" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0D8F41', textDecoration: 'none', padding: '5.5px 14px', borderRadius: 8, border: '1.5px solid #0D8F41' }}>
                  Entrar
                </Link>
                <Link href="/cadastro" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', textDecoration: 'none', padding: '7px 16px', borderRadius: 8, background: '#0D8F41' }}>
                  Criar conta
                </Link>
              </>
            )}
          </div>

          {/* mobile hamburger */}
          <button onClick={() => setOpen(v => !v)} className="mobile-menu-btn"
            style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: '#374151', padding: 6, borderRadius: 6, lineHeight: 0 }}
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </header>

      {/* mobile backdrop */}
      {open && (
        <div onClick={() => setOpen(false)} style={{
          position: 'fixed', top: 56, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.32)', zIndex: 190,
        }} />
      )}

      {/* mobile dropdown */}
      {open && (
        <div style={{
          position: 'fixed', top: 56, left: 0, right: 0,
          background: '#fff', borderBottom: '1px solid #F3F4F6',
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          padding: '12px 16px 20px',
          display: 'flex', flexDirection: 'column', gap: 4, zIndex: 200,
        }}>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', marginBottom: 4 }}>
              <Avatar user={user} size={36} />
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</p>
                <p style={{ margin: 0, fontSize: '0.7rem', color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
              </div>
            </div>
          )}

          {visibleLinks.map(link => {
            const active = pathname === link.href || pathname.startsWith(link.href + '/')
            const color = active ? '#0D8F41' : '#374151'
            return (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)} style={{
                fontSize: '0.9rem', fontWeight: active ? 700 : 500, color,
                textDecoration: 'none', padding: '10px 12px', borderRadius: 8,
                background: active ? '#F0FDF4' : 'transparent',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                {link.icon(color)}
                {link.label}
              </Link>
            )
          })}

          {/* suporte */}
          <div style={{ height: 1, background: '#F3F4F6', margin: '6px 0 4px' }} />
          <p style={{ margin: 0, padding: '2px 12px 4px', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9CA3AF' }}>
            Suporte
          </p>
          <Link href="/faq" onClick={() => setOpen(false)} style={{
            fontSize: '0.9rem', fontWeight: 500, color: '#374151',
            textDecoration: 'none', padding: '10px 12px', borderRadius: 8,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <HelpIcon size={18} />
            Perguntas frequentes
          </Link>
          <a
            href="/suporte"
            onClick={() => setOpen(false)}
            style={{
              fontSize: '0.9rem', fontWeight: 500, color: '#374151',
              textDecoration: 'none', padding: '10px 12px', borderRadius: 8,
              display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            <MessageIcon size={18} />
            Reportar problema
          </a>

          <div style={{ height: 1, background: '#F3F4F6', margin: '4px 0' }} />

          {user ? (
            <button onClick={handleSignOut} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 8, fontSize: '0.9rem', fontWeight: 600,
              color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', textAlign: 'left',
            }}>
              <SignOutIcon />
              Sair
            </button>
          ) : (
            <>
              <Link href="/login" onClick={() => setOpen(false)} style={{
                fontSize: '0.9rem', fontWeight: 700, color: '#0D8F41',
                textDecoration: 'none', padding: '11px 16px', borderRadius: 8,
                background: 'transparent', border: '1.5px solid #0D8F41',
                display: 'block', textAlign: 'center', boxSizing: 'border-box',
              }}>
                Entrar
              </Link>
              <Link href="/cadastro" onClick={() => setOpen(false)} style={{
                fontSize: '0.9rem', fontWeight: 700, color: '#fff',
                textDecoration: 'none', padding: '11px 16px', borderRadius: 8,
                background: '#0D8F41', display: 'block', textAlign: 'center', marginTop: 8,
                border: '1.5px solid #0D8F41', boxSizing: 'border-box',
              }}>
                Criar conta
              </Link>
            </>
          )}
        </div>
      )}

      <style>{`
        @media (min-width: 640px) {
          .desktop-nav     { display: flex !important; }
          .desktop-auth    { display: flex !important; }
          .mobile-menu-btn { display: none  !important; }
        }
        @media (max-width: 639px) {
          .desktop-nav     { display: none  !important; }
          .desktop-auth    { display: none  !important; }
          .mobile-menu-btn { display: flex  !important; }
        }
      `}</style>
    </>
  )
}
