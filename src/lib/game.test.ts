import { describe, expect, it } from 'vitest'
import { editDistance, isCorrectGuess, nameMask, pickSpecies, type GameSpecies } from './game'

const NAMES = new Set(['mew', 'mewtwo', 'mrmime', 'charizard', 'charmeleon', 'muk', 'farfetchd', 'porygon', 'porygon2', 'nidoranf', 'nidoranm'])

describe('editDistance', () => {
  it('conta inserções, remoções e trocas', () => {
    expect(editDistance('charizard', 'charizard')).toBe(0)
    expect(editDistance('charizad', 'charizard')).toBe(1)
    expect(editDistance('charizrad', 'charizard')).toBe(2)
    expect(editDistance('', 'abc')).toBe(3)
  })
})

describe('isCorrectGuess', () => {
  it('ignora maiúsculas, espaços e pontuação', () => {
    expect(isCorrectGuess('Mr. Mime', 'mr-mime', NAMES)).toBe(true)
    expect(isCorrectGuess("farfetch'd", 'farfetchd', NAMES)).toBe(true)
    expect(isCorrectGuess('  CHARIZARD ', 'charizard', NAMES)).toBe(true)
  })

  it('aceita pequenos erros de digitação em nomes longos', () => {
    expect(isCorrectGuess('charizad', 'charizard', NAMES)).toBe(true)
    expect(isCorrectGuess('chairzard', 'charizard', NAMES)).toBe(true)
    expect(isCorrectGuess('chrizrad', 'charizard', NAMES)).toBe(false)
    expect(isCorrectGuess('chzd', 'charizard', NAMES)).toBe(false)
  })

  it('exige o nome exato em nomes curtos', () => {
    expect(isCorrectGuess('muk', 'muk', NAMES)).toBe(true)
    expect(isCorrectGuess('mak', 'muk', NAMES)).toBe(false)
  })

  it('não aceita outro Pokémon que esteja perto', () => {
    expect(isCorrectGuess('porygon', 'porygon2', NAMES)).toBe(false)
    expect(isCorrectGuess('nidoran m', 'nidoran-f', NAMES)).toBe(false)
    expect(isCorrectGuess('mew', 'mewtwo', NAMES)).toBe(false)
  })

  it('palpite vazio nunca vale', () => {
    expect(isCorrectGuess('  ', 'mew', NAMES)).toBe(false)
  })
})

describe('pickSpecies', () => {
  const pool = [1, 2, 3].map((id) => ({ id, name: `p${id}`, generation: 1, pokemonId: id, types: [] }) as GameSpecies)

  it('evita os recentes enquanto houver outros', () => {
    expect(pickSpecies(pool, [1, 2], () => 0)?.id).toBe(3)
  })

  it('volta a usar todos quando todos são recentes', () => {
    expect(pickSpecies(pool, [1, 2, 3], () => 0.99)?.id).toBe(3)
  })

  it('retorna null com o grupo vazio', () => {
    expect(pickSpecies([], [])).toBeNull()
  })
})

describe('nameMask', () => {
  it('mostra só a primeira letra e mantém os espaços', () => {
    expect(nameMask('pikachu')).toBe('P _ _ _ _ _ _')
    expect(nameMask('mr-mime')).toBe('M _   _ _ _ _')
  })
})
