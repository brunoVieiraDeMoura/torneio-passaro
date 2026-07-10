import { createClient } from '@supabase/supabase-js'

const URL = 'https://bxnrghehoglgsovaisdf.supabase.co'
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4bnJnaGVob2dsZ3NvdmFpc2RmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA0ODQ1MywiZXhwIjoyMDkyNjI0NDUzfQ.htsaYVg2olkVhj9iqVH0XeBz3lGwHnbxhWs52OTF5oE'

const db = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } })

const day = 86400000

// ─── helpers ───────────────────────────────────────────────────────────────────
function daysFromNow(n) { return new Date(Date.now() + n * day).toISOString() }
function daysAgo(n)     { return new Date(Date.now() - n * day).toISOString() }

async function getClub(name) {
  const { data } = await db.from('clubs').select('id').ilike('name', `%${name}%`).single()
  return data?.id ?? null
}

async function getProfile(email) {
  const { data: list } = await db.auth.admin.listUsers()
  const u = list?.users?.find(x => x.email === email)
  if (!u) return null
  const { data } = await db.from('profiles').select('id, name').eq('id', u.id).single()
  return data
}

async function createUser(email, name, role = 'user') {
  const { data: list } = await db.auth.admin.listUsers()
  const existing = list?.users?.find(x => x.email === email)
  if (existing) {
    const { data } = await db.from('profiles').select('id, name').eq('id', existing.id).single()
    return data
  }
  const { data, error } = await db.auth.admin.createUser({ email, password: 'seed1234', user_metadata: { name }, email_confirm: true })
  if (error) { console.error('  ✗ user:', error.message); return null }
  await new Promise(r => setTimeout(r, 400))
  await db.from('profiles').update({ role }).eq('id', data.user.id)
  const { data: prof } = await db.from('profiles').select('id, name').eq('id', data.user.id).single()
  console.log(`  ✓ user: ${email}`)
  return prof
}

