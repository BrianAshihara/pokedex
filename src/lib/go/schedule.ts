// Situação dos eventos (agora, em breve, encerrado) e o índice "Agora no GO": em que reides e eventos
// cada Pokémon aparece agora ou nos próximos dias.

import type { GoEvent, GoRaidBoss } from './feed'
import { resolveGoPokemon, splitNames, type PokemonIndex } from './names'
import { parseEventTitle } from './translate'

export type EventStatus = 'live' | 'upcoming' | 'ended' | 'unknown'

export function eventStatus(event: Pick<GoEvent, 'start' | 'end'>, now: number): EventStatus {
  const { start, end } = event
  if (!start) return 'unknown'
  if (end && end.getTime() <= now) return 'ended'
  if (start.getTime() > now) return 'upcoming'
  return 'live'
}

export type EventCategory = 'raids' | 'max' | 'featured' | 'league' | 'other'

const CATEGORY: Record<string, EventCategory> = {
  'raid-hour': 'raids',
  'raid-battles': 'raids',
  'raid-day': 'raids',
  'raid-weekend': 'raids',
  'elite-raids': 'raids',
  'max-battles': 'max',
  'max-mondays': 'max',
  'community-day': 'featured',
  'pokemon-spotlight-hour': 'featured',
  'go-battle-league': 'league',
}

export const eventCategory = (type: string): EventCategory => CATEGORY[type] ?? 'other'

/** Contexto, não evento: aparecem numa faixa no topo em vez de na lista. */
export const isBackdrop = (type: string) => type === 'season' || type === 'go-pass'

/** Os eventos que merecem destaque: Dia Comunitário e os grandes (GO Tour, GO Fest, Áreas Selvagens). */
const MAJOR = new Set(['pokemon-go-tour', 'pokemon-go-fest', 'go-tour', 'go-fest', 'wild-area', 'city-safari', 'safari-zone'])

/** Próximo (ou em andamento) de cada tipo de destaque. */
export function highlights(events: GoEvent[], now: number): { communityDay: GoEvent | null; major: GoEvent | null } {
  const pending = events
    .filter((e) => !e.canceled && (eventStatus(e, now) === 'live' || eventStatus(e, now) === 'upcoming'))
    .sort((a, b) => a.start!.getTime() - b.start!.getTime())
  return {
    communityDay: pending.find((e) => e.type === 'community-day') ?? null,
    major: pending.find((e) => MAJOR.has(e.type)) ?? null,
  }
}

// ---------- Agora no GO ----------

/** Quanto à frente um evento com o Pokémon já aparece no selo. */
const LOOKAHEAD = 14 * 24 * 60 * 60 * 1000

/** Tipos de evento que destacam Pokémon específicos. */
const POKEMON_EVENTS = new Set([
  'community-day',
  'pokemon-spotlight-hour',
  'raid-hour',
  'raid-battles',
  'raid-day',
  'raid-weekend',
  'elite-raids',
  'max-battles',
  'max-mondays',
  'event',
])

export type Appearance =
  /** `tier` como veio do feed (ex.: "5-Star Raids"). */
  | { kind: 'raid'; tier: string; shadow: boolean; end: Date | null }
  | { kind: 'event'; eventId: string; name: string; type: string; start: Date; end: Date | null; live: boolean; shadow: boolean; dynamax: boolean }

export interface GoSchedule {
  /** Por nome do Pokémon na PokeAPI. */
  byPokemon: Map<string, Appearance[]>
  /** Por espécie, quando o GO não disse a forma (ex.: "Deoxys" vale para todas). */
  bySpecies: Map<string, Appearance[]>
}

const push = (map: Map<string, Appearance[]>, key: string, value: Appearance) => {
  const current = map.get(key)
  if (current) current.push(value)
  else map.set(key, [value])
}

