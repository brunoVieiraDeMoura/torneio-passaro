export type Item = {
  id: string; name: string; qr_token: string | null
  status: string; n: number | null; start_at: string | null
  clube: string | null; cidade: string | null; estado: string | null
  tipo_ave: string | null; estilo_canto: string | null
  duration_secs: number | null
  // inscrições já fechadas (sorteio das gaiolas OU grupos definidos) → torneio começou
  started?: boolean
}

// "Ao vivo / em andamento": rodando, OU aberto mas com a marcação contando agora
// (janela start_at→fim), OU aberto já começado (sorteio/grupos feitos = inscrições
// fechadas). Um torneio que já sorteou as gaiolas não é mais "aberto".
export function isLive(t: Item): boolean {
  if (t.status === 'running') return true
  if (t.status !== 'open') return false
  if (t.start_at && t.duration_secs != null) {
    const start = new Date(t.start_at).getTime()
    const end = start + t.duration_secs * 1000
    const now = Date.now()
    if (now >= start && now <= end) return true
  }
  return !!t.started
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
  if (isLive(t)) return 0
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
