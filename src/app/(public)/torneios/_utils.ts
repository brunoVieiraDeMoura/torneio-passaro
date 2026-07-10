export type Item = {
  id: string; name: string; qr_token: string | null
  status: string; n: number | null; start_at: string | null
  clube: string | null; cidade: string | null; estado: string | null
  tipo_ave: string | null; estilo_canto: string | null
}

export function fmtTime(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
}

export function fmtDate(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'America/Sao_Paulo' })
}

export function fmtDateFull(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' })
}

export function isFutureDay(iso: string | null): boolean {
  if (!iso) return false
  const d = new Date(iso)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)
  return d > todayEnd
}

export function statusScore(t: Item): number {
  if (t.status === 'running') return 0
  if (t.status === 'open' && !isFutureDay(t.start_at)) return 1
  if (t.status !== 'finished') return 2
  return 3
}

export function proximityScore(t: Item, cidade: string, estado: string): number {
  if (cidade && t.cidade === cidade) return 0
  if (estado && t.estado === estado) return 1
  return 2
}

export function sortByProximityAndStatus(list: Item[], cidade: string, estado: string): Item[] {
  return [...list].sort((a, b) => {
    const pp = proximityScore(a, cidade, estado) - proximityScore(b, cidade, estado)
    if (pp !== 0) return pp
    const ss = statusScore(a) - statusScore(b)
    if (ss !== 0) return ss
    const da = a.start_at ? new Date(a.start_at).getTime() : Infinity
    const db = b.start_at ? new Date(b.start_at).getTime() : Infinity
    return da - db
  })
}
