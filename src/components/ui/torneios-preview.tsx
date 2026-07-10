'use client'

import { useState, useEffect, useMemo } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Link from 'next/link'
import { sortByProximityAndStatus, type Item } from '@/app/(public)/torneios/_utils'

export default function TorneiosPreview({ torneios }: { torneios: Item[] }) {
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setCidade(localStorage.getItem('liga_cidade') ?? '')
    setEstado(localStorage.getItem('liga_estado') ?? '')
    setHydrated(true)
  }, [])

  const sorted = useMemo(
    () => sortByProximityAndStatus(torneios, cidade, estado).slice(0, 3),
    [torneios, cidade, estado],
  )

  const locationLabel = hydrated && cidade
    ? `📍 ${cidade}${estado ? `, ${estado}` : ''}`
    : hydrated && estado
    ? `📍 ${estado}`
    : null

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 1 }}>
        <Box>
          <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#0D8F41' }}>
            Em andamento
          </Typography>
          {locationLabel && (
            <Typography sx={{ fontSize: '0.62rem', color: '#9CA3AF', mt: 0.25 }}>
              {locationLabel}
            </Typography>
          )}
        </Box>
        <Typography component={Link} href="/torneios" sx={{ fontSize: '0.8rem', color: '#9CA3AF', textDecoration: 'none', '&:hover': { color: '#0D8F41' } }}>
          Ver todos →
        </Typography>
      </Box>
      <Typography sx={{ fontSize: { xs: '1.4rem', sm: '1.6rem' }, fontWeight: 800, letterSpacing: '-0.025em', color: '#111827', mb: 3, lineHeight: 1.15 }}>
        Torneios abertos
      </Typography>

      {sorted.length === 0 && (
        <Typography sx={{ fontSize: '0.82rem', color: '#9CA3AF', py: 3, textAlign: 'center' }}>
          Nenhum torneio aberto no momento.
        </Typography>
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {sorted.map((t, i) => (
          <Box
            key={t.id ?? i}
            component={t.id ? Link : 'div'}
            {...(t.id ? { href: `/torneio/${t.id}` } : {})}
            sx={{
              bgcolor: '#fff', border: '1px solid #E5E7EB', borderRadius: 2, p: 2,
              display: 'flex', alignItems: 'center', gap: 1.5,
              textDecoration: 'none', transition: 'border-color 0.15s',
              '&:hover': { borderColor: t.id ? '#0D8F41' : '#E5E7EB' },
            }}
          >
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: t.status === 'running' ? '#0D8F41' : '#D1D5DB', flexShrink: 0 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.3, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.name}
              </Typography>
              <Typography sx={{ fontSize: '0.7rem', color: '#9CA3AF', mt: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.clube} · {t.cidade}, {t.estado}
              </Typography>
              {(t.tipo_ave || t.estilo_canto) && (
                <Box sx={{ display: 'inline-flex', bgcolor: '#F0FDF4', border: '1px solid #D1FAE5', borderRadius: '6px', px: '6px', py: '1px', mt: 0.5 }}>
                  <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color: '#065F46', lineHeight: 1.4 }}>
                    {[t.tipo_ave, t.estilo_canto].filter(Boolean).join(' · ')}
                  </Typography>
                </Box>
              )}
            </Box>
            <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, justifyContent: 'flex-end' }}>
                {t.status === 'running' && (
                  <Box className="live-dot" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#EF4444', flexShrink: 0 }} />
                )}
                <Typography sx={{ fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: t.status === 'running' ? '#0D8F41' : '#9CA3AF' }}>
                  {t.status === 'running' ? 'Ao vivo' : 'Aberto'}
                </Typography>
              </Box>
              {t.n != null && (
                <Typography sx={{ fontSize: '0.68rem', color: '#D1D5DB', mt: 0.2 }}>{t.n} inscritos</Typography>
              )}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
