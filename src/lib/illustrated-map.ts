import { displayName } from './format'

export type Point = [x: number, y: number]
export type SpotIcon = 'cave' | 'forest' | 'tower' | 'factory' | 'mansion' | 'ship' | 'safari' | 'ice' | 'league'

interface Road {
  name?: string
  points: Point[]
  sea?: boolean
}
interface Town {
  name?: string
  x: number
  y: number
  size: number
}
interface Spot {
  name?: string
  x: number
  y: number
  icon: SpotIcon
}

/** Mapa autoral: as chaves de rotas, cidades e pontos são os identificadores de local da PokeAPI. */
export interface IllustratedMap {
  name: string
  width: number
  height: number
  coast: Point[]
  islands: Point[][]
  lakes: Point[][]
  forests: { x: number; y: number; rx: number; ry: number }[]
  mountains: { x: number; y: number; size: number }[]
  roads: Record<string, Road>
  towns: Record<string, Town>
  spots: Record<string, Spot>
  /** Locais da PokeAPI que ficam dentro de outro já desenhado. */
  aliases: Record<string, string>
}

export interface MapMarker {
  slug: string
  name: string
  kind: 'road' | 'sea' | 'town' | 'spot'
  x: number
  y: number
  /** Traçado das rotas. */
  d?: string
  /** Raio da área clicável de cidades e pontos. */
  r: number
}

// Atalhos para escrever os mapas: coordenadas em sequência, sem repetir a estrutura.
function chunk(values: number[], size: number): number[][] {
  return Array.from({ length: Math.floor(values.length / size) }, (_, i) => values.slice(i * size, i * size + size))
}
export const poly = (...values: number[]) => chunk(values, 2) as Point[]
export const path = (...values: number[]): Road => ({ points: poly(...values) })
export const sea = (...values: number[]): Road => ({ points: poly(...values), sea: true })
export const town = (x: number, y: number, size = 1): Town => ({ x, y, size })
export const spot = (x: number, y: number, icon: SpotIcon, name?: string): Spot => ({ x, y, icon, name })
export const peaks = (...values: number[]) => chunk(values, 3).map(([x, y, size]) => ({ x, y, size }))
export const woods = (...values: number[]) => chunk(values, 4).map(([x, y, rx, ry]) => ({ x, y, rx, ry }))

const REGION_PREFIX = /^(kanto|johto|hoenn|sinnoh|unova|kalos|alola|galar)-(sea-)?/
const placeName = (slug: string, name?: string) => name ?? displayName(slug.replace(REGION_PREFIX, ''))

/** Traçado reto entre os pontos. */
export function linePath(points: Point[]): string {
  return points.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('')
}

export function insidePolygon(x: number, y: number, polygon: Point[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export interface GridRun {
  x: number
  y: number
  width: number
}

/** Transforma uma área em blocos de grade, juntando as células vizinhas de cada linha. */
export function gridRuns(width: number, height: number, cell: number, inside: (x: number, y: number) => boolean): GridRun[] {
  const runs: GridRun[] = []
  for (let y = 0; y < height; y += cell) {
    let start: number | null = null
    for (let x = 0; x <= width; x += cell) {
      const filled = x < width && inside(x + cell / 2, y + cell / 2)
      if (filled && start === null) start = x
      if (!filled && start !== null) {
        runs.push({ x: start, y, width: x - start })
        start = null
      }
    }
  }
  return runs
}

interface Box {
  left: number
  right: number
  top: number
  bottom: number
}

const overlaps = (a: Box, b: Box) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom

/** Escolhe onde cada nome de cidade cabe: abaixo, acima ou, sem espaço, fica só o quadrado. */
export function layoutTownLabels(towns: MapMarker[], pin: MapMarker | null): { marker: MapMarker; y: number }[] {
  const taken: Box[] = pin ? [{ left: pin.x - 120, right: pin.x + 120, top: pin.y - 60, bottom: pin.y + 44 }] : []
  const placed: { marker: MapMarker; y: number }[] = []
  for (const marker of [...towns].sort((a, b) => b.r - a.r)) {
    const half = marker.name.length * 5.6
    for (const y of [marker.y + 46, marker.y - 32]) {
      const box = { left: marker.x - half, right: marker.x + half, top: y - 18, bottom: y + 6 }
      if (taken.some((other) => overlaps(box, other))) continue
      taken.push(box)
      placed.push({ marker, y })
      break
    }
  }
  return placed
}

function middleOf(points: Point[]): Point {
  const mid = (points.length - 1) / 2
  const [a, b] = [points[Math.floor(mid)], points[Math.ceil(mid)]]
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
}

/** Todos os locais clicáveis do mapa, com rotas por baixo de cidades e pontos. */
export function mapMarkers(map: IllustratedMap): MapMarker[] {
  const roads = Object.entries(map.roads).map(([slug, road]): MapMarker => {
    const [x, y] = middleOf(road.points)
    return { slug, name: placeName(slug, road.name), kind: road.sea ? 'sea' : 'road', x, y, d: linePath(road.points), r: 0 }
  })
  const towns = Object.entries(map.towns).map(([slug, t]): MapMarker => ({ slug, name: placeName(slug, t.name), kind: 'town', x: t.x, y: t.y, r: 34 * t.size }))
  const spots = Object.entries(map.spots).map(([slug, s]): MapMarker => ({ slug, name: placeName(slug, s.name), kind: 'spot', x: s.x, y: s.y, r: 24 }))
  return [...roads, ...towns, ...spots]
}
