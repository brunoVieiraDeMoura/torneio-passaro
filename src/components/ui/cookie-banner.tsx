'use client'

import { useState, useEffect } from 'react'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('cookie_consent')) setVisible(true)
  }, [])

  function accept() {
    localStorage.setItem('cookie_consent', 'accepted')
    setVisible(false)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(() => {}, () => {})
    }
  }

  function decline() {
    localStorage.setItem('cookie_consent', 'declined')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <>
      <style>{`
        @keyframes cookieFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes cookieSlideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .cookie-decline:hover { background: #F3F4F6 !important; color: #374151 !important; }
        .cookie-accept:hover  { background: #0a7a37 !important; }
      `}</style>

      {/* backdrop */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(2px)',
        animation: 'cookieFadeIn 0.25s ease',
      }} />

      {/* card */}
      <div style={{
        position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, width: 'calc(100% - 32px)', maxWidth: 460,
        background: '#fff',
        border: '1px solid #E5E7EB',
        borderRadius: 20,
        boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.1)',
        padding: '22px 22px 18px',
        animation: 'cookieSlideUp 0.35s cubic-bezier(0.16,1,0.3,1)',
      }}>

        {/* icon + title row */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
            background: '#F0FDF4',
            border: '1px solid #D1FAE5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.15rem',
          }}>
            🍪
          </div>
          <div style={{ flex: 1, paddingTop: 2 }}>
            <p style={{ margin: '0 0 5px', fontWeight: 700, fontSize: '0.9rem', color: '#111827', letterSpacing: '-0.01em' }}>
              Usamos cookies
            </p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#6B7280', lineHeight: 1.65 }}>
              Para localizar clubes perto de você e lembrar seus filtros de ranking — tipo de ave, estilo de canto e região preferida.
            </p>
          </div>
        </div>

        {/* location note */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#F0FDF4', border: '1px solid #D1FAE5',
          borderRadius: 10, padding: '9px 12px', marginBottom: 18,
        }}>
          <span style={{ fontSize: '0.78rem' }}>📍</span>
          <p style={{ margin: 0, fontSize: '0.73rem', color: '#065F46', lineHeight: 1.5 }}>
            Ao aceitar, também solicitaremos permissão de <strong>localização</strong> para sugerir clubes e rankings na sua região.
          </p>
        </div>

        {/* divider */}
        <div style={{ height: 1, background: '#F3F4F6', margin: '0 -22px 16px' }} />

        {/* buttons */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="cookie-decline" onClick={decline} style={{
            background: 'transparent', border: '1px solid #E5E7EB',
            borderRadius: 10, padding: '8px 18px',
            fontSize: '0.78rem', fontWeight: 600, color: '#6B7280',
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'background 0.15s, color 0.15s',
          }}>
            Recusar
          </button>
          <button className="cookie-accept" onClick={accept} style={{
            background: '#0D8F41', border: 'none',
            borderRadius: 10, padding: '8px 24px',
            fontSize: '0.78rem', fontWeight: 700, color: '#fff',
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'background 0.15s',
          }}>
            Aceitar
          </button>
        </div>
      </div>
    </>
  )
}
