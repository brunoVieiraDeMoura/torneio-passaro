'use client'

import { useEffect, useState } from 'react'

// Chat da live do YouTube — o embed exige o domínio exato da página
// (embed_domain), então só dá pra montar a URL no cliente.
//
// Limite do YouTube: o iframe usa a conta do YouTube logada NO NAVEGADOR e não
// dá pra logar/trocar conta por aqui (cross-origin). Para escrever, a conta
// precisa ter um canal no YouTube — por isso o "Create a channel to join the
// chat". O botão "Abrir no YouTube" resolve troca de conta/criação de canal.
export default function LiveChat({ videoId, className }: { videoId: string; className?: string }) {
  const [host, setHost] = useState<string | null>(null)
  useEffect(() => { setHost(window.location.hostname) }, [])
  if (!host) return null

  return (
    <div className={className} style={{
      display: 'flex', flexDirection: 'column',
      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
      overflow: 'hidden', background: '#0F0F0F',
    }}>
      {/* header no estilo do site */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        padding: '9px 12px', background: 'rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0,
      }}>
        <p style={{ margin: 0, fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#4ADE80', display: 'flex', alignItems: 'center', gap: 6 }}>
          💬 Chat da live
        </p>
        <a
          href={`https://www.youtube.com/live_chat?is_popout=1&v=${videoId}`}
          target="_blank" rel="noopener noreferrer"
          title="Abrir o chat no YouTube — troque de conta ou crie seu canal por lá"
          style={{
            fontSize: '0.66rem', fontWeight: 700, color: 'rgba(255,255,255,0.55)',
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)',
            flexShrink: 0,
          }}>
          Abrir no YouTube
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </a>
      </div>

      <iframe
        src={`https://www.youtube.com/live_chat?v=${videoId}&embed_domain=${host}&dark_theme=1`}
        title="Chat da live"
        style={{ flex: 1, width: '100%', minHeight: 0, border: 'none', display: 'block' }}
      />

      <p style={{
        margin: 0, padding: '7px 12px', fontSize: '0.62rem', lineHeight: 1.45,
        color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.04)',
        borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0,
      }}>
        O chat usa a conta do YouTube logada no navegador. Para escrever é preciso
        ter um canal — sem canal (ou pra trocar de conta), use “Abrir no YouTube”.
      </p>
    </div>
  )
}
