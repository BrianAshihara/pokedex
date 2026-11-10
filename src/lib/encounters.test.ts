import { describe, expect, it } from 'vitest'
import { pt } from '../i18n/pt'
import { addPreEvolutions, conditionLabel, curatedEncounters, encounterKind, gameLabel, groupEncounters, groupPlaces, rarityOf } from './encounters'
import { gridRuns, layoutTownLabels } from './illustrated-map'
import { findOnMap } from './region-maps'
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
    const games = groupEncounters([area('a', ['sword', 'blue', 'red'], [['walk', 2, 2, 10]])], new Map([['a', { name: 'Área A' }]]))
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

describe('encounterKind', () => {
  it('distingue grama de interiores pelo nome do local', () => {
    expect(encounterKind('walk', 'Route 1')).toBe('grass')
    expect(encounterKind('walk', 'Mt. Moon')).toBe('cave')
    expect(encounterKind('walk', 'Slowpoke Well')).toBe('cave')
    expect(encounterKind('walk', 'Viridian Forest')).toBe('grass')
  })

  it('classifica pesca, água e presentes', () => {
    expect(encounterKind('super-rod', 'Route 1')).toBe('fishing')
    expect(encounterKind('surf', 'Route 1')).toBe('water')
    expect(encounterKind('roaming-water', null)).toBe('roaming')
    expect(encounterKind('gift', 'Cabo Poco')).toBe('gift')
  })
})

describe('rarityOf', () => {
  it('usa faixas de chance e trata presentes como garantidos', () => {
    expect(rarityOf({ method: 'walk', chance: 30 })).toBe('common')
    expect(rarityOf({ method: 'walk', chance: 10 })).toBe('uncommon')
    expect(rarityOf({ method: 'walk', chance: 4 })).toBe('rare')
    expect(rarityOf({ method: 'walk', chance: 1 })).toBe('veryRare')
    expect(rarityOf({ method: 'gift', chance: null })).toBe('guaranteed')
    expect(rarityOf({ method: 'event', chance: null })).toBeNull()
  })
})

describe('groupPlaces', () => {
  const row = (areaName: string, chance: number | null, location?: string, place?: string, method = 'walk') => ({ areaName, location, place, method, minLevel: 1, maxLevel: 1, chance, conditions: [] })

  it('junta andares do mesmo local e ordena do mais fácil ao mais difícil', () => {
    const places = groupPlaces([row('Route 1', 5, 'r1', 'Route 1'), row('Cave (1F)', 10, 'c', 'Cave'), row('Cave (2F)', 40, 'c', 'Cave')])
    expect(places.map((p) => p.key)).toEqual(['c', 'r1'])
    expect(places[0].rows).toEqual([expect.objectContaining({ chance: 40, subAreas: ['1F', '2F'] })])
  })

  it('mantém separados métodos e condições diferentes no mesmo local', () => {
    const places = groupPlaces([row('Cave', 40, 'c', 'Cave'), row('Cave', 10, 'c', 'Cave', 'surf')])
    expect(places[0].rows.map((r) => r.method)).toEqual(['walk', 'surf'])
    expect(places[0].rows[0].subAreas).toEqual([])
  })

  it('coloca encontros garantidos primeiro', () => {
    expect(groupPlaces([row('A', 90), row('B', null, undefined, undefined, 'gift')])[0].name).toBe('B')
  })
})

describe('gridRuns', () => {
  it('junta as células vizinhas de cada linha', () => {
    expect(gridRuns(40, 20, 10, (x, y) => y < 10 && x > 10)).toEqual([{ x: 10, y: 0, width: 30 }])
  })
})

describe('layoutTownLabels', () => {
  const town = (slug: string, x: number) => ({ slug, name: 'Goldenrod City', kind: 'town' as const, x, y: 100, r: 30 })

  it('sobe o nome quando a vizinha já ocupa o espaço de baixo', () => {
    expect(layoutTownLabels([town('a', 100), town('b', 150)], null).map((l) => l.y)).toEqual([146, 68])
  })

  it('não coloca nomes atrás do marcador', () => {
    expect(layoutTownLabels([town('a', 100)], { ...town('p', 100), y: 150 }).map((l) => l.y)).toEqual([68])
  })
})

describe('findOnMap', () => {
  it('acha locais direto e por apelido', () => {
    expect(findOnMap('pallet-town')).toEqual({ mapId: 'kanto', slug: 'pallet-town' })
    expect(findOnMap('kanto-victory-road-2')).toEqual({ mapId: 'kanto', slug: 'kanto-victory-road-1' })
    expect(findOnMap('galar-route-1')).toEqual({ mapId: 'galar', slug: 'galar-route-1' })
  })


  it('devolve null fora dos mapas', () => {
    expect(findOnMap('roaming-kanto')).toBeNull()
    expect(findOnMap(undefined)).toBeNull()
  })
})

describe('conditionLabel', () => {
  it('traduz condições comuns e por padrão', () => {
    expect(conditionLabel('time-night', pt.locations)).toBe('À noite')
    expect(conditionLabel('slot2-ruby', pt.locations)).toBe('Ruby no slot 2')
    expect(conditionLabel('max-den-rating-3-star', pt.locations)).toBe('Raid de 3 estrelas')
  })
})
