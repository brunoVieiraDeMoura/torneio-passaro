import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { BirdMark, AveumWordmark } from '@/components/ui/bird-mark'

// QR geral do clube: link fixo que sempre leva ao torneio ativo do momento.
// Ao vivo tem prioridade; senão o aberto mais recente. Sem torneio ativo → aviso.
export default async function ClubeQRPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params
  const supabase = await createClient()

  const { data: club } = await supabase
    .from('clubs')
    .select('id, name, cidade, estado')
    .eq('id', clubId)
    .single()

  if (!club) notFound()

  const { data: torneios } = await supabase
    .from('tournaments')
    .select('id, qr_token, status, created_at')
    .eq('club_id', clubId)
    .in('status', ['open', 'running'])
    .order('created_at', { ascending: false })

  const ativo =
    (torneios ?? []).find(t => t.status === 'running') ??
    (torneios ?? [])[0]

  if (ativo?.qr_token) redirect(`/entrar/${ativo.qr_token}`)

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#FAFAFA' }}>
      <div style={{
        padding: '0 20px', height: 56, background: '#fff',
        borderBottom: '1px solid #F3F4F6', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <BirdMark size={36} />
          <AveumWordmark style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em' }} />
        </Link>
        <Link href="/torneios" style={{ fontSize: '0.75rem', color: '#9CA3AF', textDecoration: 'none', fontWeight: 500 }}>
          Ver torneios →
        </Link>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '28px 20px' }}>
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: '32px 24px', width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <span style={{ fontSize: '2.5rem' }}>🕊️</span>
          <h1 style={{ margin: '12px 0 6px', fontWeight: 800, fontSize: '1.15rem', color: '#111827', letterSpacing: '-0.02em' }}>
            {club.name}
          </h1>
          {club.cidade && (
            <p style={{ margin: '0 0 14px', fontSize: '0.78rem', color: '#9CA3AF' }}>
              {club.cidade}, {club.estado}
            </p>
          )}
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#6B7280', lineHeight: 1.55 }}>
            Nenhum torneio ativo no momento. Volte quando o clube abrir as inscrições.
          </p>
          <Link
            href="/torneios"
            style={{
              display: 'block', marginTop: 20, padding: '12px',
              background: '#0D8F41', color: '#fff', borderRadius: 8,
              fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none',
            }}
          >
            Ver todos os torneios
          </Link>
        </div>
      </div>
    </div>
  )
}
