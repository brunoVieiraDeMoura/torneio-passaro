import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  // Add stream_url to tournaments
  try {
    await supabase.rpc('exec_sql', { sql: 'ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS stream_url TEXT' })
    console.log('tournaments.stream_url: ok')
  } catch {
    const { error } = await supabase.from('tournaments').select('stream_url').limit(1)
    if (error?.message?.includes('stream_url')) {
      console.error('tournaments.stream_url: FAILED — add manually in Supabase dashboard')
    } else {
      console.log('tournaments.stream_url: already exists')
    }
  }

  // Add logo_url to clubs
  try {
    await supabase.rpc('exec_sql', { sql: 'ALTER TABLE clubs ADD COLUMN IF NOT EXISTS logo_url TEXT' })
    console.log('clubs.logo_url: ok')
  } catch {
    const { error } = await supabase.from('clubs').select('logo_url').limit(1)
    if (error?.message?.includes('logo_url')) {
      console.error('clubs.logo_url: FAILED — add manually in Supabase dashboard')
    } else {
      console.log('clubs.logo_url: already exists')
    }
  }

  console.log('\nSe os ALTERs falharam, execute no SQL Editor do Supabase:')
  console.log('ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS stream_url TEXT;')
  console.log('ALTER TABLE clubs ADD COLUMN IF NOT EXISTS logo_url TEXT;')
  console.log('\nCrie também o bucket de storage (público):')
  console.log('Nome: logos')
}

run()
