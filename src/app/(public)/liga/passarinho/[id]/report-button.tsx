'use client'

import { useState } from 'react'
import { reportLigaBird } from './actions'

const REASONS = [
  { value: 'imagem_ofensiva', label: 'Imagem ofensiva' },
  { value: 'nome_ofensivo', label: 'Nome ofensivo' },
  { value: 'fraude', label: 'Suspeita de fraude' },
  { value: 'coligacao', label: 'Suspeita de coligação com clubes' },
]

// Botão "Reportar" do perfil da liga: modal com motivo + detalhes opcionais.
export default function ReportButton({ targetId, targetLabel }: { targetId: string; targetLabel: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<string>('')
  const [details, setDetails] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function enviar() {
    if (!reason) { setError('Escolha um motivo.'); return }
    setSending(true)
    setError(null)
    const res = await reportLigaBird({ targetId, targetLabel, reason, details })
    setSending(false)
    if (res.ok) setDone(true)
    else setError(res.error)
  }

  function fechar() {
    setOpen(false)
    setReason(''); setDetails(''); setError(null); setDone(false)
  }

  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: '#fff', color: '#6B7280', border: '1px solid #E5E7EB',
        borderRadius: 8, padding: '7px 12px', fontSize: '0.72rem', fontWeight: 700,
        cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
        </svg>
        Reportar
      </button>

      {open && (
        <div onClick={e => { if (e.target === e.currentTarget) fechar() }}
          style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '26px 24px', width: '100%', maxWidth: 420, boxSizing: 'border-box', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            {done ? (
              <>
                <p style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '0.95rem', color: '#0D8F41' }}>✓ Report enviado</p>
                <p style={{ margin: '0 0 18px', fontSize: '0.8rem', color: '#6B7280', lineHeight: 1.5 }}>
                  Obrigado. O admin vai analisar o perfil <strong>{targetLabel}</strong>.
                </p>
                <button onClick={fechar} style={{ width: '100%', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Fechar
                </button>
              </>
            ) : (
              <>
                <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '0.95rem', color: '#111827' }}>Reportar perfil</p>
                <p style={{ margin: '0 0 16px', fontSize: '0.75rem', color: '#9CA3AF' }}>
                  {targetLabel} — o report vai para análise do admin.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                  {REASONS.map(r => (
                    <label key={r.value} style={{
                      display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                      border: `1px solid ${reason === r.value ? '#0D8F41' : '#E5E7EB'}`,
                      background: reason === r.value ? '#F0FDF4' : '#fff',
                      borderRadius: 10, padding: '11px 14px',
                    }}>
                      <input type="radio" name="report-reason" value={r.value}
                        checked={reason === r.value} onChange={() => setReason(r.value)}
                        style={{ accentColor: '#0D8F41' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>{r.label}</span>
                    </label>
                  ))}
                </div>

                <textarea
                  placeholder="Detalhes (opcional)"
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%', boxSizing: 'border-box', resize: 'vertical',
                    border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 12px',
                    fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', marginBottom: 12,
                  }}
                />

                {error && (
                  <p style={{ margin: '0 0 12px', fontSize: '0.75rem', fontWeight: 600, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px' }}>
                    {error}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={enviar} disabled={sending}
                    style={{ flex: 1, background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: sending ? 0.7 : 1 }}>
                    {sending ? 'Enviando…' : 'Enviar report'}
                  </button>
                  <button onClick={fechar}
                    style={{ flex: 1, background: '#fff', color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: 8, padding: '11px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
