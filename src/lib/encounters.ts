import curatedData from '../data/curated-encounters.json'
import type { Dictionary } from '../i18n/pt'
import { displayName } from './format'
import type { AreaInfo, EncounterRow, GameEncounters, PreEvolutionEncounters, RawEncounterArea } from './types'

interface CuratedEntry {
  games: string[]
  area: string | null
  method: string
  note?: { pt: string; en: string }
}

// A PokeAPI não tem encontros depois de Sword/Shield: este arquivo cobre só os iniciais e lendários sem nenhum registro.
const CURATED = curatedData as Record<string, CuratedEntry[]>

const VERSIONS: [string, string][] = [
  ['red-japan', 'Red (JP)'],
  ['green-japan', 'Green (JP)'],
  ['blue-japan', 'Blue (JP)'],
  ['red', 'Red'],
  ['blue', 'Blue'],
  ['yellow', 'Yellow'],
  ['gold', 'Gold'],
  ['silver', 'Silver'],
  ['crystal', 'Crystal'],
  ['ruby', 'Ruby'],
  ['sapphire', 'Sapphire'],
  ['emerald', 'Emerald'],
  ['firered', 'FireRed'],
  ['leafgreen', 'LeafGreen'],
  ['colosseum', 'Colosseum'],
  ['xd', 'XD'],
  ['diamond', 'Diamond'],
  ['pearl', 'Pearl'],
  ['platinum', 'Platinum'],
  ['heartgold', 'HeartGold'],
  ['soulsilver', 'SoulSilver'],
  ['black', 'Black'],
  ['white', 'White'],
  ['black-2', 'Black 2'],
  ['white-2', 'White 2'],
  ['x', 'X'],
  ['y', 'Y'],
  ['omega-ruby', 'Omega Ruby'],
  ['alpha-sapphire', 'Alpha Sapphire'],
  ['sun', 'Sun'],
  ['moon', 'Moon'],
  ['ultra-sun', 'Ultra Sun'],
  ['ultra-moon', 'Ultra Moon'],
  ['lets-go-pikachu', "Let's Go Pikachu"],
  ['lets-go-eevee', "Let's Go Eevee"],
  ['sword', 'Sword'],
  ['shield', 'Shield'],
  ['the-isle-of-armor-sword', 'The Isle of Armor (Sword)'],
  ['the-isle-of-armor-shield', 'The Isle of Armor (Shield)'],
  ['the-crown-tundra-sword', 'The Crown Tundra (Sword)'],
  ['the-crown-tundra-shield', 'The Crown Tundra (Shield)'],
  ['brilliant-diamond', 'Brilliant Diamond'],
  ['shining-pearl', 'Shining Pearl'],
  ['legends-arceus', 'Legends: Arceus'],
  ['scarlet', 'Scarlet'],
  ['violet', 'Violet'],
  ['the-teal-mask-scarlet', 'The Teal Mask (Scarlet)'],
  ['the-teal-mask-violet', 'The Teal Mask (Violet)'],
  ['the-indigo-disk-scarlet', 'The Indigo Disk (Scarlet)'],
  ['the-indigo-disk-violet', 'The Indigo Disk (Violet)'],
  ['legends-za', 'Legends: Z-A'],
  ['mega-dimension', 'Mega Dimension'],
]
const VERSION_ORDER = new Map(VERSIONS.map(([slug], i) => [slug, i]))
const VERSION_LABELS = new Map(VERSIONS)

const DLC_LABEL = /^(.*) \((?:Sword|Shield|Scarlet|Violet)\)$/

/** "Red / Blue"; as duas versões de um DLC viram só o nome dele. */
export function gameLabel(versions: string[]): string {
  const labels = versions.map((v) => VERSION_LABELS.get(v) ?? displayName(v))
  const dlc = labels.map((l) => DLC_LABEL.exec(l)?.[1])
  if (labels.length > 1 && dlc[0] && dlc.every((d) => d === dlc[0])) return dlc[0]
  return labels.join(' / ')
}

// Nesses métodos a chance é sempre 100% e o nível da troca é só uma faixa técnica.
const FIXED_METHODS = new Set(['gift', 'gift-egg', 'static', 'npc-trade'])

// Estados "padrão" não dizem nada ao jogador (ex.: "fora de um swarm", "sem jogo no slot 2").
const isDefaultCondition = (slug: string) => /-(no|none|off|inactive)$/.test(slug)

/** Junta jogos vizinhos com os mesmos encontros (ex.: Red e Blue), do mais antigo ao mais novo. */
function mergeGames(byVersion: Map<string, EncounterRow[]>): GameEncounters[] {
  const order = (v: string) => VERSION_ORDER.get(v) ?? VERSION_ORDER.size
  const games: GameEncounters[] = []
  for (const version of [...byVersion.keys()].sort((a, b) => order(a) - order(b))) {
    const rows = byVersion.get(version)!
    const last = games.at(-1)
    if (last && JSON.stringify(last.rows) === JSON.stringify(rows)) last.versions.push(version)
    else games.push({ id: version, versions: [version], rows })
  }
  return games
}

