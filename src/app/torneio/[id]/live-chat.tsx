'use client'

import { useEffect, useState } from 'react'

// Chat da live do YouTube — o embed exige o domínio exato da página
// (embed_domain), então só dá pra montar a URL no cliente.
export default function LiveChat({ videoId, className }: { videoId: string; className?: string }) {
  const [host, setHost] = useState<string | null>(null)
  useEffect(() => { setHost(window.location.hostname) }, [])
  if (!host) return null

  return (
    <iframe
      src={`https://www.youtube.com/live_chat?v=${videoId}&embed_domain=${host}`}
      className={className}
      title="Chat da live"
      style={{ width: '100%', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, background: '#fff' }}
    />
  )
}
