'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import PaginatedList from '@/components/ui/paginated-list'
import {
  adminLogout, deleteClub, deleteUser, setClubBanned, setClubSelo,
  setClubStatus, setReportStatus, setUserBanned,
} from './actions'

interface Profile {
  id: string; name: string | null; email: string | null
  role: string | null; banned: boolean
}
interface Club {
  id: string; name: string; cidade: string | null; estado: string | null
  status: string; banned: boolean
  selo_verde: boolean; selo_integridade: boolean
  selo_verde_request: string; selo_integridade_request: string
  selo_requested_at: string | null
}
interface Report {
  id: string; target_type: string; target_id: string; target_label: string | null
  reason: string; details: string | null; status: string; created_at: string
}

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:  { label: 'Pendente',  color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
  approved: { label: 'Aprovado',  color: '#0D8F41', bg: '#F0FDF4', border: '#D1FAE5' },
  rejected: { label: 'Recusado',  color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
}

const REASON_LABEL: Record<string, string> = {
  imagem_ofensiva: 'Imagem ofensiva',
  fraude: 'Suspeita de fraude',
  coligacao: 'Coligação com clubes',
  outro: 'Outro',
}

const PAGE_SIZE = 10

const btn = (bg: string, color: string, border = 'none'): React.CSSProperties => ({
  background: bg, color, border, borderRadius: 8, padding: '7px 12px',
  fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
})

const chip = (color: string, bg: string, border: string): React.CSSProperties => ({
  fontSize: '0.68rem', fontWeight: 700, color, background: bg,
  border: `1px solid ${border}`, borderRadius: 20, padding: '3px 10px',
  display: 'inline-flex', alignItems: 'center', gap: 5,
})

const sectionTitle: React.CSSProperties = {
  margin: '18px 0 10px', fontSize: '0.66rem', fontWeight: 700,
  letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6B7280',
}

function fmt(date: string) {
  return new Date(date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function norm(s: string | null | undefined) {
  return (s ?? '').toLowerCase()
}

type Run = (id: string, action: () => Promise<{ ok: boolean; error?: string }>) => void

// linha de selo dentro do card do clube: estado + ações do admin
function SeloRow({ nome, desc, has, request, onGrant, onRevoke, busy }: {
  nome: string; desc: string; has: boolean; request: string
  onGrant: () => void; onRevoke: () => void; busy: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '8px 0', borderTop: '1px solid #F3F4F6' }}>
      <div style={{ flex: 1, minWidth: 180 }}>
        <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#111827' }}>{nome}</p>
        <p style={{ margin: '1px 0 0', fontSize: '0.68rem', color: '#9CA3AF' }}>{desc}</p>
      </div>
      {has ? (
        <>
          <span style={chip('#0D8F41', '#F0FDF4', '#D1FAE5')}>✓ Concedido</span>
          <button disabled={busy} onClick={onRevoke} style={btn('#fff', '#DC2626', '1px solid #FECACA')}>Revogar</button>
        </>
      ) : request === 'pending' ? (
        <>
          <span style={chip('#B45309', '#FFFBEB', '#FDE68A')}>● Solicitado</span>
          <button disabled={busy} onClick={onGrant} style={btn('#0D8F41', '#fff')}>Conceder</button>
          <button disabled={busy} onClick={onRevoke} style={btn('#FEF2F2', '#DC2626', '1px solid #FECACA')}>Recusar</button>
        </>
      ) : (
        <>
          {request === 'rejected' && <span style={chip('#DC2626', '#FEF2F2', '#FECACA')}>Recusado</span>}
          <button disabled={busy} onClick={onGrant} style={btn('#fff', '#0D8F41', '1px solid #D1FAE5')}>Conceder</button>
        </>
      )}
    </div>
  )
}

function ClubCard({ c, busy, run }: { c: Club; busy: boolean; run: Run }) {
  const s = STATUS_STYLE[c.status] ?? STATUS_STYLE.pending
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 16px', marginBottom: 10, opacity: c.banned ? 0.55 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {c.name}
            {c.selo_verde && <span title="Selo verde — vinculado ao passaros.org" style={chip('#0D8F41', '#F0FDF4', '#D1FAE5')}>🟢 Verde</span>}
            {c.selo_integridade && <span title="Selo de integridade" style={chip('#1D4ED8', '#EFF6FF', '#BFDBFE')}>🛡 Integridade</span>}
            {c.banned && <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#DC2626' }}>· BANIDO</span>}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#9CA3AF' }}>
            {[c.cidade, c.estado].filter(Boolean).join(', ') || '—'}
            {c.selo_requested_at && (c.selo_verde_request === 'pending' || c.selo_integridade_request === 'pending') && ` · selo solicitado em ${fmt(c.selo_requested_at)}`}
          </p>
        </div>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: s.color, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 20, padding: '3px 10px' }}>
          {s.label}
        </span>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
          {c.status !== 'approved' && (
            <button disabled={busy} onClick={() => run(c.id, () => setClubStatus(c.id, 'approved'))} style={btn('#0D8F41', '#fff')}>Aprovar</button>
          )}
          {c.status !== 'rejected' && (
            <button disabled={busy} onClick={() => run(c.id, () => setClubStatus(c.id, 'rejected'))} style={btn('#FEF2F2', '#DC2626', '1px solid #FECACA')}>Recusar</button>
          )}
          <button disabled={busy} onClick={() => run(c.id, () => setClubBanned(c.id, !c.banned))} style={btn(c.banned ? '#F3F4F6' : '#111827', c.banned ? '#374151' : '#fff')}>
            {c.banned ? 'Desbanir' : 'Banir'}
          </button>
          <button disabled={busy}
            onClick={() => {
              if (window.confirm(`Excluir DEFINITIVAMENTE o clube "${c.name}"?\n\nTodos os torneios, participantes e pontuações dele serão apagados. Não dá para desfazer.`)) {
                run(c.id, () => deleteClub(c.id))
              }
            }}
            style={btn('#DC2626', '#fff')}>
            Excluir
          </button>
        </div>
      </div>

      {/* selos de verificação */}
      <SeloRow
        nome="🟢 Selo verde" desc="Clube vinculado ao passaros.org"
        has={c.selo_verde} request={c.selo_verde_request} busy={busy}
        onGrant={() => run(c.id, () => setClubSelo(c.id, 'verde', true))}
        onRevoke={() => run(c.id, () => setClubSelo(c.id, 'verde', false))}
      />
      <SeloRow
        nome="🛡 Selo de integridade" desc="Legalizado, mínimo de participantes e dentro das diretrizes"
        has={c.selo_integridade} request={c.selo_integridade_request} busy={busy}
        onGrant={() => run(c.id, () => setClubSelo(c.id, 'integridade', true))}
        onRevoke={() => run(c.id, () => setClubSelo(c.id, 'integridade', false))}
      />
    </div>
  )
}

