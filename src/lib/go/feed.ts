// Eventos e reides do Pokémon GO publicados pelo ScrapedDuck (github.com/bigfoott/ScrapedDuck), que coleta os
// dados do LeekDuck. Só os campos factuais entram no app: nada de imagens ou textos descritivos deles.
// O formato é de terceiros e pode mudar: tudo é validado aqui, e entradas malformadas são descartadas.

const FEED_URL = 'https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data'
const REQUEST_TIMEOUT = 10_000

export interface GoEvent {
  id: string
  /** Nome original, sem o prefixo "[Canceled]". */
  name: string
  type: string
  start: Date | null
  end: Date | null
  canceled: boolean
  /** Página do evento no LeekDuck (crédito e detalhes). */
  link: string | null
  /** Pokémon citados nos dados extras (Holofote, Dia Comunitário, reides), como aparecem no GO. */
  featured: string[]
  /** Bônus em inglês, como vieram (traduzidos na exibição). */
  bonuses: string[]
}

export interface CpRange {
  min: number
  max: number
}

export interface GoRaidBoss {
  /** Nome como aparece no GO (ex.: "Shadow Tornadus (Incarnate)"). */
  name: string
  /** Nível como veio (ex.: "5-Star Raids", "Mega Raids"). */
  tier: string
  shadow: boolean
  shiny: boolean
  types: string[]
  cp: CpRange | null
  boostedCp: CpRange | null
  weather: string[]
}

type Json = Record<string, unknown>

const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value)
const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

/**
 * Sem fuso ("2026-11-21T14:00:00.000") é horário local de cada jogador (o Dia Comunitário é às 14h em
 * qualquer lugar) e o `Date` do JavaScript já lê assim; com "Z" é um instante global, igual para todos.
 */
export function parseFeedDate(value: unknown): Date | null {
  const raw = text(value)
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) return null
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

function cpRange(value: unknown): CpRange | null {
  if (!isObject(value)) return null
  const { min, max } = value
  return typeof min === 'number' && typeof max === 'number' && min > 0 && max >= min ? { min, max } : null
}

/** Nomes de Pokémon dentro de uma lista de objetos `{ name }`. */
const names = (value: unknown): string[] => list(value).flatMap((entry) => (isObject(entry) && text(entry.name) ? [text(entry.name)] : []))

export function normalizeEvents(data: unknown): GoEvent[] {
  return list(data).flatMap((entry): GoEvent[] => {
    if (!isObject(entry)) return []
    const id = text(entry.eventID)
    const rawName = text(entry.name)
    if (!id || !rawName) return []
    const canceled = /^\[Cancell?ed\]\s*/i.test(rawName)
    const extra = isObject(entry.extraData) ? entry.extraData : {}
    const spotlight = isObject(extra.spotlight) ? extra.spotlight : {}
    const communityDay = isObject(extra.communityday) ? extra.communityday : {}
    const raids = isObject(extra.raidbattles) ? extra.raidbattles : {}
    const featured = [...names(spotlight.list), ...names(communityDay.spawns), ...names(raids.bosses)]
    if (!featured.length && text(spotlight.name)) featured.push(text(spotlight.name))
    const bonuses = [text(spotlight.bonus), ...list(communityDay.bonuses).map((b) => (isObject(b) ? text(b.text) : ''))].filter(Boolean)
    const link = text(entry.link)
    return [
      {
        id,
        name: rawName.replace(/^\[Cancell?ed\]\s*/i, ''),
        type: text(entry.eventType) || 'event',
        start: parseFeedDate(entry.start),
        end: parseFeedDate(entry.end),
        canceled,
        link: /^https:\/\/leekduck\.com\//.test(link) ? link : null,
        featured: [...new Set(featured)],
        bonuses,
      },
    ]
  })
}

export function normalizeRaids(data: unknown): GoRaidBoss[] {
  return list(data).flatMap((entry): GoRaidBoss[] => {
    if (!isObject(entry)) return []
    const name = text(entry.name)
    const tier = text(entry.tier)
    if (!name || !tier) return []
    const cp = isObject(entry.combatPower) ? entry.combatPower : {}
    return [
      {
        name,
        tier,
        shadow: /^Shadow /i.test(name),
        shiny: entry.canBeShiny === true,
        types: names(entry.types).map((t) => t.toLowerCase()),
        cp: cpRange(cp.normal),
        boostedCp: cpRange(cp.boosted),
        weather: names(entry.boostedWeather).map((w) => w.toLowerCase()),
      },
    ]
  })
}

async function getFeed(file: string): Promise<unknown> {
  const response = await fetch(`${FEED_URL}/${file}.min.json`, { signal: AbortSignal.timeout(REQUEST_TIMEOUT) })
  if (!response.ok) throw new Error(`ScrapedDuck respondeu ${response.status} para ${file}`)
  return response.json()
}

export async function fetchGoEvents(): Promise<GoEvent[]> {
  return normalizeEvents(await getFeed('events'))
}

export async function fetchGoRaids(): Promise<GoRaidBoss[]> {
  return normalizeRaids(await getFeed('raids'))
}
