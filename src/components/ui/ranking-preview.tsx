'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import type { LigaEntry } from '@/data/liga-data'
import { formatDuration } from '@/lib/duration'

const RANK_COLORS = ['#B45309', '#6B7280', '#92400E']

function ls(k: string) { return typeof window !== 'undefined' ? localStorage.getItem(k) : null }

// entries = pássaros REAIS rankeados (vem do servidor); mock só se a flag ligar
interface Props { userBirdEstilo?: string | null; entries?: LigaEntry[] }

export default function RankingPreview({ userBirdEstilo, entries = [] }: Props) {
  const [tipo,   setTipo]   = useState('Bicudo')
  const [estilo, setEstilo] = useState('Canto Fibra')
  const [estado, setEstado] = useState('')
  const [cidade, setCidade] = useState('')

  useEffect(() => {
    // só mostra uma categoria (raça · canto) que TENHA pássaro rankeado.
    // ordem: filtro salvo (se tiver dados) → estilo do próprio pássaro → Bicudo·Fibra
    // → categoria com mais cantos → default Bicudo·Fibra (quando nada registrado).
    const has = (t: string, e: string) => entries.some(x => x.tipo_ave === t && x.estilo_canto === e)
    const lsTipo   = ls('liga_tipo')
    const lsEstilo = ls('liga_estilo')

    let t = 'Bicudo', e = 'Canto Fibra'
    if (lsTipo && lsEstilo && has(lsTipo, lsEstilo)) {
      t = lsTipo; e = lsEstilo
    } else if (userBirdEstilo && entries.some(x => x.estilo_canto === userBirdEstilo)) {
      const m = [...entries].filter(x => x.estilo_canto === userBirdEstilo).sort((a, b) => b.count - a.count)[0]
      t = m.tipo_ave; e = userBirdEstilo
    } else if (has('Bicudo', 'Canto Fibra')) {
      t = 'Bicudo'; e = 'Canto Fibra'
    } else if (entries.length > 0) {
      const top = [...entries].sort((a, b) => b.count - a.count)[0]
      t = top.tipo_ave; e = top.estilo_canto
    }
    setTipo(t); setEstilo(e)

    setEstado(ls('liga_estado') ?? '')
    setCidade(ls('liga_cidade') ?? '')
  }, [userBirdEstilo, entries])

  const { top5, scopeLabel } = useMemo(() => {
    const base = entries
      .filter(e => e.tipo_ave === tipo && e.estilo_canto === estilo)
      .sort((a, b) => b.count - a.count)

    if (cidade) {
      const byCidade = base.filter(e => e.cidade === cidade)
      if (byCidade.length > 0) return { top5: byCidade.slice(0, 5), scopeLabel: cidade }
    }
    if (estado) {
      const byEstado = base.filter(e => e.estado === estado)
      if (byEstado.length > 0) return { top5: byEstado.slice(0, 5), scopeLabel: estado }
    }
    return { top5: base.slice(0, 5), scopeLabel: 'Nacional' }
  }, [entries, tipo, estilo, estado, cidade])

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 1 }}>
        <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#0D8F41' }}>
          Ranking · {scopeLabel}
        </Typography>
        <Typography
          component={Link}
          href="/liga"
          sx={{ fontSize: '0.8rem', color: '#9CA3AF', textDecoration: 'none', '&:hover': { color: '#0D8F41' } }}
        >
          Ver todos →
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 3 }}>
        <Typography sx={{ fontSize: { xs: '1.4rem', sm: '1.6rem' }, fontWeight: 800, letterSpacing: '-0.025em', color: '#111827', lineHeight: 1.15 }}>
          Melhores da temporada
        </Typography>
      </Box>

      {/* category badge */}
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, bgcolor: '#F0FDF4', border: '1px solid #D1FAE5', borderRadius: '20px', px: 1.5, py: 0.5, mb: 2 }}>
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#065F46' }}>
          {tipo} · {estilo}
        </Typography>
      </Box>

      <Box sx={{ bgcolor: '#fff', border: '1px solid #E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
        {top5.length === 0 ? (
          <Box sx={{ px: 2, py: 4, textAlign: 'center' }}>
            <Typography sx={{ fontSize: '0.82rem', color: '#9CA3AF' }}>
              Sem dados para {tipo} · {estilo} em {scopeLabel}.
            </Typography>
          </Box>
        ) : top5.map((item, i) => (
          <Box key={item.id}>
            <Box
              component={Link}
              href={`/liga/passarinho/${encodeURIComponent(item.id)}`}
              sx={{
                display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.75,
                textDecoration: 'none', color: 'inherit', transition: 'background 0.12s',
                '&:hover': { bgcolor: '#F9FAFB' },
              }}>
              <Typography sx={{ minWidth: 24, fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.05em', color: i < 3 ? RANK_COLORS[i] : '#D1D5DB' }}>
                {String(i + 1).padStart(2, '0')}
              </Typography>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.3, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.bird_name}
                </Typography>
                <Typography sx={{ fontSize: '0.7rem', color: '#9CA3AF', mt: 0.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.user_name} · {item.cidade}, {item.estado}
                </Typography>
              </Box>
              <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', letterSpacing: '-0.02em', color: i === 0 ? '#B45309' : '#374151', flexShrink: 0 }}>
                {estilo === 'Canto Fibra' ? formatDuration(item.count) : item.count.toLocaleString('pt-BR')}
              </Typography>
            </Box>
            {i < top5.length - 1 && <Divider sx={{ borderColor: '#F9FAFB' }} />}
          </Box>
        ))}
      </Box>
    </Box>
  )
}
