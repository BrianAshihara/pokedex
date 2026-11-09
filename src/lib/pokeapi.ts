import type { Dictionary } from '../i18n/pt'
import championsItems from '../data/champions-items.json'
import { curatedEncounters, groupEncounters } from './encounters'
import hiddenItemCategories from './hidden-item-categories.json'
import { groupFlavorTexts, itemGroup, itemVariant, megaStoneUser } from './items'
import type {
  Ability,
  AbilityData,
  ChainLink,
  EvolutionChain,
  EvolutionDetail,
  EvolutionNode,
  EvolutionTree,
  GameEncounters,
  ItemDetail,
  ItemListItem,
  ItemPokemon,
  LearnedMove,
  Learnset,
  MachineData,
  Matchups,
  Move,
  MoveData,
  MoveLearner,
  MoveLearners,
  MoveListItem,
  PokemonListItem,
  Pokemon,
  PreEvolutionEncounters,
  RawEncounterArea,
  RawPokemon,
  Species,
  TypeData,
} from './types'

const BASE_URL = 'https://pokeapi.co/api/v2'
const GRAPHQL_URL = 'https://graphql.pokeapi.co/v1beta2'
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

/** Habilidades que reduzem dano super efetivo para ×0,75 (2× → 1,5×, 4× → 3×). */
export const SE_REDUCING_ABILITIES = new Set(['filter', 'solid-rock', 'prism-armor'])

export function applyAbilityToMatchups(matchups: Matchups, abilitySlug: string | null): Matchups {
  if (!abilitySlug || !SE_REDUCING_ABILITIES.has(abilitySlug)) return matchups
  const adjusted: Matchups = new Map()
  for (const [multiplier, typeNames] of matchups) {
    const next = multiplier > 1 ? multiplier * 0.75 : multiplier
    adjusted.set(next, [...(adjusted.get(next) ?? []), ...typeNames])
  }
  return adjusted
}

function cleanText(text: string): string {
  return text.replaceAll('\f', ' ').replaceAll('\n', ' ').replaceAll('­ ', '').split(/\s+/).filter(Boolean).join(' ')
}

// A PokeAPI não tem português: tudo vem em inglês, e a tradução da descrição fica em src/i18n/content.
export function getFlavorText(species: Species | null): string {
  const texts = (species?.flavor_text_entries ?? []).filter((e) => e.language.name === 'en' && e.flavor_text)
  return texts.length ? cleanText(texts[texts.length - 1].flavor_text!) : ''
}

/** Categoria (ex.: "Flame Pokémon"), sempre em inglês. */
export function getGenus(species: Species | null): string {
  return species?.genera.find((g) => g.language.name === 'en')?.genus ?? ''
}

