import { describe, expect, it } from 'vitest'
import { baseStats, calcAll, calcStat, natureLabel, natureMultiplier, statRangeLv100 } from './stats'
import type { Pokemon } from './types'

describe('calcStat', () => {
  it('calcula HP com a fórmula dos jogos', () => {
    // Garchomp: HP base 108, IV 31, 0 EVs, nível 100
    expect(calcStat('HP', 108, 31, 0, 100)).toBe(357)
    expect(calcStat('HP', 108, 31, 252, 100)).toBe(420)
  })

  it('mantém HP 1 para Shedinja', () => {
    expect(calcStat('HP', 1, 31, 252, 100)).toBe(1)
  })

  it('aplica a natureza nos demais atributos', () => {
    // Garchomp: Ataque base 130, IV 31, 252 EVs, nível 100
    expect(calcStat('Attack', 130, 31, 252, 100, 'Hardy')).toBe(359)
    expect(calcStat('Attack', 130, 31, 252, 100, 'Adamant')).toBe(394)
    expect(calcStat('Attack', 130, 31, 252, 100, 'Modest')).toBe(323)
  })

  it('arredonda para baixo no nível 50', () => {
    expect(calcStat('Speed', 102, 31, 252, 50, 'Jolly')).toBe(169)
  })
})

describe('naturezas', () => {
  it('retorna o multiplicador em porcentagem inteira', () => {
    expect(natureMultiplier('Adamant', 'Attack')).toBe(110)
    expect(natureMultiplier('Adamant', 'Sp. Atk')).toBe(90)
    expect(natureMultiplier('Adamant', 'Speed')).toBe(100)
  })

  it('gera o rótulo da natureza', () => {
    expect(natureLabel('Hardy')).toBe('Hardy (neutra)')
    expect(natureLabel('Timid')).toBe('Timid (+Speed, -Attack)')
  })
})

describe('statRangeLv100', () => {
  it('calcula mínimo e máximo no nível 100', () => {
    expect(statRangeLv100('Attack', 130)).toEqual([238, 394])
    expect(statRangeLv100('HP', 108)).toEqual([326, 420])
  })
})

describe('baseStats e calcAll', () => {
  const pokemon = {
    stats: [
      { base_stat: 108, stat: { name: 'hp', url: '' } },
      { base_stat: 130, stat: { name: 'attack', url: '' } },
      { base_stat: 95, stat: { name: 'defense', url: '' } },
      { base_stat: 80, stat: { name: 'special-attack', url: '' } },
      { base_stat: 85, stat: { name: 'special-defense', url: '' } },
      { base_stat: 102, stat: { name: 'speed', url: '' } },
    ],
  } as Pokemon

  it('converte os nomes da API', () => {
    expect(baseStats(pokemon)).toEqual({ HP: 108, Attack: 130, Defense: 95, 'Sp. Atk': 80, 'Sp. Def': 85, Speed: 102 })
  })

  it('usa IV 31 e 0 EVs por padrão', () => {
    const result = calcAll(baseStats(pokemon), {}, {}, 50)
    expect(result).toEqual({ HP: 183, Attack: 150, Defense: 115, 'Sp. Atk': 100, 'Sp. Def': 105, Speed: 122 })
  })
})
