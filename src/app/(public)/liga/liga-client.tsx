'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import MUNICIPIOS from '@/data/municipios.json'
import type { LigaEntry } from '@/data/liga-data'
import BirdAvatar from '@/components/ui/bird-avatar'
import { formatDuration } from '@/lib/duration'

const PODIUM_COLOR = ['#B45309', '#6B7280', '#92400E']
const PODIUM_LABEL = ['Ouro', 'Prata', 'Bronze']
const PODIUM_BG    = ['#FFFBEB', '#F9FAFB', '#FFF7ED']
const PODIUM_EMOJI = ['🥇', '🥈', '🥉']

const STATE_ABBR: Record<string, string> = {
  'Acre':'AC','Alagoas':'AL','Amapá':'AP','Amazonas':'AM','Bahia':'BA','Ceará':'CE',
  'Distrito Federal':'DF','Espírito Santo':'ES','Goiás':'GO','Maranhão':'MA',
  'Mato Grosso':'MT','Mato Grosso do Sul':'MS','Minas Gerais':'MG','Pará':'PA',
  'Paraíba':'PB','Paraná':'PR','Pernambuco':'PE','Piauí':'PI','Rio de Janeiro':'RJ',
  'Rio Grande do Norte':'RN','Rio Grande do Sul':'RS','Rondônia':'RO','Roraima':'RR',
  'Santa Catarina':'SC','São Paulo':'SP','Sergipe':'SE','Tocantins':'TO',
}

function ls(key: string) { return typeof window !== 'undefined' ? localStorage.getItem(key) : null }
function lsSet(key: string, v: string) { if (typeof window !== 'undefined') localStorage.setItem(key, v) }

type Scope = 'nacional' | 'estadual' | 'municipal'
type Limit = 10 | 50 | 100

/* ── reusable select ── */
function Sel({ value, onChange, options, placeholder, required }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder: string; required?: boolean
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 12px',
      fontSize: '0.85rem', fontFamily: 'inherit', background: '#fff', outline: 'none',
      color: value ? '#111827' : '#9CA3AF', cursor: 'pointer',
      flex: '1 1 130px', minWidth: 0, maxWidth: '100%',
    }}>
      {!required && <option value="" style={{ color: '#9CA3AF' }}>{placeholder}</option>}
      {options.map(o => <option key={o} value={o} style={{ color: '#111827' }}>{o}</option>)}
    </select>
  )
}

