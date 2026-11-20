// Datas e contagens regressivas da página do Pokémon GO, no fuso e no idioma do aparelho.

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** "2d 4h", "5h 12min", "12min" (abreviações iguais em português e inglês). */
export function formatDuration(ms: number): string {
  const total = Math.max(0, ms)
  const days = Math.floor(total / DAY)
  const hours = Math.floor((total % DAY) / HOUR)
  const minutes = Math.max(1, Math.ceil((total % HOUR) / MINUTE))
  if (days) return hours ? `${days}d ${hours}h` : `${days}d`
  if (hours) return minutes === 60 ? `${hours + 1}h` : `${hours}h ${minutes}min`
  return `${minutes}min`
}

const LOCALE = { pt: 'pt-BR', en: 'en-US' }

const formatters = new Map<string, Intl.DateTimeFormat>()
function formatter(lang: 'pt' | 'en', options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = lang + JSON.stringify(options)
  let entry = formatters.get(key)
  if (!entry) {
    entry = new Intl.DateTimeFormat(LOCALE[lang], options)
    formatters.set(key, entry)
  }
  return entry
}

const FULL: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
const SHORT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
const DAY_ONLY: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }

/** "sáb., 21 de nov., 14:00 – 17:00"; o Intl junta as partes iguais quando o evento cabe num dia. */
export function formatRange(start: Date, end: Date | null, lang: 'pt' | 'en'): string {
  const format = formatter(lang, FULL)
  return end && end > start ? format.formatRange(start, end) : format.format(start)
}

export const formatDate = (date: Date, lang: 'pt' | 'en') => formatter(lang, SHORT).format(date)

export const formatDay = (date: Date, lang: 'pt' | 'en') => formatter(lang, DAY_ONLY).format(date)

/** Contagem em blocos (dias, horas, minutos) para os destaques. */
export function countdownParts(ms: number): { days: number; hours: number; minutes: number } {
  const total = Math.max(0, ms)
  return { days: Math.floor(total / DAY), hours: Math.floor((total % DAY) / HOUR), minutes: Math.floor((total % HOUR) / MINUTE) }
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()

/** Dia local do evento, para agrupar a agenda. */
export const dayKey = (date: Date) => date.toDateString()

/** Horário curto para um card que já está dentro do grupo do dia: "14:00 – 17:00" ou "25 de nov., 06:00 – 1 de dez., 22:00". */
export function formatTimeRange(start: Date, end: Date | null, lang: 'pt' | 'en'): string {
  if (!end || end <= start) return formatter(lang, { hour: '2-digit', minute: '2-digit' }).format(start)
  if (sameDay(start, end)) return formatter(lang, { hour: '2-digit', minute: '2-digit' }).formatRange(start, end)
  return formatter(lang, SHORT).formatRange(start, end)
}

/** Fração do evento que já passou (0 a 1), para a barra de progresso. */
export function progress(start: Date, end: Date | null, now: number): number | null {
  if (!end || end <= start) return null
  return Math.min(1, Math.max(0, (now - start.getTime()) / (end.getTime() - start.getTime())))
}

/** Dia e mês separados, para a coluna de data da lista. */
export function dateParts(date: Date, lang: 'pt' | 'en'): { day: string; month: string; weekday: string } {
  const parts = formatter(lang, { day: 'numeric', month: 'short', weekday: 'short' }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) => (parts.find((p) => p.type === type)?.value ?? '').replace('.', '')
  return { day: get('day'), month: get('month'), weekday: get('weekday') }
}
