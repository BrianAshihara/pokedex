import { describe, expect, it } from 'vitest'
import { buildSearchIndex, searchPokemon } from './search'
import type { PokemonListItem } from './types'

const mon = (id: number, name: string, speciesId = id, isDefault = true) =>
  ({ id, name, speciesId, isDefault, generation: 1, types: [], stats: [], total: 0, sprite: '', champions: false }) as PokemonListItem

const index = buildSearchIndex([
  mon(4, 'charmander'),
  mon(5, 'charmeleon'),
  mon(6, 'charizard'),
  mon(10034, 'charizard-mega-x', 6, false),
  mon(25, 'pikachu'),
  mon(122, 'mr-mime'),
  mon(250, 'ho-oh'),
  mon(669, 'flabebe'),
])
const names = (query: string) => searchPokemon(index, query).map((p) => p.name)

describe('searchPokemon', () => {
  it('prioriza o começo do nome e a forma padrão', () => {
    expect(names('char')).toEqual(['charmander', 'charmeleon', 'charizard', 'charizard-mega-x'])
  })

  it('acha palavras no meio do nome', () => {
    expect(names('mega')).toEqual(['charizard-mega-x'])
    expect(names('mime')).toEqual(['mr-mime'])
  })

  it('ignora espaços, pontuação e acentos', () => {
    expect(names('Mr. Mime')).toEqual(['mr-mime'])
    expect(names('ho oh')).toEqual(['ho-oh'])
    expect(names('flabébé')).toEqual(['flabebe'])
  })

  it('aceita pequenos erros com as letras na ordem', () => {
    expect(names('chrzd')).toEqual(['charizard', 'charizard-mega-x'])
  })

  it('busca por número, com o exato primeiro', () => {
    expect(names('25')).toEqual(['pikachu', 'ho-oh'])
    expect(names('6')).toEqual(['charizard', 'flabebe'])
  })

  it('não sugere nada para busca vazia', () => {
    expect(names('  ')).toEqual([])
  })
})
