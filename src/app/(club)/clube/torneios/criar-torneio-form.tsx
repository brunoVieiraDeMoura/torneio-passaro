'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const RACAS = [
  'Coleiro', 'Canário belga', 'Canário da terra', 'Curió', 'Bicudo',
  'Patativa', 'Galo campina', 'Sabiá laranjeira', 'Pintassilgo',
  'Trinca Ferro', 'Azulão', 'Bigodinho', 'Sanhaço', 'Tiziu',
]
const ESTILOS = [
  'Canto clássico', 'Canto rolado', 'Canto livre', 'Canto regional', 'Canto nativo',
]

const inp: React.CSSProperties = {
  width: '100%', border: '1px solid #E5E7EB', borderRadius: 8,
  padding: '10px 12px', fontSize: '0.85rem', outline: 'none',
  fontFamily: 'inherit', color: '#111827', background: '#fff', boxSizing: 'border-box',
}
const lbl: React.CSSProperties = {
  display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#6B7280',
  marginBottom: 5, letterSpacing: '0.06em', textTransform: 'uppercase',
}

export default function CriarTorneioForm({ clubId, defaultEstado = '', defaultCidade = '' }: { clubId: string; defaultEstado?: string; defaultCidade?: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startHour, setStartHour] = useState('')
  const [startMin,  setStartMin]  = useState('')

  const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
  const MINS  = ['00', '15', '30', '45']
  const [duration, setDuration] = useState(15)
  const [tipoAve, setTipoAve] = useState('')
  const [estiloCanto, setEstiloCanto] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    await supabase.from('tournaments').insert({
      club_id: clubId,
      name,
      cidade: defaultCidade || null,
      estado: defaultEstado || null,
      duration_secs: duration * 60,
      start_at: startDate ? new Date(`${startDate}T${startHour || '00'}:${startMin || '00'}`).toISOString() : null,
      tipo_ave: tipoAve,
      estilo_canto: estiloCanto,
      status: 'draft',
    })
    setName(''); setStartDate(''); setStartHour(''); setStartMin('')
    setDuration(15); setTipoAve(''); setEstiloCanto('')
    setOpen(false); setLoading(false)
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#0D8F41', color: '#fff', border: 'none',
          borderRadius: 10, padding: '13px 18px', fontSize: '0.88rem',
          fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Criar torneio
      </button>
    )
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', width: '100%', maxWidth: 460, boxSizing: 'border-box', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: '#111827' }}>Novo torneio</p>
          <button type="button" onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4, lineHeight: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={lbl}>Nome do torneio</label>
            <input style={inp} placeholder="Ex: Copa Primavera 2025" value={name} onChange={e => setName(e.target.value)} required autoFocus />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div>
              <label style={lbl}>Data</label>
              <input style={inp} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Hora</label>
              <select style={{ ...inp, color: startHour ? '#111827' : '#9CA3AF' }} value={startHour} onChange={e => setStartHour(e.target.value)}>
                <option value="" style={{ color: '#9CA3AF' }}>--</option>
                {HOURS.map(h => <option key={h} value={h} style={{ color: '#111827' }}>{h}h</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Minuto</label>
              <select style={{ ...inp, color: startMin ? '#111827' : '#9CA3AF' }} value={startMin} onChange={e => setStartMin(e.target.value)}>
                <option value="" style={{ color: '#9CA3AF' }}>--</option>
                {MINS.map(m => <option key={m} value={m} style={{ color: '#111827' }}>{m}min</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={lbl}>Duração (minutos)</label>
            <input style={inp} type="number" min={1} max={120} value={duration} onChange={e => setDuration(Number(e.target.value))} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={lbl}>Passarinho</label>
              <select style={{ ...inp, color: tipoAve ? '#111827' : '#9CA3AF' }} value={tipoAve} onChange={e => setTipoAve(e.target.value)} required>
                <option value="">Selecionar raça...</option>
                {RACAS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Estilo de canto</label>
              <select style={{ ...inp, color: estiloCanto ? '#111827' : '#9CA3AF' }} value={estiloCanto} onChange={e => setEstiloCanto(e.target.value)} required>
                <option value="">Selecionar estilo...</option>
                {ESTILOS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              type="submit" disabled={loading}
              style={{
                flex: 1, background: loading ? '#D1D5DB' : '#0D8F41', color: '#fff',
                border: 'none', borderRadius: 8, padding: '12px',
                fontSize: '0.88rem', fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              }}
            >
              {loading ? 'Criando...' : 'Criar torneio'}
            </button>
            <button type="button" onClick={() => setOpen(false)} style={{ padding: '12px 16px', border: '1px solid #E5E7EB', borderRadius: 8, background: '#fff', color: '#6B7280', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
