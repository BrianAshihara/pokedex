// Achata o objeto `sprites` da PokeAPI (aninhado por geração, jogo, animado e ícones)
// numa lista simples, fácil de filtrar e agrupar na galeria.

import { versionOrder } from './versions'

/** Estilo do sprite dentro de um mesmo jogo. Na Gen I e II há variantes cinza, GBC e sem fundo. */
export type SpriteStyle = 'default' | 'transparent' | 'gray' | 'transparent-gray' | 'gbc' | 'animated' | 'icon'

export interface SpriteEntry {
  /** 0 = especiais (arte oficial, HOME, Dream World, Showdown); 1 a 9 = geração dos jogos. */
  gen: number
  /** Jogo (`red-blue`, `x-y`...), `icons` da geração ou fonte especial (`official-artwork`, `home`...). */
  source: string
  style: SpriteStyle
  back: boolean
  shiny: boolean
  female: boolean
  url: string
}

type SpriteTree = { [key: string]: string | null | undefined | SpriteTree }

const ROMAN_GEN: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 }
const STYLE_TOKENS = new Set(['transparent', 'gray', 'gbc'])
const STYLE_ORDER: SpriteStyle[] = ['default', 'transparent', 'gray', 'transparent-gray', 'gbc', 'animated', 'icon']
/** Ordem das fontes especiais; o sprite "padrão" da raiz fica por último por repetir um dos jogos. */
const SPECIAL_ORDER = ['official-artwork', 'home', 'dream-world', 'showdown', 'default']
/** Prefixo das artes oficiais antigas (Sugimori), que entram na aba da própria geração. */
export const ARTWORK_PREFIX = 'artwork:'

const isTree = (value: unknown): value is SpriteTree => typeof value === 'object' && value !== null

/** `front_shiny_transparent` → lado, shiny, fêmea e estilo. Retorna null para chaves desconhecidas. */
function parseKey(key: string): Pick<SpriteEntry, 'back' | 'shiny' | 'female' | 'style'> | null {
  const [side, ...tokens] = key.split('_')
  if (side !== 'front' && side !== 'back') return null
  const style = tokens.filter((t) => STYLE_TOKENS.has(t))
  if (tokens.some((t) => t !== 'default' && t !== 'shiny' && t !== 'female' && !STYLE_TOKENS.has(t))) return null
  // "transparent_gray" e "gray_transparent" viram o mesmo estilo.
  const joined = style.sort((a, b) => (a === 'transparent' ? -1 : b === 'transparent' ? 1 : 0)).join('-')
  return {
    back: side === 'back',
    shiny: tokens.includes('shiny'),
    female: tokens.includes('female'),
    style: (joined || 'default') as SpriteStyle,
  }
}

/** Lê as URLs diretas de um nó (sem descer nos filhos). */
function leaves(node: SpriteTree, base: Omit<SpriteEntry, 'back' | 'shiny' | 'female' | 'style' | 'url'>, style?: SpriteStyle): SpriteEntry[] {
  const out: SpriteEntry[] = []
  for (const [key, url] of Object.entries(node)) {
    if (typeof url !== 'string' || !url) continue
    const parsed = parseKey(key)
    if (parsed) out.push({ ...base, ...parsed, style: style ?? parsed.style, url })
  }
  return out
}

/** Recebe o `sprites` bruto da PokeAPI (formato aninhado e variável, por isso `unknown`). */
export function collectSprites(sprites: unknown): SpriteEntry[] {
  if (!isTree(sprites)) return []
  const out: SpriteEntry[] = []
  const other = isTree(sprites.other) ? sprites.other : {}

  for (const [name, node] of Object.entries(other)) {
    if (!isTree(node)) continue
    const source = name.replaceAll('_', '-')
    out.push(...leaves(node, { gen: 0, source }))
    // Arte oficial de cada geração (ex.: a de Red/Blue), mostrada junto dos jogos.
    if (isTree(node.versions)) {
      for (const [genKey, games] of Object.entries(node.versions)) {
        const gen = ROMAN_GEN[genKey.replace('generation-', '')]
        if (!gen || !isTree(games)) continue
        for (const [game, art] of Object.entries(games)) {
          if (isTree(art)) out.push(...leaves(art, { gen, source: ARTWORK_PREFIX + game }))
        }
      }
    }
  }

  out.push(...leaves(sprites, { gen: 0, source: 'default' }))

  const versions = isTree(sprites.versions) ? sprites.versions : {}
  for (const [genKey, games] of Object.entries(versions)) {
    const gen = ROMAN_GEN[genKey.replace('generation-', '')]
    if (!gen || !isTree(games)) continue
    for (const [game, node] of Object.entries(games)) {
      if (!isTree(node)) continue
      // `generation-iii/icons` é um conjunto de ícones da geração inteira, não um jogo.
      if (game === 'icons') {
        out.push(...leaves(node, { gen, source: 'icons' }, 'icon'))
        continue
      }
      out.push(...leaves(node, { gen, source: game }))
      if (isTree(node.animated)) out.push(...leaves(node.animated, { gen, source: game }, 'animated'))
      if (isTree(node.icons)) out.push(...leaves(node.icons, { gen, source: game }, 'icon'))
    }
  }

  return out
}

