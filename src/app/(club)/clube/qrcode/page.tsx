import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import QRCode from 'qrcode'
import { getBaseUrl } from '@/lib/base-url'

export const metadata = { title: 'QR Code do clube' }

export default async function ClubeQRCodePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: clube } = await supabase
    .from('clubs')
    .select('id, name')
    .eq('user_id', user.id)
    .single()
  if (!clube) redirect('/clube/dashboard')

  // QR geral do clube: link fixo que redireciona pro torneio ativo do momento
  const clubQrUrl = `${await getBaseUrl()}/c/${clube.id}`
  const clubQrDataUrl = await QRCode.toDataURL(clubQrUrl, { width: 512, margin: 2 })

  return (
    <div style={{ padding: '32px 24px', maxWidth: 560, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ margin: '0 0 4px', fontSize: '0.68rem', fontWeight: 700, color: '#0D8F41', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Clube</p>
        <h1 style={{ margin: 0, fontWeight: 800, fontSize: '1.4rem', color: '#111827', letterSpacing: '-0.025em' }}>QR Code</h1>
        <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#9CA3AF' }}>
          O QR fixo do clube — imprima uma vez e use em todos os torneios.
        </p>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <p style={{ margin: 0, fontSize: '0.78rem', color: '#6B7280', lineHeight: 1.55, maxWidth: 380, textAlign: 'center' }}>
          Link fixo: quem ler é levado ao torneio ativo do clube no momento
          (ao vivo tem prioridade). Sem torneio ativo, mostra um aviso amigável.
        </p>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={clubQrDataUrl} alt="QR Code geral do clube" width={220} height={220} />
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
