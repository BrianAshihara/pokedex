import type { Pokemon } from './types'

export const STATS = ['HP', 'Attack', 'Defense', 'Sp. Atk', 'Sp. Def', 'Speed'] as const
export type StatName = (typeof STATS)[number]
export type StatValues = Record<StatName, number>

const API_NAMES: Record<string, StatName> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}

export const MAX_IV = 31
export const MAX_EV = 252
export const MAX_TOTAL_EV = 510

type NatureEffect = readonly [up: StatName | null, down: StatName | null]

export const NATURES = {
  Hardy: [null, null],
  Lonely: ['Attack', 'Defense'],
  Brave: ['Attack', 'Speed'],
  Adamant: ['Attack', 'Sp. Atk'],
  Naughty: ['Attack', 'Sp. Def'],
  Bold: ['Defense', 'Attack'],
  Docile: [null, null],
  Relaxed: ['Defense', 'Speed'],
  Impish: ['Defense', 'Sp. Atk'],
  Lax: ['Defense', 'Sp. Def'],
  Timid: ['Speed', 'Attack'],
  Hasty: ['Speed', 'Defense'],
  Serious: [null, null],
  Jolly: ['Speed', 'Sp. Atk'],
  Naive: ['Speed', 'Sp. Def'],
  Modest: ['Sp. Atk', 'Attack'],
  Mild: ['Sp. Atk', 'Defense'],
  Quiet: ['Sp. Atk', 'Speed'],
  Bashful: [null, null],
  Rash: ['Sp. Atk', 'Sp. Def'],
  Calm: ['Sp. Def', 'Attack'],
  Gentle: ['Sp. Def', 'Defense'],
  Sassy: ['Sp. Def', 'Speed'],
  Careful: ['Sp. Def', 'Sp. Atk'],
  Quirky: [null, null],
} as const satisfies Record<string, NatureEffect>

export type Nature = keyof typeof NATURES
export const NATURE_NAMES = Object.keys(NATURES) as Nature[]

export function natureEffect(nature: Nature): NatureEffect {
  return NATURES[nature] ?? [null, null]
}

export function natureLabel(nature: Nature): string {
  const [up, down] = natureEffect(nature)
  return up ? `${nature} (+${up}, -${down})` : `${nature} (neutra)`
}

/** Multiplicador em porcentagem inteira, para evitar erro de ponto flutuante. */
export function natureMultiplier(nature: Nature, stat: StatName): number {
  const [up, down] = natureEffect(nature)
  if (stat === up) return 110
  if (stat === down) return 90
  return 100
}

export function calcStat(stat: StatName, base: number, iv = MAX_IV, ev = 0, level = 100, nature: Nature = 'Hardy'): number {
  const core = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100)
  if (stat === 'HP') return base === 1 ? 1 : core + level + 10
  return Math.floor(((core + 5) * natureMultiplier(nature, stat)) / 100)
}

export function calcAll(
  base: StatValues,
  ivs: Partial<StatValues> = {},
  evs: Partial<StatValues> = {},
  level = 100,
  nature: Nature = 'Hardy',
): StatValues {
  return mapStats((s) => calcStat(s, base[s] ?? 0, ivs[s] ?? MAX_IV, evs[s] ?? 0, level, nature))
}

function natureAffecting(stat: StatName, boosted: boolean): Nature {
  const index = boosted ? 0 : 1
  return NATURE_NAMES.find((n) => NATURES[n][index] === stat) ?? 'Hardy'
}

/** Mínimo (IV 0, sem EVs, natureza desfavorável) e máximo (IV 31, 252 EVs, natureza favorável). */
export function statRangeLv100(stat: StatName, base: number): [number, number] {
  return [
    calcStat(stat, base, 0, 0, 100, natureAffecting(stat, false)),
    calcStat(stat, base, MAX_IV, MAX_EV, 100, natureAffecting(stat, true)),
  ]
}

export function baseStats(pokemon: Pokemon): StatValues {
  const result = mapStats(() => 0)
  for (const entry of pokemon.stats) {
    const name = API_NAMES[entry.stat.name]
    if (name) result[name] = entry.base_stat
  }
  return result
}

export function mapStats(fn: (stat: StatName) => number): StatValues {
  return Object.fromEntries(STATS.map((s) => [s, fn(s)])) as StatValues
}

export function sumStats(values: StatValues): number {
  return STATS.reduce((total, s) => total + values[s], 0)
}
