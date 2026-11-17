import { describe, expect, it } from 'vitest'
import { abilityMultiplier, championsSpeed, finalSpeed, stageMultiplier, turnOrder, type SpeedField, type SpeedSet } from './speed'

const FIELD: SpeedField = { weather: 'none', electricTerrain: false, trickRoom: false, tailwind: [false, false] }
const set = (over: Partial<SpeedSet> = {}): SpeedSet => ({
  pokemon: 'x',
  sp: 32,
  nature: 'plus',
  stage: 0,
  ability: null,
  abilityActive: false,
  paralyzed: false,
  ironBall: false,
  ...over,
})

describe('championsSpeed', () => {
  it('bate com as tabelas de Speed do Champions (Dragapult, base 142)', () => {
    expect(championsSpeed(142, 32, 'plus')).toBe(213)
    expect(championsSpeed(142, 32, 'neutral')).toBe(194)
    expect(championsSpeed(142, 0, 'neutral')).toBe(162)
    expect(championsSpeed(142, 0, 'minus')).toBe(145)
  })

  it('equivale a 252 EVs no nível 50 (Garchomp Jolly = 169)', () => {
    expect(championsSpeed(102, 32, 'plus')).toBe(169)
  })
})

describe('stageMultiplier', () => {
  it('segue a tabela de estágios', () => {
    expect(stageMultiplier(0)).toBe(1)
    expect(stageMultiplier(1)).toBe(1.5)
    expect(stageMultiplier(6)).toBe(4)
    expect(stageMultiplier(-1)).toBeCloseTo(2 / 3)
    expect(stageMultiplier(-6)).toBe(0.25)
  })
})

describe('finalSpeed', () => {
  it('aplica estágio com arredondamento para baixo (+1 Garchomp Jolly = 253)', () => {
    expect(finalSpeed(102, set({ stage: 1 }), FIELD, false).final).toBe(253)
  })

  it('dobra com Tailwind (Dragapult neutro = 388, Jolly = 426)', () => {
    expect(finalSpeed(142, set({ nature: 'neutral' }), FIELD, true).final).toBe(388)
    expect(finalSpeed(142, set(), FIELD, true).final).toBe(426)
  })

  it('ativa habilidades de clima só com o clima certo', () => {
    const venusaur = set({ sp: 0, nature: 'neutral', ability: 'chlorophyll' })
    expect(finalSpeed(80, venusaur, FIELD, false).final).toBe(100)
    expect(finalSpeed(80, venusaur, { ...FIELD, weather: 'sun' }, false).final).toBe(200)
    expect(finalSpeed(80, venusaur, { ...FIELD, weather: 'rain' }, false).final).toBe(100)
  })

  it('Surge Surfer depende do Terreno elétrico', () => {
    const raichu = set({ ability: 'surge-surfer' })
    expect(abilityMultiplier(raichu, FIELD)).toBeNull()
    expect(abilityMultiplier(raichu, { ...FIELD, electricTerrain: true })).toBe(2)
  })

  it('Unburden precisa estar ativo', () => {
    expect(abilityMultiplier(set({ ability: 'unburden' }), FIELD)).toBeNull()
    expect(abilityMultiplier(set({ ability: 'unburden', abilityActive: true }), FIELD)).toBe(2)
  })

  it('encadeia modificadores: Iron Ball e Tailwind se anulam', () => {
    expect(finalSpeed(80, set({ sp: 0, nature: 'neutral', ironBall: true }), FIELD, true).final).toBe(100)
  })

  it('paralisia corta pela metade depois dos outros modificadores', () => {
    const r = finalSpeed(102, set({ paralyzed: true }), FIELD, false)
    expect(r.final).toBe(84)
    expect(r.steps.map((s) => s.kind)).toEqual(['paralysis'])
  })

  it('Quick Feet ignora a paralisia e ganha ×1.5', () => {
    const r = finalSpeed(80, set({ sp: 0, nature: 'neutral', ability: 'quick-feet', paralyzed: true }), FIELD, false)
    expect(r.final).toBe(150)
  })

  it('Speed Boost não muda a Speed sozinho', () => {
    expect(finalSpeed(80, set({ ability: 'speed-boost', abilityActive: true }), FIELD, false).steps).toEqual([])
  })
})

describe('turnOrder', () => {
  const entries = [
    { item: 'a', speed: 100 },
    { item: 'b', speed: 150 },
    { item: 'c', speed: 100 },
    { item: 'd', speed: 50 },
  ]

  it('ordena do mais rápido para o mais lento e marca empates', () => {
    const order = turnOrder(entries, false)
    expect(order.map((o) => o.item)).toEqual(['b', 'a', 'c', 'd'])
    expect(order.map((o) => o.position)).toEqual([1, 2, 2, 4])
    expect(order.map((o) => o.tied)).toEqual([false, true, true, false])
  })

  it('inverte sob Trick Room', () => {
    expect(turnOrder(entries, true).map((o) => o.item)).toEqual(['d', 'a', 'c', 'b'])
  })
})
