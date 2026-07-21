'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import MUNICIPIOS from '@/data/municipios.json'

const ESTADOS = Object.keys(MUNICIPIOS as Record<string, string[]>).sort()

const inp: React.CSSProperties = {
  width: '100%', border: '1px solid #E5E7EB', borderRadius: 8,
  padding: '10px 12px', fontSize: '0.85rem', outline: 'none',
  fontFamily: 'inherit', color: '#111827', background: '#fff', boxSizing: 'border-box',
  // ao focar no mobile, o browser rola o input pra vista — deixa folga pra barra fixa
  // do topo do painel do clube (56px) não cobrir o campo
  scrollMarginTop: 72,
}
const lbl: React.CSSProperties = {
  display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#6B7280',
  marginBottom: 5, letterSpacing: '0.06em', textTransform: 'uppercase',
}
const section: React.CSSProperties = {
  background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12,
  padding: '22px', marginBottom: 16,
}

interface Props {
  clubId: string
  initialClubName: string
  initialCidade: string
  initialEstado: string
  initialUserName: string
  email: string
  initialLogoUrl: string | null
}

export default function ConfigForm({ clubId, initialClubName, initialCidade, initialEstado, initialUserName, email, initialLogoUrl }: Props) {
  const router = useRouter()
  const [clubName, setClubName] = useState(initialClubName)
  const [estado, setEstado] = useState(initialEstado)
  const [cidade, setCidade] = useState(initialCidade)
  const [userName, setUserName] = useState(initialUserName)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoMsg, setLogoMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const cidades = useMemo(
    () => (MUNICIPIOS as Record<string, string[]>)[estado] ?? [],
    [estado]
  )

  function handleEstado(uf: string) {
    setEstado(uf)
    setCidade('')
  }

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setLogoMsg({ text: 'Arquivo muito grande. Máximo 5MB.', ok: false }); return }
    setLogoUploading(true); setLogoMsg(null)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${clubId}/logo.${ext}`
    const { error: upErr } = await supabase.storage.from('logos').upload(path, file, { upsert: true })
    if (upErr) { setLogoMsg({ text: 'Erro ao fazer upload. Tente novamente.', ok: false }); setLogoUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)
    const { error: dbErr } = await supabase.from('clubs').update({ logo_url: publicUrl }).eq('id', clubId)
    if (dbErr) { setLogoMsg({ text: 'Upload feito mas erro ao salvar. Tente novamente.', ok: false }); setLogoUploading(false); return }
    setLogoUrl(publicUrl)
    setLogoMsg({ text: 'Logo atualizada com sucesso.', ok: true })
    setLogoUploading(false)
    router.refresh()
  }

  async function removeLogo() {
    const supabase = createClient()
    await supabase.from('clubs').update({ logo_url: null }).eq('id', clubId)
    setLogoUrl(null)
    setLogoMsg({ text: 'Logo removida.', ok: true })
    router.refresh()
  }

  async function saveClub(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setMsg(null)
    const supabase = createClient()
    const [r1, r2] = await Promise.all([
      supabase.from('clubs').update({ name: clubName, cidade, estado }).eq('id', clubId),
      supabase.from('profiles').update({ name: userName }).eq('email', email),
    ])
    setSaving(false)
    if (r1.error || r2.error) setMsg({ text: 'Erro ao salvar. Tente novamente.', ok: false })
    else { setMsg({ text: 'Salvo com sucesso.', ok: true }); router.refresh() }
  }

  return (
    <>
    {/* ── Logo do clube ── */}
    <div style={{ ...section, marginBottom: 16 }}>
      <p style={{ margin: '0 0 14px', fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>Logo do clube</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        {logoUrl ? (
          <div style={{ width: 80, height: 80, borderRadius: 10, border: '1px solid #E5E7EB', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB', flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        ) : (
          <div style={{ width: 80, height: 80, borderRadius: 10, border: '2px dashed #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB', flexShrink: 0 }}>
            <span style={{ fontSize: '1.4rem' }}>🏆</span>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: logoUploading ? '#D1D5DB' : '#111827', color: '#fff',
            borderRadius: 8, padding: '8px 14px', fontSize: '0.8rem', fontWeight: 700,
            cursor: logoUploading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          }}>
            {logoUploading ? 'Enviando...' : '↑ Fazer upload'}
            <input type="file" accept="image/*" onChange={uploadLogo} disabled={logoUploading} style={{ display: 'none' }} />
          </label>
          <p style={{ margin: 0, fontSize: '0.68rem', color: '#9CA3AF' }}>PNG, JPG ou SVG · Máx. 5MB</p>
          {logoUrl && (
            <button type="button" onClick={removeLogo} style={{ background: 'none', border: 'none', padding: 0, fontSize: '0.72rem', color: '#DC2626', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', fontWeight: 600 }}>
              Remover logo
            </button>
          )}
        </div>
      </div>
      {logoMsg && (
        <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: logoMsg.ok ? '#F0FDF4' : '#FEF2F2', color: logoMsg.ok ? '#0D8F41' : '#DC2626', fontSize: '0.8rem', fontWeight: 600 }}>
          {logoMsg.text}
        </div>
      )}
    </div>

    <form onSubmit={saveClub}>
      <div style={section}>
        <p style={{ margin: '0 0 18px', fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>Informações do clube</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div>
            <label style={lbl}>Nome do clube</label>
            <input style={inp} value={clubName} onChange={e => setClubName(e.target.value)} required />
          </div>

          {/* estado */}
          <div>
            <label style={lbl}>Estado</label>
            <select
              style={{ ...inp, color: estado ? '#111827' : '#9CA3AF' }}
              value={estado}
              onChange={e => handleEstado(e.target.value)}
            >
              <option value="">Selecionar estado...</option>
              {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </div>

          {/* cidade */}
          <div>
            <label style={lbl}>Cidade</label>
            <select
              style={{ ...inp, color: cidade ? '#111827' : '#9CA3AF' }}
              value={cidade}
              onChange={e => setCidade(e.target.value)}
              disabled={!estado}
            >
              <option value="">{estado ? 'Selecionar cidade...' : 'Selecione o estado primeiro'}</option>
              {cidades.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label style={lbl}>Nome do responsável</label>
            <input style={inp} value={userName} onChange={e => setUserName(e.target.value)} />
          </div>

          <div>
            <label style={lbl}>E-mail</label>
            <input style={{ ...inp, background: '#F9FAFB', color: '#9CA3AF' }} value={email} disabled />
          </div>
        </div>

        {msg && (
          <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: msg.ok ? '#F0FDF4' : '#FEF2F2', color: msg.ok ? '#0D8F41' : '#DC2626', fontSize: '0.8rem', fontWeight: 600 }}>
            {msg.text}
          </div>
        )}

        <button
          type="submit" disabled={saving}
          style={{
            marginTop: 16, background: saving ? '#D1D5DB' : '#0D8F41', color: '#fff',
            border: 'none', borderRadius: 8, padding: '11px 20px',
            fontSize: '0.85rem', fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          }}
        >
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </form>
    </>
  )
}
