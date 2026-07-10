'use client'

import { useState, useEffect, useRef } from 'react'
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

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#6B7280',
  marginBottom: 5, letterSpacing: '0.06em', textTransform: 'uppercase',
}

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #E5E7EB', borderRadius: 8,
  padding: '10px 12px', fontSize: '0.85rem', outline: 'none',
  fontFamily: 'inherit', color: '#111827', background: '#fff', boxSizing: 'border-box',
}

function CustomSelect({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // detect if list has more content below
  useEffect(() => {
    if (!open) { setHasMore(false); return }
    const el = listRef.current
    if (!el) return
    function check() {
      setHasMore(el!.scrollTop + el!.clientHeight < el!.scrollHeight - 4)
    }
    check()
    el.addEventListener('scroll', check)
    window.addEventListener('resize', check)
    return () => {
      el.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [open])

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <style>{`
        @keyframes nudgeDown {
          0%, 100% { transform: translateY(0); opacity: 1; }
          50%       { transform: translateY(5px); opacity: 0.6; }
        }
      `}</style>

      {/* trigger button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          ...inputStyle,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', textAlign: 'left', gap: 8,
          color: value ? '#111827' : '#9CA3AF',
          borderColor: open ? '#111827' : '#E5E7EB',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {value || placeholder}
        </span>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          style={{ flexShrink: 0, transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* dropdown */}
      {open && (
        <div style={{ position: 'absolute', top: 4, left: 0, right: 0, zIndex: 10 }}>
          {/* scrollable list */}
          <div
            ref={listRef}
            style={{
              background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              maxHeight: 200, overflowY: 'auto',
            }}
          >
            {options.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false) }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '10px 12px', border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: '0.85rem',
                  background: value === opt ? '#F0FDF4' : 'transparent',
                  color: value === opt ? '#0D8F41' : '#111827',
                }}
              >
                {opt}
              </button>
            ))}
          </div>

          {/* scroll-more indicator — overlaid inside dropdown, bottom-right corner */}
          {hasMore && (
            <div style={{
              position: 'absolute', bottom: 8, right: 8, zIndex: 11,
              pointerEvents: 'none',
            }}>
              <div style={{
                background: '#fff', border: '1px solid #E5E7EB',
                borderRadius: '50%', width: 26, height: 26,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              }}>
                <svg
                  width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round"
                  style={{ animation: 'nudgeDown 1.2s ease-in-out infinite' }}
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function BirdForm({ userId }: { userId: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [raca, setRaca] = useState('')
  const [estilo, setEstilo] = useState('')
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    await supabase.from('birds').insert({ user_id: userId, name, raca, estilo_canto: estilo })
    setName(''); setRaca(''); setEstilo('')
    setLoading(false); setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '13px 16px', background: '#0D8F41', color: '#fff',
          border: 'none', borderRadius: 10, fontSize: '0.88rem',
          fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Adicionar pássaro
      </button>

      {open && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 400,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            ref={boxRef}
            style={{
              background: '#fff', borderRadius: 16, padding: '28px 24px',
              width: '100%', maxWidth: 420,
              boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#111827' }}>Novo pássaro</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4, lineHeight: 0 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Nome do pássaro</label>
                <input
                  type="text" placeholder="Ex: Canário Dourado" value={name}
                  onChange={e => setName(e.target.value)} required autoFocus
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Raça</label>
                <CustomSelect value={raca} onChange={setRaca} options={RACAS} placeholder="Selecionar raça..." />
              </div>

              <div>
                <label style={labelStyle}>Estilo de canto</label>
                <CustomSelect value={estilo} onChange={setEstilo} options={ESTILOS} placeholder="Selecionar estilo..." />
              </div>

              <button
                type="submit" disabled={loading}
                style={{
                  background: loading ? '#D1D5DB' : '#0D8F41', color: '#fff',
                  border: 'none', borderRadius: 8, padding: '12px',
                  fontSize: '0.88rem', fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', marginTop: 4,
                  transition: 'background 0.15s', width: '100%',
                }}
              >
                {loading ? 'Salvando...' : 'Salvar pássaro'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
