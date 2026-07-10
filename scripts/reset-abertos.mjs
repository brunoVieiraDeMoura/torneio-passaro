import { createClient } from '@supabase/supabase-js'

const URL = 'https://bxnrghehoglgsovaisdf.supabase.co'
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4bnJnaGVob2dsZ3NvdmFpc2RmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA0ODQ1MywiZXhwIjoyMDkyNjI0NDUzfQ.htsaYVg2olkVhj9iqVH0XeBz3lGwHnbxhWs52OTF5oE'

const db = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } })

// hora local Brasília → ISO string
function brTime(hhmm) {
  const today = new Date()
  const [h, m] = hhmm.split(':').map(Number)
  // UTC-3
  const utcH = h + 3
  today.setUTCHours(utcH, m, 0, 0)
  return today.toISOString()
}

async function getClub(namePart) {
  const { data } = await db.from('clubs').select('id, name').ilike('name', `%${namePart}%`).single()
  return data
}

async function run() {
  console.log('🗑  Deletando torneios abertos sem start_at ou com start_at inválido...')

  // deleta todos os open/running que têm start_at null
  const { data: toDelete } = await db
    .from('tournaments')
    .select('id, name, status, start_at')
    .in('status', ['open', 'running'])

  if (toDelete) {
    for (const t of toDelete) {
      await db.from('tournaments').delete().eq('id', t.id)
      console.log(`  ✗ deletado: ${t.name} (${t.status}, start_at: ${t.start_at ?? 'null'})`)
    }
  }

  console.log('\n📋 Buscando clubes...')
  const clubeCanarios = await getClub('Canários do Vale')
  const clubeMineiro  = await getClub('Mineiro')
  const clubeGaucho   = await getClub('Gaúcha')
  const clubeCearense = await getClub('Cearense')
  const clubeFederal  = await getClub('Federação')

  console.log(`  Canários do Vale: ${clubeCanarios?.id}`)
  console.log(`  Clube Mineiro:    ${clubeMineiro?.id}`)
  console.log(`  Liga Gaúcha:      ${clubeGaucho?.id}`)
  console.log(`  Cearense:         ${clubeCearense?.id}`)
  console.log(`  Federação:        ${clubeFederal?.id}`)

  // Hoje com horários reais (Brasília UTC-3)
  const novosAbertos = [
    {
      club_id:  clubeCanarios?.id,
      name:     'Campeonato Paulista de Canto 2025',
      status:   'running',
      cidade:   'São Paulo',
      estado:   'SP',
      start_at: brTime('09:00'),
      duration_secs: 3600,
    },
    {
      club_id:  clubeMineiro?.id,
      name:     'Torneio das Minas Gerais',
      status:   'open',
      cidade:   'Belo Horizonte',
      estado:   'MG',
      start_at: brTime('14:00'),
      duration_secs: 3600,
    },
    {
      club_id:  clubeGaucho?.id,
      name:     'Copa Gaúcha de Canto',
      status:   'open',
      cidade:   'Porto Alegre',
      estado:   'RS',
      start_at: brTime('16:30'),
      duration_secs: 3600,
    },
    {
      club_id:  clubeCearense?.id,
      name:     'Torneio Cearense de Canários',
      status:   'open',
      cidade:   'Fortaleza',
      estado:   'CE',
      start_at: brTime('18:00'),
      duration_secs: 3600,
    },
  ]

  console.log('\n✅ Criando novos torneios abertos...')
  for (const t of novosAbertos) {
    if (!t.club_id) { console.error(`  ✗ clube não encontrado para: ${t.name}`); continue }
    const { data, error } = await db.from('tournaments').insert(t).select().single()
    if (error) { console.error(`  ✗ ${t.name}:`, error.message); continue }

    const localTime = new Date(t.start_at).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit'
    })
    console.log(`  ✓ [${t.status.padEnd(7)}] ${t.name} — ${localTime} (${t.cidade}, ${t.estado})`)
    console.log(`         QR: /entrar/${data.qr_token}`)
  }

  console.log('\n✅ Pronto!')
}

run().catch(console.error)
