import type { CSSProperties } from 'react'
import { createPublicClient } from '@/lib/supabase/public'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import SpectatorRealtime from '@/components/ui/spectator-realtime'
import ParticiparCta from './participar-cta'
import AdBanner from '@/components/ui/ad-banner'
import LiveChat from './live-chat'
import { AnimatedRanking, AutoScrollMain, MarcacaoPanel, SpectatorClock, type RankItem } from './spectator-widgets'
import { formatDurationMinSec } from '@/lib/duration'

// sempre renderiza fresco: o SpectatorRealtime dá router.refresh() ao vivo (scores,
// fibra_intervals, etc.) — sem isso o RSC podia vir de cache e o placar (inclusive os
// tempos do Canto Fibra) não atualizava em tempo real.
export const dynamic = 'force-dynamic'

type Club = { name: string; cidade: string; estado: string } | null

const RANK_COLORS = ['#B45309', '#6B7280', '#92400E']

type Elim = { id: string; bird_name: string; user_name: string; lastRound: number | null; total: number; position: number }
type HistEntry = { participant_id: string; bird_name: string; count: number }
type HistRound = { round: number; entries: HistEntry[] }

const summaryStyle: CSSProperties = {
  listStyle: 'none', cursor: 'pointer', padding: '10px 18px',
  fontSize: '0.75rem', fontWeight: 700, color: '#0D8F41', background: '#FAFAFA',
  borderTop: '1px solid #F3F4F6', userSelect: 'none',
}

const eyebrowStyle = (color: string): CSSProperties => ({
  margin: '0 0 8px', fontSize: '0.62rem', fontWeight: 700,
  letterSpacing: '0.18em', textTransform: 'uppercase', color,
})

function EliminadoRow({ p, timeMode = false }: { p: Elim; timeMode?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', opacity: 0.8 }}>
      <span style={{ minWidth: 34, fontWeight: 800, fontSize: '0.8rem', color: '#DC2626' }}>{p.position}º</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '0.85rem', color: '#111827', textDecoration: 'line-through', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.bird_name}</p>
        <p style={{ margin: 0, fontSize: '0.7rem', color: '#9CA3AF' }}>{p.user_name}{p.lastRound ? ` · caiu na rodada ${p.lastRound}` : ''}</p>
      </div>
      <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#DC2626', flexShrink: 0 }}>{timeMode ? formatDurationMinSec(p.total) : p.total.toLocaleString('pt-BR')}</span>
    </div>
  )
}

