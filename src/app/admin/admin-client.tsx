'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  id: string; name: string | null; email: string | null
  role: string | null; banned: boolean
}
interface Club {
  id: string; name: string; cidade: string | null; estado: string | null
  status: string; banned: boolean
}

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:  { label: 'Pendente',  color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
  approved: { label: 'Aprovado',  color: '#0D8F41', bg: '#F0FDF4', border: '#D1FAE5' },
  rejected: { label: 'Recusado',  color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
}

const btn =(bg: string, color: string, border = 'none'): React.CSSProperties => ({
  background: bg, color, border, borderRadius: 8, padding: '7px 12px',
  fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
})

export default function AdminClient({ profiles: p0, clubs: c0 }: { profiles: Profile[]; clubs: Club[] }) {
  const [profiles, setProfiles] = useState(p0)
  const [clubs, setClubs] = useState(c0)
  const [tab, setTab] = useState<'clubs' | 'users'>('clubs')
  const [busy, setBusy] = useState<string | null>(null)

  async function toggleBanUser(id: string, banned: boolean) {
    setBusy(id)
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({ banned }).eq('id', id)
    if (!error) setProfiles(prev => prev.map(u => u.id === id ? { ...u, banned } : u))
    setBusy(null)
  }

  async function setClubStatus(id: string, status: string) {
    setBusy(id)
    const supabase = createClient()
    const { error } = await supabase.from('clubs').update({ status }).eq('id', id)
    if (!error) setClubs(prev => prev.map(c => c.id === id ? { ...c, status } : c))
    setBusy(null)
  }

  async function toggleBanClub(id: string, banned: boolean) {
    setBusy(id)
    const supabase = createClient()
    const { error } = await supabase.from('clubs').update({ banned }).eq('id', id)
    if (!error) setClubs(prev => prev.map(c => c.id === id ? { ...c, banned } : c))
    setBusy(null)
  }

  const pendingCount = clubs.filter(c => c.status === 'pending').length

  return (
    <main style={{ minHeight: '100dvh', background: '#FAFAFA' }}>
      <div style={{ background: '#0A1F0E', padding: '20px 0' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px' }}>
          <p style={{ margin: '0 0 4px', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#4ADE80' }}>
            Admin Central
          </p>
          <h1 style={{ margin: 0, fontWeight: 800, fontSize: '1.5rem', color: '#fff', letterSpacing: '-0.025em' }}>
            Gerenciar usuários e clubes
          </h1>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px 60px' }}>
        {/* tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button onClick={() => setTab('clubs')} style={{
            ...btn(tab === 'clubs' ? '#111827' : '#fff', tab === 'clubs' ? '#fff' : '#6B7280', tab === 'clubs' ? 'none' : '1px solid #E5E7EB'),
            padding: '9px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            Clubes
            {pendingCount > 0 && (
              <span style={{ background: '#F59E0B', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: '0.68rem' }}>{pendingCount}</span>
            )}
          </button>
          <button onClick={() => setTab('users')} style={{
            ...btn(tab === 'users' ? '#111827' : '#fff', tab === 'users' ? '#fff' : '#6B7280', tab === 'users' ? 'none' : '1px solid #E5E7EB'),
            padding: '9px 16px', fontSize: '0.82rem',
          }}>
            Usuários ({profiles.length})
          </button>
        </div>

        {/* clubs */}
        {tab === 'clubs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {clubs.length === 0 && <p style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>Nenhum clube.</p>}
            {clubs.map(c => {
              const s = STATUS_STYLE[c.status] ?? STATUS_STYLE.pending
              return (
                <div key={c.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', opacity: c.banned ? 0.55 : 1 }}>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>
                      {c.name}
                      {c.banned && <span style={{ marginLeft: 8, fontSize: '0.68rem', fontWeight: 700, color: '#DC2626' }}>· BANIDO</span>}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#9CA3AF' }}>
                      {[c.cidade, c.estado].filter(Boolean).join(', ') || '—'}
                    </p>
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: s.color, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 20, padding: '3px 10px' }}>
                    {s.label}
                  </span>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {c.status !== 'approved' && (
                      <button disabled={busy === c.id} onClick={() => setClubStatus(c.id, 'approved')} style={btn('#0D8F41', '#fff')}>Aprovar</button>
                    )}
                    {c.status !== 'rejected' && (
                      <button disabled={busy === c.id} onClick={() => setClubStatus(c.id, 'rejected')} style={btn('#FEF2F2', '#DC2626', '1px solid #FECACA')}>Recusar</button>
                    )}
                    <button disabled={busy === c.id} onClick={() => toggleBanClub(c.id, !c.banned)} style={btn(c.banned ? '#F3F4F6' : '#111827', c.banned ? '#374151' : '#fff')}>
                      {c.banned ? 'Desbanir' : 'Banir'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* users */}
        {tab === 'users' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {profiles.length === 0 && <p style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>Nenhum usuário.</p>}
            {profiles.map(u => (
              <div key={u.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', opacity: u.banned ? 0.55 : 1 }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>
                    {u.name || '(sem nome)'}
                    {u.role === 'club' && <span style={{ marginLeft: 8, fontSize: '0.66rem', fontWeight: 700, color: '#0D8F41', background: '#F0FDF4', borderRadius: 20, padding: '1px 7px' }}>clube</span>}
                    {u.banned && <span style={{ marginLeft: 8, fontSize: '0.68rem', fontWeight: 700, color: '#DC2626' }}>· BANIDO</span>}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#9CA3AF' }}>{u.email || '—'}</p>
                </div>
                <button disabled={busy === u.id} onClick={() => toggleBanUser(u.id, !u.banned)} style={btn(u.banned ? '#F3F4F6' : '#111827', u.banned ? '#374151' : '#fff')}>
                  {u.banned ? 'Desbanir' : 'Banir'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
