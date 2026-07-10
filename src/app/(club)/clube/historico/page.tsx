import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ClubeHistorico() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: clube } = await supabase.from('clubs').select('id').eq('user_id', user.id).single()
  if (!clube) redirect('/clube/dashboard')

  const { data: torneios } = await supabase
    .from('tournaments')
    .select('id, name, created_at, cidade, estado, start_at, tipo_ave, estilo_canto')
    .eq('club_id', clube.id)
    .eq('status', 'finished')
    .order('created_at', { ascending: false })

  return (
    <div style={{ padding: '32px 24px', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ margin: '0 0 4px', fontSize: '0.68rem', fontWeight: 700, color: '#0D8F41', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Clube</p>
        <h1 style={{ margin: 0, fontWeight: 800, fontSize: '1.4rem', color: '#111827', letterSpacing: '-0.025em' }}>Histórico</h1>
      </div>

      {(!torneios || torneios.length === 0) && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF', fontSize: '0.85rem' }}>
          Nenhum torneio finalizado ainda.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {torneios?.map(t => (
          <Link key={t.id} href={`/mestre/torneio/${t.id}`} style={{ textDecoration: 'none', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>{t.name}</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {t.cidade && <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{t.cidade}, {t.estado}</span>}
                <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                  {new Date(t.start_at ?? t.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                </span>
                {t.tipo_ave && <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#065F46', background: '#F0FDF4', border: '1px solid #D1FAE5', borderRadius: 20, padding: '1px 8px' }}>{t.tipo_ave}</span>}
                {t.estilo_canto && <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#374151', background: '#F3F4F6', borderRadius: 20, padding: '1px 8px' }}>{t.estilo_canto}</span>}
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </Link>
        ))}
      </div>
    </div>
  )
}