// ─── run ───────────────────────────────────────────────────────────────────────
async function run() {
  console.log('\n🌱 Seed campeonatos...\n')

  // busca clubes existentes
  const clubeCanarios = await getClub('Canários do Vale')
  const clubeMineiro  = await getClub('Mineiro')
  if (!clubeCanarios || !clubeMineiro) {
    console.error('Clubes não encontrados — rode scripts/seed.mjs primeiro'); process.exit(1)
  }

  // ── NOVOS CLUBES ─────────────────────────────────────────────────────────────
  const newClubUsers = [
    { email: 'clube.gaucho@seed.dev',    name: 'Liga Gaúcha do Canto',          role: 'club', cidade: 'Porto Alegre',   estado: 'RS' },
    { email: 'clube.cearense@seed.dev',  name: 'Clube Cearense de Pássaros',    role: 'club', cidade: 'Fortaleza',      estado: 'CE' },
    { email: 'clube.federal@seed.dev',   name: 'Federação Brasileira de Canto', role: 'club', cidade: 'Brasília',       estado: 'DF' },
  ]

  const clubeMap = {}
  for (const u of newClubUsers) {
    const prof = await createUser(u.email, u.name, 'club')
    if (!prof) continue
    let { data: club } = await db.from('clubs').select('id').eq('user_id', prof.id).single()
    if (!club) {
      const { data } = await db.from('clubs').insert({ user_id: prof.id, name: u.name, cidade: u.cidade, estado: u.estado }).select().single()
      club = data
      console.log(`  ✓ clube: ${u.name}`)
    }
    clubeMap[u.name] = club.id
  }

  // ── PARTICIPANTES EXTRAS ─────────────────────────────────────────────────────
  const extraUsers = [
    { email: 'fernanda.souza@seed.dev',  name: 'Fernanda Souza',  bird: "Canto d'Ouro",   raca: 'Canário Belga',     estilo: 'Violinista' },
    { email: 'ricardo.alves@seed.dev',   name: 'Ricardo Alves',   bird: 'Voz da Serra',   raca: 'Pintassilgo',       estilo: 'Meloso' },
    { email: 'lucia.mendes@seed.dev',    name: 'Lucia Mendes',    bird: 'Flautim',         raca: 'Coleiro-do-Norte',  estilo: 'Liscano' },
    { email: 'roberto.cruz@seed.dev',    name: 'Roberto Cruz',    bird: 'Trinca-Ferro',   raca: 'Trinca-Ferro',      estilo: 'Roncante' },
    { email: 'camila.ramos@seed.dev',    name: 'Camila Ramos',    bird: 'Cigarra Branca', raca: 'Bicudo',            estilo: 'Clássico' },
    { email: 'marcos.oliveira@seed.dev', name: 'Marcos Oliveira', bird: 'Rei das Pedras', raca: 'Curió',             estilo: 'Mosqueado' },
    { email: 'patricia.lima@seed.dev',   name: 'Patrícia Lima',   bird: 'Aurora',         raca: 'Sabiá-Laranjeira',  estilo: 'Meloso' },
    { email: 'thiago.santos@seed.dev',   name: 'Thiago Santos',   bird: 'Trovador',       raca: 'Galo-de-Campina',   estilo: 'Rolado' },
    { email: 'beatriz.costa@seed.dev',   name: 'Beatriz Costa',   bird: 'Pérola',         raca: 'Azulão',            estilo: 'Picado' },
    { email: 'gabriel.ferreira@seed.dev',name: 'Gabriel Ferreira',bird: 'Maestro',        raca: 'Patativa',          estilo: 'Clássico' },
  ]

  const profiles = {}
  for (const u of extraUsers) {
    const prof = await createUser(u.email, u.name)
    if (!prof) continue
    profiles[u.email] = { id: prof.id, name: prof.name, bird: u.bird }
    let { data: bird } = await db.from('birds').select('id').eq('user_id', prof.id).eq('name', u.bird).single()
    if (!bird) {
      const { data } = await db.from('birds').insert({ user_id: prof.id, name: u.bird, raca: u.raca, estilo_canto: u.estilo }).select().single()
      bird = data
    }
  }

  // também busca participantes existentes do seed original
  for (const email of ['joao.silva@seed.dev','maria.santos@seed.dev','carlos.ferreira@seed.dev','ana.costa@seed.dev','pedro.lima@seed.dev']) {
    const prof = await getProfile(email)
    if (prof) profiles[email] = { id: prof.id, name: prof.name, bird: null }
  }

  // busca nomes de pássaros dos originais
  const birdNames = {
    'joao.silva@seed.dev':      'Canário Dourado',
    'maria.santos@seed.dev':    'Rei do Canto',
    'carlos.ferreira@seed.dev': 'Patativa Serrana',
    'ana.costa@seed.dev':       'Melodia Verde',
    'pedro.lima@seed.dev':      'Tom Claro',
  }
  for (const [email, bird] of Object.entries(birdNames)) {
    if (profiles[email]) profiles[email].bird = bird
  }

  const allEmails = Object.keys(profiles)

  // ── TORNEIOS FUTUROS ─────────────────────────────────────────────────────────
  console.log('\n📅 Criando torneios futuros...')
  const futuros = [
    { club_id: clubeCanarios,      name: 'Campeonato Paulista de Canto — 2ª Edição', status: 'open', cidade: 'São Paulo',    estado: 'SP', start_at: daysFromNow(4),  tipo_ave: 'Canário belga', estilo_canto: 'Canto clássico' },
    { club_id: clubeMap['Liga Gaúcha do Canto'],    name: 'Copa Sul Brasileira 2025',           status: 'open', cidade: 'Porto Alegre', estado: 'RS', start_at: daysFromNow(8),  tipo_ave: 'Coleiro',        estilo_canto: 'Canto rolado'   },
    { club_id: clubeMap['Federação Brasileira de Canto'], name: 'Festival Nacional de Canários',  status: 'open', cidade: 'Brasília',    estado: 'DF', start_at: daysFromNow(14), tipo_ave: 'Curió',          estilo_canto: 'Canto livre'    },
    { club_id: clubeMap['Clube Cearense de Pássaros'],    name: 'Torneio Nordestino de Canto',    status: 'open', cidade: 'Fortaleza',   estado: 'CE', start_at: daysFromNow(21), tipo_ave: 'Bicudo',         estilo_canto: 'Canto regional' },
  ]

  for (const t of futuros) {
    if (!t.club_id) { console.error('  ✗ clube não encontrado para', t.name); continue }
    const { error } = await db.from('tournaments').insert(t)
    if (error) console.error('  ✗', t.name, error.message)
    else console.log(`  ✓ futuro: ${t.name}`)
  }

  // ── TORNEIOS ENCERRADOS ──────────────────────────────────────────────────────
  console.log('\n🏆 Criando torneios encerrados...')

  const encerrados = [
    {
      meta: { club_id: clubeCanarios, name: 'Campeonato Paulista de Canto 2024', status: 'finished', cidade: 'São Paulo', estado: 'SP', start_at: daysAgo(30) },
      scores: [
        { email: 'joao.silva@seed.dev',       cage: 1, count: 1580 },
        { email: 'fernanda.souza@seed.dev',    cage: 2, count: 1340 },
        { email: 'carlos.ferreira@seed.dev',  cage: 3, count: 1205 },
        { email: 'ricardo.alves@seed.dev',    cage: 4, count: 1098 },
        { email: 'maria.santos@seed.dev',     cage: 5, count: 987  },
        { email: 'lucia.mendes@seed.dev',     cage: 6, count: 876  },
        { email: 'roberto.cruz@seed.dev',     cage: 7, count: 754  },
        { email: 'pedro.lima@seed.dev',       cage: 8, count: 643  },
      ],
    },
    {
      meta: { club_id: clubeMap['Clube Cearense de Pássaros'], name: 'Copa Nordeste de Pássaros 2024', status: 'finished', cidade: 'Fortaleza', estado: 'CE', start_at: daysAgo(55) },
      scores: [
        { email: 'camila.ramos@seed.dev',     cage: 1, count: 2103 },
        { email: 'thiago.santos@seed.dev',    cage: 2, count: 1876 },
        { email: 'gabriel.ferreira@seed.dev', cage: 3, count: 1654 },
        { email: 'beatriz.costa@seed.dev',    cage: 4, count: 1432 },
        { email: 'marcos.oliveira@seed.dev',  cage: 5, count: 1210 },
        { email: 'patricia.lima@seed.dev',    cage: 6, count: 987  },
        { email: 'ana.costa@seed.dev',        cage: 7, count: 876  },
      ],
    },
    {
      meta: { club_id: clubeMineiro, name: 'Torneio de Inverno das Minas Gerais', status: 'finished', cidade: 'Belo Horizonte', estado: 'MG', start_at: daysAgo(80) },
      scores: [
        { email: 'marcos.oliveira@seed.dev',  cage: 1, count: 1876 },
        { email: 'joao.silva@seed.dev',       cage: 2, count: 1654 },
        { email: 'gabriel.ferreira@seed.dev', cage: 3, count: 1543 },
        { email: 'maria.santos@seed.dev',     cage: 4, count: 1321 },
        { email: 'thiago.santos@seed.dev',    cage: 5, count: 1198 },
        { email: 'patricia.lima@seed.dev',    cage: 6, count: 1065 },
        { email: 'ana.costa@seed.dev',        cage: 7, count: 932  },
        { email: 'carlos.ferreira@seed.dev',  cage: 8, count: 821  },
        { email: 'beatriz.costa@seed.dev',    cage: 9, count: 710  },
      ],
    },
    {
      meta: { club_id: clubeMap['Liga Gaúcha do Canto'], name: 'Festival do Canto Gaúcho 2024', status: 'finished', cidade: 'Porto Alegre', estado: 'RS', start_at: daysAgo(120) },
      scores: [
        { email: 'fernanda.souza@seed.dev',   cage: 1, count: 2340 },
        { email: 'camila.ramos@seed.dev',     cage: 2, count: 2105 },
        { email: 'ricardo.alves@seed.dev',    cage: 3, count: 1987 },
        { email: 'lucia.mendes@seed.dev',     cage: 4, count: 1765 },
        { email: 'roberto.cruz@seed.dev',     cage: 5, count: 1543 },
        { email: 'pedro.lima@seed.dev',       cage: 6, count: 1321 },
        { email: 'beatriz.costa@seed.dev',    cage: 7, count: 1198 },
        { email: 'thiago.santos@seed.dev',    cage: 8, count: 987  },
        { email: 'marcos.oliveira@seed.dev',  cage: 9, count: 876  },
        { email: 'joao.silva@seed.dev',       cage: 10, count: 765 },
      ],
    },
  ]

  for (const t of encerrados) {
    if (!t.meta.club_id) { console.error('  ✗ clube não encontrado para', t.meta.name); continue }
    const { data: torneio, error } = await db.from('tournaments').insert(t.meta).select().single()
    if (error || !torneio) { console.error('  ✗', t.meta.name, error?.message); continue }
    console.log(`  ✓ torneio: ${t.meta.name}`)

    for (const s of t.scores) {
      const prof = profiles[s.email]
      if (!prof) continue

      const { data: part, error: pe } = await db.from('participants').insert({
        tournament_id: torneio.id,
        user_id: prof.id,
        user_name: prof.name,
        bird_name: prof.bird ?? 'Pássaro',
        cage_number: s.cage,
        status: 'approved',
      }).select().single()

      if (pe || !part) { console.error('    ✗ participante', s.email, pe?.message); continue }

      await db.from('scores').insert({ participant_id: part.id, tournament_id: torneio.id, count: s.count })
    }
    console.log(`    → ${t.scores.length} participantes com scores`)
  }

  console.log('\n✅ Seed concluído!')
  console.log(`   ${futuros.length} torneios futuros`)
  console.log(`   ${encerrados.length} torneios encerrados`)
  console.log(`   ${extraUsers.length} novos participantes`)
}

run().catch(console.error)
