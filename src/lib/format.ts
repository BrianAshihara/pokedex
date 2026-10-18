import type { Pokemon } from './types'

export const TYPE_COLORS: Record<string, string> = {
  normal: '#a8a878',
  fire: '#f08030',
  water: '#6890f0',
  electric: '#f8d030',
  grass: '#78c850',
  ice: '#98d8d8',
  fighting: '#c03028',
  poison: '#a040a0',
  ground: '#e0c068',
  flying: '#a890f0',
  psychic: '#f85888',
  bug: '#a8b820',
  rock: '#b8a038',
  ghost: '#705898',
  dragon: '#7038f8',
  dark: '#705848',
  steel: '#b8b8d0',
  fairy: '#ee99ac',
  stellar: '#40b5a5',
  unknown: '#68a090',
}

export const COMPARE_COLORS = ['#ffcb05', '#38bdf8', '#f472b6']

export function typeColor(typeName: string | undefined): string {
  return TYPE_COLORS[typeName ?? 'unknown'] ?? TYPE_COLORS.unknown
}

export function typeNames(pokemon: Pokemon): string[] {
  return pokemon.types.map((t) => t.type.name)
}

export function accentColor(pokemon: Pokemon): string {
  return typeColor(typeNames(pokemon)[0])
}

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function displayName(name: string | null | undefined): string {
  return (name ?? '').replaceAll('-', ' ').replace(/(^|\s)(\w)/g, (_, space: string, c: string) => space + c.toUpperCase())
}

export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`
}

/** Número com vírgula decimal, sem zeros desnecessários (ex.: 87,5). */
export function decimal(value: number, digits = 1, trimZeros = false): string {
  let text = value.toFixed(digits)
  if (trimZeros) text = text.replace(/\.?0+$/, '')
  return text.replace('.', ',')
}

export function statColor(value: number): string {
  if (value < 30) return '#f34444'
  if (value < 60) return '#ff7f0f'
  if (value < 90) return '#ffdd57'
  if (value < 120) return '#a0e515'
  if (value < 150) return '#23cd5e'
  return '#00c2b8'
}

export function pokemonArt(pokemon: Pokemon): string | null {
  return pokemon.sprites.other?.['official-artwork']?.front_default || pokemon.sprites.front_default || null
}

export const MOVE_METHODS: [string, string][] = [
  ['level-up', 'Nível'],
  ['egg', 'Ovo'],
  ['machine', 'MT'],
  ['tutor', 'Tutor'],
]

export const CATEGORY_LABELS: Record<string, string> = { physical: 'Físico', special: 'Especial', status: 'Status' }

const MACHINE_PREFIXES: [string, string][] = [
  ['TM', 'MT'],
  ['HM', 'MO'],
  ['TR', 'DT'],
]

export function machineLabel(label: string): string {
  const match = MACHINE_PREFIXES.find(([en]) => label.startsWith(en))
  return match ? match[1] + label.slice(match[0].length) : label || '?'
}

/** `from` é o Pokémon de origem, usado pelo botão "Voltar" da página do golpe. */
/** Valor de `?de=` quando a página do golpe foi aberta pela lista de Golpes (e não por um Pokémon). */
export const FROM_MOVE_LIST = 'golpes'

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

export function generationLabel(generation: number): string {
  return ROMAN[generation] ?? String(generation)
}

export function moveLink(slug: string, versionGroup?: string, from?: string): string {
  const params = new URLSearchParams()
  if (versionGroup) params.set('jogo', versionGroup)
  if (from) params.set('de', from)
  const query = params.toString()
  return `/golpe/${slug}` + (query ? `?${query}` : '')
}