export interface SpriteFilter {
  back: boolean
  shiny: boolean
  female: boolean
}

export interface SpriteGroup {
  source: string
  sprites: SpriteEntry[]
}

/**
 * Sprites de uma geração que batem com o filtro, agrupados por fonte e em ordem cronológica.
 * Com "fêmea" ligado, usa o sprite de fêmea quando existe e cai no padrão quando não há diferença.
 */
export function spritesFor(entries: SpriteEntry[], gen: number, filter: SpriteFilter): SpriteGroup[] {
  const pool = entries.filter((e) => e.gen === gen && e.back === filter.back && e.shiny === filter.shiny)
  const bySource = new Map<string, SpriteEntry[]>()
  for (const style of STYLE_ORDER) {
    for (const source of new Set(pool.map((e) => e.source))) {
      const matches = pool.filter((e) => e.source === source && e.style === style)
      const pick = (filter.female && matches.find((e) => e.female)) || matches.find((e) => !e.female)
      if (pick) bySource.set(source, [...(bySource.get(source) ?? []), pick])
    }
  }
  return sortSources([...bySource.keys()], gen).map((source) => ({ source, sprites: bySource.get(source)! }))
}

function sortSources(sources: string[], gen: number): string[] {
  if (gen === 0) {
    const rank = (s: string) => (SPECIAL_ORDER.includes(s) ? SPECIAL_ORDER.indexOf(s) : SPECIAL_ORDER.length)
    return [...sources].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
  }
  const artwork = sources.filter((s) => s.startsWith(ARTWORK_PREFIX)).sort()
  // Nos sprites, Gold e Silver vêm separados; contam como o version group gold-silver.
  const order = (s: string) => versionOrder(s === 'gold' || s === 'silver' ? 'gold-silver' : s)
  const games = sources.filter((s) => !s.startsWith(ARTWORK_PREFIX) && s !== 'icons').sort((a, b) => order(a) - order(b) || a.localeCompare(b))
  return [...artwork, ...games, ...sources.filter((s) => s === 'icons')]
}

export interface TimelineEntry {
  gen: number
  source: string
  sprite: SpriteEntry
}

/**
 * Um sprite por geração, do jogo em que o Pokémon estreou naquela geração (ex.: Red/Blue na Gen I),
 * para ver a evolução do visual lado a lado. Ignora a arte oficial e os ícones.
 */
export function spriteTimeline(entries: SpriteEntry[], filter: SpriteFilter): TimelineEntry[] {
  const out: TimelineEntry[] = []
  for (const gen of spriteGenerations(entries)) {
    if (gen === 0) continue
    const groups = spritesFor(entries, gen, filter).filter((g) => !g.source.startsWith(ARTWORK_PREFIX) && g.source !== 'icons')
    for (const group of groups) {
      const sprite = group.sprites.find((s) => s.style === 'default') ?? group.sprites.find((s) => s.style !== 'icon')
      if (sprite) {
        out.push({ gen, source: group.source, sprite })
        break
      }
    }
  }
  return out
}

/** Gerações com pelo menos um sprite, em ordem (0 = especiais primeiro). */
export function spriteGenerations(entries: SpriteEntry[]): number[] {
  return [...new Set(entries.map((e) => e.gen))].sort((a, b) => a - b)
}

export const hasFemaleSprites = (entries: SpriteEntry[]) => entries.some((e) => e.female)
