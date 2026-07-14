// Teste de carga do /api/score (contagem de cantos).
//
// Semeia torneios + participantes de teste via service role, dispara N "usuários"
// clicando simultaneamente (1 envio/s cada, como o app real), mede latência/erros,
// verifica consistência (cliques aceitos vs. total gravado) e limpa tudo no final.
//
// USO (com `next start` rodando):
//   node scripts/load-test.mjs --base http://localhost:3005 --users 50 --tournaments 5 --duration 20 --rounds 3
//
// NUNCA aponte para produção com dados reais.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

// ── carrega .env.local ──
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
}

const args = Object.fromEntries(
  process.argv.slice(2).map((a, i, arr) => a.startsWith('--') ? [a.slice(2), arr[i + 1]] : null).filter(Boolean)
)
const BASE        = args.base ?? 'http://localhost:3005'
const USERS0      = parseInt(args.users ?? '50')
const TOURNAMENTS = parseInt(args.tournaments ?? '5')
const DURATION    = parseInt(args.duration ?? '20')   // segundos de fogo por rodada
const MAX_ROUNDS  = parseInt(args.rounds ?? '3')      // 50 → 100 → 200 (dobrando)

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const LIVES = [
  'https://www.youtube.com/watch?v=jfKfPfyJRdk',
  'https://www.youtube.com/watch?v=5qap5aO4i9A',
  'https://www.youtube.com/watch?v=DWcJFNfaw9c',
]

function pct(sorted, p) {
  if (!sorted.length) return 0
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]
}

async function seed(users) {
  const { data: club } = await supabase.from('clubs').select('id').limit(1).single()
  if (!club) throw new Error('Nenhum clube no banco — crie um clube antes de rodar o teste.')

  const now = new Date().toISOString()
  const tourRows = Array.from({ length: TOURNAMENTS }, (_, i) => ({
    club_id: club.id,
    name: `LOADTEST-${Date.now()}-${i}`,
    status: 'running',
    start_at: now,
    duration_secs: 3600,
    stream_url: LIVES[i % LIVES.length], // live aleatória em cada torneio
  }))
  const { data: tours, error: te } = await supabase.from('tournaments').insert(tourRows).select('id')
  if (te) throw te

  const partRows = Array.from({ length: users }, (_, i) => ({
    tournament_id: tours[i % tours.length].id,
    user_id: null,
    user_name: `LoadUser ${i}`,
    bird_name: `LoadBird ${i}`,
    status: 'approved',
  }))
  const { data: parts, error: pe } = await supabase.from('participants').insert(partRows).select('id, tournament_id')
  if (pe) throw pe

  return { tourIds: tours.map(t => t.id), parts }
}

async function cleanup(tourIds) {
  // scores/participants/round_scores caem por cascade; se não houver cascade, apaga na ordem
  await supabase.from('scores').delete().in('tournament_id', tourIds)
  await supabase.from('round_scores').delete().in('tournament_id', tourIds)
  await supabase.from('participants').delete().in('tournament_id', tourIds)
  await supabase.from('tournaments').delete().in('id', tourIds)
}

async function fireRound(users) {
  console.log(`\n━━ Rodada: ${users} usuários · ${TOURNAMENTS} torneios · ${DURATION}s de cliques simultâneos ━━`)
  const { tourIds, parts } = await seed(users)

  const lat = []
  const codes = {}
  let sentOk = 0        // total de cantos aceitos pelo servidor
  const expected = new Map(parts.map(p => [p.id, 0]))

  const deadline = Date.now() + DURATION * 1000
  const workers = parts.map(async p => {
    while (Date.now() < deadline) {
      const inc = 1 + Math.floor(Math.random() * 8)
      const susp = Math.random() < 0.1 ? 1 : 0
      const t0 = performance.now()
      try {
        const res = await fetch(`${BASE}/api/score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantId: p.id, tournamentId: p.tournament_id, increment: inc, suspicious: susp }),
        })
        lat.push(performance.now() - t0)
        codes[res.status] = (codes[res.status] ?? 0) + 1
        if (res.ok) { sentOk += inc; expected.set(p.id, expected.get(p.id) + inc) }
      } catch {
        codes.NETWORK = (codes.NETWORK ?? 0) + 1
      }
      await new Promise(r => setTimeout(r, 1000)) // 1 envio/s por usuário, igual ao app
    }
  })
  await Promise.all(workers)

  // consistência: total gravado no banco vs. total aceito
  const { data: scores } = await supabase.from('scores').select('participant_id, count').in('tournament_id', tourIds)
  const dbTotal = (scores ?? []).reduce((a, s) => a + s.count, 0)
  let mismatches = 0
  for (const s of scores ?? []) {
    if (s.count !== expected.get(s.participant_id)) mismatches++
  }

  await cleanup(tourIds)

  const sorted = [...lat].sort((a, b) => a - b)
  const total = Object.values(codes).reduce((a, b) => a + b, 0)
  const errors = total - (codes[200] ?? 0)
  const report = {
    users,
    requests: total,
    rps: +(total / DURATION).toFixed(1),
    ok: codes[200] ?? 0,
    errors,
    errorRate: +(100 * errors / Math.max(1, total)).toFixed(2),
    codes,
    p50: Math.round(pct(sorted, 0.5)),
    p95: Math.round(pct(sorted, 0.95)),
    p99: Math.round(pct(sorted, 0.99)),
    max: Math.round(sorted[sorted.length - 1] ?? 0),
    cantosAceitos: sentOk,
    cantosNoBanco: dbTotal,
    consistencia: dbTotal === sentOk ? 'OK' : `DIVERGIU (${mismatches} participantes)`,
  }
  console.table([report])
  return report
}

const results = []
let users = USERS0
for (let r = 0; r < MAX_ROUNDS; r++) {
  const rep = await fireRound(users)
  results.push(rep)
  if (rep.errorRate > 5 || rep.p95 > 3000) {
    console.log(`\n⚠ Limite atingido nesta escala (${users} usuários): erros ${rep.errorRate}% · p95 ${rep.p95}ms. Parando.`)
    break
  }
  users *= 2
}

console.log('\n══ RESUMO ══')
console.table(results)
