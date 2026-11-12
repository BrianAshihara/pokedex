import { queryOptions } from '@tanstack/react-query'
import * as api from './pokeapi'
import type { Learnset, Pokemon, Species } from './types'

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

export const moveQuery = (slug: string) => queryOptions({ queryKey: ['move', slug], queryFn: () => api.getMove(slug) })

export const moveVersionGroupsQuery = (slug: string) =>
  queryOptions({ queryKey: ['move-version-groups', slug], queryFn: () => api.getMoveVersionGroups(slug) })

export const moveLearnersQuery = (slug: string, versionGroup: string) =>
  queryOptions({ queryKey: ['move-learners', slug, versionGroup], queryFn: () => api.getMoveLearners(slug, versionGroup) })

export const allMovesQuery = () => queryOptions({ queryKey: ['all-moves'], queryFn: api.getAllMoves })

export const allPokemonQuery = () => queryOptions({ queryKey: ['all-pokemon'], queryFn: api.getAllPokemon })

export const encountersQuery = (pokemonName: string) =>
  queryOptions({ queryKey: ['encounters', pokemonName], queryFn: () => api.getEncounters(pokemonName) })

export const preEvolutionEncountersQuery = (species: Species | null) =>
  queryOptions({
    queryKey: ['pre-evolution-encounters', species?.name],
    queryFn: () => api.getPreEvolutionEncounters(species!),
    enabled: !!species?.evolves_from_species,
  })

export const allItemsQuery = () => queryOptions({ queryKey: ['all-items'], queryFn: api.getAllItems })

export const itemQuery = (slug: string) => queryOptions({ queryKey: ['item', slug], queryFn: () => api.getItem(slug) })

export const allAbilitiesQuery = () => queryOptions({ queryKey: ['all-abilities'], queryFn: api.getAllAbilities })

export const abilityPageQuery = (slug: string) => queryOptions({ queryKey: ['ability-page', slug], queryFn: () => api.getAbilityPage(slug) })

export const gameSpeciesQuery = () => queryOptions({ queryKey: ['game-species'], queryFn: api.getGameSpecies })
