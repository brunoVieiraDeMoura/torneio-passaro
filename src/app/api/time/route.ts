import { NextResponse } from 'next/server'

// Hora oficial do servidor (NTP) — usada pelos participantes pra alinhar o
// countdown da marcação. O cliente mede o RTT e compensa a latência.
export async function GET() {
  return NextResponse.json(
    { now: Date.now() },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
