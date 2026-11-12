// Regras do minijogo "Quem é esse Pokémon?": conferência do palpite e sorteio.

import { normalizeQuery } from './pokeapi'

export interface GameSpecies {
  /** Número da espécie na Pokédex nacional. */
  id: number
  name: string
  generation: number
  /** Id da forma padrão (arte, grito). */
  pokemonId: number
  types: string[]
}

/** Distância de edição (inserir, apagar ou trocar uma letra). */
export function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = row
  }
  return prev[b.length]
}

/** Erros de digitação aceitos: nenhum em nomes curtos (Mew, Muk), 1 a partir de 5 letras, 2 a partir de 9. */
function tolerance(length: number): number {
  return length >= 9 ? 2 : length >= 5 ? 1 : 0
}

/**
 * O palpite vale se for o nome (sem acento, espaço ou pontuação: "mr mime", "farfetchd") ou um erro de digitação dele.
 * Um palpite que é exatamente outro Pokémon nunca vale, mesmo que fique perto (ex.: "mew" para Mewtwo).
 */
export function isCorrectGuess(guess: string, answer: string, allNames: ReadonlySet<string>): boolean {
  const g = normalizeQuery(guess)
  const a = normalizeQuery(answer)
  if (!g) return false
  if (g === a) return true
  if (allNames.has(g)) return false
  return editDistance(g, a) <= tolerance(a.length)
}

/** Sorteia uma espécie do grupo, evitando as que saíram há pouco (quando o grupo permite). */
export function pickSpecies(pool: GameSpecies[], recent: number[], random = Math.random): GameSpecies | null {
  if (!pool.length) return null
  const fresh = pool.filter((s) => !recent.includes(s.id))
  const from = fresh.length ? fresh : pool
  return from[Math.floor(random() * from.length)]
}

/** Dica da última fase: primeira letra e o tamanho do nome ("P _ _ _ _ _ _"). */
export function nameMask(name: string): string {
  return [...name.replaceAll('-', ' ')].map((c, i) => (i === 0 ? c.toUpperCase() : c === ' ' ? ' ' : '_')).join(' ')
}
