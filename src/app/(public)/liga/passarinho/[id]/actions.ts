'use server'

// Report de perfil da liga — exige login; grava via service role
// (a tabela reports tem RLS sem policies: cliente não escreve direto).
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const REASONS = ['imagem_ofensiva', 'fraude', 'coligacao'] as const
export type ReportReason = typeof REASONS[number]

export async function reportLigaBird(input: {
  targetId: string
  targetLabel: string
  reason: string
  details?: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'É preciso estar logado para reportar.' }

  if (!REASONS.includes(input.reason as ReportReason)) {
    return { ok: false, error: 'Motivo inválido.' }
  }

  const db = createServiceClient()

  // 1 report aberto por usuário/alvo — evita spam de duplicados
  const { data: existing } = await db.from('reports')
    .select('id')
    .eq('target_type', 'bird')
    .eq('target_id', input.targetId)
    .eq('reporter_id', user.id)
    .eq('status', 'open')
    .limit(1)
  if (existing && existing.length > 0) {
    return { ok: false, error: 'Você já enviou um report deste perfil — ele está em análise.' }
  }

  const { error } = await db.from('reports').insert({
    target_type: 'bird',
    target_id: input.targetId,
    target_label: input.targetLabel.slice(0, 120),
    reason: input.reason,
    details: input.details?.trim().slice(0, 1000) || null,
    reporter_id: user.id,
  })
  if (error) return { ok: false, error: 'Não foi possível enviar o report. Tente de novo.' }
  return { ok: true }
}
