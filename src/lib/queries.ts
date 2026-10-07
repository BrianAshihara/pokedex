import { queryOptions } from '@tanstack/react-query'
import * as api from './pokeapi'
import type { Learnset, Pokemon } from './types'

export const pokemonQuery = (ref: string) =>
  queryOptions({ queryKey: ['pokemon', ref.trim().toLowerCase()], queryFn: () => api.fetchPokemon(ref) })

export const speciesQuery = (ref: string | number) =>
  queryOptions({ queryKey: ['species', String(ref)], queryFn: () => api.fetchSpecies(ref) })

export const speciesCountQuery = () => queryOptions({ queryKey: ['species-count'], queryFn: api.getSpeciesCount })

export const pokemonNamesQuery = () => queryOptions({ queryKey: ['pokemon-names'], queryFn: api.fetchAllPokemonNames })

export const abilitiesQuery = (pokemon: Pokemon) =>
  queryOptions({ queryKey: ['abilities', pokemon.name], queryFn: () => api.getAbilities(pokemon.abilities) })

export const matchupsQuery = (pokemon: Pokemon) =>
  queryOptions({ queryKey: ['matchups', pokemon.name], queryFn: () => api.getTypeMatchups(pokemon.types) })

export const evolutionQuery = (speciesName: string) =>
  queryOptions({ queryKey: ['evolution', speciesName], queryFn: () => api.getEvolutionTree(speciesName) })

export const learnsetQuery = (pokemonName: string, learnset: Learnset, versionGroup: string) =>
  queryOptions({
    queryKey: ['learnset', pokemonName, versionGroup],
    queryFn: () => api.getLearnset(learnset, versionGroup),
  })