function HistRow({ e, i, timeMode = false }: { e: HistEntry; i: number; timeMode?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 18px' }}>
      <span style={{ minWidth: 22, fontWeight: 800, fontSize: '0.7rem', color: i < 3 ? RANK_COLORS[i] : '#D1D5DB' }}>{String(i + 1).padStart(2, '0')}</span>
      <p style={{ flex: 1, margin: 0, fontWeight: 600, fontSize: '0.82rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.bird_name}</p>
      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0D8F41', flexShrink: 0 }}>{timeMode ? formatDurationMinSec(e.count) : e.count.toLocaleString('pt-BR')}</span>
    </div>
  )
}

// bloco de uma rodada: top 3 + dropdown p/ o resto
function HistoricoRodada({ rd, timeMode = false }: { rd: HistRound; timeMode?: boolean }) {
  const rest = rd.entries.slice(3)
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
      <p style={{ margin: 0, padding: '10px 18px', background: '#F3F4F6', fontWeight: 700, fontSize: '0.78rem', color: '#374151' }}>Rodada {rd.round}</p>
      {rd.entries.slice(0, 3).map((e, i) => <HistRow key={e.participant_id + '-' + i} e={e} i={i} timeMode={timeMode} />)}
      {rest.length > 0 && (
        <details>
          <summary style={summaryStyle}>Ver mais {rest.length}</summary>
          {rest.map((e, i) => <HistRow key={e.participant_id + '-r' + i} e={e} i={i + 3} timeMode={timeMode} />)}
        </details>
      )}
    </div>
  )
}

// lista de eliminados: top 3 + dropdown p/ o resto
function EliminadosLista({ eliminated, timeMode = false }: { eliminated: Elim[]; timeMode?: boolean }) {
  const rest = eliminated.slice(3)
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
      {eliminated.slice(0, 3).map(p => <EliminadoRow key={p.id} p={p} timeMode={timeMode} />)}
      {rest.length > 0 && (
        <details>
          <summary style={summaryStyle}>Ver mais {rest.length}</summary>
          {rest.map(p => <EliminadoRow key={p.id} p={p} timeMode={timeMode} />)}
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
  const yt = getYouTubeId(url)
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&mute=1&playsinline=1`
  return url
}

// id do vídeo do YouTube (p/ o chat da live) — null se não for link do YouTube
function getYouTubeId(url: string): string | null {
  return url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)?.[1] ?? null
}

const getTorneioData = async (id: string) => {
  const supabase = createPublicClient()

  const { data: torneio } = await supabase
    .from('tournaments')
    .select('id, name, status, start_at, duration_secs, qr_token, stream_url, active_group, divisions, estilo_canto, clubs(name, cidade, estado)')
    .eq('id', id)
    .single()

  if (!torneio) return null

  const isFibra = torneio.estilo_canto === 'Canto Fibra'

  const [{ data: participants }, { data: scores }, { data: history }, { data: fibraRows }] = await Promise.all([
    supabase
      .from('participants')
      .select('id, user_name, bird_name, cage_number, status, round_group, marks_participant_id')
      .eq('tournament_id', id)
      .order('cage_number', { ascending: true }),
    supabase
      .from('scores')
      .select('participant_id, count, suspicious_count')
      .eq('tournament_id', id),
    supabase
      .from('round_scores')
      .select('participant_id, bird_name, round, round_group, count')
      .eq('tournament_id', id)
      .order('round', { ascending: true }),
    isFibra
      ? supabase
          .from('fibra_intervals')
          .select('participant_id, started_at, ended_at')
          .eq('tournament_id', id)
          .order('started_at', { ascending: true })
      : Promise.resolve({ data: null as { participant_id: string; started_at: string; ended_at: string }[] | null }),
  ])

  const scoreMap: Record<string, number> = {}
  const warnMap: Record<string, number> = {}
  for (const s of scores ?? []) {
    scoreMap[s.participant_id] = s.count
    warnMap[s.participant_id] = (s as { suspicious_count?: number }).suspicious_count ?? 0
  }

  const intervalsMap: Record<string, { started_at: string; ended_at: string }[]> = {}
  for (const iv of fibraRows ?? []) {
    (intervalsMap[iv.participant_id] ??= []).push({ started_at: iv.started_at, ended_at: iv.ended_at })
  }

  const allParts = participants ?? []

  // ainda participando (aprovados) — placar do ciclo atual
  const ranked = allParts
    .filter(p => p.status === 'approved')
    .map(p => ({ ...p, score: scoreMap[p.id] ?? 0, warns: warnMap[p.id] ?? 0, intervals: intervalsMap[p.id] }))
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

  return { torneio, ranked, eliminated, historyByRound, isFibra }
}

export default async function TorneioEspectadorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getTorneioData(id)
  if (!data) notFound()

  const { torneio, ranked, eliminated, historyByRound, isFibra } = data
  const clube = torneio.clubs as unknown as Club
  // contagem dirigida pelo tempo: ao vivo se rodando OU aberto dentro da janela de start
  const startMs = torneio.start_at ? new Date(torneio.start_at).getTime() : null
  const endMs = startMs !== null ? startMs + (torneio.duration_secs ?? 0) * 1000 : null
  const withinWindow = startMs !== null && endMs !== null && Date.now() >= startMs && Date.now() <= endMs
  const isLive = torneio.status === 'running' || (torneio.status === 'open' && withinWindow)
  const isOpen = torneio.status === 'open'
  // torneio dividido em grupos → painel da marcação (próxima/atual, controlado
  // por relógio no cliente) + ranking geral lado a lado em telas largas
  const divisions = (torneio as Record<string, unknown>).divisions as number ?? 1
  const activeGroup = (torneio as Record<string, unknown>).active_group as number ?? 1
  const groupsAssigned = ranked.some(p => (p as RankItem).round_group != null)
  // sorteio das gaiolas feito → inscrições encerradas (anti-roubo)
  const drawDone = ranked.length >= 2 && ranked.every(p => (p as { marks_participant_id?: string | null }).marks_participant_id != null)
  const showPanel = (torneio.status === 'open' || torneio.status === 'running') && divisions > 1 && groupsAssigned
  const competing: RankItem[] = ranked.filter(p => (p as RankItem).round_group === activeGroup)
  const nextGroupItems: RankItem[] = ranked.filter(p => (p as RankItem).round_group === activeGroup + 1)
  const isActive = torneio.status === 'open' || torneio.status === 'running'
  // primeira marcação definida (grupos das gaiolas atribuídos) → inscrições fecham
  const canJoin = isOpen && !groupsAssigned && !drawDone
  const time = fmtTime(torneio.start_at)
  const streamUrl = ((torneio as Record<string, unknown>).stream_url as string | null) ?? null
  const embedUrl = streamUrl ? toEmbedUrl(streamUrl) : null
  const chatVideoId = streamUrl ? getYouTubeId(streamUrl) : null

  /* "Encerrado" SÓ quando finalizado — entre marcações (running com janela
     expirada) o torneio segue em andamento */
  const statusLabel = torneio.status === 'finished' ? 'Encerrado' : isLive ? 'Ao vivo' : isOpen ? 'Aberto' : 'Em andamento'

  return (
    <>
      {isActive && <SpectatorRealtime tournamentId={id} />}

      <div className="sp-shell">
        {/* painel de info: hero escuro no mobile, sidebar fixa no desktop */}
        <aside className="sp-side">
          <div className="sp-side-inner">
            <Link href="/torneios" className="sp-back">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Torneios
            </Link>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                {isLive && <span className="live-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />}
                <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: isLive ? '#4ADE80' : 'rgba(255,255,255,0.55)' }}>
                  {statusLabel}
                </span>
              </div>
              <h1 style={{ margin: '0 0 6px', fontWeight: 800, fontSize: 'clamp(1.3rem, 1.05rem + 1.2vw, 1.6rem)', color: '#fff', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
                {torneio.name}
              </h1>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>
                {[clube?.name, clube?.cidade && clube?.estado ? `${clube.cidade}, ${clube.estado}` : null].filter(Boolean).join(' · ')}
                {time && ` · ${isLive ? 'Iniciado' : 'Previsto'} ${time}`}
              </p>

              {/* horários: agora / próxima marcação / termina em */}
              {isActive && <SpectatorClock startAt={torneio.start_at} durationSecs={torneio.duration_secs ?? 0} onDark />}
            </div>

            {/* live ao vivo (iframe único — compartilhado entre mobile e desktop) */}
            {embedUrl && (
              <div>
                <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: '#000' }}>
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

            {/* chat da live (só YouTube) */}
            {chatVideoId && <LiveChat videoId={chatVideoId} className="sp-chat" />}

            {isOpen && torneio.qr_token && (
              <div style={{ margin: '2px 0 -20px' }}>
                <ParticiparCta tournamentId={torneio.id} qrToken={torneio.qr_token} closed={!canJoin} />
              </div>
            )}

            <p className="sp-count">
              {canJoin
                ? `${ranked.length} participante${ranked.length !== 1 ? 's' : ''} inscrito${ranked.length !== 1 ? 's' : ''}`
                : 'Inscrições encerradas'}
            </p>
          </div>
        </aside>

        {/* placar — no desktop rola sozinho em loop (telão) */}
        <AutoScrollMain className="sp-main">
          <div className="sp-main-inner">
            {/* Anúncio — 100% da largura no topo da coluna do placar */}
            <div style={{ marginBottom: 20 }}>
              <AdBanner inline />
            </div>
            <div style={{ marginBottom: 20 }}>
              <p style={eyebrowStyle('#0D8F41')}>
                {isLive ? 'Placar ao vivo' : eliminated.length > 0 ? 'Ainda participando' : 'Participantes'}
              </p>
              <h2 style={{ margin: 0, fontWeight: 800, fontSize: 'clamp(1.3rem, 1.1rem + 1vw, 1.8rem)', color: '#111827', letterSpacing: '-0.03em' }}>
                Ranking
              </h2>
            </div>

            {showPanel ? (
              <div className="sp-panel-grid">
                <MarcacaoPanel
                  startAt={torneio.start_at} durationSecs={torneio.duration_secs ?? 0}
                  activeGroup={activeGroup} divisions={divisions}
                  current={competing} next={nextGroupItems} timeMode={isFibra}
                />
                <div>
                  <p style={eyebrowStyle('#0D8F41')}>Ranking geral</p>
                  <AnimatedRanking items={ranked as RankItem[]} emptyText="Nenhum participante aprovado ainda." timeMode={isFibra} />
                </div>
              </div>
            ) : ranked.length > 0 ? (
              <AnimatedRanking items={ranked as RankItem[]} timeMode={isFibra} />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF' }}>
                <p style={{ margin: '0 0 4px', fontSize: '0.85rem' }}>Nenhum participante aprovado ainda.</p>
                <p style={{ margin: 0, fontSize: '0.75rem' }}>As inscrições aparecem aqui após aprovação.</p>
              </div>
            )}

            {/* Eliminados */}
            {eliminated.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <p style={eyebrowStyle('#DC2626')}>Eliminados ({eliminated.length})</p>
                <EliminadosLista eliminated={eliminated} timeMode={isFibra} />
              </div>
            )}

            {/* Histórico de cantos por rodada */}
            {historyByRound.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <p style={eyebrowStyle('#0D8F41')}>Histórico por rodada</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {historyByRound.map(rd => <HistoricoRodada key={rd.round} rd={rd} timeMode={isFibra} />)}
                </div>
              </div>
            )}

            {isLive && (
              <p style={{ margin: '20px 0 0', fontSize: '0.65rem', color: '#D1D5DB', textAlign: 'right' }}>
                Atualiza automaticamente a cada 5s
              </p>
            )}
          </div>
        </AutoScrollMain>
      </div>

      <style>{`
        .sp-shell { min-height: calc(100dvh - 56px); background: #fff; }
        .sp-side { background: #16382A; }
        .sp-side-inner {
          max-width: 680px; margin: 0 auto; padding: 24px 20px 24px;
          display: flex; flex-direction: column; gap: 18px;
        }
        .sp-back {
          align-self: flex-start; display: inline-flex; align-items: center; gap: 4px;
          font-size: 0.72rem; font-weight: 600; color: rgba(255,255,255,0.5);
          text-decoration: none; padding: 5px 10px 5px 7px; border-radius: 7px;
          border: 1px solid rgba(255,255,255,0.12);
        }
        .sp-count { margin: 0; text-align: center; font-size: 0.75rem; color: rgba(255,255,255,0.4); }
        .sp-main-inner { max-width: 680px; margin: 0 auto; padding: 24px 20px 48px; }
        .sp-panel-grid { display: grid; grid-template-columns: 1fr; gap: 24px; align-items: start; }
        /* chat precisa de altura de sobra — curto demais corta o topo e a caixa de digitação */
        .sp-chat { height: min(480px, 70dvh); }

        /* ≥1024px: modo telão — sem navbar do site, tela inteira (100dvh),
           sidebar fixa + placar com scroll próprio */
        @media (min-width: 1024px) {
          .site-header { display: none !important; }
          .sp-shell {
            display: grid; grid-template-columns: clamp(300px, 30vw, 400px) 1fr;
            height: 100dvh; overflow: hidden;
          }
          .sp-chat { height: auto; flex: 1; min-height: 420px; }
          .sp-side { overflow-y: auto; border-right: 1px solid rgba(255,255,255,0.08); }
          .sp-side-inner { max-width: none; min-height: 100%; padding: 32px 28px; box-sizing: border-box; }
          .sp-count { margin-top: auto; padding-top: 20px; }
          .sp-main { overflow-y: auto; }
          .sp-main-inner { max-width: 1100px; margin: 0; padding: 32px 40px 48px; }
          /* ranking maior no telão (consumido pelas linhas do ranking) */
          .sp-main {
            --rk-gap: 14px; --rk-pad: 11px 16px;
            --rk-pos-w: 30px; --rk-pos-fs: 0.8rem;
            --rk-name-fs: 0.95rem; --rk-sub-fs: 0.78rem; --rk-score-fs: 1.3rem;
            --rk-warn-pad: 4px 10px; --rk-warn-ico: 14px; --rk-warn-fs: 0.85rem;
          }
        }

        /* ≥1280px: marcação atual e ranking geral lado a lado */
        @media (min-width: 1280px) {
          .sp-panel-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </>
  )
}
