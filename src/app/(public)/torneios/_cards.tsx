'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Link from 'next/link'
import { fmtTime, fmtDate, fmtDateFull, type Item } from './_utils'

const btnBase = {
  display: 'block', textAlign: 'center', fontSize: '0.78rem',
  fontWeight: 600, textDecoration: 'none', borderRadius: '7px',
  py: '7px', px: '14px', whiteSpace: 'nowrap',
} as const

export function BirdTag({ tipo_ave, estilo_canto }: { tipo_ave: string | null; estilo_canto: string | null }) {
  const label = [tipo_ave, estilo_canto].filter(Boolean).join(' · ')
  if (!label) return null
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center',
      bgcolor: '#F0FDF4', border: '1px solid #D1FAE5', borderRadius: '6px',
      px: '7px', py: '2px', mt: 0.75, width: 'fit-content',
    }}>
      <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, color: '#065F46', lineHeight: 1.4 }}>
        {label}
      </Typography>
    </Box>
  )
}

export function LiveCard({ t }: { t: Item }) {
  const time = fmtTime(t.start_at)
  return (
    <Box sx={{
      bgcolor: '#fff', border: '1px solid #E5E7EB', borderRadius: 2, p: 2.5,
      display: 'flex', flexDirection: { xs: 'column', sm: 'row' },
      alignItems: { xs: 'stretch', sm: 'center' }, gap: { xs: 1.5, sm: 2 },
      transition: 'border-color 0.15s', '&:hover': { borderColor: '#D1D5DB' },
    }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.4, flexWrap: 'wrap' }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827', lineHeight: 1.3 }}>
            {t.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
            <Box className="live-dot" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#EF4444', flexShrink: 0 }} />
            <Typography sx={{ fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#0D8F41' }}>
              Ao vivo
            </Typography>
          </Box>
        </Box>
        <Typography sx={{ fontSize: '0.73rem', color: '#9CA3AF' }}>
          {[t.clube, t.cidade && t.estado ? `${t.cidade}, ${t.estado}` : null, t.n != null ? `${t.n} inscrito${t.n !== 1 ? 's' : ''}` : null].filter(Boolean).join(' · ')}
        </Typography>
        {time && (
          <Typography sx={{ fontSize: '0.7rem', color: '#6B7280', mt: 0.3 }}>
            {`Iniciado às ${time.split(', ')[1] ?? time}`}
          </Typography>
        )}
        <BirdTag tipo_ave={t.tipo_ave} estilo_canto={t.estilo_canto} />
      </Box>
      <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, width: { xs: '100%', sm: 'auto' } }}>
        <Box component={Link} href={`/torneio/${t.id}`} sx={{ ...btnBase, flex: { xs: 1, sm: 'none' }, color: '#374151', border: '1px solid #E5E7EB', '&:hover': { borderColor: '#9CA3AF', color: '#111827' } }}>
          Ver torneio
        </Box>
      </Box>
    </Box>
  )
}

export function OpenCard({ t }: { t: Item }) {
  const time = fmtTime(t.start_at)
  return (
    <Box sx={{
      bgcolor: '#fff', border: '1px solid #E5E7EB', borderRadius: 2, p: 2.5,
      display: 'flex', flexDirection: { xs: 'column', sm: 'row' },
      alignItems: { xs: 'stretch', sm: 'center' }, gap: { xs: 1.5, sm: 2 },
      transition: 'border-color 0.15s', '&:hover': { borderColor: '#D1D5DB' },
    }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.4, flexWrap: 'wrap' }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827', lineHeight: 1.3 }}>
            {t.name}
          </Typography>
          <Typography sx={{ fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9CA3AF' }}>
            Aberto
          </Typography>
        </Box>
        <Typography sx={{ fontSize: '0.73rem', color: '#9CA3AF' }}>
          {[t.clube, t.cidade && t.estado ? `${t.cidade}, ${t.estado}` : null, t.n != null ? `${t.n} inscrito${t.n !== 1 ? 's' : ''}` : null].filter(Boolean).join(' · ')}
        </Typography>
        {time && (
          <Typography sx={{ fontSize: '0.7rem', color: '#9CA3AF', mt: 0.3 }}>
            {`Previsto: ${time}`}
          </Typography>
        )}
        <BirdTag tipo_ave={t.tipo_ave} estilo_canto={t.estilo_canto} />
      </Box>
      <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, width: { xs: '100%', sm: 'auto' } }}>
        <Box component={Link} href={`/torneio/${t.id}`} sx={{ ...btnBase, flex: { xs: 1, sm: 'none' }, color: '#374151', border: '1px solid #E5E7EB', '&:hover': { borderColor: '#9CA3AF', color: '#111827' } }}>
          Ver torneio
        </Box>
        {t.qr_token ? (
          <Box component={Link} href={`/entrar/${t.qr_token}`} sx={{ ...btnBase, flex: { xs: 1, sm: 'none' }, color: '#fff', bgcolor: '#0D8F41', '&:hover': { bgcolor: '#0B7A36' } }}>
            Participar →
          </Box>
        ) : (
          <Box sx={{ ...btnBase, flex: { xs: 1, sm: 'none' }, color: '#D1D5DB', border: '1px solid #F3F4F6' }}>
            Participar
          </Box>
        )}
      </Box>
    </Box>
  )
}

export function UpcomingCard({ t }: { t: Item }) {
  return (
    <Box sx={{ bgcolor: '#fff', border: '1px solid #F3F4F6', borderRadius: 2, p: 2.5, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, gap: { xs: 1, sm: 2 }, opacity: 0.65 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#374151', lineHeight: 1.3, mb: 0.4 }}>{t.name}</Typography>
        <Typography sx={{ fontSize: '0.73rem', color: '#9CA3AF' }}>
          {[t.clube, t.cidade && t.estado ? `${t.cidade}, ${t.estado}` : null].filter(Boolean).join(' · ')}
        </Typography>
        {(t.tipo_ave || t.estilo_canto) && (
          <Box sx={{ display: 'inline-flex', bgcolor: '#F0FDF4', border: '1px solid #D1FAE5', borderRadius: '6px', px: '7px', py: '2px', mt: 0.75 }}>
            <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, color: '#065F46', lineHeight: 1.4 }}>
              {[t.tipo_ave, t.estilo_canto].filter(Boolean).join(' · ')}
            </Typography>
          </Box>
        )}
      </Box>
      <Box sx={{ flexShrink: 0, textAlign: { xs: 'left', sm: 'right' } }}>
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#9CA3AF' }}>{fmtDate(t.start_at)}</Typography>
        <Typography sx={{ fontSize: '0.68rem', color: '#9CA3AF', mt: 0.3 }}>Inscrições abertas no dia</Typography>
      </Box>
    </Box>
  )
}

export function FinishedCard({ t }: { t: Item }) {
  return (
    <Box sx={{ bgcolor: '#fff', border: '1px solid #F9FAFB', borderRadius: 2, p: 2, display: 'flex', alignItems: 'center', gap: 2, opacity: 0.5 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: '#374151', lineHeight: 1.3 }}>{t.name}</Typography>
        <Typography sx={{ fontSize: '0.7rem', color: '#9CA3AF', mt: 0.2 }}>
          {[t.clube, t.cidade && t.estado ? `${t.cidade}, ${t.estado}` : null, t.start_at ? fmtDateFull(t.start_at) : null, t.n != null ? `${t.n} participante${t.n !== 1 ? 's' : ''}` : null].filter(Boolean).join(' · ')}
        </Typography>
      </Box>
      <Box component={Link} href={`/torneio/${t.id}`} sx={{ fontSize: '0.72rem', fontWeight: 600, color: '#9CA3AF', textDecoration: 'none', flexShrink: 0, '&:hover': { color: '#374151' } }}>
        Ver resultado →
      </Box>
    </Box>
  )
}
