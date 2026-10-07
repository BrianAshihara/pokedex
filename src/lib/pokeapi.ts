import type {
  Ability,
  AbilityData,
  ChainLink,
  EvolutionChain,
  EvolutionDetail,
  EvolutionNode,
  EvolutionTree,
  LearnedMove,
  Learnset,
  MachineData,
  Matchups,
  Move,
  MoveData,
  Pokemon,
  RawPokemon,
  Species,
  TypeData,
} from './types'

const BASE_URL = 'https://pokeapi.co/api/v2'
const REQUEST_TIMEOUT = 10_000
const FALLBACK_SPECIES_COUNT = 1025
const MAX_PARALLEL_REQUESTS = 16

// Cache em memória por chave. Guarda a Promise para que chamadas simultâneas
// compartilhem a mesma requisição; falhas de rede são descartadas para nova tentativa.
const cache = new Map<string, Promise<unknown>>()

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  let entry = cache.get(key) as Promise<T> | undefined
  if (!entry) {
    entry = load()
    cache.set(key, entry)
    entry.catch(() => cache.delete(key))
  }
  return entry
}

/** Retorna null em 404. Outros erros são lançados para não serem cacheados. */
async function getJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT) })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`PokeAPI respondeu ${response.status} para ${url}`)
  return (await response.json()) as T
}

function getCachedJson<T>(url: string): Promise<T | null> {
  return cached(url, () => getJson<T>(url))
}

/** Promise.all com limite de requisições simultâneas, preservando a ordem. */
async function mapLimit<T, R>(items: readonly T[], fn: (item: T) => Promise<R>, limit = MAX_PARALLEL_REQUESTS): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await fn(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

export function sanitizeLookupName(value: string): string {
  return value.trim().toLowerCase().replaceAll(' ', '-').replaceAll('_', '-').replaceAll('.', '')
}

export function normalizeQuery(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]/g, '')
}

const isDigits = (value: string) => /^\d+$/.test(value)

/** Remove os campos que o app não usa e transforma a lista de golpes em um índice enxuto por jogo. */
function slimPokemon(data: RawPokemon): Pokemon {
  const { moves, ...rest } = data
  const learnset: Learnset = {}
  for (const entry of moves ?? []) {
    for (const detail of entry.version_group_details) {
      ;(learnset[detail.version_group.name] ??= []).push([
        entry.move.name,
        detail.move_learn_method.name,
        detail.level_learned_at || 0,
      ])
    }
  }
  return {
    id: rest.id,
    name: rest.name,
    height: rest.height,
    weight: rest.weight,
    base_experience: rest.base_experience,
    species: rest.species,
    types: rest.types,
    stats: rest.stats,
    abilities: rest.abilities,
    sprites: {
      front_default: rest.sprites.front_default,
      front_shiny: rest.sprites.front_shiny,
      other: rest.sprites.other,
    },
    cries: rest.cries,
    learnset,
  }
}

function fetchPokemonRaw(ref: string): Promise<Pokemon | null> {
  return cached(`pokemon:${ref}`, async () => {
    const data = await getJson<RawPokemon>(`${BASE_URL}/pokemon/${encodeURIComponent(ref)}`)
    return data ? slimPokemon(data) : null
  })
}

export async function fetchAllPokemonNames(): Promise<string[]> {
  const data = await getCachedJson<{ results: { name: string }[] }>(`${BASE_URL}/pokemon?limit=20000`)
  return (data?.results ?? []).map((p) => p.name).filter(Boolean)
}

function buildAliasMap(): Promise<Map<string, string>> {
  return cached('alias-map', async () => {
    const aliases = new Map<string, string>()
    for (const name of await fetchAllPokemonNames()) {
      const normalized = normalizeQuery(name)
      if (normalized && !aliases.has(normalized)) aliases.set(normalized, name)
    }
    return aliases
  })
}

export async function getSpeciesCount(): Promise<number> {
  try {
    const data = await getCachedJson<{ count: number }>(`${BASE_URL}/pokemon-species?limit=1`)
    return data?.count || FALLBACK_SPECIES_COUNT
  } catch {
    return FALLBACK_SPECIES_COUNT
  }
}

async function resolvePokemonName(query: string): Promise<string> {
  const candidate = sanitizeLookupName(query)
  const normalized = normalizeQuery(candidate)
  if (!normalized) return candidate
  return (await buildAliasMap()).get(normalized) ?? candidate
}

export function fetchSpecies(ref: string | number): Promise<Species | null> {
  return getCachedJson<Species>(`${BASE_URL}/pokemon-species/${encodeURIComponent(String(ref))}`)
}

