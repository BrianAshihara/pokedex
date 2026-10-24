import { normalizeQuery } from './pokeapi'
import type { PokemonListItem } from './types'

export interface SearchEntry {
  pokemon: PokemonListItem
  /** Nome sem acento, pontuação nem hífen: "mr-mime" → "mrmime". */
  key: string
  /** Cada parte do nome, para achar "mega" em "charizard-mega-x". */
  words: string[]
}

/** Prepara a lista uma vez; a busca roda a cada tecla sobre esse índice. */
export function buildSearchIndex(list: PokemonListItem[]): SearchEntry[] {
  return list.map((pokemon) => ({ pokemon, key: normalizeQuery(pokemon.name), words: pokemon.name.split('-').map(normalizeQuery) }))
}

/** Letras da busca aparecem no nome nessa ordem, com qualquer coisa entre elas ("chrzd" → charizard). */
function isSubsequence(query: string, text: string): boolean {
  let i = 0
  for (const char of text) if (char === query[i] && ++i === query.length) return true
  return false
}

/**
 * Sugestões para o campo de busca, das mais prováveis para as menos:
 * número (só formas padrão), começo do nome, começo de uma palavra, trecho do nome e, por fim, letras na ordem.
 * Formas padrão vêm antes das alternativas (Charizard antes de Charizard Mega X).
 */
export function searchPokemon(index: SearchEntry[], query: string, limit = 8): PokemonListItem[] {
  const q = normalizeQuery(query)
  if (!q) return []

  const ranked: [rank: number, entry: SearchEntry][] = []
  if (/^\d+$/.test(q)) {
    // Número é da espécie: as formas (Pikachu Rock Star, Belle…) só ocupariam as vagas.
    for (const entry of index) {
      if (!entry.pokemon.isDefault) continue
      const id = String(entry.pokemon.speciesId)
      if (id === q) ranked.push([0, entry])
      else if (id.startsWith(q)) ranked.push([1, entry])
    }
  } else {
    for (const entry of index) {
      if (entry.key.startsWith(q)) ranked.push([0, entry])
      else if (entry.words.some((w) => w.startsWith(q))) ranked.push([1, entry])
      else if (entry.key.includes(q)) ranked.push([2, entry])
      else if (q.length >= 3 && isSubsequence(q, entry.key)) ranked.push([3, entry])
    }
  }

  return ranked
    .sort(
      ([ra, a], [rb, b]) =>
        ra - rb ||
        Number(b.pokemon.isDefault) - Number(a.pokemon.isDefault) ||
        a.pokemon.speciesId - b.pokemon.speciesId ||
        a.pokemon.id - b.pokemon.id,
    )
    .slice(0, limit)
    .map(([, entry]) => entry.pokemon)
}
