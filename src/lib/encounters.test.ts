import { describe, expect, it } from 'vitest'
import { pt } from '../i18n/pt'
import { addPreEvolutions, conditionLabel, curatedEncounters, gameLabel, groupEncounters } from './encounters'
import type { RawEncounterArea } from './types'

const resource = (name: string) => ({ name, url: '' })

function area(slug: string, versions: string[], details: [method: string, min: number, max: number, chance: number, conditions?: string[]][]): RawEncounterArea {
  return {
    location_area: resource(slug),
    version_details: versions.map((version) => ({
      version: resource(version),
      encounter_details: details.map(([method, min_level, max_level, chance, conditions = []]) => ({
        min_level,
        max_level,
        chance,
        method: resource(method),
        condition_values: conditions.map(resource),
      })),
    })),
  }
}

describe('groupEncounters', () => {
  it('soma os slots e usa a faixa total de níveis', () => {
    const [game] = groupEncounters([area('route-1-area', ['red'], [['walk', 3, 3, 20], ['walk', 5, 7, 10]])], new Map())
    expect(game.rows).toEqual([{ areaName: 'Route 1', method: 'walk', minLevel: 3, maxLevel: 7, chance: 30, conditions: [] }])
  })

  it('separa condições relevantes e ignora estados padrão', () => {
    const [game] = groupEncounters([area('a', ['gold'], [['walk', 2, 2, 10, ['time-day', 'swarm-no']], ['walk', 2, 2, 10, ['time-night', 'swarm-no']]])], new Map())
    expect(game.rows.map((r) => r.conditions)).toEqual([['time-day'], ['time-night']])
  })

  it('não mostra chance em encontros fixos nem nível em trocas', () => {
    const [game] = groupEncounters([area('a', ['red'], [['static', 70, 70, 100], ['npc-trade', 2, 100, 100]])], new Map())
    expect(game.rows.find((r) => r.method === 'static')).toMatchObject({ chance: null, minLevel: 70 })
    expect(game.rows.find((r) => r.method === 'npc-trade')).toMatchObject({ chance: null, minLevel: null })
  })

  it('junta jogos vizinhos idênticos e mantém a ordem de lançamento', () => {
    const games = groupEncounters([area('a', ['sword', 'blue', 'red'], [['walk', 2, 2, 10]])], new Map([['a', 'Área A']]))
    expect(games.map((g) => g.versions)).toEqual([['red', 'blue', 'sword']])
    expect(games[0].rows[0].areaName).toBe('Área A')
  })

  it('não junta jogos com encontros diferentes', () => {
    const games = groupEncounters([area('a', ['red'], [['walk', 2, 2, 10]]), area('b', ['blue'], [['walk', 2, 2, 10]])], new Map())
    expect(games.map((g) => g.id)).toEqual(['red', 'blue'])
  })
})

describe('gameLabel', () => {
  it('lista os jogos e simplifica DLCs', () => {
    expect(gameLabel(['red', 'blue'])).toBe('Red / Blue')
    expect(gameLabel(['the-teal-mask-scarlet', 'the-teal-mask-violet'])).toBe('The Teal Mask')
    expect(gameLabel(['the-teal-mask-scarlet'])).toBe('The Teal Mask (Scarlet)')
  })
})

describe('curatedEncounters', () => {
  it('cobre os iniciais da geração 9 e agrupa as versões', () => {
    const [game] = curatedEncounters('sprigatito')
    expect(game.versions).toEqual(['scarlet', 'violet'])
    expect(game.rows[0]).toMatchObject({ areaName: 'Cabo Poco', method: 'gift' })
  })

  it('mantém separados os jogos com locais diferentes', () => {
    expect(curatedEncounters('phione').map((g) => g.versions.at(-1))).toContain('legends-arceus')
    expect(curatedEncounters('koraidon')[0].rows).toHaveLength(2)
  })

  it('devolve vazio para espécies fora da lista', () => {
    expect(curatedEncounters('pikachu')).toEqual([])
  })
})

describe('addPreEvolutions', () => {
  const row = { areaName: 'A', method: 'gift', minLevel: 5, maxLevel: 5, chance: null, conditions: [] }
  const game = (versions: string[], areaName = 'A') => ({ id: versions[0], versions, rows: [{ ...row, areaName }] })

  it('completa só os jogos em que o Pokémon não aparece', () => {
    const games = addPreEvolutions([game(['sword'], 'Própria')], [{ species: 'bulbasaur', games: [game(['red', 'blue']), game(['sword'], 'Ignorada')] }])
    expect(games.map((g) => g.versions)).toEqual([['red', 'blue'], ['sword']])
    expect(games[0].rows[0].via).toBe('bulbasaur')
    expect(games[1].rows).toEqual([expect.objectContaining({ areaName: 'Própria' })])
    expect(games[1].rows[0].via).toBeUndefined()
  })

  it('acumula pré-evoluções no mesmo jogo, da mais próxima para a mais distante', () => {
    const [only] = addPreEvolutions([], [{ species: 'ivysaur', games: [game(['x'], 'I')] }, { species: 'bulbasaur', games: [game(['x'], 'B')] }])
    expect(only.rows.map((r) => r.via)).toEqual(['ivysaur', 'bulbasaur'])
  })
})

describe('conditionLabel', () => {
  it('traduz condições comuns e por padrão', () => {
    expect(conditionLabel('time-night', pt.locations)).toBe('À noite')
    expect(conditionLabel('slot2-ruby', pt.locations)).toBe('Ruby no slot 2')
    expect(conditionLabel('max-den-rating-3-star', pt.locations)).toBe('Raid de 3 estrelas')
  })
})
