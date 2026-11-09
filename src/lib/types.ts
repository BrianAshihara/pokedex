// Formato dos dados da PokeAPI (apenas os campos usados pelo app).

export interface NamedResource {
  name: string
  url: string
}

interface LocalizedName {
  name: string
  language: NamedResource
}

interface LocalizedText {
  language: NamedResource
  flavor_text?: string
  short_effect?: string
}

export interface Sprites {
  front_default?: string | null
  front_shiny?: string | null
}

export interface PokemonSprites extends Sprites {
  other?: {
    'official-artwork'?: Sprites
    home?: Sprites
    showdown?: Sprites
  }
}

/** [golpe, método de aprendizado, nível] */
export type LearnsetEntry = [move: string, method: string, level: number]
export type Learnset = Record<string, LearnsetEntry[]>

export interface Pokemon {
  id: number
  name: string
  height: number
  weight: number
  base_experience: number | null
  species: NamedResource
  types: { slot: number; type: NamedResource }[]
  stats: { base_stat: number; stat: NamedResource }[]
  abilities: { is_hidden: boolean; ability: NamedResource }[]
  sprites: PokemonSprites
  cries?: { latest?: string | null; legacy?: string | null }
  learnset: Learnset
}

export interface RawPokemon extends Omit<Pokemon, 'learnset'> {
  moves?: {
    move: NamedResource
    version_group_details: { level_learned_at: number; move_learn_method: NamedResource; version_group: NamedResource }[]
  }[]
}

export interface Species {
  id: number
  name: string
  is_legendary: boolean
  is_mythical: boolean
  is_baby: boolean
  gender_rate: number
  capture_rate: number | null
  generation: NamedResource | null
  evolution_chain: { url: string } | null
  evolves_from_species: NamedResource | null
  varieties: { is_default: boolean; pokemon: NamedResource }[]
  genera: { genus: string; language: NamedResource }[]
  flavor_text_entries: LocalizedText[]
}

export interface TypeData {
  damage_relations: {
    double_damage_from: NamedResource[]
    half_damage_from: NamedResource[]
    no_damage_from: NamedResource[]
  }
}

export interface EvolutionDetail {
  trigger: NamedResource | null
  min_level: number | null
  time_of_day: string
  known_move: NamedResource | null
  known_move_type: NamedResource | null
  held_item: NamedResource | null
  item: NamedResource | null
  min_happiness: number | null
  min_beauty: number | null
  min_affection: number | null
  location: NamedResource | null
  needs_overworld_rain: boolean
  party_species: NamedResource | null
  party_type: NamedResource | null
  relative_physical_stats: number | null
  gender: number | null
  turn_upside_down: boolean
  trade_species: NamedResource | null
}

export interface ChainLink {
  species: NamedResource
  evolution_details: EvolutionDetail[]
  evolves_to: ChainLink[]
}

export interface EvolutionChain {
  chain: ChainLink
}

export interface AbilityData {
  name: string
  names: LocalizedName[]
  flavor_text_entries: LocalizedText[]
  effect_entries: LocalizedText[]
}

export interface MoveData {
  name: string
  names: LocalizedName[]
  type: NamedResource | null
  damage_class: NamedResource | null
  power: number | null
  accuracy: number | null
  pp: number | null
  effect_chance: number | null
  effect_entries: LocalizedText[]
  flavor_text_entries: LocalizedText[]
  machines: { machine: { url: string }; version_group: NamedResource }[]
}

export interface MachineData {
  item: NamedResource | null
}

// Formatos já processados pelo app.

export interface Ability {
  name: string
  /** Identificador da PokeAPI, ex: "solid-rock". */
  slug: string
  description: string
  hidden: boolean
}

export interface Move {
  name: string
  /** Identificador da PokeAPI, ex: "flamethrower". */
  slug: string
  type: string
  category: string
  power: number | null
  accuracy: number | null
  pp: number | null
  effect: string
  machines: Record<string, string>
}

/** Pokémon (ou forma) que aprende um golpe num jogo, por um método. */
export interface MoveLearner {
  name: string
  id: number
  speciesId: number
  types: string[]
  sprite: string | null
  /** Só preenchido em level-up; 0 = aprende ao evoluir. */
  levels: number[]
}

