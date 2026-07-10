import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import MestreClient from './mestre-client'
import QRCode from 'qrcode'

export default async function MestreTorneioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: torneio } = await supabase
    .from('tournaments')
    .select('*, clubs(user_id, logo_url)')
    .eq('id', id)
    .single()

  if (!torneio) notFound()
  const clubData = torneio.clubs as unknown as { user_id: string; logo_url?: string | null } | null
  if (clubData?.user_id !== user.id) redirect('/mestre')

  const { data: participantes } = await supabase
    .from('participants')
    .select('id, user_name, bird_name, cage_number, status, user_id, round_group')
    .eq('tournament_id', id)
    .order('created_at', { ascending: true })

  const { data: scores } = await supabase
    .from('scores')
    .select('participant_id, count')
    .eq('tournament_id', id)

  const qrUrl = `${process.env.NEXT_PUBLIC_APP_URL}/entrar/${torneio.qr_token}`
  const qrDataUrl = torneio.qr_token ? await QRCode.toDataURL(qrUrl, { width: 256, margin: 2 }) : null

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <Link href="/clube/dashboard" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Dashboard
        </Link>
      </div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{torneio.name}</h1>
        <span className={`text-sm font-medium px-3 py-1 rounded-full ${
          torneio.status === 'running' ? 'bg-green-100 text-green-700' :
          torneio.status === 'open' ? 'bg-blue-100 text-blue-700' :
          torneio.status === 'finished' ? 'bg-zinc-100 text-zinc-500' :
          'bg-yellow-100 text-yellow-700'
        }`}>
          {torneio.status === 'draft' ? 'Rascunho' :
           torneio.status === 'open' ? 'Aberto' :
           torneio.status === 'running' ? '● Ao vivo' : 'Finalizado'}
        </span>
      </div>

      <MestreClient
        torneio={{
          id: torneio.id, status: torneio.status, duration_secs: torneio.duration_secs, start_at: torneio.start_at ?? null,
          round: (torneio as Record<string, unknown>).round as number ?? 1,
          divisions: (torneio as Record<string, unknown>).divisions as number ?? 1,
          active_group: (torneio as Record<string, unknown>).active_group as number ?? 1,
        }}
        participantesInitial={participantes ?? []}
        scoresInitial={scores ?? []}
        qrDataUrl={qrDataUrl}
        qrUrl={qrUrl}
        streamUrlInitial={(torneio as Record<string, unknown>).stream_url as string | null ?? null}
        clubLogoUrl={clubData?.logo_url ?? null}
      />
    </main>
  )
}