const compareRows = (a: EncounterRow, b: EncounterRow) =>
  (a.areaName ?? '').localeCompare(b.areaName ?? '', undefined, { numeric: true }) ||
  a.method.localeCompare(b.method) ||
  (a.minLevel ?? 0) - (b.minLevel ?? 0) ||
  a.conditions.join().localeCompare(b.conditions.join())

/** Soma as chances de cada slot por jogo, área, método e condições, em uma linha só. */
export function groupEncounters(areas: RawEncounterArea[], areaNames: Map<string, AreaInfo>): GameEncounters[] {
  const byVersion = new Map<string, Map<string, EncounterRow>>()

  for (const area of areas) {
    const slug = area.location_area.name
    const info = areaNames.get(slug)
    const areaName = info?.name ?? displayName(slug.replace(/-area$/, ''))
    for (const { version, encounter_details: details } of area.version_details) {
      let rows = byVersion.get(version.name)
      if (!rows) byVersion.set(version.name, (rows = new Map()))
      for (const detail of details) {
        const method = detail.method.name
        const conditions = detail.condition_values.map((c) => c.name).filter((c) => !isDefaultCondition(c)).sort()
        const key = `${slug}|${method}|${conditions.join()}`
        const fixed = FIXED_METHODS.has(method)
        const row = rows.get(key)
        if (!row) {
          rows.set(key, {
            areaName,
            location: info?.location,
            place: info?.place,
            method,
            minLevel: method === 'npc-trade' ? null : detail.min_level,
            maxLevel: method === 'npc-trade' ? null : detail.max_level,
            chance: fixed ? null : detail.chance,
            conditions,
          })
        } else {
          if (row.minLevel !== null) row.minLevel = Math.min(row.minLevel, detail.min_level)
          if (row.maxLevel !== null) row.maxLevel = Math.max(row.maxLevel, detail.max_level)
          if (row.chance !== null) row.chance = Math.min(100, row.chance + detail.chance)
        }
      }
    }
  }

  return mergeGames(new Map([...byVersion].map(([version, rows]) => [version, [...rows.values()].sort(compareRows)])))
}

/** Encontros curados à mão de uma espécie, no mesmo formato dos da API. */
export function curatedEncounters(species: string): GameEncounters[] {
  const byVersion = new Map<string, EncounterRow[]>()
  for (const entry of CURATED[species] ?? []) {
    for (const version of entry.games) {
      const rows = byVersion.get(version) ?? []
      rows.push({ areaName: entry.area, method: entry.method, minLevel: null, maxLevel: null, chance: null, conditions: [], note: entry.note })
      byVersion.set(version, rows)
    }
  }
  return mergeGames(byVersion)
}

/** Nos jogos em que o Pokémon não aparece, mostra onde achar suas pré-evoluções (ex.: Venusaur em Red → Bulbasaur). */
export function addPreEvolutions(own: GameEncounters[], preEvolutions: PreEvolutionEncounters[]): GameEncounters[] {
  const byVersion = new Map<string, EncounterRow[]>()
  for (const game of own) for (const version of game.versions) byVersion.set(version, game.rows)
  const ownVersions = new Set(byVersion.keys())

  for (const { species, games } of preEvolutions) {
    for (const game of games) {
      const rows = game.rows.map((row) => ({ ...row, via: species }))
      for (const version of game.versions) {
        if (!ownVersions.has(version)) byVersion.set(version, [...(byVersion.get(version) ?? []), ...rows])
      }
    }
  }
  return mergeGames(byVersion)
}

export function methodLabel(method: string, texts: Dictionary['locations']): string {
  return texts.methods[method] ?? displayName(method)
}

export type EncounterKind = 'grass' | 'cave' | 'water' | 'fishing' | 'tree' | 'rock' | 'gift' | 'fixed' | 'trade' | 'roaming' | 'other'

// O método "walk" vale para grama e para interiores: só o nome do local diferencia.
const INDOORS = /cave|cavern|tunnel|grotto|chamber|\bmt\b|mount|ruins|tower|mansion|plant|ship|anne|victory road|underground|hideout|sewer|cellar|temple|factory|building|lab\b|\bhq\b|\bwell\b|ice path|seafoam|whirl islands|dragon'?s den/i

const KIND_BY_METHOD: [RegExp, EncounterKind][] = [
  [/roaming|wanderer|chase|flying/, 'roaming'],
  [/rod|feebas|bubbling/, 'fishing'],
  [/surf|seaweed|water|dive/, 'water'],
  [/headbutt|berry-trees/, 'tree'],
  [/rock-smash/, 'rock'],
  [/cave-spots|bridge-spots/, 'cave'],
  [/^(gift|gift-egg|event)$/, 'gift'],
  [/static|raid|snag|grotto/, 'fixed'],
  [/npc-trade/, 'trade'],
  [/walk|grass|flowers|rough-terrain|overworld|horde|sos|ambush/, 'grass'],
]