/** Pokémon de um evento: os dos dados extras e os citados no título. */
export function eventPokemon(event: GoEvent): string[] {
  const { subject } = parseEventTitle(event.name, event.type)
  const fromTitle = subject ? splitNames(subject).flatMap(expandForms) : []
  if (!event.featured.length) return [...new Set(fromTitle)]
  // Os dados extras são mais precisos, mas não dizem se a reide é Sombrosa: isso vem do título.
  const shadow = fromTitle.length > 0 && fromTitle.every((name) => /^Shadow /i.test(name))
  return [...new Set(event.featured.map((name) => (shadow && !/^Shadow /i.test(name) ? `Shadow ${name}` : name)))]
}

/** "Deoxys (Normal, Attack, and Speed Formes)" → "Deoxys (Normal)", "Deoxys (Attack)", "Deoxys (Speed)". */
export function expandForms(name: string): string[] {
  const match = /^(.+?) \((.+?) Formes\)$/.exec(name)
  if (!match) return [name]
  return splitNames(match[2]).map((form) => `${match[1]} (${form})`)
}

export function buildSchedule(events: GoEvent[], raids: GoRaidBoss[], index: PokemonIndex, now: number): GoSchedule {
  const byPokemon = new Map<string, Appearance[]>()
  const bySpecies = new Map<string, Appearance[]>()
  const add = (raw: string, appearance: Appearance) => {
    const pokemon = resolveGoPokemon(raw, index)
    if (!pokemon) return null
    const value = appearance.kind === 'event' ? { ...appearance, shadow: pokemon.shadow, dynamax: pokemon.dynamax } : { ...appearance, shadow: pokemon.shadow }
    push(pokemon.anyForm ? bySpecies : byPokemon, pokemon.anyForm ? pokemon.species : pokemon.name, value)
    return pokemon
  }

  const active = events.filter((e) => !e.canceled && e.start && POKEMON_EVENTS.has(e.type))
  // Fim da reide atual de cada Pokémon, tirado do evento "X em Reides de 5 estrelas" em andamento.
  const raidEnds = new Map<string, Date | null>()
  for (const event of active) {
    if (event.type !== 'raid-battles' || eventStatus(event, now) !== 'live') continue
    for (const raw of eventPokemon(event)) {
      const pokemon = resolveGoPokemon(raw, index)
      if (pokemon) raidEnds.set(`${pokemon.shadow ? 's:' : ''}${pokemon.species}`, event.end)
    }
  }

  const inRaids = new Set<string>()
  for (const boss of raids) {
    const pokemon = resolveGoPokemon(boss.name, index)
    if (!pokemon) continue
    const key = `${pokemon.shadow ? 's:' : ''}${pokemon.species}`
    inRaids.add(key)
    add(boss.name, { kind: 'raid', tier: boss.tier, shadow: boss.shadow, end: raidEnds.get(key) ?? null })
  }

  for (const event of active) {
    const status = eventStatus(event, now)
    if (status === 'ended' || status === 'unknown' || event.start!.getTime() - now > LOOKAHEAD) continue
    for (const raw of eventPokemon(event)) {
      const pokemon = resolveGoPokemon(raw, index)
      // A reide em andamento já aparece pelo nível; o evento repetiria a mesma informação.
      if (!pokemon || (event.type === 'raid-battles' && status === 'live' && inRaids.has(`${pokemon.shadow ? 's:' : ''}${pokemon.species}`))) continue
      add(raw, { kind: 'event', eventId: event.id, name: event.name, type: event.type, start: event.start!, end: event.end, live: status === 'live', shadow: false, dynamax: false })
    }
  }
  return { byPokemon, bySpecies }
}

/** Aparições de um Pokémon, das que estão valendo agora para as próximas. */
export function appearancesFor(schedule: GoSchedule, pokemonName: string, speciesName: string): Appearance[] {
  const all = [...(schedule.byPokemon.get(pokemonName) ?? []), ...(schedule.bySpecies.get(speciesName) ?? [])]
  const seen = new Set<string>()
  const startOf = (a: Appearance) => (a.kind === 'raid' ? 0 : a.live ? 0 : a.start.getTime())
  return all
    .filter((a) => {
      const key = a.kind === 'raid' ? `raid:${a.tier}:${a.shadow}` : `event:${a.eventId}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => startOf(a) - startOf(b) || (a.kind === 'raid' ? -1 : 1))
}
