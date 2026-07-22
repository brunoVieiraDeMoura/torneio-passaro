'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { processBirdPhoto } from '@/lib/bird-photo'
import { uploadBirdPhoto } from './actions'
import FeedbackPopup, { type PopupMsg } from '@/components/ui/feedback-popup'
import { formatDuration } from '@/lib/duration'

const BREED_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  'Coleiro':          { color: '#1F2937', bg: '#F8FAFC', border: '#94A3B8' },
  'Canário belga':    { color: '#D97706', bg: '#FEFCE8', border: '#FDE047' },
  'Canário da terra': { color: '#EAB308', bg: '#FFFBEB', border: '#FCD34D' },
  'Curió':            { color: '#92400E', bg: '#FEF3C7', border: '#A16207' },
  'Bicudo':           { color: '#374151', bg: '#F1F5F9', border: '#64748B' },
  'Patativa':         { color: '#6B7280', bg: '#F9FAFB', border: '#9CA3AF' },
  'Galo campina':     { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  'Sabiá laranjeira': { color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' },
  'Pintassilgo':      { color: '#CA8A04', bg: '#FEFCE8', border: '#FDE047' },
  'Trinca Ferro':     { color: '#64748B', bg: '#F8FAFC', border: '#CBD5E1' },
  'Azulão':           { color: '#2563EB', bg: '#EFF6FF', border: '#93C5FD' },
  'Bigodinho':        { color: '#475569', bg: '#F9FAFB', border: '#D1D5DB' },
  'Sanhaço':          { color: '#4338CA', bg: '#EEF2FF', border: '#A5B4FC' },
  'Tiziu':            { color: '#0F766E', bg: '#F0FDFA', border: '#99F6E4' },
}

const DEFAULT_STYLE = { color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' }

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

function BirdSvg({ color, size = 28 }: { color: string; size?: number }) {
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

type Period = 'semana' | 'mês' | 'ano' | 'total'

interface HistoryItem {
  participant_id: string
  tournament_name: string
  tournament_status: string
  tournament_start_at: string | null
  score_count: number
  joined_at: string
  won?: boolean // 1º lugar em torneio finalizado
}

interface Props {
  bird: {
    id: string; name: string; raca: string | null; estilo_canto: string | null; created_at: string
    photo_url?: string | null
  }
  history: HistoryItem[]
}

function totalFor(history: HistoryItem[], period: Period): number {
  const now = new Date()
  return history.reduce((sum, h) => {
    const date = new Date(h.tournament_start_at ?? h.joined_at)
    if (period === 'semana') {
      const week = new Date(now); week.setDate(now.getDate() - 7)
      if (date < week) return sum
    } else if (period === 'mês') {
      if (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) return sum
    } else if (period === 'ano') {
      if (date.getFullYear() !== now.getFullYear()) return sum
    }
    return sum + h.score_count
  }, 0)
}

export default function BirdCard({ bird, history }: Props) {
  const router = useRouter()
  const bs = BREED_STYLE[bird.raca ?? ''] ?? DEFAULT_STYLE
  const [imgError, setImgError] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(bird.photo_url ?? null)
  const [uploading, setUploading] = useState(false)
  const [popup, setPopup] = useState<PopupMsg | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  // foto própria primeiro; sem ela, a foto padrão da raça
  const photo = photoUrl ?? BIRD_PHOTO[bird.raca ?? '']

  // clicar na foto → escolher imagem → crop/reduz no cliente → upload
  async function handlePhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite escolher o mesmo arquivo de novo
    if (!file) return
    setUploading(true)
    try {
      const blob = await processBirdPhoto(file)
      const fd = new FormData()
      fd.set('birdId', bird.id)
      fd.set('photo', new File([blob], 'photo.jpg', { type: 'image/jpeg' }))
      const res = await uploadBirdPhoto(fd)
      if (res.ok) {
        setPhotoUrl(res.url); setImgError(false)
        setPopup({ type: 'success', text: `Foto de "${bird.name}" atualizada!` })
        router.refresh()
      } else {
        setPopup({ type: 'error', text: res.error })
      }
    } catch (err) {
      setPopup({ type: 'error', text: err instanceof Error ? err.message : 'Erro ao processar a imagem.' })
    }
    setUploading(false)
  }
  const [period, setPeriod]       = useState<Period>('total')
  const [editing, setEditing]       = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [name, setName]           = useState(bird.name)
  const [saving, setSaving]       = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('birds').delete().eq('id', bird.id)
    router.refresh()
  }

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('birds').update({ name }).eq('id', bird.id)
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  const fieldSt: React.CSSProperties = {
    width: '100%', border: '1px solid #E5E7EB', borderRadius: 8,
    padding: '8px 10px', fontSize: '0.82rem', fontFamily: 'inherit',
    color: '#111827', background: '#fff', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ position: 'relative', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, overflow: 'hidden' }}>
      <FeedbackPopup msg={popup} onClose={() => setPopup(null)} />

      {/* ── top bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px 0' }}>

        {/* avatar — clicar troca a foto (crop pequeno automático) */}
        <button
          type="button"
          onClick={() => !uploading && fileRef.current?.click()}
          title="Trocar foto do pássaro"
          aria-label="Trocar foto do pássaro"
          style={{
            position: 'relative', width: 56, height: 56, borderRadius: 14, flexShrink: 0,
            overflow: 'hidden', padding: 0, cursor: uploading ? 'wait' : 'pointer',
            background: (photo && !imgError) ? 'transparent' : '#fff',
            border: (photo && !imgError) ? 'none' : `1.5px solid ${bs.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'inherit',
          }}>
          {(photo && !imgError)
            ? <img src={photo} alt={bird.raca ?? ''} onError={() => setImgError(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: uploading ? 0.4 : 1 }} />
            : <BirdSvg color={bs.color} size={30} />
          }
          {/* badge de câmera */}
          <span style={{
            position: 'absolute', right: 2, bottom: 2, width: 18, height: 18,
            borderRadius: '50%', background: 'rgba(17,24,39,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {uploading ? (
              <span style={{ color: '#fff', fontSize: '0.55rem', fontWeight: 800 }}>…</span>
            ) : (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            )}
          </span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoPick} style={{ display: 'none' }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <input
              value={name} onChange={e => setName(e.target.value)}
              style={{ ...fieldSt, fontWeight: 700, fontSize: '0.95rem', marginBottom: 6 }}
            />
          ) : (
            <p style={{ margin: '0 0 3px', fontWeight: 800, fontSize: '0.95rem', color: '#111827' }}>{bird.name}</p>
          )}
          {!editing && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {bird.raca && (
                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: bs.color, background: bs.bg, border: `1px solid ${bs.border}`, borderRadius: 20, padding: '2px 8px' }}>
                  {bird.raca}
                </span>
              )}
              {bird.estilo_canto && (
                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#374151', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 20, padding: '2px 8px' }}>
                  {bird.estilo_canto}
                </span>
              )}
            </div>
          )}
        </div>

        {/* action buttons — só ícone: com texto estouravam a largura no celular */}
        {!editing && (
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={() => setEditing(true)} title="Editar" aria-label="Editar pássaro" style={{
              background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8,
              width: 34, height: 34, cursor: 'pointer', color: '#6B7280', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 0,
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button onClick={() => setConfirmDelete(true)} title="Deletar" aria-label="Deletar pássaro" style={{
              background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8,
              width: 34, height: 34, cursor: 'pointer', color: '#DC2626', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 0,
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* ── edit form — só nome (input acima) e foto (botão da foto). Raça/estilo não editam. ── */}
      {editing && (
        <div style={{ padding: '0 18px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ margin: 0, fontSize: '0.72rem', color: '#9CA3AF' }}>
            Edite o nome acima ou toque na foto para trocar a imagem.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => { setEditing(false); setName(bird.name) }} style={{
              background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8,
              padding: '8px 16px', cursor: 'pointer', color: '#6B7280',
              fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit',
            }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving} style={{
              background: '#0D8F41', border: 'none', borderRadius: 8,
              padding: '8px 20px', cursor: saving ? 'not-allowed' : 'pointer',
              color: '#fff', fontSize: '0.8rem', fontWeight: 700, fontFamily: 'inherit',
            }}>{saving ? 'Salvando…' : 'Salvar'}</button>
          </div>
        </div>
      )}

      {/* ── stats ── */}
      <div style={{ padding: '14px 16px 0' }}>
        {/* period tabs */}
        <div style={{ display: 'flex', gap: 2, background: '#F3F4F6', borderRadius: 8, padding: 3, width: 'fit-content', marginBottom: 12 }}>
          {(['semana','mês','ano','total'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              background: period === p ? '#fff' : 'transparent',
              border: 'none', borderRadius: 6, padding: '5px 12px',
              fontSize: '0.7rem', fontWeight: period === p ? 700 : 500,
              color: period === p ? '#111827' : '#9CA3AF',
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: period === p ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.12s',
            }}>{p.charAt(0).toUpperCase() + p.slice(1)}</button>
          ))}
        </div>

        {/* stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
          {(() => {
            const inPeriod = (h: HistoryItem) => {
              if (period === 'total') return true
              const now = new Date(); const date = new Date(h.tournament_start_at ?? h.joined_at)
              if (period === 'semana') { const w = new Date(now); w.setDate(now.getDate()-7); return date >= w }
              if (period === 'mês') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
              if (period === 'ano') return date.getFullYear() === now.getFullYear()
              return true
            }
            // Canto Fibra pontua por TEMPO (ms) → total é tempo somado (mm:ss), não nº de cantos
            const isFibra = bird.estilo_canto === 'Canto Fibra'
            const totalScore = totalFor(history, period)
            return [
              { label: isFibra ? 'Tempo de canto' : 'Cantos', value: isFibra ? formatDuration(totalScore) : totalScore.toLocaleString('pt-BR') },
              { label: 'Torneios', value: history.filter(inPeriod).length.toString() },
              { label: 'Vitórias', value: history.filter(h => h.won && inPeriod(h)).length.toString() },
            ]
          })().map(s => (
            <div key={s.label} style={{ background: '#F9FAFB', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 2px', fontWeight: 800, fontSize: '1.1rem', color: '#111827', letterSpacing: '-0.02em' }}>{s.value}</p>
              <p style={{ margin: 0, fontSize: '0.62rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── footer: history link ── */}
      <div style={{ borderTop: '1px solid #F3F4F6', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
          {history.length} campeonato{history.length !== 1 ? 's' : ''}
        </span>
        <Link href={`/meus-passarinhos/${bird.id}`} style={{
          fontSize: '0.78rem', fontWeight: 600, color: '#0D8F41',
          textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4,
        }}>
          Ver histórico completo →
        </Link>
      </div>

      {/* ── confirm delete overlay ── */}
      {confirmDelete && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(3px)', borderRadius: 16,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 14, padding: 24, zIndex: 10,
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.92rem', color: '#111827' }}>Deletar &quot;{bird.name}&quot;?</p>
            <p style={{ margin: 0, fontSize: '0.76rem', color: '#6B7280', lineHeight: 1.5 }}>
              Esta ação não pode ser desfeita.<br />O histórico de campeonatos será mantido.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setConfirmDelete(false)} style={{
              background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 9,
              padding: '9px 18px', cursor: 'pointer', color: '#374151',
              fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit',
            }}>Cancelar</button>
            <button onClick={handleDelete} disabled={deleting} style={{
              background: '#DC2626', border: 'none', borderRadius: 9,
              padding: '9px 18px', cursor: deleting ? 'not-allowed' : 'pointer',
              color: '#fff', fontSize: '0.8rem', fontWeight: 700, fontFamily: 'inherit',
            }}>{deleting ? 'Deletando…' : 'Sim, deletar'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
