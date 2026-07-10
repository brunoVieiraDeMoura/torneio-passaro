'use client'

import { useState } from 'react'
import Link from 'next/link'

const BREED_STYLE: Record<string, { color: string; bg: string }> = {
  'Coleiro':          { color: '#1F2937', bg: '#F8FAFC' },
  'Canário belga':    { color: '#D97706', bg: '#FEFCE8' },
  'Canário da terra': { color: '#EAB308', bg: '#FFFBEB' },
  'Curió':            { color: '#92400E', bg: '#FEF3C7' },
  'Bicudo':           { color: '#374151', bg: '#F1F5F9' },
  'Patativa':         { color: '#6B7280', bg: '#F9FAFB' },
  'Galo campina':     { color: '#DC2626', bg: '#FEF2F2' },
  'Sabiá laranjeira': { color: '#EA580C', bg: '#FFF7ED' },
  'Pintassilgo':      { color: '#CA8A04', bg: '#FEFCE8' },
  'Trinca Ferro':     { color: '#64748B', bg: '#F8FAFC' },
  'Azulão':           { color: '#2563EB', bg: '#EFF6FF' },
  'Bigodinho':        { color: '#475569', bg: '#F9FAFB' },
  'Sanhaço':          { color: '#4338CA', bg: '#EEF2FF' },
  'Tiziu':            { color: '#0F766E', bg: '#F0FDFA' },
}
const DEFAULT_BS = { color: '#6B7280', bg: '#F3F4F6' }

const BIRD_PHOTO: Record<string, string> = {
  'Coleiro':          '/passarinhos-img/coleiro.jpg',
  'Canário belga':    '/passarinhos-img/canario-belga.jpg',
  'Canário da terra': '/passarinhos-img/canario-da-terra.jpg',
  'Curió':            '/passarinhos-img/curio.jpg',
  'Bicudo':           '/passarinhos-img/bicudo.jpg',
  'Patativa':         '/passarinhos-img/patativa.jpg',
  'Galo campina':     '/passarinhos-img/galo-campina.jpg',
  'Sabiá laranjeira': '/passarinhos-img/sabia-laranjeira.jpg',
  'Pintassilgo':      '/passarinhos-img/pintassilgo.jpg',
  'Trinca Ferro':     '/passarinhos-img/trinca-ferro.jpg',
  'Azulão':           '/passarinhos-img/azulao.jpg',
  'Bigodinho':        '/passarinhos-img/bigodinho.jpg',
  'Sanhaço':          '/passarinhos-img/sanhaco.jpg',
  'Tiziu':            '/passarinhos-img/tiziu.jpg',
}

function BirdSvg({ color, size = 32 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 7h.01"/>
      <path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20"/>
      <path d="m20 7 2 .5-2 .5"/>
      <path d="M10 18v3"/>
      <path d="M14 17.75v3.25"/>
      <path d="M7 18a6 6 0 0 0 3.84-10.61"/>
    </svg>
  )
}

interface HistoryItem {
  participant_id: string; tournament_id: string; tournament_name: string
  tournament_status: string; tournament_start_at: string | null
  tournament_cidade: string; tournament_estado: string
  score_count: number; joined_at: string; participant_status: string
}

interface Props {
  bird: { id: string; name: string; raca: string | null; estilo_canto: string | null; created_at: string }
  history: HistoryItem[]
}

