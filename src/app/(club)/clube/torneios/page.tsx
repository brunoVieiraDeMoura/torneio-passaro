import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CriarTorneioForm from './criar-torneio-form'
import DeleteTorneioButton from './delete-torneio-button'
import FinalizarTorneioButton from './finalizar-torneio-button'

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  draft:    { label: 'Rascunho', color: '#92400E', bg: '#FFFBEB' },
  open:     { label: 'Aberto',   color: '#1D4ED8', bg: '#EFF6FF' },
  running:  { label: '● Ao vivo', color: '#0D8F41', bg: '#F0FDF4' },
}

export default async function ClubeTorneios() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: clube } = await supabase.from('clubs').select('id, cidade, estado').eq('user_id', user.id).single()
  if (!clube) redirect('/clube/dashboard')

  const { data: torneios } = await supabase
    .from('tournaments')
    .select('id, name, status, created_at, cidade, estado, start_at, tipo_ave, estilo_canto')
    .eq('club_id', clube.id)
    .neq('status', 'finished')
    .order('created_at', { ascending: false })

  return (
    <div style={{ padding: '32px 24px', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: '0.68rem', fontWeight: 700, color: '#0D8F41', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Clube</p>
          <h1 style={{ margin: 0, fontWeight: 800, fontSize: '1.4rem', color: '#111827', letterSpacing: '-0.025em' }}>Torneios</h1>
        </div>
        <CriarTorneioForm clubId={clube.id} defaultEstado={clube.estado ?? ''} defaultCidade={clube.cidade ?? ''} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(!torneios || torneios.length === 0) && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#9CA3AF', fontSize: '0.85rem' }}>
            Nenhum torneio ainda. Crie o primeiro!
          </div>
        )}
        {torneios?.map(t => {
          const s = STATUS_LABEL[t.status] ?? STATUS_LABEL.draft
          return (
            <div key={t.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>{t.name}</p>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: s.color, background: s.bg, borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap' }}>{s.label}</span>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {t.cidade && <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{t.cidade}, {t.estado}</span>}
                  {t.start_at && (
                    <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                      {new Date(t.start_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  {t.tipo_ave && <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#065F46', background: '#F0FDF4', border: '1px solid #D1FAE5', borderRadius: 20, padding: '1px 8px' }}>{t.tipo_ave}</span>}
                  {t.estilo_canto && <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#374151', background: '#F3F4F6', borderRadius: 20, padding: '1px 8px' }}>{t.estilo_canto}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <Link
                  href={`/mestre/torneio/${t.id}`}
                  style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0D8F41', background: '#F0FDF4', border: '1px solid #D1FAE5', borderRadius: 8, padding: '7px 14px', textDecoration: 'none' }}
                >
                  Gerenciar
                </Link>
                {(t.status === 'open' || t.status === 'running') && <FinalizarTorneioButton torneioId={t.id} />}
                {t.status === 'draft' && <DeleteTorneioButton torneioId={t.id} />}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