export default function LigaClient({ entries, currentUserId }: { entries: LigaEntry[]; currentUserId?: string | null }) {
  // pássaro real do usuário logado: id gerado como `r_${user_id}_${slug}` em lib/liga
  const isMine = (id: string) => !!currentUserId && id.startsWith(`r_${currentUserId}_`)
  const [scope,   setScope]   = useState<Scope>('municipal')
  const [limit,   setLimit]   = useState<Limit>(10)
  const [estado,  setEstado]  = useState('')
  const [cidade,  setCidade]  = useState('')
  const [tipoAve, setTipoAve] = useState('Coleiro')
  const [estilo,  setEstilo]  = useState('Canto clássico')
  const isFibra = estilo === 'Canto Fibra'
  const [geoStatus, setGeoStatus] = useState<'idle'|'loading'|'done'|'denied'>('idle')
  const [hydrated, setHydrated] = useState(false)
  const [userOverride, setUserOverride] = useState(false)

  /* filter options derived from the actual entries (real + mock) */
  const ESTADOS = useMemo(() => [...new Set(entries.map(e => e.estado).filter(Boolean))].sort(), [entries])
  const TIPOS   = useMemo(() => [...new Set(entries.map(e => e.tipo_ave).filter(Boolean))].sort(), [entries])
  const ESTILOS = useMemo(() => [...new Set(entries.map(e => e.estilo_canto).filter(Boolean))].sort(), [entries])

  /* restore from localStorage after mount (avoid SSR mismatch) */
  useEffect(() => {
    const scope_ = ls('liga_scope') as Scope | null
    const limit_ = Number(ls('liga_limit')) as Limit
    if (scope_)  setScope(scope_)
    if (limit_)  setLimit(limit_)
    setEstado(ls('liga_estado') ?? '')
    setCidade(ls('liga_cidade') ?? '')
    setTipoAve(ls('liga_tipo')   ?? 'Coleiro')
    setEstilo(ls('liga_estilo')  ?? 'Canto clássico')
    setHydrated(true)
  }, [])

  /* persist to localStorage on every change (only after hydrated) */
  useEffect(() => { if (hydrated) lsSet('liga_scope',  scope)         }, [scope,   hydrated])
  useEffect(() => { if (hydrated) lsSet('liga_limit',  String(limit)) }, [limit,   hydrated])
  useEffect(() => { if (hydrated) lsSet('liga_tipo',   tipoAve)       }, [tipoAve, hydrated])
  useEffect(() => { if (hydrated) lsSet('liga_estilo', estilo)        }, [estilo,  hydrated])
  useEffect(() => { if (hydrated) lsSet('liga_estado', estado)        }, [estado,  hydrated])
  useEffect(() => { if (hydrated) lsSet('liga_cidade', cidade)        }, [cidade,  hydrated])

  /* auto-detect location (runs on mount; skips if permission already denied) */
  useEffect(() => {
    if (!hydrated) return
    if (!navigator.geolocation) return
    setGeoStatus('loading')
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const { latitude: lat, longitude: lon } = pos.coords
          const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, { headers: { 'Accept-Language': 'pt-BR' } })
          const data = await res.json()
          const uf   = STATE_ABBR[data.address?.state ?? ''] ?? ''
          const city = data.address?.city ?? data.address?.town ?? data.address?.village ?? ''
          if (uf) {
            setEstado(uf)
            setScope('estadual')
            const lista = (MUNICIPIOS as Record<string, string[]>)[uf] ?? []
            const matchCity = lista.find(c => c.toLowerCase() === city.toLowerCase()) ?? ''
            if (matchCity) { setCidade(matchCity); setScope('municipal') }
          }
        } catch { /* silently ignore */ }
        setGeoStatus('done')
      },
      () => setGeoStatus('denied')
    )
  }, [hydrated])

  const cidades = useMemo(
    () => (MUNICIPIOS as Record<string, string[]>)[estado] ?? [],
    [estado]
  )

  const { filtered, effectiveScope } = useMemo(() => {
    const base = entries
      .filter(e => e.tipo_ave === tipoAve && e.estilo_canto === estilo)
      .sort((a, b) => b.count - a.count)

    if (userOverride) {
      if (scope === 'municipal' && cidade) return { filtered: base.filter(e => e.cidade === cidade).slice(0, limit), effectiveScope: 'municipal' as Scope }
      if (scope === 'estadual'  && estado) return { filtered: base.filter(e => e.estado === estado).slice(0, limit), effectiveScope: 'estadual' as Scope }
      return { filtered: base.slice(0, limit), effectiveScope: scope }
    }

    // auto-detect fallback chain
    if (scope === 'municipal' && cidade) {
      const municipal = base.filter(e => e.cidade === cidade)
      if (municipal.length > 0) return { filtered: municipal.slice(0, limit), effectiveScope: 'municipal' as Scope }
    }
    if ((scope === 'municipal' || scope === 'estadual') && estado) {
      const estadual = base.filter(e => e.estado === estado)
      if (estadual.length > 0) return { filtered: estadual.slice(0, limit), effectiveScope: 'estadual' as Scope }
    }
    return { filtered: base.slice(0, limit), effectiveScope: 'nacional' as Scope }
  }, [entries, scope, estado, cidade, tipoAve, estilo, limit, userOverride])

  const podium = filtered.slice(0, 3)
  const isEmpty = (scope === 'estadual' && !estado) || (scope === 'municipal' && !cidade)

  const scopeLabel = effectiveScope === 'nacional' ? 'Nacional'
    : effectiveScope === 'estadual'  ? (estado ?? 'Estadual')
    : (cidade ?? 'Municipal')

  return (
    <Box sx={{ bgcolor: '#FAFAFA', minHeight: '100vh' }}>

      {/* ── HEADER ── */}
      <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #F3F4F6', pt: { xs: 2.5, sm: 5 }, pb: 0 }}>
        <Container maxWidth={false} sx={{ maxWidth: 1000 }}>
          <Typography sx={{ color: '#0D8F41', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', mb: 0.75 }}>
            Temporada 2025
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Typography sx={{ color: '#111827', fontSize: { xs: '1.3rem', sm: '1.7rem' }, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.1 }}>
              Liga — {scopeLabel}
            </Typography>
            {geoStatus === 'loading' && (
              <Typography sx={{ fontSize: '0.7rem', color: '#9CA3AF' }}>Detectando localização…</Typography>
            )}
            {geoStatus === 'done' && estado && (
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, bgcolor: '#F0FDF4', border: '1px solid #D1FAE5', borderRadius: '20px', px: 1, py: 0.25 }}>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color: '#065F46' }}>📍 localização automática</Typography>
              </Box>
            )}
          </Box>

          {/* scope underline tabs — largura igual no mobile (mais fácil de tocar) */}
          <Box sx={{ display: 'flex', borderBottom: '1px solid #F3F4F6', gap: 0, '& button': { flex: { xs: 1, sm: '0 0 auto' } } }}>
            {(['municipal', 'estadual', 'nacional'] as Scope[]).map(s => {
              const active = effectiveScope === s
              const label = s === 'nacional' ? 'Nacional' : s === 'estadual' ? 'Estadual' : 'Municipal'
              return (
                <button key={s} onClick={() => { setScope(s); setUserOverride(true) }} style={{
                  background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  padding: '12px 16px', fontSize: '0.85rem', fontWeight: active ? 700 : 500,
                  color: active ? '#111827' : '#9CA3AF', textAlign: 'center',
                  borderBottom: active ? '2px solid #111827' : '2px solid transparent',
                  marginBottom: -1, transition: 'color 0.15s',
                }}>
                  {label}
                </button>
              )
            })}
          </Box>
        </Container>
      </Box>

      <Container maxWidth={false} sx={{ maxWidth: 1000, pt: 3, pb: 6 }}>

        {/* ── FILTERS ROW ── */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 3, alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', width: { xs: '100%', sm: 'auto' } }}>
            {(effectiveScope === 'estadual' || effectiveScope === 'municipal') && (
              <Sel value={estado} onChange={setEstado} options={ESTADOS} placeholder="Estado" />
            )}
            {effectiveScope === 'municipal' && (
              <>
                <Sel value={estado}  onChange={v => { setEstado(v); setCidade('') }} options={ESTADOS} placeholder="Estado" />
                {estado && <Sel value={cidade} onChange={setCidade} options={cidades} placeholder="Cidade" />}
              </>
            )}
            <Sel value={tipoAve} onChange={setTipoAve} options={TIPOS}   placeholder="Tipo de ave"    required />
            <Sel value={estilo}  onChange={setEstilo}  options={ESTILOS} placeholder="Estilo de canto" required />
          </Box>

          {/* Top N segment — ocupa a linha toda no mobile */}
          <Box sx={{ display: 'flex', border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden', flexShrink: 0, width: { xs: '100%', sm: 'auto' }, '& button': { flex: { xs: 1, sm: '0 0 auto' } } }}>
            {([10, 50, 100] as Limit[]).map((n, i) => {
              const active = limit === n
              return (
                <button key={n} onClick={() => setLimit(n)} style={{
                  background: active ? '#111827' : '#fff',
                  color: active ? '#fff' : '#6B7280',
                  border: 'none',
                  borderLeft: i > 0 ? '1px solid #E5E7EB' : 'none',
                  cursor: 'pointer', fontFamily: 'inherit',
                  padding: '9px 14px', fontSize: '0.78rem', fontWeight: active ? 700 : 500,
                  transition: 'all 0.15s',
                }}>
                  Top {n}
                </button>
              )
            })}
          </Box>
        </Box>

        {/* ── EMPTY ── */}
        {isEmpty && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography sx={{ fontSize: '0.9rem', color: '#9CA3AF' }}>
              {effectiveScope === 'estadual' ? 'Selecione um estado.' : 'Selecione estado e cidade.'}
            </Typography>
          </Box>
        )}

        {/* ── NO RESULTS ── */}
        {!isEmpty && filtered.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography sx={{ fontSize: '0.9rem', color: '#9CA3AF' }}>
              {effectiveScope === 'municipal'
                ? `Nenhum pássaro encontrado em ${cidade || 'seu município'}.`
                : effectiveScope === 'estadual'
                ? `Nenhum pássaro encontrado em ${estado || 'seu estado'}.`
                : 'Nenhum resultado para esse filtro.'}
            </Typography>
          </Box>
        )}

        {!isEmpty && filtered.length > 0 && (
          <>
            {/* ── PODIUM ── */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: { xs: 1, sm: 1.5 }, mb: 3 }}>
              {podium.map((item, i) => (
                <Box key={item.id} component={Link} href={`/liga/passarinho/${item.id}`} sx={{
                  border: isMine(item.id) ? '2px solid #0D8F41' : '1px solid #E5E7EB',
                  borderTop: `3px solid ${isMine(item.id) ? '#0D8F41' : PODIUM_COLOR[i]}`,
                  borderRadius: 2, p: { xs: 1.5, sm: 2 }, bgcolor: isMine(item.id) ? '#F0FDF4' : PODIUM_BG[i],
                  textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center',
                  textAlign: 'center', cursor: 'pointer',
                  '&:hover': { opacity: 0.85 }, transition: 'opacity 0.15s',
                }}>
                  <Typography sx={{ fontSize: '0.58rem', fontWeight: 800, color: PODIUM_COLOR[i], letterSpacing: '0.1em', textTransform: 'uppercase', mb: 1 }}>
                    {PODIUM_EMOJI[i]} {PODIUM_LABEL[i]}
                  </Typography>
                  <Box sx={{ mb: 1 }}>
                    <BirdAvatar tipoAve={item.tipo_ave} photoUrl={item.photo_url} size={52} radius={14} />
                  </Box>
                  <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.78rem', sm: '0.88rem' }, lineHeight: 1.25, color: isMine(item.id) ? '#0D8F41' : '#111827', mb: 0.25, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.bird_name}{isMine(item.id) ? ' (você)' : ''}
                  </Typography>
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, color: '#6B7280', mb: 0.75, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.user_name}
                  </Typography>
                  <Typography sx={{ fontSize: { xs: '1.15rem', sm: '1.3rem' }, fontWeight: 800, letterSpacing: '-0.025em', color: PODIUM_COLOR[i], lineHeight: 1 }}>
                    {isFibra ? formatDuration(item.count) : item.count.toLocaleString('pt-BR')}
                  </Typography>
                  <Typography sx={{ fontSize: '0.58rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', mt: 0.4 }}>
                    {isFibra ? 'tempo cantado' : 'cantos'}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* ── LIST ── */}
            <Box sx={{ bgcolor: '#fff', border: '1px solid #E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '30px 40px 1fr auto', sm: '36px 44px 1fr auto' }, gap: 1.5, px: { xs: 2, sm: 2.5 }, py: 1.25, borderBottom: '1px solid #F3F4F6', bgcolor: '#F9FAFB', alignItems: 'center' }}>
                <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>#</Typography>
                <Box />
                <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pássaro</Typography>
                <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'right' }}>{isFibra ? 'Tempo' : 'Cantos'}</Typography>
              </Box>

              {filtered.map((item, i) => (
                <Box key={item.id} component={Link} href={`/liga/passarinho/${item.id}`} sx={{
                  display: 'grid', gridTemplateColumns: { xs: '30px 40px 1fr auto', sm: '36px 44px 1fr auto' }, gap: 1.5,
                  px: { xs: 2, sm: 2.5 }, py: { xs: 1.5, sm: 1.75 }, alignItems: 'center',
                  borderBottom: i < filtered.length - 1 ? '1px solid #F9FAFB' : 'none',
                  bgcolor: isMine(item.id) ? '#F0FDF4' : i === 0 ? '#FFFBEB' : 'transparent',
                  boxShadow: isMine(item.id) ? 'inset 3px 0 0 #0D8F41' : 'none',
                  textDecoration: 'none', cursor: 'pointer',
                  '&:hover': { bgcolor: isMine(item.id) ? '#DCFCE7' : i === 0 ? '#FEF3C7' : '#F9FAFB' },
                  transition: 'background-color 0.15s',
                }}>
                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em', color: i < 3 ? PODIUM_COLOR[i] : '#D1D5DB' }}>
                    {i < 3 ? PODIUM_EMOJI[i] : String(i + 1).padStart(2, '0')}
                  </Typography>

                  <BirdAvatar tipoAve={item.tipo_ave} photoUrl={item.photo_url} size={40} radius={10} />

                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.87rem', color: isMine(item.id) ? '#0D8F41' : '#111827', lineHeight: 1.3, mb: 0.2 }}>
                      {item.bird_name}{isMine(item.id) ? ' (você)' : ''}
                    </Typography>
                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mb: 0.4 }}>
                      {item.user_name} · {item.cidade}, {item.estado}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      <Box sx={{ display: 'inline-flex', bgcolor: '#F0FDF4', border: '1px solid #D1FAE5', borderRadius: '20px', px: '7px', py: '1px' }}>
                        <Typography sx={{ fontSize: '0.6rem', fontWeight: 600, color: '#065F46', lineHeight: 1.4 }}>{item.tipo_ave}</Typography>
                      </Box>
                      <Box sx={{ display: { xs: 'none', sm: 'inline-flex' }, bgcolor: '#F3F4F6', borderRadius: '20px', px: '7px', py: '1px' }}>
                        <Typography sx={{ fontSize: '0.6rem', fontWeight: 600, color: '#374151', lineHeight: 1.4 }}>{item.estilo_canto}</Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Box sx={{ textAlign: 'right' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.02em', color: i === 0 ? '#B45309' : '#374151', lineHeight: 1.1 }}>
                      {isFibra ? formatDuration(item.count) : item.count.toLocaleString('pt-BR')}
                    </Typography>
                    <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: '#D1D5DB', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {isFibra ? 'tempo cantado' : 'cantos'}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </>
        )}

      </Container>
    </Box>
  )
}
