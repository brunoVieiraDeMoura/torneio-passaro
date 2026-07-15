import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import QRCode from 'qrcode'
import { getBaseUrl } from '@/lib/base-url'
import FolhaClient from './folha-client'

export const metadata = { title: 'Folha de impressão — QR do clube' }

// Folha A4 pronta pra imprimir: logo/nome do app, nome do clube,
// "Inscrições" bem grande, QR geral embaixo e dica de modo avião + Wi-Fi
// (preenchido na barra antes de imprimir).
// Fica fora do grupo (club) de propósito — sem sidebar na impressão.
export default async function QrImpressaoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: clube } = await supabase
    .from('clubs')
    .select('id, name, cidade, estado')
    .eq('user_id', user.id)
    .single()
  if (!clube) redirect('/clube/dashboard')

  const clubQrUrl = `${await getBaseUrl()}/c/${clube.id}`
  const qrDataUrl = await QRCode.toDataURL(clubQrUrl, { width: 1024, margin: 2 })

  return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6' }}>
      <style>{`
        @page { size: A4 portrait; margin: 0; }
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .folha-a4 { box-shadow: none !important; margin: 0 !important; min-height: 100vh !important; }
          /* esconde flutuantes globais (cookie banner, scroll-to-top) na folha */
          body > div > div[style*="position:fixed"],
          body div[style*="position: fixed"] { display: none !important; }
        }
      `}</style>

      <FolhaClient
        clubName={clube.name}
        cidade={clube.cidade ?? null}
        estado={clube.estado ?? null}
        qrDataUrl={qrDataUrl}
        clubQrUrl={clubQrUrl}
      />
    </div>
  )
}
