'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Alert = { id: string; type: string; message: string; created_at: string }

const TYPE_ICON: Record<string, string> = {
  imagem_removida: '🖼️',
  nome_filtrado: '✏️',
  aviso: '⚠️',
}

// Avisos de moderação (user_alerts) não lidos do usuário logado — modal que só
// fecha no "Entendi" (marca como lido). Criados pelo admin na Admin Central.
export default function UserAlerts({ userId }: { userId: string }) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    supabase.from('user_alerts')
      .select('id, type, message, created_at')
      .eq('user_id', userId)
      .eq('read', false)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (!cancelled && data) setAlerts(data) })
    return () => { cancelled = true }
  }, [userId])

  if (alerts.length === 0) return null

  async function entendi() {
    setClosing(true)
    const supabase = createClient()
    await supabase.from('user_alerts')
      .update({ read: true })
      .in('id', alerts.map(a => a.id))
    setAlerts([])
    setClosing(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '26px 24px', width: '100%', maxWidth: 440, boxSizing: 'border-box', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', maxHeight: '80dvh', overflowY: 'auto' }}>
        <p style={{ margin: '0 0 4px', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B45309' }}>
          Aviso da administração
        </p>
        <h2 style={{ margin: '0 0 16px', fontWeight: 800, fontSize: '1.1rem', color: '#111827', letterSpacing: '-0.02em' }}>
          Você tem {alerts.length} aviso{alerts.length !== 1 ? 's' : ''}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
          {alerts.map(a => (
            <div key={a.id} style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.1rem', lineHeight: 1, flexShrink: 0 }}>{TYPE_ICON[a.type] ?? '⚠️'}</span>
              <div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#78350F', lineHeight: 1.55 }}>{a.message}</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.66rem', color: '#B45309' }}>
                  {new Date(a.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </p>
              </div>
            </div>
          ))}
        </div>

        <button onClick={entendi} disabled={closing} style={{
          width: '100%', background: '#111827', color: '#fff', border: 'none',
          borderRadius: 10, padding: '13px', fontSize: '0.9rem', fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit', opacity: closing ? 0.7 : 1,
        }}>
          {closing ? 'Salvando…' : 'Entendi'}
        </button>
      </div>
    </div>
  )
}
