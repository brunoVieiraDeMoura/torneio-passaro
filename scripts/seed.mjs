import { createClient } from '@supabase/supabase-js'

const URL  = 'https://bxnrghehoglgsovaisdf.supabase.co'
const KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4bnJnaGVob2dsZ3NvdmFpc2RmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA0ODQ1MywiZXhwIjoyMDkyNjI0NDUzfQ.htsaYVg2olkVhj9iqVH0XeBz3lGwHnbxhWs52OTF5oE'

const db = createClient(URL, KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function run() {
  console.log('🌱 Seed iniciado...')

  // ── 1. AUTH USERS ──────────────────────────────────────────────────────────
  const usersToCreate = [
    { email: 'clube.canarios@seed.dev',   password: 'seed1234', name: 'Canários do Vale SC',      role: 'club' },
    { email: 'clube.mineiro@seed.dev',    password: 'seed1234', name: 'Clube Mineiro de Canto',   role: 'club' },
    { email: 'joao.silva@seed.dev',       password: 'seed1234', name: 'João Silva',               role: 'user' },
    { email: 'maria.santos@seed.dev',     password: 'seed1234', name: 'Maria Santos',             role: 'user' },
    { email: 'carlos.ferreira@seed.dev',  password: 'seed1234', name: 'Carlos Ferreira',          role: 'user' },
    { email: 'ana.costa@seed.dev',        password: 'seed1234', name: 'Ana Costa',                role: 'user' },
    { email: 'pedro.lima@seed.dev',       password: 'seed1234', name: 'Pedro Lima',               role: 'user' },
  ]

  const userIds = {}
  for (const u of usersToCreate) {
    const { data, error } = await db.auth.admin.createUser({
      email: u.email,
      password: u.password,
      user_metadata: { name: u.name },
      email_confirm: true,
    })
    if (error && error.message.includes('already registered')) {
      // busca o user existente
      const { data: list } = await db.auth.admin.listUsers()
      const existing = list?.users?.find(x => x.email === u.email)
      if (existing) { userIds[u.email] = existing.id; console.log(`  ↩ ${u.email} já existe`) }
      continue
    }
    if (error) { console.error(`  ✗ ${u.email}:`, error.message); continue }
    userIds[u.email] = data.user.id
    console.log(`  ✓ user: ${u.email}`)
  }

  // aguarda trigger criar profiles
  await new Promise(r => setTimeout(r, 1500))

  // ── 2. ATUALIZA ROLES NOS PROFILES ─────────────────────────────────────────
  for (const u of usersToCreate) {
    const id = userIds[u.email]
    if (!id) continue
    await db.from('profiles').update({ role: u.role }).eq('id', id)
  }
  console.log('  ✓ roles atualizados')

  // ── 3. CLUBES ───────────────────────────────────────────────────────────────
  const clubsData = [
    { user_email: 'clube.canarios@seed.dev', name: 'Canários do Vale SC',   cidade: 'São Paulo',      estado: 'SP' },
    { user_email: 'clube.mineiro@seed.dev',  name: 'Clube Mineiro de Canto', cidade: 'Belo Horizonte', estado: 'MG' },
  ]

  const clubIds = {}
  for (const c of clubsData) {
    const uid = userIds[c.user_email]
    if (!uid) continue
    const { data, error } = await db.from('clubs').insert({
      user_id: uid, name: c.name, cidade: c.cidade, estado: c.estado,
    }).select().single()
    if (error) { console.error(`  ✗ clube ${c.name}:`, error.message); continue }
    clubIds[c.name] = data.id
    console.log(`  ✓ clube: ${c.name}`)
  }

  // ── 4. TORNEIOS ─────────────────────────────────────────────────────────────
  const torneiosData = [
    {
      clube: 'Canários do Vale SC',
      name: 'Campeonato Paulista de Canto 2025',
      status: 'running',
      cidade: 'São Paulo', estado: 'SP',
      start_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
      clube: 'Clube Mineiro de Canto',
      name: 'Torneio das Minas Gerais',
      status: 'open',
      cidade: 'Belo Horizonte', estado: 'MG',
      start_at: null,
    },
    {
      clube: 'Canários do Vale SC',
      name: 'Copa Paulista Aberta',
      status: 'open',
      cidade: 'São Paulo', estado: 'SP',
      start_at: null,
    },
  ]

  const torneiIds = {}
  for (const t of torneiosData) {
    const cid = clubIds[t.clube]
    if (!cid) continue
    const { data, error } = await db.from('tournaments').insert({
      club_id: cid, name: t.name, status: t.status,
      cidade: t.cidade, estado: t.estado,
      start_at: t.start_at,
    }).select().single()
    if (error) { console.error(`  ✗ torneio ${t.name}:`, error.message); continue }
    torneiIds[t.name] = data.id
    console.log(`  ✓ torneio: ${t.name}`)
  }

  // ── 5. PÁSSAROS ─────────────────────────────────────────────────────────────
  const birdsData = [
    { user_email: 'joao.silva@seed.dev',      name: 'Canário Dourado',  raca: 'Canário-da-Terra',  estilo_canto: 'Liscano' },
    { user_email: 'maria.santos@seed.dev',    name: 'Rei do Canto',     raca: 'Curió',             estilo_canto: 'Meloso' },
    { user_email: 'carlos.ferreira@seed.dev', name: 'Patativa Serrana', raca: 'Patativa',          estilo_canto: 'Roncante' },
    { user_email: 'ana.costa@seed.dev',       name: 'Melodia Verde',    raca: 'Sabiá-Laranjeira',  estilo_canto: 'Violinista' },
    { user_email: 'pedro.lima@seed.dev',      name: 'Tom Claro',        raca: 'Trinca-Ferro',      estilo_canto: 'Clássico' },
  ]

  const birdMap = {}
  for (const b of birdsData) {
    const uid = userIds[b.user_email]
    if (!uid) continue
    const { data, error } = await db.from('birds').insert({
      user_id: uid, name: b.name, raca: b.raca, estilo_canto: b.estilo_canto,
    }).select().single()
    if (error) { console.error(`  ✗ pássaro ${b.name}:`, error.message); continue }
    birdMap[b.user_email] = { birdId: data.id, birdName: b.name }
    console.log(`  ✓ pássaro: ${b.name}`)
  }

  // ── 6. PARTICIPANTES (no torneio running) ──────────────────────────────────
  const torneioPrincipal = torneiIds['Campeonato Paulista de Canto 2025']
  if (!torneioPrincipal) { console.error('torneio principal não encontrado'); process.exit(1) }

  const participantesData = [
    { user_email: 'joao.silva@seed.dev',      cage: 1 },
    { user_email: 'maria.santos@seed.dev',    cage: 2 },
    { user_email: 'carlos.ferreira@seed.dev', cage: 3 },
    { user_email: 'ana.costa@seed.dev',       cage: 4 },
    { user_email: 'pedro.lima@seed.dev',      cage: 5 },
  ]

  const participantIds = {}
  for (const p of participantesData) {
    const uid  = userIds[p.user_email]
    const bird = birdMap[p.user_email]
    if (!uid || !bird) continue
    const { data: prof } = await db.from('profiles').select('name').eq('id', uid).single()
    const { data, error } = await db.from('participants').insert({
      tournament_id: torneioPrincipal,
      user_id: uid,
      user_name: prof?.name ?? p.user_email,
      bird_name: bird.birdName,
      cage_number: p.cage,
      status: 'approved',
    }).select().single()
    if (error) { console.error(`  ✗ participante ${p.user_email}:`, error.message); continue }
    participantIds[p.user_email] = data.id
    console.log(`  ✓ participante: ${prof?.name}`)
  }

  // ── 7. SCORES ───────────────────────────────────────────────────────────────
  const scoresData = [
    { user_email: 'joao.silva@seed.dev',      count: 1247 },
    { user_email: 'maria.santos@seed.dev',    count: 1089 },
    { user_email: 'carlos.ferreira@seed.dev', count: 934  },
    { user_email: 'ana.costa@seed.dev',       count: 856  },
    { user_email: 'pedro.lima@seed.dev',      count: 798  },
  ]

  for (const s of scoresData) {
    const pid = participantIds[s.user_email]
    if (!pid) continue
    const { error } = await db.from('scores').insert({
      participant_id: pid,
      tournament_id: torneioPrincipal,
      count: s.count,
    })
    if (error) { console.error(`  ✗ score ${s.user_email}:`, error.message); continue }
    console.log(`  ✓ score: ${s.user_email} → ${s.count}`)
  }

  console.log('\n✅ Seed concluído!')
}

run().catch(console.error)
