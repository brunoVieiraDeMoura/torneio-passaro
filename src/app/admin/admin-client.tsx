'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import PaginatedList from '@/components/ui/paginated-list'
import { SeloShield, SELO_VERDE_COLOR, SELO_INTEGRIDADE_COLOR } from '@/components/ui/selo-shield'
import {
  adminLogout, banReportedOwner, deleteClub, deleteUser, moderateFilterName,
  moderateRemoveImage, setClubBanned, setClubSelo, setClubStatus,
  setReportStatus, setUserBanned,
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
  // enriquecido no server: dono do perfil reportado + reincidência de moderação
  owner_id: string | null; owner_name: string | null; owner_banned: boolean
  bird_photo_url: string | null; prior_moderations: number
}

// retorno da RPC admin_usage (null se a migration ainda não rodou)
interface Usage {
  db_bytes: number; storage_bytes: number; storage_files: number
  users: number; birds: number; bird_photos: number; clubs: number
  tournaments: number; participants: number; round_scores: number; reports: number
}

// limites do plano FREE do Supabase — ajustar aqui se mudar de plano
const FREE_DB_BYTES = 500 * 1024 * 1024        // 500 MB de banco
const FREE_STORAGE_BYTES = 1024 * 1024 * 1024  // 1 GB de storage
const FREE_MAU = 50_000                        // 50 mil usuários ativos/mês

