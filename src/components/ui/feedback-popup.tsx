'use client'

import { useEffect } from 'react'

export type PopupMsg = { type: 'success' | 'error'; text: string }

// Popup de feedback no estilo do site: verde p/ sucesso (some sozinho),
// vermelho p/ erro (fica até fechar). Fixo no topo, acima de tudo.
export default function FeedbackPopup({ msg, onClose }: { msg: PopupMsg | null; onClose: () => void }) {
  const isSuccess = msg?.type === 'success'

  useEffect(() => {
    if (!msg || !isSuccess) return
    const t = setTimeout(onClose, 3200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msg])

  if (!msg) return null
  const ok = msg.type === 'success'

  return (
    <div style={{ position: 'fixed', top: 14, left: 0, right: 0, zIndex: 600, display: 'flex', justifyContent: 'center', padding: '0 16px', pointerEvents: 'none' }}>
      <style>{`@keyframes fb-popup-in { from { transform: translateY(-14px); opacity: 0 } to { transform: none; opacity: 1 } }`}</style>
      <div role="alert" style={{
        pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 10,
        background: '#fff', border: `1px solid ${ok ? '#D1FAE5' : '#FECACA'}`,
        borderRadius: 12, boxShadow: '0 12px 32px rgba(0,0,0,0.16)',
        padding: '11px 12px 11px 14px', maxWidth: 440,
        animation: 'fb-popup-in 0.18s ease',
      }}>
        <span style={{
          width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
          background: ok ? '#F0FDF4' : '#FEF2F2',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {ok ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0D8F41" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="3" strokeLinecap="round">
              <line x1="12" y1="7" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          )}
        </span>
        <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: ok ? '#065F46' : '#991B1B', lineHeight: 1.45, flex: 1 }}>
          {msg.text}
        </p>
        <button onClick={onClose} aria-label="Fechar" style={{
          background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF',
          padding: 4, lineHeight: 0, flexShrink: 0, fontFamily: 'inherit',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
