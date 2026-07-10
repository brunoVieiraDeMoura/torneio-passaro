import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://bxnrghehogtgsovaisdf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4bnJnaGVob2dsZ3NvdmFpc2RmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA0ODQ1MywiZXhwIjoyMDkyNjI0NDUzfQ.htsaYVg2olkVhj9iqVH0XeBz3lGwHnbxhWs52OTF5oE',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const { data, error } = await supabase.auth.admin.createUser({
  email: 'teste@teste.com',
  password: 'teste123',
  email_confirm: true,
  user_metadata: { name: 'Teste', role: 'user' },
})

if (error) {
  console.error('Erro:', error.message)
  process.exit(1)
}

console.log('Usuário criado:', data.user.id, data.user.email)