function fmtBytes(n: number): string {
  if (n >= 1024 * 1024 * 1024) return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${n} B`
}

// barra de uso com % — verde <70, âmbar 70–90, vermelho >90
function UsageBar({ label, sub, used, limit, usedLabel, limitLabel }: {
  label: string; sub?: string; used: number; limit: number
  usedLabel: string; limitLabel: string
}) {
  const pct = Math.min(100, (used / limit) * 100)
  const color = pct < 70 ? '#0D8F41' : pct < 90 ? '#D97706' : '#DC2626'
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>{label}</p>
        <p style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color, letterSpacing: '-0.02em' }}>
          {pct < 1 && used > 0 ? '<1' : Math.round(pct)}%
        </p>
      </div>
      {sub && <p style={{ margin: '0 0 8px', fontSize: '0.68rem', color: '#9CA3AF' }}>{sub}</p>}
      <div style={{ height: 10, background: '#F3F4F6', borderRadius: 20, overflow: 'hidden', margin: '8px 0 8px' }}>
        <div style={{ width: `${Math.max(pct, used > 0 ? 2 : 0)}%`, height: '100%', background: color, borderRadius: 20, transition: 'width 0.4s' }} />
      </div>
      <p style={{ margin: 0, fontSize: '0.72rem', color: '#6B7280' }}>
        <strong style={{ color: '#111827' }}>{usedLabel}</strong> de {limitLabel}
      </p>
    </div>
  )
}

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:  { label: 'Pendente',  color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
  approved: { label: 'Aprovado',  color: '#0D8F41', bg: '#F0FDF4', border: '#D1FAE5' },
  rejected: { label: 'Recusado',  color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
}

const REASON_LABEL: Record<string, string> = {
  imagem_ofensiva: 'Imagem ofensiva',
  nome_ofensivo: 'Nome ofensivo',
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
function SeloRow({ icon, nome, desc, has, request, onGrant, onRevoke, busy }: {
  icon: React.ReactNode; nome: string; desc: string; has: boolean; request: string
  onGrant: () => void; onRevoke: () => void; busy: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '8px 0', borderTop: '1px solid #F3F4F6' }}>
      <div style={{ flex: 1, minWidth: 180 }}>
        <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 6 }}>{icon} {nome}</p>
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
            {c.selo_verde && <span title="Selo verde — vinculado ao passaros.org" style={chip('#0D8F41', '#F0FDF4', '#D1FAE5')}><SeloShield color={SELO_VERDE_COLOR} size={13} /> Verde</span>}
            {c.selo_integridade && <span title="Selo de integridade" style={chip('#92400E', '#FFFBEB', '#FDE68A')}><SeloShield color={SELO_INTEGRIDADE_COLOR} size={13} /> Integridade</span>}
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
        icon={<SeloShield color={SELO_VERDE_COLOR} />}
        nome="Selo verde" desc="Clube vinculado ao passaros.org"
        has={c.selo_verde} request={c.selo_verde_request} busy={busy}
        onGrant={() => run(c.id, () => setClubSelo(c.id, 'verde', true))}
        onRevoke={() => run(c.id, () => setClubSelo(c.id, 'verde', false))}
      />
      <SeloRow
        icon={<SeloShield color={SELO_INTEGRIDADE_COLOR} />}
        nome="Selo de integridade" desc="Legalizado, mínimo de participantes e dentro das diretrizes"
        has={c.selo_integridade} request={c.selo_integridade_request} busy={busy}
        onGrant={() => run(c.id, () => setClubSelo(c.id, 'integridade', true))}
        onRevoke={() => run(c.id, () => setClubSelo(c.id, 'integridade', false))}
      />
    </div>
  )
}

export default function AdminClient({ profiles, clubs, reports, usage }: {
  profiles: Profile[]; clubs: Club[]; reports: Report[]; usage: Usage | null
}) {
  const [tab, setTab] = useState<'clubs' | 'reports' | 'users' | 'settings'>('clubs')
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
          <button onClick={() => { setTab('settings'); setQuery('') }} style={tabBtn(tab === 'settings')}>
            ⚙ Settings
          </button>
        </div>

        {/* busca por nome */}
        {tab !== 'settings' && (
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
        )}

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
              {reportsFiltered.map(r => {
                const isOffense = r.reason === 'imagem_ofensiva' || r.reason === 'nome_ofensivo'
                // ban liberado: fraude/coligação sempre; imagem/nome só com reincidência
                // (imagem já removida OU nome já filtrado ao menos 1 vez)
                const canBan = r.owner_id != null && !r.owner_banned &&
                  (r.reason === 'fraude' || r.reason === 'coligacao' || (isOffense && r.prior_moderations >= 1))
                return (
                <div key={r.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 16px', marginBottom: 10, opacity: r.status === 'open' ? 1 : 0.65 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: '#111827' }}>
                        {REASON_LABEL[r.reason] ?? r.reason}
                        <span style={{ marginLeft: 8, fontWeight: 500, color: '#6B7280' }}>
                          {r.target_label ?? r.target_id}
                        </span>
                        {r.owner_banned && <span style={{ marginLeft: 8, fontSize: '0.68rem', fontWeight: 700, color: '#DC2626' }}>· DONO BANIDO</span>}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#9CA3AF' }}>
                        {fmt(r.created_at)}
                        {r.owner_name && <> · dono: {r.owner_name}</>}
                        {r.owner_id && r.prior_moderations > 0 && (
                          <span style={{ color: '#B45309', fontWeight: 700 }}> · {r.prior_moderations} moderação{r.prior_moderations !== 1 ? 'ções' : ''} anterior{r.prior_moderations !== 1 ? 'es' : ''}</span>
                        )}
                        {r.target_type === 'bird' && (
                          <> · <Link href={`/liga/passarinho/${encodeURIComponent(r.target_id)}`} target="_blank" style={{ color: '#0D8F41' }}>ver perfil na liga →</Link></>
                        )}
                      </p>
                      {r.details && (
                        <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: '#374151', background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: 8, padding: '8px 10px' }}>
                          {r.details}
                        </p>
                      )}

                      {/* imagem reportada: mostra a foto própria do pássaro (se houver) */}
                      {r.reason === 'imagem_ofensiva' && (
                        r.bird_photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.bird_photo_url} alt="Imagem reportada"
                            style={{ marginTop: 8, width: 120, height: 120, objectFit: 'cover', borderRadius: 10, border: '1px solid #FECACA', display: 'block' }} />
                        ) : (
                          <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: '#9CA3AF', fontStyle: 'italic' }}>
                            {r.owner_id ? 'Sem imagem própria — o perfil usa a foto padrão da raça.' : ''}
                          </p>
                        )
                      )}

                      {r.owner_id == null && (
                        <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: '#9CA3AF', fontStyle: 'italic' }}>
                          Perfil de demonstração — sem dono real para moderar.
                        </p>
                      )}
                    </div>

                    {r.status === 'open' ? (
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {/* ações de moderação por motivo */}
                        {r.reason === 'imagem_ofensiva' && r.owner_id && (
                          <button disabled={busy === r.id || !r.bird_photo_url}
                            title={!r.bird_photo_url ? 'Este pássaro não tem imagem própria' : undefined}
                            onClick={() => {
                              if (window.confirm('Remover a imagem deste pássaro?\n\nO dono receberá um aviso de que imagens desse tipo podem resultar em banimento permanente.')) {
                                run(r.id, () => moderateRemoveImage(r.id))
                              }
                            }}
                            style={{ ...btn('#B45309', '#fff'), opacity: !r.bird_photo_url ? 0.45 : 1 }}>
                            Remover imagem
                          </button>
                        )}
                        {r.reason === 'nome_ofensivo' && r.owner_id && (
                          <button disabled={busy === r.id}
                            onClick={() => {
                              if (window.confirm('Filtrar o nome deste pássaro?\n\nO nome vira "Nomefiltrado(id)" na liga, nos torneios e no cadastro, e o dono recebe um aviso.')) {
                                run(r.id, () => moderateFilterName(r.id))
                              }
                            }}
                            style={btn('#B45309', '#fff')}>
                            Filtrar nome
                          </button>
                        )}
                        {canBan && (
                          <button disabled={busy === r.id}
                            onClick={() => {
                              if (window.confirm(`Banir "${r.owner_name ?? 'o dono'}"?\n\nA conta perde acesso à plataforma (reversível na aba Usuários).`)) {
                                run(r.id, () => banReportedOwner(r.id))
                              }
                            }}
                            style={btn('#DC2626', '#fff')}>
                            Banir dono
                          </button>
                        )}
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
                )
              })}
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

        {/* ── settings: uso do plano free do Supabase ── */}
        {tab === 'settings' && (
          <div style={{ marginTop: 12 }}>
            {!usage ? (
              <p style={{ color: '#B45309', fontSize: '0.85rem', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 14px' }}>
                Sem dados de uso — rode a migration <code>20260716_admin_usage.sql</code> no Supabase.
              </p>
            ) : (
              <>
                <p style={sectionTitle}>Uso do plano free do Supabase</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: 12 }}>
                  <UsageBar
                    label="Banco de dados"
                    sub="Torneios, contas, pontuações, histórico…"
                    used={usage.db_bytes} limit={FREE_DB_BYTES}
                    usedLabel={fmtBytes(usage.db_bytes)} limitLabel={fmtBytes(FREE_DB_BYTES)}
                  />
                  <UsageBar
                    label="Storage (imagens)"
                    sub={`${usage.storage_files} arquivo${usage.storage_files !== 1 ? 's' : ''} — fotos de pássaros e logos de clubes`}
                    used={usage.storage_bytes} limit={FREE_STORAGE_BYTES}
                    usedLabel={fmtBytes(usage.storage_bytes)} limitLabel={fmtBytes(FREE_STORAGE_BYTES)}
                  />
                  <UsageBar
                    label="Contas registradas"
                    sub="Limite do free: 50 mil usuários ativos por mês"
                    used={usage.users} limit={FREE_MAU}
                    usedLabel={usage.users.toLocaleString('pt-BR')} limitLabel={FREE_MAU.toLocaleString('pt-BR')}
                  />
                </div>

                <p style={sectionTitle}>Registros no banco</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                  {[
                    { label: 'Contas', value: usage.users },
                    { label: 'Clubes', value: usage.clubs },
                    { label: 'Pássaros', value: usage.birds },
                    { label: 'Fotos de pássaro', value: usage.bird_photos },
                    { label: 'Torneios', value: usage.tournaments },
                    { label: 'Participações', value: usage.participants },
                    { label: 'Marcações (histórico)', value: usage.round_scores },
                    { label: 'Reports', value: usage.reports },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem', color: '#111827', letterSpacing: '-0.02em' }}>
                        {s.value.toLocaleString('pt-BR')}
                      </p>
                      <p style={{ margin: '3px 0 0', fontSize: '0.62rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {s.label}
                      </p>
                    </div>
                  ))}
                </div>

                <p style={{ margin: '14px 0 0', fontSize: '0.72rem', color: '#9CA3AF', lineHeight: 1.5 }}>
                  Egress (banda de 5 GB/mês do free) não dá pra medir por aqui — acompanhe em{' '}
                  <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" style={{ color: '#0D8F41' }}>
                    supabase.com/dashboard → Usage
                  </a>. Limites acima são do plano free; mudou de plano, ajuste as constantes no topo do admin-client.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
