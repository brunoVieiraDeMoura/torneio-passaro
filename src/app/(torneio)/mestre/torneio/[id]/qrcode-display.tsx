import QRCode from 'qrcode'
import Image from 'next/image'

export default async function QRCodeDisplay({ url }: { url: string }) {
  const qrDataUrl = await QRCode.toDataURL(url, { width: 256, margin: 2 })

  return (
    <div className="flex flex-col items-center gap-3 bg-white border border-zinc-200 rounded-xl p-6">
      <p className="text-sm text-zinc-500 font-medium">QR Code para participantes</p>
      <Image src={qrDataUrl} alt="QR Code do torneio" width={192} height={192} />
      <p className="text-xs text-zinc-400 break-all text-center max-w-xs">{url}</p>
    </div>
  )
}
