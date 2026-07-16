'use server'

// Upload da foto do pássaro — o arquivo chega JÁ reduzido pelo cliente
// (crop 256x256 JPEG, ver lib/bird-photo.ts); aqui só validamos, subimos pro
// storage com service role (sem depender de policy do bucket) e salvamos a URL.
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const MAX_BYTES = 400 * 1024 // foto processada fica bem abaixo disso

export async function uploadBirdPhoto(formData: FormData): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'É preciso estar logado.' }

  const birdId = String(formData.get('birdId') ?? '')
  const photo = formData.get('photo')
  if (!birdId || !(photo instanceof File)) return { ok: false, error: 'Dados inválidos.' }
  if (photo.type !== 'image/jpeg') return { ok: false, error: 'Formato inválido.' }
  if (photo.size > MAX_BYTES) return { ok: false, error: 'Imagem muito grande — tente outra foto.' }

  const db = createServiceClient()

  // pássaro precisa ser do usuário logado
  const { data: bird } = await db.from('birds').select('id, user_id').eq('id', birdId).single()
  if (!bird || bird.user_id !== user.id) return { ok: false, error: 'Pássaro não encontrado.' }

  // remove fotos antigas deste pássaro (nomes com timestamp p/ furar cache do CDN)
  const dir = `birds/${user.id}`
  const { data: old } = await db.storage.from('logos').list(dir)
  const stale = (old ?? []).filter(f => f.name.startsWith(`${birdId}-`)).map(f => `${dir}/${f.name}`)
  if (stale.length) await db.storage.from('logos').remove(stale)

  const path = `${dir}/${birdId}-${Date.now()}.jpg`
  const { error: upErr } = await db.storage.from('logos')
    .upload(path, photo, { contentType: 'image/jpeg', upsert: true })
  if (upErr) return { ok: false, error: 'Erro no upload. Tente de novo.' }

  const { data: { publicUrl } } = db.storage.from('logos').getPublicUrl(path)
  const { error: dbErr } = await db.from('birds').update({ photo_url: publicUrl }).eq('id', birdId)
  if (dbErr) return { ok: false, error: 'Upload feito, mas não consegui salvar. Tente de novo.' }

  return { ok: true, url: publicUrl }
}