/** Busca por nome, número ou apelido tolerante (ex.: "mr mime", "deoxys", "25"). */
export async function fetchPokemon(ref: string): Promise<Pokemon | null> {
  const original = ref.trim().toLowerCase()
  if (!original) return null

  const direct = isDigits(original) ? original : sanitizeLookupName(original)
  const directData = await fetchPokemonRaw(direct)
  if (directData) return directData
  if (isDigits(direct)) return null

  const resolved = await resolvePokemonName(direct)
  if (resolved && resolved !== direct) {
    const resolvedData = await fetchPokemonRaw(resolved)
    if (resolvedData) return resolvedData
  }

  const species = await fetchSpecies(direct)
  const defaultVariety = species?.varieties.find((v) => v.is_default)
  return defaultVariety ? fetchPokemonRaw(defaultVariety.pokemon.name) : null
}

export async function getTypeMatchups(types: Pokemon['types']): Promise<Matchups> {
  const typeDatas = await mapLimit(types, (t) => getCachedJson<TypeData>(t.type.url))

  const multipliers = new Map<string, number>()
  for (const typeData of typeDatas) {
    if (!typeData) continue
    const relations = typeData.damage_relations
    for (const rel of relations.double_damage_from) multipliers.set(rel.name, (multipliers.get(rel.name) ?? 1) * 2)
    for (const rel of relations.half_damage_from) multipliers.set(rel.name, (multipliers.get(rel.name) ?? 1) * 0.5)
    for (const rel of relations.no_damage_from) multipliers.set(rel.name, 0)
  }

  const matchups: Matchups = new Map()
  for (const [typeName, multiplier] of multipliers) {
    if (multiplier === 1) continue
    if (!matchups.has(multiplier)) matchups.set(multiplier, [])
    matchups.get(multiplier)!.push(typeName)
  }
  return matchups
}

function cleanText(text: string): string {
  return text.replaceAll('\f', ' ').replaceAll('\n', ' ').replaceAll('­ ', '').split(/\s+/).filter(Boolean).join(' ')
}

const PREFERRED_LANGUAGES = ['pt-BR', 'pt', 'en']

export function getFlavorText(species: Species | null): string {
  const entries = species?.flavor_text_entries ?? []
  for (const lang of PREFERRED_LANGUAGES) {
    const texts = entries.filter((e) => e.language.name === lang && e.flavor_text)
    if (texts.length) return cleanText(texts[texts.length - 1].flavor_text!)
  }
  return ''
}

export function getGenus(species: Species | null): string {
  const genera = species?.genera ?? []
  for (const lang of PREFERRED_LANGUAGES) {
    const match = genera.find((g) => g.language.name === lang)
    if (match) return match.genus
  }
  return ''
}

