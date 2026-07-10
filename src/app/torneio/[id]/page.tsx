import type { CSSProperties } from 'react'
import { createPublicClient } from '@/lib/supabase/public'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import QRCode from 'qrcode'
import SpectatorRealtime from '@/components/ui/spectator-realtime'

type Club = { name: string; cidade: string; estado: string } | null

const RANK_COLORS = ['#B45309', '#6B7280', '#92400E']
const RANK_BG     = ['rgba(180,83,9,0.08)', 'rgba(107,114,128,0.06)', 'rgba(146,64,14,0.07)']

type Elim = { id: string; bird_name: string; user_name: string; lastRound: number | null; total: number; position: number }
type HistEntry = { participant_id: string; bird_name: string; count: number }
type HistRound = { round: number; entries: HistEntry[] }

const summaryStyle: CSSProperties = {
  listStyle: 'none', cursor: 'pointer', padding: '10px 18px',
  fontSize: '0.75rem', fontWeight: 700, color: '#0D8F41', background: '#FAFAFA',
  borderTop: '1px solid #F3F4F6', userSelect: 'none',
}

function EliminadoRow({ p }: { p: Elim }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', opacity: 0.8 }}>
      <span style={{ minWidth: 34, fontWeight: 800, fontSize: '0.8rem', color: '#DC2626' }}>{p.position}º</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '0.85rem', color: '#111827', textDecoration: 'line-through', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.bird_name}</p>
        <p style={{ margin: 0, fontSize: '0.7rem', color: '#9CA3AF' }}>{p.user_name}{p.lastRound ? ` · caiu na rodada ${p.lastRound}` : ''}</p>
      </div>
      <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#DC2626', flexShrink: 0 }}>{p.total.toLocaleString('pt-BR')}</span>
    </div>
  )
}

function HistRow({ e, i }: { e: HistEntry; i: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 18px' }}>
      <span style={{ minWidth: 22, fontWeight: 800, fontSize: '0.7rem', color: i < 3 ? RANK_COLORS[i] : '#D1D5DB' }}>{String(i + 1).padStart(2, '0')}</span>
      <p style={{ flex: 1, margin: 0, fontWeight: 600, fontSize: '0.82rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.bird_name}</p>
      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0D8F41', flexShrink: 0 }}>{e.count.toLocaleString('pt-BR')}</span>
    </div>
  )
}

// bloco de uma rodada: top 3 + dropdown p/ o resto
function HistoricoRodada({ rd }: { rd: HistRound }) {
  const rest = rd.entries.slice(3)
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
      <p style={{ margin: 0, padding: '10px 18px', background: '#F3F4F6', fontWeight: 700, fontSize: '0.78rem', color: '#374151' }}>Rodada {rd.round}</p>
      {rd.entries.slice(0, 3).map((e, i) => <HistRow key={e.participant_id + '-' + i} e={e} i={i} />)}
      {rest.length > 0 && (
        <details>
          <summary style={summaryStyle}>Ver mais {rest.length}</summary>
          {rest.map((e, i) => <HistRow key={e.participant_id + '-r' + i} e={e} i={i + 3} />)}
        </details>
      )}
    </div>
  )
}

// lista de eliminados: top 3 + dropdown p/ o resto
function EliminadosLista({ eliminated }: { eliminated: Elim[] }) {
  const rest = eliminated.slice(3)
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
      {eliminated.slice(0, 3).map(p => <EliminadoRow key={p.id} p={p} />)}
      {rest.length > 0 && (
        <details>
          <summary style={summaryStyle}>Ver mais {rest.length}</summary>
          {rest.map(p => <EliminadoRow key={p.id} p={p} />)}
        </details>
      )}
    </div>
  )
}

