import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SelosCard from './selos-card'

export default async function ClubeDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: clube } = await supabase
    .from('clubs')
    .select('id, name, cidade, estado, selo_verde, selo_integridade, selo_verde_request, selo_integridade_request')
    .eq('user_id', user.id).single()

  if (!clube) redirect('/login')

  const { data: torneios } = await supabase
    .from('tournaments').select('id, status, name, start_at').eq('club_id', clube.id)

  const total = torneios?.length ?? 0
  const abertos = torneios?.filter(t => t.status === 'open').length ?? 0
  const aoVivo = torneios?.filter(t => t.status === 'running').length ?? 0
  const finalizados = torneios?.filter(t => t.status === 'finished').length ?? 0

  const proximos = (torneios ?? [])
    .filter(t => t.status === 'open' && t.start_at)
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    .slice(0, 3)

  return (
    <div style={{ padding: '32px 24px', maxWidth: 800, margin: '0 auto' }}>

      {/* club name */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ margin: '0 0 4px', fontSize: '0.68rem', fontWeight: 700, color: '#0D8F41', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          Dashboard
        </p>
        <h1 style={{ margin: 0, fontWeight: 800, fontSize: '1.5rem', color: '#111827', letterSpacing: '-0.025em' }}>
          {clube.name}
        </h1>
        {clube.cidade && (
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#9CA3AF' }}>
            {clube.cidade}, {clube.estado}
          </p>
        )}
      </div>

      {/* verificação: selo verde + selo de integridade */}
      <SelosCard
        clubId={clube.id}
        seloVerde={clube.selo_verde ?? false}
        seloIntegridade={clube.selo_integridade ?? false}
        verdeRequest={clube.selo_verde_request ?? 'none'}
        integridadeRequest={clube.selo_integridade_request ?? 'none'}
      />

      {/* stats */}
      <div className="club-stats-4" style={{ marginBottom: 28 }}>
        {[
          { label: 'Total',      value: total,      color: '#374151', bg: '#F9FAFB', border: '#E5E7EB' },
          { label: 'Abertos',    value: abertos,    color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
          { label: 'Ao vivo',    value: aoVivo,     color: '#0D8F41', bg: '#F0FDF4', border: '#D1FAE5' },
          { label: 'Finalizados',value: finalizados, color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: '16px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: s.color, letterSpacing: '-0.03em' }}>{s.value}</p>
            <p style={{ margin: '4px 0 0', fontSize: '0.68rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* quick actions */}
      <div className="club-actions-2" style={{ marginBottom: 28 }}>
        <Link href="/clube/torneios" style={{ textDecoration: 'none', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '20px', display: 'flex', alignItems: 'center', gap: 14, transition: 'border-color 0.12s' }}>
          <div style={{ width: 40, height: 40, background: '#F0FDF4', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D8F41" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
              <path d="M4 22h16"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
            </svg>
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>Torneios</p>
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#9CA3AF' }}>Criar e gerenciar</p>
          </div>
        </Link>
        <Link href="/clube/participantes" style={{ textDecoration: 'none', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, background: '#EFF6FF', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>Participantes</p>
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#9CA3AF' }}>Ver todos</p>
          </div>
        </Link>
      </div>

      {/* proximos torneios */}
      {proximos.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '20px' }}>
          <p style={{ margin: '0 0 14px', fontSize: '0.68rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Próximos torneios
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {proximos.map(t => (
              <Link key={t.id} href={`/mestre/torneio/${t.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F9FAFB' }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem', color: '#111827' }}>{t.name}</p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#9CA3AF' }}>
                  {t.start_at ? new Date(t.start_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