const titleize = (text: string) => text.replaceAll('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())

const TIME_OF_DAY: Record<string, string> = { day: 'Dia', night: 'Noite', dusk: 'Crepúsculo' }

function describeLevelUp(detail: EvolutionDetail): string[] {
  const parts: string[] = []
  if (detail.min_level != null) parts.push(`Nv ${detail.min_level}`)
  if (detail.time_of_day) parts.push(TIME_OF_DAY[detail.time_of_day] ?? titleize(detail.time_of_day))
  if (detail.known_move) parts.push(`Mov ${titleize(detail.known_move.name)}`)
  if (detail.known_move_type) parts.push(`Golpe ${titleize(detail.known_move_type.name)}`)
  if (detail.held_item) parts.push(`Segurando ${titleize(detail.held_item.name)}`)
  if (detail.min_happiness != null) parts.push('Amizade')
  if (detail.min_beauty != null) parts.push('Beleza')
  if (detail.min_affection != null) parts.push('Afeto')
  if (detail.location) parts.push(titleize(detail.location.name))
  if (detail.needs_overworld_rain) parts.push('Chuva')
  if (detail.party_species) parts.push(`Equipe ${titleize(detail.party_species.name)}`)
  if (detail.party_type) parts.push(`Equipe ${titleize(detail.party_type.name)}`)
  if (detail.relative_physical_stats === 1) parts.push('Atk > Def')
  else if (detail.relative_physical_stats === -1) parts.push('Atk < Def')
  else if (detail.relative_physical_stats === 0) parts.push('Atk = Def')
  if (detail.gender === 1) parts.push('Fêmea')
  else if (detail.gender === 2) parts.push('Macho')
  if (detail.turn_upside_down) parts.push('De cabeça para baixo')
  if (!parts.length) parts.push('Subir de nível')
  return parts
}

export function summarizeEvolutionMethods(details: (EvolutionDetail | null)[]): string {
  const summaries: string[] = []
  for (const detail of details) {
    if (!detail) continue
    const trigger = detail.trigger?.name ?? ''
    let parts: string[] = []

    if (trigger === 'level-up') {
      parts = describeLevelUp(detail)
    } else if (trigger === 'use-item') {
      parts.push(detail.item ? `Usar ${titleize(detail.item.name)}` : 'Usar item')
    } else if (trigger === 'trade') {
      if (detail.held_item) parts.push(`Troca + ${titleize(detail.held_item.name)}`)
      else if (detail.trade_species) parts.push(`Troca com ${titleize(detail.trade_species.name)}`)
      else parts.push('Troca')
    } else if (trigger) {
      parts.push(titleize(trigger))
    }

    const summary = parts.length ? parts.join(' + ') : trigger ? titleize(trigger) : ''
    if (summary) summaries.push(summary)
  }
  return [...new Set(summaries)].join(' / ')
}

function spriteOf(pokemon: Pokemon | null): string | null {
  if (!pokemon) return null
  return pokemon.sprites.front_default || pokemon.sprites.other?.['official-artwork']?.front_default || null
}

export async function getEvolutionTree(speciesName: string): Promise<EvolutionTree | null> {
  const species = await fetchSpecies(speciesName)
  const chainUrl = species?.evolution_chain?.url
  if (!chainUrl) return null

  const chainData = await getCachedJson<EvolutionChain>(chainUrl)
  if (!chainData?.chain) return null

  const names: string[] = []
  const build = (node: ChainLink, method: string | null = null): EvolutionNode => {
    names.push(node.species.name)
    return {
      name: node.species.name,
      method,
      children: node.evolves_to.map((child) => build(child, summarizeEvolutionMethods(child.evolution_details))),
    }
  }
  const tree = build(chainData.chain)

  // Um sprite que falha não deve derrubar a árvore inteira.
  const pokemons = await mapLimit(names, (name) => fetchPokemon(name).catch(() => null))
  const sprites = Object.fromEntries(names.map((name, i) => [name, spriteOf(pokemons[i])]))
  return { tree, sprites }
}

export const VERSION_GROUPS: [string, string][] = [
  ['red-green-japan', 'Red / Green (JP)'],
  ['red-blue', 'Red / Blue'],
  ['blue-japan', 'Blue (JP)'],
  ['yellow', 'Yellow'],
  ['gold-silver', 'Gold / Silver'],
  ['crystal', 'Crystal'],
  ['ruby-sapphire', 'Ruby / Sapphire'],
  ['emerald', 'Emerald'],
  ['firered-leafgreen', 'FireRed / LeafGreen'],
  ['colosseum', 'Colosseum'],
  ['xd', 'XD'],
  ['diamond-pearl', 'Diamond / Pearl'],
  ['platinum', 'Platinum'],
  ['heartgold-soulsilver', 'HeartGold / SoulSilver'],
  ['black-white', 'Black / White'],
  ['black-2-white-2', 'Black 2 / White 2'],
  ['x-y', 'X / Y'],
  ['omega-ruby-alpha-sapphire', 'Omega Ruby / Alpha Sapphire'],
  ['sun-moon', 'Sun / Moon'],
  ['ultra-sun-ultra-moon', 'Ultra Sun / Ultra Moon'],
  ['lets-go-pikachu-lets-go-eevee', "Let's Go Pikachu / Eevee"],
  ['sword-shield', 'Sword / Shield'],
  ['the-isle-of-armor', 'The Isle of Armor'],
  ['the-crown-tundra', 'The Crown Tundra'],
  ['brilliant-diamond-shining-pearl', 'Brilliant Diamond / Shining Pearl'],
  ['legends-arceus', 'Legends: Arceus'],
  ['scarlet-violet', 'Scarlet / Violet'],
  ['the-teal-mask', 'The Teal Mask'],
  ['the-indigo-disk', 'The Indigo Disk'],
  ['legends-za', 'Legends: Z-A'],
  ['mega-dimension', 'Mega Dimension'],
  ['champions', 'Champions'],
]
const VERSION_ORDER = new Map(VERSION_GROUPS.map(([name], i) => [name, i]))
const VERSION_LABELS = new Map(VERSION_GROUPS)

export function versionGroupLabel(name: string): string {
  return VERSION_LABELS.get(name) ?? titleize(name)
}

export function sortedVersionGroups(learnset: Learnset): string[] {
  const order = (vg: string) => VERSION_ORDER.get(vg) ?? VERSION_ORDER.size
  return Object.keys(learnset).sort((a, b) => order(a) - order(b) || a.localeCompare(b))
}

export function defaultVersionGroup(learnset: Learnset): string | null {
  const groups = sortedVersionGroups(learnset)
  const withLevelUp = groups.filter((vg) => learnset[vg].some(([, method]) => method === 'level-up'))
  const candidates = withLevelUp.length ? withLevelUp : groups
  return candidates[candidates.length - 1] ?? null
}

function englishText(entries: { language: { name: string }; flavor_text?: string; short_effect?: string }[] | undefined, field: 'flavor_text' | 'short_effect'): string {
  const texts = (entries ?? []).filter((e) => e.language.name === 'en' && e[field]).map((e) => e[field]!)
  return texts.length ? cleanText(texts[texts.length - 1]) : ''
}

function englishName(data: { name: string; names: { name: string; language: { name: string } }[] }): string {
  return data.names.find((n) => n.language.name === 'en')?.name || titleize(data.name)
}

function getAbility(name: string): Promise<Omit<Ability, 'hidden'>> {
  return cached(`ability:${name}`, async () => {
    const data = await getJson<AbilityData>(`${BASE_URL}/ability/${name}`)
    if (!data) return { name: titleize(name), description: '' }
    const description = englishText(data.flavor_text_entries, 'flavor_text') || englishText(data.effect_entries, 'short_effect')
    return { name: englishName(data), description }
  })
}

export async function getAbilities(abilities: Pokemon['abilities']): Promise<Ability[]> {
  const details = await mapLimit(abilities, (a) => getAbility(a.ability.name))
  return abilities.map((a, i) => ({ ...details[i], hidden: a.is_hidden }))
}

function getMove(name: string): Promise<Move | null> {
  return cached(`move:${name}`, async () => {
    const data = await getJson<MoveData>(`${BASE_URL}/move/${name}`)
    if (!data) return null
    let effect = englishText(data.effect_entries, 'short_effect')
    if (effect && data.effect_chance != null) effect = effect.replaceAll('$effect_chance', String(data.effect_chance))
    return {
      name: englishName(data),
      type: data.type?.name ?? 'unknown',
      category: data.damage_class?.name ?? 'status',
      power: data.power,
      accuracy: data.accuracy,
      pp: data.pp,
      effect: effect || englishText(data.flavor_text_entries, 'flavor_text'),
      machines: Object.fromEntries(data.machines.map((m) => [m.version_group.name, m.machine.url])),
    }
  })
}

async function getMachineLabel(url: string): Promise<string> {
  const data = await getCachedJson<MachineData>(url)
  return (data?.item?.name ?? '').toUpperCase()
}

const MACHINE_PREFIX_ORDER: Record<string, number> = { TM: 0, HM: 1, TR: 2 }

function compareMachines(a: string, b: string): number {
  const key = (label: string) => {
    const prefix = label.replace(/\d+$/, '')
    const digits = label.slice(prefix.length)
    return [label === '' ? 1 : 0, MACHINE_PREFIX_ORDER[prefix] ?? 3, digits ? Number(digits) : 0]
  }
  const ka = key(a)
  const kb = key(b)
  return ka[0] - kb[0] || ka[1] - kb[1] || ka[2] - kb[2]
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)

/** Agrupa os golpes de um jogo por método de aprendizado, já com os detalhes de cada golpe. */
export async function getLearnset(learnset: Learnset, versionGroup: string): Promise<Record<string, LearnedMove[]>> {
  const entries = learnset[versionGroup] ?? []
  const moveNames = [...new Set(entries.map(([name]) => name))]
  const moveList = await mapLimit(moveNames, getMove)
  const moves = new Map(moveNames.map((name, i) => [name, moveList[i]]))

  const machineUrls = new Map<string, string>()
  for (const [name, method] of entries) {
    const url = moves.get(name)?.machines[versionGroup]
    if (method === 'machine' && url) machineUrls.set(name, url)
  }
  const labelList = await mapLimit([...machineUrls.values()], getMachineLabel)
  const machineLabels = new Map([...machineUrls.keys()].map((name, i) => [name, labelList[i]]))

  const grouped: Record<string, LearnedMove[]> = {}
  for (const [name, method, level] of entries) {
    const move = moves.get(name)
    if (!move) continue
    ;(grouped[method] ??= []).push({ ...move, level, machine: machineLabels.get(name) ?? '' })
  }

  for (const [method, rows] of Object.entries(grouped)) {
    if (method === 'level-up') rows.sort((a, b) => a.level - b.level || byName(a, b))
    else if (method === 'machine') rows.sort((a, b) => compareMachines(a.machine, b.machine) || byName(a, b))
    else rows.sort(byName)
  }
  return grouped
}