/** Tipo visual do encontro, usado para escolher ícone, cor e explicação. */
export function encounterKind(method: string, place: string | null): EncounterKind {
  if (method === 'walk' && place && INDOORS.test(place)) return 'cave'
  return KIND_BY_METHOD.find(([pattern]) => pattern.test(method))?.[1] ?? 'other'
}

/** Instrução em linguagem simples, para quem nunca jogou. */
export function howToText(method: string, kind: EncounterKind, texts: Dictionary['locations']): string {
  return texts.howTo[method] ?? (kind === 'other' ? methodLabel(method, texts) : texts.kindHowTo[kind])
}

export type Rarity = 'guaranteed' | 'common' | 'uncommon' | 'rare' | 'veryRare'

export function rarityOf(row: Pick<EncounterRow, 'method' | 'chance'>): Rarity | null {
  if (FIXED_METHODS.has(row.method)) return 'guaranteed'
  if (row.chance === null) return null
  if (row.chance >= 30) return 'common'
  if (row.chance >= 10) return 'uncommon'
  return row.chance >= 4 ? 'rare' : 'veryRare'
}

/** Um jeito de encontrar o Pokémon em um local, somando os andares e trechos em que ele vale. */
export interface PlaceRow extends EncounterRow {
  subAreas: string[]
}

export interface EncounterPlace {
  key: string
  /** null em eventos e cruzamentos, que não acontecem em um lugar. */
  name: string | null
  location?: string
  rows: PlaceRow[]
}

const rowScore = (row: EncounterRow) => (rarityOf(row) === 'guaranteed' ? 101 : (row.chance ?? -1))

/** A parte específica da área ("1F" em "Mt. Moon (1F)"), quando o local tem mais de uma. */
function subAreaLabel(row: EncounterRow, place: string | null): string | null {
  if (!row.areaName || !place || row.areaName === place) return null
  const rest = row.areaName.startsWith(place) ? row.areaName.slice(place.length).replace(/^[\s\-–(,]+|\)$/g, '') : row.areaName
  return rest || null
}

/** Mesmo método e condições em andares diferentes viram uma linha: faixa total de níveis e a melhor chance. */
function mergeSubAreas(rows: EncounterRow[], place: string | null): PlaceRow[] {
  const merged = new Map<string, PlaceRow>()
  for (const row of rows) {
    const key = `${row.method}|${row.conditions.join()}|${row.via ?? ''}`
    const subArea = subAreaLabel(row, place)
    const known = merged.get(key)
    if (!known) {
      merged.set(key, { ...row, subAreas: subArea ? [subArea] : [] })
      continue
    }
    if (subArea && !known.subAreas.includes(subArea)) known.subAreas.push(subArea)
    if (known.minLevel !== null && row.minLevel !== null) known.minLevel = Math.min(known.minLevel, row.minLevel)
    if (known.maxLevel !== null && row.maxLevel !== null) known.maxLevel = Math.max(known.maxLevel, row.maxLevel)
    if (known.chance !== null && row.chance !== null) known.chance = Math.max(known.chance, row.chance)
  }
  return [...merged.values()].sort((a, b) => rowScore(b) - rowScore(a))
}

/** Junta as linhas por local e coloca primeiro onde é mais fácil encontrar. */
export function groupPlaces(rows: EncounterRow[]): EncounterPlace[] {
  const byPlace = new Map<string, { name: string | null; location?: string; rows: EncounterRow[] }>()
  for (const row of rows) {
    const name = row.place ?? row.areaName
    const key = row.location ?? name ?? row.method
    const place = byPlace.get(key)
    if (place) place.rows.push(row)
    else byPlace.set(key, { name, location: row.location, rows: [row] })
  }
  const places = [...byPlace].map(([key, place]): EncounterPlace => ({ ...place, key, rows: mergeSubAreas(place.rows, place.name) }))
  const score = (place: EncounterPlace) => Math.max(...place.rows.map(rowScore))
  return places.sort((a, b) => score(b) - score(a) || (a.name ?? '').localeCompare(b.name ?? '', undefined, { numeric: true }))
}

/** Texto de uma condição. As raras, ligadas a um único evento da história, ficam com o nome original. */
export function conditionLabel(slug: string, texts: Dictionary['locations']): string {
  const exact = texts.conditions[slug]
  if (exact) return exact
  const match = (pattern: RegExp) => pattern.exec(slug)?.[1]
  const name = (value: string) => displayName(value)

  let value = match(/^slot2-(.+)$/)
  if (value) return texts.slot2(name(value))
  if ((value = match(/^radio-(.+)$/))) return texts.radio(name(value))
  if ((value = match(/^starter-(.+)$/))) return texts.starter(name(value))
  if ((value = match(/^trade-(.+)$/))) return texts.tradeFor(name(value))
  if ((value = match(/^item-(.+)$/))) return texts.haveItem(name(value))
  if ((value = match(/^coins-(\d+)$/))) return texts.coins(value)
  if ((value = match(/^max-den-rating-(\d)-star$/))) return texts.raidStars(value)
  return displayName(slug.replace(/^(other|story-progress)-/, ''))
}