function fmtTime(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

// converte link do YouTube em URL de embed (autoplay mudo p/ o browser permitir)
function toEmbedUrl(url: string): string {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&mute=1&playsinline=1`
  return url
}

const getTorneioData = async (id: string) => {
  const supabase = createPublicClient()

  const { data: torneio } = await supabase
    .from('tournaments')
    .select('id, name, status, start_at, duration_secs, qr_token, stream_url, clubs(name, cidade, estado)')
    .eq('id', id)
    .single()

  if (!torneio) return null

  const [{ data: participants }, { data: scores }, { data: history }] = await Promise.all([
    supabase
      .from('participants')
      .select('id, user_name, bird_name, cage_number, status')
      .eq('tournament_id', id)
      .order('cage_number', { ascending: true }),
    supabase
      .from('scores')
      .select('participant_id, count')
      .eq('tournament_id', id),
    supabase
      .from('round_scores')
      .select('participant_id, bird_name, round, round_group, count')
      .eq('tournament_id', id)
      .order('round', { ascending: true }),
  ])

  const scoreMap: Record<string, number> = {}
  for (const s of scores ?? []) scoreMap[s.participant_id] = s.count

  const allParts = participants ?? []

  // ainda participando (aprovados) — placar do ciclo atual
  const ranked = allParts
    .filter(p => p.status === 'approved')
    .map(p => ({ ...p, score: scoreMap[p.id] ?? 0 }))
    .sort((a, b) => b.score - a.score)

  // histórico por rodada (snapshots de round_scores)
  type Hist = { participant_id: string; bird_name: string; round: number; count: number }
  const hist = (history ?? []) as unknown as Hist[]
  const roundsSet = Array.from(new Set(hist.map(h => h.round))).sort((a, b) => a - b)
  const historyByRound = roundsSet.map(r => ({
    round: r,
    entries: hist.filter(h => h.round === r).sort((a, b) => b.count - a.count),
  }))

  // total do pássaro no histórico (soma das rodadas snapshotadas)
  const histTotal: Record<string, number> = {}
  const histLastRound: Record<string, number> = {}
  for (const h of hist) {
    histTotal[h.participant_id] = (histTotal[h.participant_id] ?? 0) + h.count
    histLastRound[h.participant_id] = Math.max(histLastRound[h.participant_id] ?? 0, h.round)
  }

  // eliminados: quem caiu depois fica na frente; posição = atrás de todos os que seguem
  const eliminated = allParts
    .filter(p => p.status === 'eliminated')
    .map(p => ({ ...p, total: histTotal[p.id] ?? scoreMap[p.id] ?? 0, lastRound: histLastRound[p.id] ?? null }))
    .sort((a, b) => (b.lastRound ?? 0) - (a.lastRound ?? 0) || b.total - a.total)
    .map((p, idx) => ({ ...p, position: ranked.length + idx + 1 }))

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const [qrDataUrl, qrDesktopDataUrl] = torneio.qr_token
    ? await Promise.all([
        QRCode.toDataURL(`${appUrl}/entrar/${torneio.qr_token}`, { width: 280, margin: 2, color: { dark: '#111827', light: '#ffffff' } }),
        QRCode.toDataURL(`${appUrl}/entrar/${torneio.qr_token}`, { width: 340, margin: 2, color: { dark: '#ffffff', light: '#0D2B17' } }),
      ])
    : [null, null]

  return { torneio, ranked, eliminated, historyByRound, qrDataUrl, qrDesktopDataUrl }
}

export default async function TorneioEspectadorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getTorneioData(id)
  if (!data) notFound()

  const { torneio, ranked, eliminated, historyByRound, qrDataUrl, qrDesktopDataUrl } = data
  const clube = torneio.clubs as unknown as Club
  // contagem dirigida pelo tempo: ao vivo se rodando OU aberto dentro da janela de start
  const startMs = torneio.start_at ? new Date(torneio.start_at).getTime() : null
  const endMs = startMs !== null ? startMs + (torneio.duration_secs ?? 0) * 1000 : null
  const withinWindow = startMs !== null && endMs !== null && Date.now() >= startMs && Date.now() <= endMs
  const isLive = torneio.status === 'running' || (torneio.status === 'open' && withinWindow)
  const isOpen = torneio.status === 'open'
  const isActive = torneio.status === 'open' || torneio.status === 'running'
  const canJoin = isOpen
  const time = fmtTime(torneio.start_at)
  const streamUrl = ((torneio as Record<string, unknown>).stream_url as string | null) ?? null
  const embedUrl = streamUrl ? toEmbedUrl(streamUrl) : null

  return (
    <>
      {isActive && <SpectatorRealtime tournamentId={id} />}

      {/* ── DESKTOP BIG SCREEN ── */}
      <div className="spectator-desktop" style={{ display: 'none', height: '100dvh', background: '#fff', color: '#fff', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', height: '100%' }}>

          {/* left: QR + info */}
          <div style={{
            background: '#16382A',
            borderRight: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', flexDirection: 'column',
            padding: '36px 32px', overflow: 'hidden',
          }}>
            {/* logo + back */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'auto' }}>
              <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
                  <path d="M1 8 Q5.5 1 11 8 Q16.5 15 21 8" stroke="#0D8F41" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff', letterSpacing: '-0.02em' }}>Cantorias</span>
              </Link>
              <Link href="/torneios" style={{
                fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.45)',
                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4,
                padding: '5px 10px', borderRadius: 7,
                border: '1px solid rgba(255,255,255,0.1)',
                transition: 'color 0.15s',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                Torneios
              </Link>
            </div>

            {/* tournament name */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                {isLive && <span className="live-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />}
                <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: isLive ? '#4ADE80' : '#6B7280' }}>
                  {isLive ? 'Ao vivo' : isOpen ? 'Aberto' : 'Encerrado'}
                </span>
              </div>
              <h1 style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '1.3rem', color: '#fff', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
                {torneio.name}
              </h1>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
                {[clube?.name, clube?.cidade && clube?.estado ? `${clube.cidade}, ${clube.estado}` : null].filter(Boolean).join(' · ')}
                {time && ` · ${isLive ? 'Iniciado' : 'Previsto'} ${time}`}
              </p>
            </div>

            {/* live ao vivo */}
            {embedUrl && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: '#000' }}>
                  <iframe
                    src={embedUrl}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                  />
                </div>
                <p style={{ margin: '8px 0 0', fontSize: '0.68rem', color: '#4ADE80', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />
                  Transmissão ao vivo
                </p>
              </div>
            )}

            {/* QR code */}
            {qrDesktopDataUrl && canJoin && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                <div style={{ background: '#0D2B17', borderRadius: 16, padding: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrDesktopDataUrl} alt="QR para participar" width={220} height={220} style={{ display: 'block' }} />
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#4ADE80', fontWeight: 600, textAlign: 'center' }}>
                  Escaneie para participar
                </p>
                <p style={{ margin: 0, fontSize: '0.68rem', color: '#4B5563', textAlign: 'center', lineHeight: 1.4 }}>
                  {ranked.length} participante{ranked.length !== 1 ? 's' : ''} inscrito{ranked.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            {(!canJoin || !qrDesktopDataUrl) && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#4B5563' }}>Inscrições encerradas</p>
              </div>
            )}
          </div>

          {/* right: ranking */}
          <div style={{ display: 'flex', flexDirection: 'column', padding: '36px 40px', overflow: 'hidden', background: '#fff' }}>
            <div style={{ marginBottom: 24 }}>
              <p style={{ margin: '0 0 4px', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#0D8F41' }}>
                {isLive ? 'Placar ao vivo' : 'Participantes'}
              </p>
              <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1.8rem', color: '#111827', letterSpacing: '-0.03em' }}>
                Ranking
              </h2>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {ranked.length === 0 && (
                <p style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>Nenhum participante aprovado ainda.</p>
              )}
              {ranked.map((p, i) => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  background: i < 3 ? RANK_BG[i] : '#FAFAFA',
                  borderRadius: 10, padding: '12px 18px',
                  border: `1px solid ${i < 3 ? 'rgba(0,0,0,0.06)' : '#F3F4F6'}`,
                }}>
                  <span style={{ minWidth: 32, fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.06em', color: i < 3 ? RANK_COLORS[i] : '#D1D5DB' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '1rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.bird_name}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#D1D5DB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.user_name}{p.cage_number != null ? ` · Gaiola ${p.cage_number}` : ''}
                    </p>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: '1.4rem', letterSpacing: '-0.04em', color: i === 0 ? '#B45309' : '#374151', flexShrink: 0 }}>
                    {p.score.toLocaleString('pt-BR')}
                  </span>
                </div>
              ))}

              {/* Eliminados */}
              {eliminated.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <p style={{ margin: '0 0 8px', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#DC2626' }}>Eliminados ({eliminated.length})</p>
                  <EliminadosLista eliminated={eliminated} />
                </div>
              )}

              {/* Histórico por rodada */}
              {historyByRound.length > 0 && (
                <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{ margin: 0, fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#0D8F41' }}>Histórico por rodada</p>
                  {historyByRound.map(rd => <HistoricoRodada key={rd.round} rd={rd} />)}
                </div>
              )}
            </div>

            {isLive && (
              <p style={{ margin: '16px 0 0', fontSize: '0.65rem', color: '#D1D5DB', textAlign: 'right' }}>
                Atualiza automaticamente a cada 5s
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── MOBILE ── */}
      <div className="spectator-mobile" style={{ background: '#FAFAFA', minHeight: '100vh' }}>
        <div style={{ background: '#fff', borderBottom: '1px solid #F3F4F6' }}>
          <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 20px 24px' }}>
            <Link href="/torneios" style={{ fontSize: '0.75rem', color: '#9CA3AF', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Torneios
            </Link>

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <p style={{ margin: '0 0 6px', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#0D8F41' }}>
                  {isLive ? 'Ao vivo' : isOpen ? 'Aberto' : 'Encerrado'}
                </p>
                <h1 style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '1.5rem', color: '#111827', letterSpacing: '-0.025em', lineHeight: 1.15 }}>
                  {torneio.name}
                </h1>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#9CA3AF' }}>
                  {[clube?.name, clube?.cidade && clube?.estado ? `${clube.cidade}, ${clube.estado}` : null].filter(Boolean).join(' · ')}
                  {time && ` · ${isLive ? 'Iniciado' : 'Previsto'} ${time}`}
                </p>
              </div>
              {isLive && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, paddingTop: 4 }}>
                  <span className="live-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0D8F41' }}>Ao vivo</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px 40px' }}>
          {/* live ao vivo */}
          {embedUrl && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E7EB', background: '#000' }}>
                <iframe
                  src={embedUrl}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                />
              </div>
              <p style={{ margin: '8px 0 0', fontSize: '0.7rem', color: '#0D8F41', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />
                Transmissão ao vivo
              </p>
            </div>
          )}

          {canJoin && torneio.qr_token && (
            <Link href={`/entrar/${torneio.qr_token}`} style={{
              display: 'block', textAlign: 'center',
              background: '#0D8F41', color: '#fff', fontWeight: 700,
              fontSize: '0.88rem', textDecoration: 'none',
              padding: '12px', borderRadius: 10, marginBottom: 20,
            }}>
              Participar deste torneio →
            </Link>
          )}

          <p style={{ margin: '0 0 4px', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#0D8F41' }}>
            {eliminated.length > 0 ? 'Ainda participando' : isLive ? 'Placar ao vivo' : 'Participantes'}
          </p>
          <p style={{ margin: '0 0 16px', fontWeight: 800, fontSize: '1.25rem', color: '#111827', letterSpacing: '-0.02em' }}>
            {ranked.length > 0 ? `${ranked.length} participante${ranked.length !== 1 ? 's' : ''}` : 'Nenhum participante ainda'}
          </p>

          {ranked.length > 0 ? (
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
              {ranked.map((p, i) => (
                <div key={p.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px' }}>
                    <span style={{ minWidth: 26, fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.05em', color: i < 3 ? RANK_COLORS[i] : '#D1D5DB' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '0.87rem', color: '#111827' }}>{p.bird_name}</p>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: '#9CA3AF' }}>
                        {p.user_name}{p.cage_number != null ? ` · Gaiola ${p.cage_number}` : ''}
                      </p>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em', color: i === 0 ? '#B45309' : '#374151', flexShrink: 0 }}>
                      {p.score.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  {i < ranked.length - 1 && <div style={{ height: 1, background: '#F9FAFB' }} />}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF' }}>
              <p style={{ margin: '0 0 4px', fontSize: '0.85rem' }}>Nenhum participante aprovado ainda.</p>
              <p style={{ margin: 0, fontSize: '0.75rem' }}>As inscrições aparecem aqui após aprovação.</p>
            </div>
          )}

          {/* Eliminados */}
          {eliminated.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <p style={{ margin: '0 0 10px', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#DC2626' }}>
                Eliminados ({eliminated.length})
              </p>
              <EliminadosLista eliminated={eliminated} />
            </div>
          )}

          {/* Histórico de cantos por rodada */}
          {historyByRound.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <p style={{ margin: '0 0 10px', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#0D8F41' }}>
                Histórico por rodada
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {historyByRound.map(rd => <HistoricoRodada key={rd.round} rd={rd} />)}
              </div>
            </div>
          )}

          {/* QR code mobile (smaller, discreto) */}
          {qrDataUrl && canJoin && (
            <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <p style={{ margin: 0, fontSize: '0.68rem', color: '#D1D5DB', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                QR de acesso
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR para participar" width={120} height={120} style={{ borderRadius: 8, border: '1px solid #F3F4F6' }} />
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .spectator-desktop { display: block !important; }
          .spectator-mobile  { display: none  !important; }
        }
        @media (max-width: 767px) {
          .spectator-desktop { display: none  !important; }
          .spectator-mobile  { display: block !important; }
        }
      `}</style>
    </>
  )
}
