// Comparador de Speed para Pokémon Champions: nível 50, IVs 31 e Stat Points (0 a 32 por atributo) no lugar dos EVs.
// A ordem dos cálculos segue o Showdown (Gen 9): estágio, modificadores encadeados em base 4096 e, por último, paralisia.

export interface SpeedPokemon {
  name: string
  /** Id do /pokemon (para o sprite); difere da espécie nas Megas e formas regionais. */
  id: number
  speciesId: number
  baseSpeed: number
  abilities: string[]
}

export const MAX_SP = 32
export const MIN_STAGE = -6
export const MAX_STAGE = 6

export type NatureEffect = 'plus' | 'neutral' | 'minus'
export type Weather = 'none' | 'rain' | 'sun' | 'sand' | 'snow'

export interface SpeedField {
  weather: Weather
  electricTerrain: boolean
  trickRoom: boolean
  /** Tailwind de cada lado: [seu lado, oponente]. */
  tailwind: [boolean, boolean]
}

export interface SpeedSet {
  pokemon: string
  sp: number
  nature: NatureEffect
  stage: number
  /** Habilidade escolhida entre as do Pokémon (só importa se mexer na Speed). */
  ability: string | null
  /** Unburden sem item, ou Quick Feet com algum status (paralisia já ativa o Quick Feet sozinha). */
  abilityActive: boolean
  paralyzed: boolean
  ironBall: boolean
}

type AbilityRule =
  | { kind: 'weather'; weather: Weather; mult: number }
  | { kind: 'terrain'; mult: number }
  | { kind: 'toggle'; mult: number }
  | { kind: 'hint' }

/** Habilidades que mudam a Speed. Clima e terreno vêm do campo; as demais têm um interruptor no Pokémon. */
export const SPEED_ABILITIES: Record<string, AbilityRule> = {
  'swift-swim': { kind: 'weather', weather: 'rain', mult: 2 },
  chlorophyll: { kind: 'weather', weather: 'sun', mult: 2 },
  'sand-rush': { kind: 'weather', weather: 'sand', mult: 2 },
  'slush-rush': { kind: 'weather', weather: 'snow', mult: 2 },
  'surge-surfer': { kind: 'terrain', mult: 2 },
  unburden: { kind: 'toggle', mult: 2 },
  'quick-feet': { kind: 'toggle', mult: 1.5 },
  // Speed Boost não tem multiplicador: soma +1 estágio por turno, então vira só uma dica na tela.
  'speed-boost': { kind: 'hint' },
}

export const isSpeedAbility = (ability: string) => ability in SPEED_ABILITIES

/** Speed no nível 50 com IV 31: cada Stat Point soma 1 ponto antes da natureza. */
export function championsSpeed(base: number, sp: number, nature: NatureEffect): number {
  const raw = Math.floor(((2 * base + 31) * 50) / 100) + 5 + sp
  const mult = nature === 'plus' ? 1.1 : nature === 'minus' ? 0.9 : 1
  return Math.floor(raw * mult)
}

/** +1 = ×1.5, +2 = ×2 ... -1 = ×2/3, -2 = ×0.5 ... */
export function stageMultiplier(stage: number): number {
  return stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage)
}

/** Encadeia modificadores como o jogo (base 4096) e aplica arredondando 0.5 para baixo. */
function applyChain(value: number, mults: number[]): number {
  const chained = mults.reduce((acc, m) => (acc * Math.round(m * 4096) + 2048) >> 12, 4096)
  return Math.floor((value * chained + 2047) / 4096)
}

export type SpeedStepKind = 'stage' | 'ability' | 'ironBall' | 'tailwind' | 'paralysis'

export interface SpeedStep {
  kind: SpeedStepKind
  mult: number
}

export interface SpeedResult {
  /** Speed do atributo (base + SP + natureza). */
  stat: number
  final: number
  /** Modificadores aplicados, na ordem do cálculo. */
  steps: SpeedStep[]
}

/** O multiplicador da habilidade, se ela estiver ativa nesse campo. */
export function abilityMultiplier(set: SpeedSet, field: SpeedField): number | null {
  const rule = set.ability ? SPEED_ABILITIES[set.ability] : undefined
  if (!rule || rule.kind === 'hint') return null
  if (rule.kind === 'weather') return field.weather === rule.weather ? rule.mult : null
  if (rule.kind === 'terrain') return field.electricTerrain ? rule.mult : null
  if (set.ability === 'quick-feet') return set.abilityActive || set.paralyzed ? rule.mult : null
  return set.abilityActive ? rule.mult : null
}

export function finalSpeed(base: number, set: SpeedSet, field: SpeedField, tailwind: boolean): SpeedResult {
  const stat = championsSpeed(base, set.sp, set.nature)
  const steps: SpeedStep[] = []
  let value = stat

  if (set.stage !== 0) {
    const mult = stageMultiplier(set.stage)
    value = Math.floor(value * mult)
    steps.push({ kind: 'stage', mult })
  }

  const chain: SpeedStep[] = []
  const ability = abilityMultiplier(set, field)
  if (ability) chain.push({ kind: 'ability', mult: ability })
  if (set.ironBall) chain.push({ kind: 'ironBall', mult: 0.5 })
  if (tailwind) chain.push({ kind: 'tailwind', mult: 2 })
  if (chain.length) {
    value = applyChain(
      value,
      chain.map((s) => s.mult),
    )
    steps.push(...chain)
  }

  // Quick Feet ignora a queda de Speed da paralisia.
  if (set.paralyzed && set.ability !== 'quick-feet') {
    value = Math.floor(value / 2)
    steps.push({ kind: 'paralysis', mult: 0.5 })
  }

  return { stat, final: value, steps }
}

export interface OrderEntry<T> {
  item: T
  speed: number
  /** Posição na ordem de ação (1 = age primeiro); empatados dividem a mesma posição. */
  position: number
  tied: boolean
}

/** Ordem de ação: o mais rápido primeiro, ou o mais lento sob Trick Room. Empates são decididos no sorteio. */
export function turnOrder<T>(entries: { item: T; speed: number }[], trickRoom: boolean): OrderEntry<T>[] {
  const sorted = [...entries].sort((a, b) => (trickRoom ? a.speed - b.speed : b.speed - a.speed))
  return sorted.map((e, i) => {
    const position = sorted.findIndex((o) => o.speed === e.speed) + 1
    return { ...e, position, tied: sorted.some((o, j) => j !== i && o.speed === e.speed) }
  })
}
