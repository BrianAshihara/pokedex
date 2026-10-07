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
  description: string
  hidden: boolean
}

export interface Move {
  name: string
  type: string
  category: string
  power: number | null
  accuracy: number | null
  pp: number | null
  effect: string
  machines: Record<string, string>
}

export interface LearnedMove extends Move {
  level: number
  machine: string
}

export interface EvolutionNode {
  name: string
  method: string | null
  children: EvolutionNode[]
}

export interface EvolutionTree {
  tree: EvolutionNode
  sprites: Record<string, string | null>
}

/** Multiplicador de dano → tipos atacantes. Só multiplicadores diferentes de 1. */
export type Matchups = Map<number, string[]>
