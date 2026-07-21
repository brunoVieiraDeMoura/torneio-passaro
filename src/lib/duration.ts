function pad(n: number) { return String(n).padStart(2, '0') }

// tempo acumulado (ms) → "mm:ss" ou "h:mm:ss" (Canto Fibra)
export function formatDuration(ms: number): string {
  const totalSecs = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

// tempo acumulado (ms) → SEMPRE "mm:ss" (minutos totais, sem separar horas).
// Ex.: 1h05m30s → "65:30". Usado onde só interessa minuto/segundo.
export function formatDurationMinSec(ms: number): string {
  const totalSecs = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(totalSecs / 60)
  const s = totalSecs % 60
  return `${pad(m)}:${pad(s)}`
}

// "mm:ss", "m:ss" ou "h:mm:ss" digitado pelo chefe → ms. null se inválido/vazio.
export function parseDuration(input: string): number | null {
  const raw = input.trim()
  if (!raw) return null
  const parts = raw.split(':').map(p => p.trim())
  if (parts.some(p => p === '' || isNaN(Number(p)))) return null
  const nums = parts.map(Number)
  let h = 0, m = 0, s = 0
  if (nums.length === 3) [h, m, s] = nums
  else if (nums.length === 2) [m, s] = nums
  else if (nums.length === 1) [s] = nums
  else return null
  if (m >= 60 || s >= 60 || h < 0 || m < 0 || s < 0) return null
  return ((h * 3600) + (m * 60) + s) * 1000
}
