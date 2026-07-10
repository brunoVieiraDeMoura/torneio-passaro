'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Bird { id: string; name: string; raca: string | null; estilo_canto: string | null }

interface Props {
  tournamentId: string
  tipoAve: string | null
  estiloCanto: string | null
  isLoggedIn: boolean
  profile: { name: string; email: string } | null
  matchingBirds: Bird[]
  returnPath: string
}

/* ── not logged in ── */
function NeedLogin({ returnPath }: { returnPath: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%', background: '#FEF3C7',
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: '0.95rem', color: '#111827' }}>
        Login necessário
      </p>
      <p style={{ margin: '0 0 20px', fontSize: '0.8rem', color: '#6B7280', lineHeight: 1.5 }}>
        Você precisa estar logado para inscrever seu pássaro neste torneio.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Link
          href={`/login?redirect=${encodeURIComponent(returnPath)}`}
          style={{
            display: 'block', textAlign: 'center', padding: '12px',
            background: '#0D8F41', color: '#fff', borderRadius: 8,
            fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none',
          }}
        >
          Entrar na conta
        </Link>
        <Link
          href={`/cadastro?redirect=${encodeURIComponent(returnPath)}`}
          style={{
            display: 'block', textAlign: 'center', padding: '12px',
            background: '#F9FAFB', color: '#374151', border: '1px solid #E5E7EB',
            borderRadius: 8, fontWeight: 600, fontSize: '0.88rem', textDecoration: 'none',
          }}
        >
          Criar conta
        </Link>
      </div>
    </div>
  )
}

/* ── no matching birds ── */
function NoBirds({ tipoAve, estiloCanto }: { tipoAve: string | null; estiloCanto: string | null }) {
  const categoria = [tipoAve, estiloCanto].filter(Boolean).join(' · ')
  return (
    <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%', background: '#F3F4F6',
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 7h.01"/><path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20"/>
          <path d="m20 7 2 .5-2 .5"/><path d="M10 18v3"/><path d="M14 17.75v3.25"/>
          <path d="M7 18a6 6 0 0 0 3.84-10.61"/>
        </svg>
      </div>
      <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: '0.95rem', color: '#111827' }}>
        Nenhum pássaro compatível
      </p>

      {categoria ? (
        <>
          <p style={{ margin: '0 0 6px', fontSize: '0.8rem', color: '#6B7280', lineHeight: 1.5 }}>
            Este torneio é para:
          </p>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
            {tipoAve && (
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#065F46', background: '#F0FDF4', border: '1px solid #D1FAE5', borderRadius: 20, padding: '4px 12px' }}>
                {tipoAve}
              </span>
            )}
            {estiloCanto && (
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', background: '#F3F4F6', borderRadius: 20, padding: '4px 12px' }}>
                {estiloCanto}
              </span>
            )}
          </div>
          <p style={{ margin: '0 0 20px', fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>
            Deseja cadastrar um {categoria}?
          </p>
        </>
      ) : (
        <p style={{ margin: '0 0 20px', fontSize: '0.8rem', color: '#6B7280', lineHeight: 1.5 }}>
          Cadastre um pássaro para participar deste torneio.
        </p>
      )}

      <Link
        href="/meus-passarinhos"
        style={{
          display: 'block', textAlign: 'center', padding: '12px',
          background: '#0D8F41', color: '#fff', borderRadius: 8,
          fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none',
        }}
      >
        {categoria ? `Cadastrar ${tipoAve ?? 'pássaro'}` : 'Cadastrar pássaro'}
      </Link>
    </div>
  )
}

/* ── main form ── */
export default function EntrarForm({
  tournamentId, tipoAve, estiloCanto,
  isLoggedIn, profile, matchingBirds, returnPath,
}: Props) {
  const router = useRouter()
  const [selectedBirdId, setSelectedBirdId] = useState<string>(matchingBirds[0]?.id ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  if (!isLoggedIn) return <NeedLogin returnPath={returnPath} />
  if (matchingBirds.length === 0) return <NoBirds tipoAve={tipoAve} estiloCanto={estiloCanto} />

  const selectedBird = matchingBirds.find(b => b.id === selectedBirdId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedBird || !profile) return
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('participants')
      .insert({
        tournament_id: tournamentId,
        user_id: user?.id ?? null,
        user_name: profile.name,
        bird_name: selectedBird.name,
        status: 'pending',
      })
      .select('id')
      .single()

    if (error || !data) {
      setError('Erro ao se inscrever. Tente novamente.')
      setLoading(false)
      return
    }

    setDone(true)
    router.push(`/torneio/${tournamentId}/participante?pid=${data.id}`)
  }

  if (done) {
    return (
      <div style={{ textAlign: 'center', padding: '12px 0' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D8F41" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>Inscrição enviada!</p>
        <p style={{ margin: 0, fontSize: '0.78rem', color: '#9CA3AF' }}>Aguardando aprovação do clube.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* participando como */}
      <div style={{ background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: 10, padding: '12px 14px' }}>
        <p style={{ margin: '0 0 2px', fontSize: '0.62rem', fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Participando como
        </p>
        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>
          {profile!.name}
        </p>
        <p style={{ margin: 0, fontSize: '0.75rem', color: '#9CA3AF' }}>{profile!.email}</p>
      </div>

      {/* seleção de pássaro */}
      <div>
        <p style={{ margin: '0 0 10px', fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Escolha o pássaro
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {matchingBirds.map(bird => {
            const selected = bird.id === selectedBirdId
            return (
              <button
                key={bird.id}
                type="button"
                onClick={() => setSelectedBirdId(bird.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '13px 14px', borderRadius: 10, cursor: 'pointer',
                  border: selected ? '2px solid #0D8F41' : '1.5px solid #E5E7EB',
                  background: selected ? '#F0FDF4' : '#fff',
                  fontFamily: 'inherit', transition: 'all 0.12s',
                  textAlign: 'left',
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: selected ? '#065F46' : '#111827' }}>
                    {bird.name}
                  </p>
                  {(bird.raca || bird.estilo_canto) && (
                    <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: selected ? '#0D8F41' : '#9CA3AF' }}>
                      {[bird.raca, bird.estilo_canto].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  border: selected ? '2px solid #0D8F41' : '2px solid #D1D5DB',
                  background: selected ? '#0D8F41' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {selected && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 13px', fontSize: '0.8rem', color: '#DC2626' }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !selectedBirdId}
        style={{
          background: loading || !selectedBirdId ? '#D1D5DB' : '#0D8F41',
          color: '#fff', border: 'none', borderRadius: 8, padding: '13px',
          fontSize: '0.88rem', fontWeight: 700,
          cursor: loading || !selectedBirdId ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', transition: 'background 0.15s', width: '100%',
        }}
      >
        {loading ? 'Inscrevendo...' : `Confirmar com ${selectedBird?.name ?? '...'}`}
      </button>

      <Link
        href="/torneios"
        style={{ display: 'block', textAlign: 'center', fontSize: '0.75rem', color: '#9CA3AF', textDecoration: 'none', marginTop: -4 }}
      >
        ← Voltar ao site
      </Link>
    </form>
  )
}