export interface MoveLearners {
  /** Item da máquina naquele jogo, ex: "TM125"; vazio se o golpe não é MT. */
  machine: string
  byMethod: Record<string, MoveLearner[]>
}

/** Linha da lista de todos os golpes (página /golpes). */
export interface MoveListItem {
  slug: string
  name: string
  type: string
  category: string
  power: number | null
  accuracy: number | null
  pp: number | null
  generation: number
  effect: string
}

export interface LearnedMove extends Move {
  level: number
  machine: string
}

export interface EvolutionNode {
  name: string
  /** Como se chega a este estágio a partir do anterior (vazio no primeiro). */
  details: (EvolutionDetail | null)[]
  children: EvolutionNode[]
}

export interface EvolutionTree {
  tree: EvolutionNode
  sprites: Record<string, string | null>
}

export interface RawEncounterArea {
  location_area: NamedResource
  version_details: {
    version: NamedResource
    encounter_details: {
      min_level: number
      max_level: number
      chance: number
      method: NamedResource
      condition_values: NamedResource[]
    }[]
  }[]
}

export interface EncounterRow {
  /** null em eventos e cruzamentos, que não acontecem em um lugar do mapa. */
  areaName: string | null
  method: string
  minLevel: number | null
  maxLevel: number | null
  chance: number | null
  conditions: string[]
  /** Só nos encontros curados à mão. */
  note?: { pt: string; en: string }
  /** Pré-evolução encontrada neste local, quando o próprio Pokémon não aparece no jogo. */
  via?: string
}

export interface PreEvolutionEncounters {
  species: string
  games: GameEncounters[]
}

/** Encontros de um ou mais jogos com exatamente os mesmos dados (ex.: Red e Blue). */
export interface GameEncounters {
  id: string
  versions: string[]
  rows: EncounterRow[]
}

export type ItemGroup = 'medicine' | 'training' | 'battle' | 'mega' | 'balls' | 'berries' | 'evolution' | 'key' | 'other'

/** Linha da lista de todos os itens (página /itens). */
export interface ItemListItem {
  slug: string
  name: string
  category: string
  group: ItemGroup
  /** 0 quando a PokeAPI não registra a geração. */
  generation: number
  sprite: string | null
  effect: string
  /** Quem usa a Mega Stone, para descrever as que não têm texto na API. */
  megaUser: string | null
  /** Liberado na regulação atual de Pokémon Champions. */
  champions: boolean
}

/** Mesmo texto dos jogos em uma ou mais versões. */
export interface ItemFlavor {
  versionGroups: string[]
  text: string
}

/** Pokémon listado na página de um item. */
export interface ItemPokemon {
  name: string
  id: number
  speciesId: number
  types: string[]
  sprite: string | null
  /** Maior chance de vir segurando o item, nos jogos em que aparece. */
  rarity?: number
}

export interface ItemDetail extends ItemListItem {
  flingPower: number | null
  flingEffect: string | null
  /** Do jogo mais recente que registra preço; a PokeAPI só tem isso para poucos itens. */
  price: { buy: number | null; sell: number | null } | null
  /** Do jogo mais recente para o mais antigo. */
  flavors: ItemFlavor[]
  attributes: string[]
  heldBy: ItemPokemon[]
  evolves: ItemPokemon[]
  megaForms: ItemPokemon[]
}

/** Multiplicador de dano → tipos atacantes. Só multiplicadores diferentes de 1. */
export type Matchups = Map<number, string[]>

/** Linha da lista de todos os Pokémon (página inicial). */
export interface PokemonListItem {
  name: string
  id: number
  speciesId: number
  /** false para formas alternativas (Megas, regionais, Gigantamax…). */
  isDefault: boolean
  generation: number
  types: string[]
  /** Na ordem de STATS: HP, Attack, Defense, Sp. Atk, Sp. Def, Speed. */
  stats: number[]
  total: number
  sprite: string
  /** Disponível em Pokémon Champions. */
  champions: boolean
}
