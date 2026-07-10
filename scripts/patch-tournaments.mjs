import { createClient } from '@supabase/supabase-js'

const URL = 'https://bxnrghehoglgsovaisdf.supabase.co'
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4bnJnaGVob2dsZ3NvdmFpc2RmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA0ODQ1MywiZXhwIjoyMDkyNjI0NDUzfQ.htsaYVg2olkVhj9iqVH0XeBz3lGwHnbxhWs52OTF5oE'

const db = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } })

// ─── 1. apply migration ───────────────────────────────────────────────────────
async function applyMigration() {
  console.log('\n🔧 Applying migration (add tipo_ave / estilo_canto to tournaments)...')

  const sql = `
    alter table public.tournaments
      add column if not exists tipo_ave     text,
      add column if not exists estilo_canto text;
  `

  let rpcError
  try {
    const res = await db.rpc('exec_sql', { sql })
    rpcError = res.error
  } catch {
    rpcError = { message: 'rpc not available' }
  }

  if (rpcError) {
    // exec_sql RPC may not exist; columns may already be there.
    // Try a harmless select to see if columns exist.
    const { error: checkErr } = await db.from('tournaments').select('tipo_ave, estilo_canto').limit(1)
    if (checkErr) {
      console.error('  ✗ Columns missing and cannot apply migration via RPC.')
      console.error('    Run this SQL in Supabase SQL editor:')
      console.error('    alter table public.tournaments')
      console.error('      add column if not exists tipo_ave     text,')
      console.error('      add column if not exists estilo_canto text;')
      return false
    }
    console.log('  ✓ Columns already exist.')
  } else {
    console.log('  ✓ Migration applied.')
  }
  return true
}

// ─── 2. patch tournaments ─────────────────────────────────────────────────────
const TOURNAMENT_PATCHES = [
  // open / upcoming
  { nameFragment: 'Campeonato Paulista de Canto — 2ª Edição', tipo_ave: 'Canário belga',    estilo_canto: 'Canto clássico' },
  { nameFragment: 'Copa Sul Brasileira 2025',                  tipo_ave: 'Coleiro',           estilo_canto: 'Canto rolado'   },
  { nameFragment: 'Festival Nacional de Canários',             tipo_ave: 'Curió',             estilo_canto: 'Canto livre'    },
  { nameFragment: 'Torneio Nordestino de Canto',               tipo_ave: 'Bicudo',            estilo_canto: 'Canto regional' },
  // finished (for completeness)
  { nameFragment: 'Campeonato Paulista de Canto 2024',         tipo_ave: 'Canário belga',    estilo_canto: 'Canto clássico' },
  { nameFragment: 'Copa Nordeste de Pássaros 2024',            tipo_ave: 'Bicudo',           estilo_canto: 'Canto regional' },
  { nameFragment: 'Torneio de Inverno das Minas Gerais',       tipo_ave: 'Curió',            estilo_canto: 'Canto livre'    },
  { nameFragment: 'Festival do Canto Gaúcho 2024',             tipo_ave: 'Coleiro',          estilo_canto: 'Canto rolado'   },
]

async function patchTournaments() {
  console.log('\n📝 Patching tournaments with tipo_ave / estilo_canto...')

  const { data: all, error } = await db.from('tournaments').select('id, name, tipo_ave, estilo_canto')
  if (error) { console.error('  ✗ Could not fetch tournaments:', error.message); return }

  for (const patch of TOURNAMENT_PATCHES) {
    const match = all.find(t => t.name.includes(patch.nameFragment))
    if (!match) {
      console.log(`  – not found: ${patch.nameFragment}`)
      continue
    }
    if (match.tipo_ave && match.estilo_canto) {
      console.log(`  ✓ already set: ${match.name}`)
      continue
    }
    const { error: ue } = await db
      .from('tournaments')
      .update({ tipo_ave: patch.tipo_ave, estilo_canto: patch.estilo_canto })
      .eq('id', match.id)
    if (ue) console.error(`  ✗ ${match.name}:`, ue.message)
    else console.log(`  ✓ updated: ${match.name} → ${patch.tipo_ave} · ${patch.estilo_canto}`)
  }
}

// ─── main ─────────────────────────────────────────────────────────────────────
async function run() {
  const ok = await applyMigration()
  if (!ok) {
    console.log('\n⚠  Apply the SQL migration manually, then re-run this script.')
    process.exit(1)
  }
  await patchTournaments()
  console.log('\n✅ Done.')
}

run().catch(console.error)