function fmt(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function BirdReport({ bird, history }: Props) {
  const bs = BREED_STYLE[bird.raca ?? ''] ?? DEFAULT_BS
  const photo = BIRD_PHOTO[bird.raca ?? '']
  const [imgError, setImgError] = useState(false)
  const totalCantos  = history.reduce((s, h) => s + h.score_count, 0)
  const totalTorneios = history.length
  const melhor = history.reduce((best, h) => h.score_count > best ? h.score_count : best, 0)

  const now = new Date()
  const startOfWeek  = new Date(now); startOfWeek.setDate(now.getDate() - 7)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfYear  = new Date(now.getFullYear(), 0, 1)

  function cantosFrom(from: Date) {
    return history
      .filter(h => new Date(h.tournament_start_at ?? h.joined_at) >= from)
      .reduce((s, h) => s + h.score_count, 0)
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .print-page { padding: 0 !important; }
        }
        .hist-head {
          display: grid; grid-template-columns: 1fr 140px 90px 80px; gap: 12px;
          padding: 10px 20px; background: #F9FAFB; border-bottom: 1px solid #F3F4F6;
        }
        .hist-row {
          display: grid; grid-template-columns: 1fr 140px 90px 80px; gap: 12px;
          padding: 14px 20px; align-items: center;
        }
        .hist-cantos { text-align: right; }
        .hist-label { display: none; }
        @media (max-width: 640px) {
          .hist-head { display: none; }
          .hist-row {
            grid-template-columns: 1fr auto; gap: 4px 12px;
            padding: 14px 16px; align-items: start;
          }
          .hist-torneio { grid-column: 1; grid-row: 1; }
          .hist-cantos  { grid-column: 2; grid-row: 1; text-align: right; }
          .hist-local   { grid-column: 1 / -1; grid-row: 2; }
          .hist-data    { grid-column: 1 / -1; grid-row: 3; }
          .hist-label { display: inline; color: #9CA3AF; font-weight: 600; margin-right: 4px; }
        }
      `}</style>

      <div className="print-page" style={{ background: '#FAFAFA', minHeight: '100vh' }}>

        {/* ── page header (hidden on print) ── */}
        <div className="no-print" style={{ background: '#fff', borderBottom: '1px solid #F3F4F6', padding: '14px 0' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: '0 0 3px', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#0D8F41' }}>
                Relatório
              </p>
              <Link href="/meus-passarinhos" style={{ fontSize: '0.78rem', color: '#6B7280', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                Meus Pássaros
              </Link>
            </div>
            <button onClick={() => window.print()} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: '#111827', border: 'none', borderRadius: 9,
              padding: '8px 16px', cursor: 'pointer', color: '#fff',
              fontSize: '0.78rem', fontWeight: 700, fontFamily: 'inherit',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
              </svg>
              Imprimir / PDF
            </button>
          </div>
        </div>

        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 16px 60px' }}>

          {/* ── bird header ── */}
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: '24px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 18, flexShrink: 0,
              overflow: 'hidden',
              background: (photo && !imgError) ? 'transparent' : '#fff',
              border: (photo && !imgError) ? 'none' : '1.5px solid #E5E7EB',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {(photo && !imgError)
                ? <img src={photo} alt={bird.raca ?? ''} onError={() => setImgError(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : <BirdSvg color={bs.color} size={38} />
              }
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 6px', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#0D8F41' }}>
                Relatório do Pássaro
              </p>
              <h1 style={{ margin: '0 0 8px', fontWeight: 800, fontSize: '1.5rem', color: '#111827', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
                {bird.name}
              </h1>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {bird.raca && (
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: bs.color, background: bs.bg, borderRadius: 20, padding: '3px 10px' }}>
                    {bird.raca}
                  </span>
                )}
                {bird.estilo_canto && (
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#374151', background: '#F3F4F6', borderRadius: 20, padding: '3px 10px' }}>
                    {bird.estilo_canto}
                  </span>
                )}
                <span style={{ fontSize: '0.7rem', color: '#9CA3AF', padding: '3px 0' }}>
                  Cadastrado em {fmt(bird.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* ── stats grid ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
            {/* cantos por período */}
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '20px' }}>
              <p style={{ margin: '0 0 14px', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9CA3AF' }}>
                Cantos por período
              </p>
              {[
                { label: 'Esta semana', value: cantosFrom(startOfWeek) },
                { label: 'Este mês',    value: cantosFrom(startOfMonth) },
                { label: 'Este ano',    value: cantosFrom(startOfYear) },
                { label: 'Todo tempo',  value: totalCantos },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F9FAFB' }}>
                  <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>{s.label}</span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>
                    {s.value.toLocaleString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>

            {/* resumo geral */}
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '20px' }}>
              <p style={{ margin: '0 0 14px', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9CA3AF' }}>
                Resumo geral
              </p>
              {[
                { label: 'Total de cantos',    value: totalCantos.toLocaleString('pt-BR') },
                { label: 'Campeonatos',        value: totalTorneios.toString() },
                { label: 'Melhor pontuação',   value: melhor.toLocaleString('pt-BR') },
                { label: 'Média por torneio',  value: totalTorneios > 0 ? Math.round(totalCantos / totalTorneios).toLocaleString('pt-BR') : '—' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F9FAFB' }}>
                  <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>{s.label}</span>
                  <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── history table ── */}
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #F3F4F6' }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>
                Histórico de campeonatos
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#9CA3AF' }}>
                {totalTorneios} participação{totalTorneios !== 1 ? 'ções' : ''}
              </p>
            </div>

            {history.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.85rem' }}>
                Nenhum campeonato participado ainda.
              </div>
            ) : (
              <>
                {/* table header */}
                <div className="hist-head">
                  {['Torneio', 'Local', 'Data', 'Cantos'].map(h => (
                    <p key={h} style={{ margin: 0, fontSize: '0.6rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: h === 'Cantos' ? 'right' : 'left' }}>
                      {h}
                    </p>
                  ))}
                </div>
                {history.map((h, i) => (
                  <div key={h.participant_id} className="hist-row" style={{
                    borderBottom: i < history.length - 1 ? '1px solid #F9FAFB' : 'none',
                    background: h.score_count === melhor && melhor > 0 ? '#FFFBEB' : 'transparent',
                  }}>
                    <div className="hist-torneio" style={{ minWidth: 0 }}>
                      <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: '0.85rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {h.tournament_name}
                        {h.score_count === melhor && melhor > 0 && (
                          <span style={{ marginLeft: 6, fontSize: '0.6rem', fontWeight: 700, color: '#B45309', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 20, padding: '1px 6px' }}>
                            Melhor
                          </span>
                        )}
                      </p>
                      <span style={{
                        fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                        color: h.tournament_status === 'finished' ? '#6B7280' : '#0D8F41',
                      }}>
                        {h.tournament_status === 'finished' ? 'Encerrado' : h.tournament_status === 'running' ? 'Ao vivo' : 'Aberto'}
                      </span>
                    </div>
                    <p className="hist-local" style={{ margin: 0, fontSize: '0.78rem', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span className="hist-label">Local:</span>
                      {[h.tournament_cidade, h.tournament_estado].filter(Boolean).join(', ') || '—'}
                    </p>
                    <p className="hist-data" style={{ margin: 0, fontSize: '0.78rem', color: '#6B7280' }}>
                      <span className="hist-label">Data:</span>
                      {fmt(h.tournament_start_at)}
                    </p>
                    <p className="hist-cantos" style={{ margin: 0, fontWeight: 800, fontSize: '0.92rem', color: h.score_count === melhor && melhor > 0 ? '#B45309' : '#111827', letterSpacing: '-0.02em' }}>
                      {h.score_count.toLocaleString('pt-BR')}
                    </p>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* print footer */}
          <div style={{ marginTop: 32, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '0.68rem', color: '#D1D5DB' }}>
              Cantorias · Relatório gerado em {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
