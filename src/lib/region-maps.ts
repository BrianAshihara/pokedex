import { alola } from '../data/maps/alola'
import { galar } from '../data/maps/galar'
import { hoenn } from '../data/maps/hoenn'
import { johto } from '../data/maps/johto'
import { kalos } from '../data/maps/kalos'
import { kanto } from '../data/maps/kanto'
import { orre } from '../data/maps/orre'
import { sevii } from '../data/maps/sevii'
import { sinnoh } from '../data/maps/sinnoh'
import { unova } from '../data/maps/unova'
import { mapMarkers } from './illustrated-map'
import type { IllustratedMap } from './illustrated-map'

export const REGION_MAPS: Record<string, IllustratedMap> = { kanto, sevii, johto, hoenn, sinnoh, unova, kalos, alola, galar, orre }

const SLUGS_BY_MAP = Object.entries(REGION_MAPS).map(([mapId, map]) => ({ mapId, map, slugs: new Set(mapMarkers(map).map((m) => m.slug)) }))

/** Onde um local da PokeAPI fica no mapa. Andares e prédios caem no local que os contém. */
export function findOnMap(location: string | undefined): { mapId: string; slug: string } | null {
  if (!location) return null
  for (const { mapId, map, slugs } of SLUGS_BY_MAP) {
    const slug = map.aliases[location] ?? location
    if (slugs.has(slug)) return { mapId, slug }
  }
  return null
}
