import { describe, expect, it } from 'vitest'
import { applyAbilityToMatchups, defaultVersionGroup, normalizeQuery, sanitizeLookupName, sortedVersionGroups, summarizeEvolutionMethods, versionGroupLabel } from './pokeapi'
import type { EvolutionDetail } from './types'

const detail = (fields: Partial<EvolutionDetail>) => fields as EvolutionDetail
const resource = (name: string) => ({ name, url: '' })

describe('busca tolerante', () => {
  it('normaliza nomes digitados', () => {
    expect(sanitizeLookupName(' Mr. Mime ')).toBe('mr-mime')
    expect(normalizeQuery('Mr. Mime')).toBe('mrmime')
    expect(normalizeQuery('Flabébé')).toBe('flabebe')
  })
})

describe('summarizeEvolutionMethods', () => {
  it('descreve evolução por nível', () => {
    expect(summarizeEvolutionMethods([detail({ trigger: resource('level-up'), min_level: 16 })])).toBe('Nv 16')
  })

  it('descreve amizade e horário', () => {
    expect(summarizeEvolutionMethods([detail({ trigger: resource('level-up'), min_happiness: 160, time_of_day: 'day' })])).toBe('Dia + Amizade')
  })

  it('descreve uso de item e troca', () => {
    expect(summarizeEvolutionMethods([detail({ trigger: resource('use-item'), item: resource('fire-stone') })])).toBe('Usar Fire Stone')
    expect(summarizeEvolutionMethods([detail({ trigger: resource('trade'), held_item: resource('metal-coat') })])).toBe('Troca + Metal Coat')
  })

  it('junta métodos alternativos sem repetir', () => {
    const level = detail({ trigger: resource('level-up'), min_level: 36 })
    const item = detail({ trigger: resource('use-item'), item: resource('ice-stone') })
    expect(summarizeEvolutionMethods([level, item, level])).toBe('Nv 36 / Usar Ice Stone')
  })
})

describe('jogos', () => {
  const learnset = {
    'scarlet-violet': [['tackle', 'level-up', 1] as [string, string, number]],
    'red-blue': [['tackle', 'level-up', 1] as [string, string, number]],
    'the-indigo-disk': [['surf', 'tutor', 0] as [string, string, number]],
  }

  it('ordena na ordem de lançamento', () => {
    expect(sortedVersionGroups(learnset)).toEqual(['red-blue', 'scarlet-violet', 'the-indigo-disk'])
  })

  it('escolhe o jogo mais recente com golpes por nível', () => {
    expect(defaultVersionGroup(learnset)).toBe('scarlet-violet')
    expect(defaultVersionGroup({})).toBeNull()
  })

  it('formata nomes de jogos desconhecidos', () => {
    expect(versionGroupLabel('sword-shield')).toBe('Sword / Shield')
    expect(versionGroupLabel('new-game')).toBe('New Game')
  })
})

describe('applyAbilityToMatchups', () => {
  // Aggron-Mega (Steel): fraco a Fighting/Ground 2×, imune a Poison.
  const steel = new Map([
    [2, ['fighting', 'ground']],
    [0.5, ['normal', 'flying']],
    [0, ['poison']],
  ])

  it('Filter reduz super efetivo para 1,5× e 3×', () => {
    const result = applyAbilityToMatchups(steel, 'filter')
    expect(result.get(1.5)).toEqual(['fighting', 'ground'])
    expect(result.has(2)).toBe(false)
    expect(result.get(0.5)).toEqual(['normal', 'flying'])
    expect(result.get(0)).toEqual(['poison'])
    expect(applyAbilityToMatchups(new Map([[4, ['ice']]]), 'solid-rock').get(3)).toEqual(['ice'])
  })

  it('ignora habilidades sem efeito na grade', () => {
    expect(applyAbilityToMatchups(steel, 'sturdy')).toBe(steel)
    expect(applyAbilityToMatchups(steel, null)).toBe(steel)
  })
})
