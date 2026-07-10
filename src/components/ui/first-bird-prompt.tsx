'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const DISMISS_KEY = 'firstBirdPromptDismissed'

/**
 * Após o primeiro login, se o usuário (perfil 'user') ainda não tem nenhuma Ave
 * cadastrada, mostra um popup convidando a registrar a primeira.
 * Auto-guarda: só aparece p/ usuário logado, sem pássaros e que não dispensou.
 */
export default function FirstBirdPrompt() {
  const router = useRouter()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(DISMISS_KEY)) return

    let active = true
    ;(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !active) return

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'user' || !active) return

      const { count } = await supabase
        .from('birds')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if (active && (count ?? 0) === 0) setShow(true)
    })()

    return () => { active = false }
  }, [])

  function dismiss() {
    if (typeof window !== 'undefined') localStorage.setItem(DISMISS_KEY, '1')
    setShow(false)
  }

  function go() {
    if (typeof window !== 'undefined') localStorage.setItem(DISMISS_KEY, '1')
    setShow(false)
    router.push('/meus-passarinhos')
  }

  if (!show) return null

  return (
    <div onClick={e => { if (e.target === e.currentTarget) dismiss() }}
      style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', width: '100%', maxWidth: 380, boxSizing: 'border-box', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0D8F41" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 7h.01"/><path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20"/>
            <path d="m20 7 2 .5-2 .5"/><path d="M10 18v3"/><path d="M14 17.75v3.25"/>
            <path d="M7 18a6 6 0 0 0 3.84-10.61"/>
          </svg>
        </div>
        <p style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '1.05rem', color: '#111827' }}>
          Vamos registrar sua primeira Ave!
        </p>
        <p style={{ margin: '0 0 22px', fontSize: '0.82rem', color: '#6B7280', lineHeight: 1.5 }}>
          Cadastre seu pássaro para poder participar dos torneios.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={go}
            style={{ background: '#0D8F41', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Registrar minha Ave
          </button>
          <button onClick={dismiss}
            style={{ background: '#fff', color: '#9CA3AF', border: 'none', borderRadius: 8, padding: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Agora não
          </button>
        </div>
      </div>
    </div>
  )
}
