import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Client com service role — SÓ para uso em rotas/código de servidor (nunca importar
// em componente client). Ignora RLS: use quando a rota já valida as regras de negócio.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