export default function AdminClient({ profiles, clubs, reports }: {
  profiles: Profile[]; clubs: Club[]; reports: Report[]
}) {
  const [tab, setTab] = useState<'clubs' | 'reports' | 'users'>('clubs')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // roda a action, mostra erro se falhar; revalidatePath('/admin') na action
  // atualiza os dados do server component sozinho.
  const run: Run = (id, action) => {
    setBusy(id)
    startTransition(async () => {
      const res = await action()
      if (!res.ok && res.error) alert(res.error)
      setBusy(null)
    })
  }

  const q = norm(query.trim())

  // clubes: quem pediu selo separado dos demais
  const clubsFiltered = clubs.filter(c => !q || norm(c.name).includes(q) || norm(c.cidade).includes(q))
  const pediuSelo = (c: Club) => c.selo_verde_request === 'pending' || c.selo_integridade_request === 'pending'
  const solicitantes = clubsFiltered.filter(pediuSelo)
  const demaisClubes = clubsFiltered.filter(c => !pediuSelo(c))

  const reportsFiltered = reports.filter(r =>
    !q || norm(r.target_label).includes(q) || norm(REASON_LABEL[r.reason] ?? r.reason).includes(q) || norm(r.target_id).includes(q))

  const usersFiltered = profiles.filter(u => !q || norm(u.name).includes(q) || norm(u.email).includes(q))

  const pendingClubs = clubs.filter(c => c.status === 'pending').length
  const pendingSelos = clubs.filter(pediuSelo).length
  const openReports = reports.filter(r => r.status === 'open').length

  const tabBtn = (active: boolean): React.CSSProperties => ({
    ...btn(active ? '#111827' : '#fff', active ? '#fff' : '#6B7280', active ? 'none' : '1px solid #E5E7EB'),
    padding: '9px 16px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: 6,
  })
  const badge = (bg: string): React.CSSProperties => ({
    background: bg, color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: '0.68rem', fontWeight: 800,
  })

  const searchPlaceholder =
    tab === 'clubs' ? 'Buscar clube por nome ou cidade…'
    : tab === 'reports' ? 'Buscar report por alvo ou motivo…'
    : 'Buscar usuário por nome ou email…'

  return (
    <main style={{ minHeight: '100dvh', background: '#FAFAFA' }}>
      <div style={{ background: '#0A1F0E', padding: '20px 0' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#4ADE80' }}>
              Admin Central
            </p>
            <h1 style={{ margin: 0, fontWeight: 800, fontSize: '1.5rem', color: '#fff', letterSpacing: '-0.025em' }}>
              Gerenciar plataforma
            </h1>
          </div>
          <button onClick={() => adminLogout()} style={{ ...btn('rgba(255,255,255,0.08)', 'rgba(255,255,255,0.6)', '1px solid rgba(255,255,255,0.15)'), flexShrink: 0 }}>
            Sair
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px 60px' }}>
        {/* tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <button onClick={() => { setTab('clubs'); setQuery('') }} style={tabBtn(tab === 'clubs')}>
            Clubes
            {(pendingClubs + pendingSelos) > 0 && <span style={badge('#F59E0B')}>{pendingClubs + pendingSelos}</span>}
          </button>
          <button onClick={() => { setTab('reports'); setQuery('') }} style={tabBtn(tab === 'reports')}>
            Reports
            {openReports > 0 && <span style={badge('#DC2626')}>{openReports}</span>}
          </button>
          <button onClick={() => { setTab('users'); setQuery('') }} style={tabBtn(tab === 'users')}>
            Usuários ({profiles.length})
          </button>
        </div>

        {/* busca por nome */}
        <div style={{ position: 'relative', marginBottom: 6 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '11px 12px 11px 36px',
              border: '1px solid #E5E7EB', borderRadius: 10, fontSize: '0.85rem',
              fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#111827',
            }}
          />
        </div>

        {/* ── clubes: solicitações de selo separadas dos demais ── */}
        {tab === 'clubs' && (
          <div>
            <p style={sectionTitle}>
              📋 Solicitações de verificação ({solicitantes.length})
            </p>
            {solicitantes.length === 0 ? (
              <p style={{ color: '#9CA3AF', fontSize: '0.8rem', margin: '0 0 4px' }}>
                {q ? 'Nenhuma solicitação encontrada na busca.' : 'Nenhum clube aguardando verificação.'}
              </p>
            ) : (
              <PaginatedList key={`sol-${q}`} pageSize={PAGE_SIZE}>
                {solicitantes.map(c => <ClubCard key={c.id} c={c} busy={busy === c.id} run={run} />)}
              </PaginatedList>
            )}

            <p style={sectionTitle}>
              Todos os clubes ({demaisClubes.length})
            </p>
            {demaisClubes.length === 0 ? (
              <p style={{ color: '#9CA3AF', fontSize: '0.8rem', margin: 0 }}>
                {q ? 'Nenhum clube encontrado na busca.' : 'Nenhum clube.'}
              </p>
            ) : (
              <PaginatedList key={`clubs-${q}`} pageSize={PAGE_SIZE}>
                {demaisClubes.map(c => <ClubCard key={c.id} c={c} busy={busy === c.id} run={run} />)}
              </PaginatedList>
            )}

            <p style={{ margin: '14px 0 0', fontSize: '0.72rem', color: '#9CA3AF' }}>
              Só torneios de clubes com selo (verde ou integridade) têm os cantos contabilizados na Liga.
            </p>
          </div>
        )}

        {/* ── reports ── */}
        {tab === 'reports' && (
          <div style={{ marginTop: 12 }}>
            {reportsFiltered.length === 0 && (
              <p style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>{q ? 'Nenhum report encontrado na busca.' : 'Nenhum report.'}</p>
            )}
            <PaginatedList key={`rep-${q}`} pageSize={PAGE_SIZE}>
              {reportsFiltered.map(r => (
                <div key={r.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 16px', marginBottom: 10, opacity: r.status === 'open' ? 1 : 0.65 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: '#111827' }}>
                        {REASON_LABEL[r.reason] ?? r.reason}
                        <span style={{ marginLeft: 8, fontWeight: 500, color: '#6B7280' }}>
                          {r.target_label ?? r.target_id}
                        </span>
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#9CA3AF' }}>
                        {fmt(r.created_at)}
                        {r.target_type === 'bird' && (
                          <> · <Link href={`/liga/passarinho/${encodeURIComponent(r.target_id)}`} target="_blank" style={{ color: '#0D8F41' }}>ver perfil na liga →</Link></>
                        )}
                      </p>
                      {r.details && (
                        <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: '#374151', background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: 8, padding: '8px 10px' }}>
                          {r.details}
                        </p>
                      )}
                    </div>
                    {r.status === 'open' ? (
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button disabled={busy === r.id} onClick={() => run(r.id, () => setReportStatus(r.id, 'resolved'))} style={btn('#0D8F41', '#fff')}>Resolver</button>
                        <button disabled={busy === r.id} onClick={() => run(r.id, () => setReportStatus(r.id, 'dismissed'))} style={btn('#fff', '#6B7280', '1px solid #E5E7EB')}>Descartar</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={chip(r.status === 'resolved' ? '#0D8F41' : '#6B7280', r.status === 'resolved' ? '#F0FDF4' : '#F3F4F6', r.status === 'resolved' ? '#D1FAE5' : '#E5E7EB')}>
                          {r.status === 'resolved' ? 'Resolvido' : 'Descartado'}
                        </span>
                        <button disabled={busy === r.id} onClick={() => run(r.id, () => setReportStatus(r.id, 'open'))} style={btn('#fff', '#6B7280', '1px solid #E5E7EB')}>Reabrir</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </PaginatedList>
          </div>
        )}

        {/* ── usuários: ban, exclusão ── */}
        {tab === 'users' && (
          <div style={{ marginTop: 12 }}>
            {usersFiltered.length === 0 && (
              <p style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>{q ? 'Nenhum usuário encontrado na busca.' : 'Nenhum usuário.'}</p>
            )}
            <PaginatedList key={`usr-${q}`} pageSize={PAGE_SIZE}>
              {usersFiltered.map(u => (
                <div key={u.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', opacity: u.banned ? 0.55 : 1 }}>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>
                      {u.name || '(sem nome)'}
                      {u.role === 'club' && <span style={{ marginLeft: 8, fontSize: '0.66rem', fontWeight: 700, color: '#0D8F41', background: '#F0FDF4', borderRadius: 20, padding: '1px 7px' }}>clube</span>}
                      {u.banned && <span style={{ marginLeft: 8, fontSize: '0.68rem', fontWeight: 700, color: '#DC2626' }}>· BANIDO</span>}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#9CA3AF' }}>{u.email || '—'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button disabled={busy === u.id} onClick={() => run(u.id, () => setUserBanned(u.id, !u.banned))} style={btn(u.banned ? '#F3F4F6' : '#111827', u.banned ? '#374151' : '#fff')}>
                      {u.banned ? 'Desbanir' : 'Banir'}
                    </button>
                    <button disabled={busy === u.id}
                      onClick={() => {
                        if (window.confirm(`Excluir DEFINITIVAMENTE a conta de "${u.name || u.email}"?\n\nA conta, os pássaros e (se for clube) o clube com seus torneios serão apagados. Não dá para desfazer.`)) {
                          run(u.id, () => deleteUser(u.id))
                        }
                      }}
                      style={btn('#DC2626', '#fff')}>
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </PaginatedList>
          </div>
        )}
      </div>
    </main>
  )
}