const titleize = (text: string) => text.replaceAll('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())

type EvolutionTexts = Dictionary['evolution']

function describeLevelUp(detail: EvolutionDetail, evo: EvolutionTexts): string[] {
  const parts: string[] = []
  const times: Record<string, string> = { day: evo.day, night: evo.night, dusk: evo.dusk }
  if (detail.min_level != null) parts.push(evo.level(detail.min_level))
  if (detail.time_of_day) parts.push(times[detail.time_of_day] ?? titleize(detail.time_of_day))
  if (detail.known_move) parts.push(evo.knownMove(titleize(detail.known_move.name)))
  if (detail.known_move_type) parts.push(evo.knownMoveType(titleize(detail.known_move_type.name)))
  if (detail.held_item) parts.push(evo.holding(titleize(detail.held_item.name)))
  if (detail.min_happiness != null) parts.push(evo.friendship)
  if (detail.min_beauty != null) parts.push(evo.beauty)
  if (detail.min_affection != null) parts.push(evo.affection)
  if (detail.location) parts.push(titleize(detail.location.name))
  if (detail.needs_overworld_rain) parts.push(evo.rain)
  if (detail.party_species) parts.push(evo.party(titleize(detail.party_species.name)))
  if (detail.party_type) parts.push(evo.party(titleize(detail.party_type.name)))
  if (detail.relative_physical_stats === 1) parts.push('Atk > Def')
  else if (detail.relative_physical_stats === -1) parts.push('Atk < Def')
  else if (detail.relative_physical_stats === 0) parts.push('Atk = Def')
  if (detail.gender === 1) parts.push(evo.female)
  else if (detail.gender === 2) parts.push(evo.male)
  if (detail.turn_upside_down) parts.push(evo.upsideDown)
  if (!parts.length) parts.push(evo.levelUp)
  return parts
}

export interface EvolutionOption {
  text: string
  /** Evolução por uso de item: é o método mais reconhecível quando há muitos (ex.: Eevee). */
  usesItem: boolean
}

/** Cada forma alternativa de evoluir, sem repetir, no idioma de `evo`. */
export function evolutionOptions(details: (EvolutionDetail | null)[], evo: EvolutionTexts): EvolutionOption[] {
  const options = new Map<string, EvolutionOption>()
  for (const detail of details) {
    if (!detail) continue
    const trigger = detail.trigger?.name ?? ''
    let parts: string[] = []

    if (trigger === 'level-up') {
      parts = describeLevelUp(detail, evo)
    } else if (trigger === 'use-item') {
      parts.push(detail.item ? evo.useItem(titleize(detail.item.name)) : evo.anyItem)
    } else if (trigger === 'trade') {
      if (detail.held_item) parts.push(evo.tradeHolding(titleize(detail.held_item.name)))
      else if (detail.trade_species) parts.push(evo.tradeWith(titleize(detail.trade_species.name)))
      else parts.push(evo.trade)
    } else if (trigger) {
      parts.push(titleize(trigger))
    }

    const text = parts.length ? parts.join(' + ') : trigger ? titleize(trigger) : ''
    if (text && !options.has(text)) options.set(text, { text, usesItem: trigger === 'use-item' })
  }
  return [...options.values()]
}

export function summarizeEvolutionMethods(details: (EvolutionDetail | null)[], evo: EvolutionTexts): string {
  return evolutionOptions(details, evo)
    .map((o) => o.text)
    .join(' / ')
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
  // Guarda os detalhes crus: o texto do método é montado na tela, no idioma escolhido.
  const build = (node: ChainLink): EvolutionNode => {
    names.push(node.species.name)
    return {
      name: node.species.name,
      details: node.evolution_details ?? [],
      children: node.evolves_to.map(build),
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

export function sortVersionGroups(names: string[]): string[] {
  const order = (vg: string) => VERSION_ORDER.get(vg) ?? VERSION_ORDER.size
  return [...names].sort((a, b) => order(a) - order(b) || a.localeCompare(b))
}

export function sortedVersionGroups(learnset: Learnset): string[] {
  return sortVersionGroups(Object.keys(learnset))
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

function getAbility(name: string): Promise<Omit<Ability, 'slug' | 'hidden'>> {
  return cached(`ability:${name}`, async () => {
    const data = await getJson<AbilityData>(`${BASE_URL}/ability/${name}`)
    if (!data) return { name: titleize(name), description: '' }
    const description = englishText(data.flavor_text_entries, 'flavor_text') || englishText(data.effect_entries, 'short_effect')
    return { name: englishName(data), description }
  })
}

export async function getAbilities(abilities: Pokemon['abilities']): Promise<Ability[]> {
  const details = await mapLimit(abilities, (a) => getAbility(a.ability.name))
  return abilities.map((a, i) => ({ ...details[i], slug: a.ability.name, hidden: a.is_hidden }))
}

export function getMove(name: string): Promise<Move | null> {
  return cached(`move:${name}`, async () => {
    const data = await getJson<MoveData>(`${BASE_URL}/move/${name}`)
    if (!data) return null
    let effect = englishText(data.effect_entries, 'short_effect')
    if (effect && data.effect_chance != null) effect = effect.replaceAll('$effect_chance', String(data.effect_chance))
    return {
      name: englishName(data),
      slug: data.name,
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

// "Quem aprende este golpe" via GraphQL: uma consulta em vez de centenas de /pokemon/{nome}.

async function graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT * 2),
  })
  if (!response.ok) throw new Error(`PokeAPI GraphQL respondeu ${response.status}`)
  const body = (await response.json()) as { data?: T; errors?: { message: string }[] }
  if (body.errors?.length || !body.data) throw new Error(body.errors?.[0]?.message ?? 'Resposta GraphQL vazia')
  return body.data
}

const MOVE_VERSION_GROUPS_QUERY = `query ($move: String!) {
  pokemonmove(where: { move: { name: { _eq: $move } } }, distinct_on: version_group_id) { versiongroup { name } }
}`

export async function getMoveVersionGroups(move: string): Promise<string[]> {
  const data = await graphql<{ pokemonmove: { versiongroup: { name: string } }[] }>(MOVE_VERSION_GROUPS_QUERY, { move })
  return sortVersionGroups(data.pokemonmove.map((row) => row.versiongroup.name))
}

const MOVE_LEARNERS_QUERY = `query ($move: String!, $vg: String!) {
  move(where: { name: { _eq: $move } }) {
    machines(where: { versiongroup: { name: { _eq: $vg } } }) { item { name } }
  }
  pokemonmove(where: { move: { name: { _eq: $move } }, versiongroup: { name: { _eq: $vg } } }) {
    level
    movelearnmethod { name }
    pokemon {
      id
      name
      pokemon_species_id
      pokemontypes(order_by: { slot: asc }) { type { name } }
      pokemonsprites { sprites(path: "front_default") }
    }
  }
}`

interface MoveLearnersResponse {
  move: { machines: { item: { name: string } | null }[] }[]
  pokemonmove: {
    level: number
    movelearnmethod: { name: string }
    pokemon: {
      id: number
      name: string
      pokemon_species_id: number
      pokemontypes: { type: { name: string } }[]
      pokemonsprites: { sprites: string | null }[]
    }
  }[]
}

export async function getMoveLearners(move: string, versionGroup: string): Promise<MoveLearners> {
  const data = await graphql<MoveLearnersResponse>(MOVE_LEARNERS_QUERY, { move, vg: versionGroup })

  // Um Pokémon pode aparecer várias vezes no mesmo método (ex: level-up no Nv 1 e no Nv 30).
  const byMethod: Record<string, Map<string, MoveLearner>> = {}
  for (const row of data.pokemonmove) {
    const { pokemon } = row
    const method = row.movelearnmethod.name
    const learners = (byMethod[method] ??= new Map())
    let learner = learners.get(pokemon.name)
    if (!learner) {
      learner = {
        name: pokemon.name,
        id: pokemon.id,
        speciesId: pokemon.pokemon_species_id,
        types: pokemon.pokemontypes.map((t) => t.type.name),
        sprite: pokemon.pokemonsprites[0]?.sprites ?? null,
        levels: [],
      }
      learners.set(pokemon.name, learner)
    }
    if (method === 'level-up' && !learner.levels.includes(row.level)) learner.levels.push(row.level)
  }

  const byDex = (a: MoveLearner, b: MoveLearner) => a.speciesId - b.speciesId || a.id - b.id
  const result: Record<string, MoveLearner[]> = {}
  for (const [method, learners] of Object.entries(byMethod)) {
    const rows = [...learners.values()]
    for (const row of rows) row.levels.sort((a, b) => a - b)
    rows.sort(byDex)
    result[method] = rows
  }

  return { machine: (data.move[0]?.machines[0]?.item?.name ?? '').toUpperCase(), byMethod: result }
}

// Pokémon Champions não tem geração própria na API: o elenco vem dos golpes aprendidos nesse jogo
// (que já trazem Megas e formas regionais) e da Pokédex dele, que inclui espécies ainda sem golpes cadastrados.
const CHAMPIONS = '{ versiongroup: { name: { _eq: "champions" } } }'

// Só golpes que algum Pokémon aprende: fora ficam Shadow, Z-Moves e Max Moves.
const ALL_MOVES_QUERY = `{
  move(where: { pokemonmoves: {} }, order_by: { id: asc }) {
    name
    power
    accuracy
    pp
    move_effect_chance
    generation_id
    type { name }
    movedamageclass { name }
    movenames(where: { language: { name: { _eq: "en" } } }) { name }
    moveeffect { moveeffecteffecttexts(where: { language: { name: { _eq: "en" } } }) { short_effect } }
    moveflavortexts(where: { language: { name: { _eq: "en" } } }, order_by: { version_group_id: desc }, limit: 1) { flavor_text }
  }
}`

interface AllMovesResponse {
  move: {
    name: string
    power: number | null
    accuracy: number | null
    pp: number | null
    move_effect_chance: number | null
    generation_id: number
    type: { name: string } | null
    movedamageclass: { name: string } | null
    movenames: { name: string }[]
    moveeffect: { moveeffecteffecttexts: { short_effect: string }[] } | null
    moveflavortexts: { flavor_text: string }[]
  }[]
}

export async function getAllMoves(): Promise<MoveListItem[]> {
  const data = await graphql<AllMovesResponse>(ALL_MOVES_QUERY, {})
  return data.move.map((m) => {
    let effect = m.moveeffect?.moveeffecteffecttexts[0]?.short_effect ?? ''
    if (effect && m.move_effect_chance != null) effect = effect.replaceAll('$effect_chance', String(m.move_effect_chance))
    return {
      slug: m.name,
      name: m.movenames[0]?.name || titleize(m.name),
      type: m.type?.name ?? 'unknown',
      category: m.movedamageclass?.name ?? 'status',
      power: m.power,
      accuracy: m.accuracy,
      pp: m.pp,
      generation: m.generation_id,
      effect: cleanText(effect || (m.moveflavortexts[0]?.flavor_text ?? '')),
    }
  })
}

// Sprite pelo id: dispensa trazer o JSON de sprites de 1300 Pokémon na consulta.
export const spriteUrl = (id: number) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`

const ALL_POKEMON_QUERY = `{
  pokemon(order_by: { id: asc }) {
    id
    name
    is_default
    pokemon_species_id
    pokemonspecy { generation_id pokemondexnumbers(where: { pokedex: { name: { _eq: "champions" } } }) { pokedex_number } }
    pokemontypes(order_by: { slot: asc }) { type { name } }
    pokemonstats(order_by: { stat_id: asc }) { base_stat }
    champions: pokemonmoves(where: ${CHAMPIONS}, limit: 1) { id }
  }
}`

interface AllPokemonResponse {
  pokemon: {
    id: number
    name: string
    is_default: boolean
    pokemon_species_id: number
    pokemonspecy: { generation_id: number; pokemondexnumbers: { pokedex_number: number }[] } | null
    pokemontypes: { type: { name: string } }[]
    pokemonstats: { base_stat: number }[]
    champions: { id: number }[]
  }[]
}

export async function getAllPokemon(): Promise<PokemonListItem[]> {
  const data = await graphql<AllPokemonResponse>(ALL_POKEMON_QUERY, {})
  return data.pokemon
    .map((p) => {
      const stats = p.pokemonstats.map((s) => s.base_stat)
      return {
        name: p.name,
        id: p.id,
        speciesId: p.pokemon_species_id,
        isDefault: p.is_default,
        generation: p.pokemonspecy?.generation_id ?? 0,
        types: p.pokemontypes.map((t) => t.type.name),
        stats,
        total: stats.reduce((sum, value) => sum + value, 0),
        sprite: spriteUrl(p.id),
        // A Pokédex lista espécies: vale para a forma padrão, não para Gigantamax e afins.
        champions: p.champions.length > 0 || (p.is_default && !!p.pokemonspecy?.pokemondexnumbers.length),
      }
    })
    .sort((a, b) => a.speciesId - b.speciesId || a.id - b.id)
}

// Onde encontrar: o REST já vem agrupado por área e jogo (o GraphQL devolveria milhares de linhas no Magikarp).
// Só os nomes das áreas vêm do GraphQL; se ele falhar, o nome é montado a partir do identificador.

const AREA_NAMES_QUERY = `query ($areas: [String!]!) {
  locationarea(where: { name: { _in: $areas } }) {
    name
    locationareanames(where: { language: { name: { _eq: "en" } } }) { name }
    location { locationnames(where: { language: { name: { _eq: "en" } } }) { name } }
  }
}`

interface AreaNamesResponse {
  locationarea: {
    name: string
    locationareanames: { name: string }[]
    location: { locationnames: { name: string }[] } | null
  }[]
}

async function getAreaNames(areas: string[]): Promise<Map<string, string>> {
  if (!areas.length) return new Map()
  try {
    const data = await graphql<AreaNamesResponse>(AREA_NAMES_QUERY, { areas })
    return new Map(
      data.locationarea.flatMap((area) => {
        const name = area.locationareanames[0]?.name || area.location?.locationnames[0]?.name
        // Algumas áreas vêm como "Road 22" em vez de "Route 22".
        return name ? [[area.name, name.replace(/^Road (\d)/, 'Route $1')] as [string, string]] : []
      }),
    )
  } catch {
    return new Map()
  }
}

export function getEncounters(pokemonName: string): Promise<GameEncounters[]> {
  return cached(`encounters:${pokemonName}`, async () => {
    const areas = (await getJson<RawEncounterArea[]>(`${BASE_URL}/pokemon/${pokemonName}/encounters`)) ?? []
    return groupEncounters(areas, await getAreaNames(areas.map((a) => a.location_area.name)))
  })
}

/** Encontros de cada pré-evolução, da mais próxima para a mais distante. */
export async function getPreEvolutionEncounters(species: Species): Promise<PreEvolutionEncounters[]> {
  const result: PreEvolutionEncounters[] = []
  let parentName = species.evolves_from_species?.name
  while (parentName) {
    const parent = await fetchSpecies(parentName)
    if (!parent) break
    const games = await getEncounters(parent.varieties.find((v) => v.is_default)?.pokemon.name ?? parent.name)
    result.push({ species: parent.name, games: games.length ? games : curatedEncounters(parent.name) })
    parentName = parent.evolves_from_species?.name
  }
  return result
}

const CHAMPIONS_ITEMS = new Set(championsItems.items)

const ITEM_FIELDS = `
  name
  fling_power
  itemcategory { name }
  itemnames(where: { language: { name: { _eq: "en" } } }) { name }
  itemeffecttexts(where: { language: { name: { _eq: "en" } } }) { short_effect }
  itemflavortexts(where: { language: { name: { _eq: "en" } } }, order_by: { version_group_id: desc }, limit: 1) { flavor_text }
  itemgameindices(order_by: { generation_id: asc }, limit: 1) { generation_id }
  itemsprites { sprites(path: "default") }
  pokemonformconditions(limit: 1) { pokemon_form { pokemon { name } } }
`

interface RawItem {
  name: string
  fling_power: number | null
  itemcategory: { name: string } | null
  itemnames: { name: string }[]
  itemeffecttexts: { short_effect: string }[]
  itemflavortexts: { flavor_text: string }[]
  itemgameindices: { generation_id: number }[]
  itemsprites: { sprites: string | null }[]
  pokemonformconditions: { pokemon_form: { pokemon: { name: string } | null } | null }[]
}

function slimItem(item: RawItem): ItemListItem {
  const category = item.itemcategory?.name ?? 'other'
  return {
    slug: item.name,
    name: item.itemnames[0]?.name || titleize(item.name),
    category,
    group: itemGroup(category),
    generation: item.itemgameindices[0]?.generation_id ?? 0,
    sprite: item.itemsprites[0]?.sprites ?? null,
    // Efeito resumido; sem ele, o texto dos jogos (mesma regra de scripts/i18n-content.mjs).
    effect: cleanText(item.itemeffecttexts[0]?.short_effect || item.itemflavortexts[0]?.flavor_text || ''),
    megaUser: megaStoneUser(item.pokemonformconditions[0]?.pokemon_form?.pokemon?.name),
    champions: CHAMPIONS_ITEMS.has(item.name),
  }
}

const ALL_ITEMS_QUERY = `query ($hidden: [String!]!) {
  item(where: { itemcategory: { name: { _nin: $hidden } } }, order_by: { id: asc }) { ${ITEM_FIELDS} }
}`

export async function getAllItems(): Promise<ItemListItem[]> {
  const data = await graphql<{ item: RawItem[] }>(ALL_ITEMS_QUERY, { hidden: hiddenItemCategories })
  // A API repete alguns itens (ex.: Roseli Berry): fica a entrada que tem descrição.
  const bySlug = new Map<string, ItemListItem>()
  for (const item of data.item.map(slimItem)) {
    const seen = bySlug.get(item.slug)
    if (!seen || (!seen.effect && item.effect)) bySlug.set(item.slug, item)
  }
  const items = [...bySlug.values()]
  const uses = new Map<string, number>()
  for (const item of items) uses.set(item.name, (uses.get(item.name) ?? 0) + 1)
  return items.map((item) => {
    const variant = uses.get(item.name)! > 1 ? itemVariant(item.slug) : null
    return variant ? { ...item, name: `${item.name} (${variant})` } : item
  })
}

const POKEMON_CARD_FIELDS = `
  id
  name
  pokemon_species_id
  pokemontypes(order_by: { slot: asc }) { type { name } }
  pokemonsprites { sprites(path: "front_default") }
`

const EVOLVED_SPECIES = `pokemonspecy { pokemons(where: { is_default: { _eq: true } }) { ${POKEMON_CARD_FIELDS} } }`

const ITEM_DETAIL_QUERY = `query ($slug: String!) {
  item(where: { name: { _eq: $slug } }) {
    ${ITEM_FIELDS}
    itemflingeffect { name }
    flavors: itemflavortexts(where: { language: { name: { _eq: "en" } } }, order_by: { version_group_id: asc }) { flavor_text versiongroup { name } }
    prices: itemprices(where: { _or: [{ purchase_price: { _gt: 0 } }, { sell_price: { _gt: 0 } }] }, order_by: { version_group_id: desc }, limit: 1) { purchase_price sell_price }
    itemattributemaps { itemattribute { name } }
    pokemonitems { rarity pokemon { ${POKEMON_CARD_FIELDS} } }
    pokemonevolutions { ${EVOLVED_SPECIES} }
    PokemonevolutionsByHeldItemId { ${EVOLVED_SPECIES} }
    forms: pokemonformconditions { pokemon_form { pokemon { ${POKEMON_CARD_FIELDS} } } }
  }
}`

interface RawCardPokemon {
  id: number
  name: string
  pokemon_species_id: number
  pokemontypes: { type: { name: string } }[]
  pokemonsprites: { sprites: string | null }[]
}

interface RawEvolution {
  pokemonspecy: { pokemons: RawCardPokemon[] } | null
}

interface RawItemDetail extends RawItem {
  itemflingeffect: { name: string } | null
  flavors: { flavor_text: string; versiongroup: { name: string } | null }[]
  prices: { purchase_price: number | null; sell_price: number | null }[]
  itemattributemaps: { itemattribute: { name: string } }[]
  pokemonitems: { rarity: number; pokemon: RawCardPokemon | null }[]
  pokemonevolutions: RawEvolution[]
  PokemonevolutionsByHeldItemId: RawEvolution[]
  forms: { pokemon_form: { pokemon: RawCardPokemon | null } | null }[]
}

function cardPokemon(p: RawCardPokemon): ItemPokemon {
  return {
    name: p.name,
    id: p.id,
    speciesId: p.pokemon_species_id,
    types: p.pokemontypes.map((t) => t.type.name),
    sprite: p.pokemonsprites[0]?.sprites ?? null,
  }
}

const byDexNumber = (a: ItemPokemon, b: ItemPokemon) => a.speciesId - b.speciesId || a.id - b.id

function uniqueCards(pokemon: (RawCardPokemon | null | undefined)[]): ItemPokemon[] {
  const cards = new Map<string, ItemPokemon>()
  for (const p of pokemon) if (p) cards.set(p.name, cardPokemon(p))
  return [...cards.values()].sort(byDexNumber)
}

export function getItem(slug: string): Promise<ItemDetail | null> {
  return cached(`item:${slug}`, async () => {
    const data = await graphql<{ item: RawItemDetail[] }>(ITEM_DETAIL_QUERY, { slug })
    const item = data.item[0]
    if (!item) return null

    // O mesmo Pokémon aparece uma vez por jogo: fica a maior chance.
    const holders = new Map<string, ItemPokemon>()
    for (const { rarity, pokemon } of item.pokemonitems) {
      if (!pokemon) continue
      const holder = holders.get(pokemon.name)
      if (!holder) holders.set(pokemon.name, { ...cardPokemon(pokemon), rarity })
      else holder.rarity = Math.max(holder.rarity ?? 0, rarity)
    }

    const variant = itemVariant(slug)
    const base = slimItem(item)
    return {
      ...base,
      name: variant ? `${base.name} (${variant})` : base.name,
      flingPower: item.fling_power,
      flingEffect: item.itemflingeffect?.name ?? null,
      price: item.prices[0] ? { buy: item.prices[0].purchase_price || null, sell: item.prices[0].sell_price || null } : null,
      flavors: groupFlavorTexts(item.flavors.flatMap((f) => (f.versiongroup ? [{ versionGroup: f.versiongroup.name, text: cleanText(f.flavor_text) }] : []))),
      attributes: item.itemattributemaps.map((a) => a.itemattribute.name),
      heldBy: [...holders.values()].sort(byDexNumber),
      evolves: uniqueCards([...item.pokemonevolutions, ...item.PokemonevolutionsByHeldItemId].map((e) => e.pokemonspecy?.pokemons[0])),
      megaForms: uniqueCards(item.forms.map((f) => f.pokemon_form?.pokemon)),
    }
  })
}
