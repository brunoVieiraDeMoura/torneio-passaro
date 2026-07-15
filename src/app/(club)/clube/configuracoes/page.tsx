import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import QRCode from 'qrcode'
import { getBaseUrl } from '@/lib/base-url'
import ConfigForm from './config-form'

export default async function ClubeConfiguracoes() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: clube }, { data: profile }] = await Promise.all([
    supabase.from('clubs').select('id, name, cidade, estado, logo_url').eq('user_id', user.id).single(),
    supabase.from('profiles').select('name, email').eq('id', user.id).single(),
  ])
  if (!clube) redirect('/clube/dashboard')

  // QR geral do clube: link fixo que redireciona pro torneio ativo do momento
  const clubQrUrl = `${await getBaseUrl()}/c/${clube.id}`
  const clubQrDataUrl = await QRCode.toDataURL(clubQrUrl, { width: 512, margin: 2 })

  return (
    <div style={{ padding: '32px 24px', maxWidth: 560, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ margin: '0 0 4px', fontSize: '0.68rem', fontWeight: 700, color: '#0D8F41', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Clube</p>
        <h1 style={{ margin: 0, fontWeight: 800, fontSize: '1.4rem', color: '#111827', letterSpacing: '-0.025em' }}>Configurações</h1>
      </div>
      <ConfigForm
        clubId={clube.id}
        initialClubName={clube.name}
        initialCidade={clube.cidade ?? ''}
        initialEstado={clube.estado ?? ''}
        initialUserName={profile?.name ?? ''}
        email={profile?.email ?? user.email ?? ''}
        initialLogoUrl={(clube as Record<string, unknown>).logo_url as string | null ?? null}
      />

      {/* ── QR Code geral do clube ── */}
      <div style={{ marginTop: 28, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: '0 0 4px', fontSize: '0.68rem', fontWeight: 700, color: '#0D8F41', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            QR Code geral do clube
          </p>
          <p style={{ margin: 0, fontSize: '0.78rem', color: '#6B7280', lineHeight: 1.55, maxWidth: 380 }}>
            Link fixo: quem ler é levado ao torneio ativo do clube no momento
            (ao vivo tem prioridade). Imprima uma vez e use em todos os torneios.
          </p>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={clubQrDataUrl} alt="QR Code geral do clube" width={180} height={180} />
        <p style={{ margin: 0, fontSize: '0.65rem', color: '#D1D5DB', wordBreak: 'break-all', textAlign: 'center', maxWidth: 300 }}>{clubQrUrl}</p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
          <Link
            href="/clube/qr-impressao"
            target="_blank"
            style={{
              flex: 1, minWidth: 200, textAlign: 'center', padding: '12px 16px',
              background: '#0D8F41', color: '#fff', borderRadius: 8,
              fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none',
            }}
          >
            🖨️ Baixar folha de impressão
          </Link>
          <a
            href={clubQrDataUrl}
            download={`qr-${clube.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`}
            style={{
              flex: 1, minWidth: 200, textAlign: 'center', padding: '12px 16px',
              background: '#fff', color: '#374151', border: '1px solid #E5E7EB',
              borderRadius: 8, fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none',
            }}
          >
            ⬇ Baixar só o QR (PNG)
          </a>
        </div>
      </div>
    </div>
  )
}
