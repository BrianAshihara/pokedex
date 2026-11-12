import { describe, expect, it } from 'vitest'
import { collectSprites, hasFemaleSprites, spriteGenerations, spritesFor, spriteTimeline } from './sprites'

const U = (path: string) => `https://sprites/${path}.png`

// Recorte do formato real de /pokemon/pikachu.
const raw = {
  front_default: U('root'),
  front_shiny: U('root-shiny'),
  back_default: null,
  other: {
    'official-artwork': {
      front_default: U('art'),
      front_shiny: U('art-shiny'),
      versions: {
        'generation-i': { 'red-and-blue': { front_default: U('art-rb') } },
        'generation-ii': { 'gold-and-silver': { front_default: null } },
      },
    },
    dream_world: { front_default: U('dw'), front_female: null },
    showdown: { front_default: U('sd'), back_default: U('sd-back') },
  },
  versions: {
    'generation-i': {
      yellow: { front_default: U('y'), front_gray: U('y-gray'), front_transparent_gray: U('y-tg'), front_gbc: U('y-gbc'), back_default: U('y-back') },
      'red-blue': { front_default: U('rb') },
    },
    'generation-ii': {
      silver: { front_default: U('s'), front_shiny_transparent: U('s-shiny-t') },
      gold: { front_default: U('g') },
      crystal: { front_default: U('c'), animated: { front_default: U('c-anim') } },
    },
    'generation-iii': { icons: { front_default: U('g3-icon') } },
    'generation-iv': {
      'diamond-pearl': { front_default: U('dp'), front_female: U('dp-f') },
      platinum: { front_default: U('pt') },
    },
    'generation-viii': { 'sword-shield': { front_default: U('swsh'), icons: { front_default: U('swsh-icon') } } },
  },
}

describe('collectSprites', () => {
  const all = collectSprites(raw)

  it('achata todas as URLs não nulas', () => {
    expect(all).toHaveLength(25)
    expect(all.every((e) => e.url.startsWith('https://'))).toBe(true)
  })

  it('interpreta lado, shiny, fêmea e estilo pela chave', () => {
    expect(all.find((e) => e.url === U('y-tg'))).toMatchObject({ gen: 1, source: 'yellow', style: 'transparent-gray', back: false })
    expect(all.find((e) => e.url === U('s-shiny-t'))).toMatchObject({ gen: 2, source: 'silver', style: 'transparent', shiny: true })
    expect(all.find((e) => e.url === U('dp-f'))).toMatchObject({ female: true, style: 'default' })
    expect(all.find((e) => e.url === U('y-back'))).toMatchObject({ back: true })
  })

  it('separa animados, ícones e arte oficial antiga', () => {
    expect(all.find((e) => e.url === U('c-anim'))).toMatchObject({ source: 'crystal', style: 'animated' })
    expect(all.find((e) => e.url === U('swsh-icon'))).toMatchObject({ source: 'sword-shield', style: 'icon' })
    expect(all.find((e) => e.url === U('g3-icon'))).toMatchObject({ gen: 3, source: 'icons', style: 'icon' })
    expect(all.find((e) => e.url === U('art-rb'))).toMatchObject({ gen: 1, source: 'artwork:red-and-blue' })
    expect(all.find((e) => e.url === U('dw'))).toMatchObject({ gen: 0, source: 'dream-world' })
  })

  it('tolera entrada vazia', () => {
    expect(collectSprites(null)).toEqual([])
    expect(collectSprites({})).toEqual([])
  })
})

describe('spritesFor', () => {
  const all = collectSprites(raw)
  const front = { back: false, shiny: false, female: false }

  it('ordena as fontes: arte oficial, jogos em ordem cronológica, ícones no fim', () => {
    expect(spritesFor(all, 1, front).map((g) => g.source)).toEqual(['artwork:red-and-blue', 'red-blue', 'yellow'])
    expect(spritesFor(all, 2, front).map((g) => g.source)).toEqual(['gold', 'silver', 'crystal'])
    expect(spritesFor(all, 0, front).map((g) => g.source)).toEqual(['official-artwork', 'dream-world', 'showdown', 'default'])
  })

  it('lista as variantes de cada jogo na ordem padrão → sem fundo → cinza → GBC → animado → ícone', () => {
    const yellow = spritesFor(all, 1, front).find((g) => g.source === 'yellow')!
    expect(yellow.sprites.map((s) => s.style)).toEqual(['default', 'gray', 'transparent-gray', 'gbc'])
    const crystal = spritesFor(all, 2, front).find((g) => g.source === 'crystal')!
    expect(crystal.sprites.map((s) => s.style)).toEqual(['default', 'animated'])
  })

  it('filtra costas e shiny sem completar com o normal', () => {
    expect(spritesFor(all, 1, { ...front, back: true }).map((g) => g.source)).toEqual(['yellow'])
    expect(spritesFor(all, 1, { ...front, shiny: true })).toEqual([])
  })

  it('com fêmea ligado, usa o sprite de fêmea quando existe e o padrão quando não há diferença', () => {
    const groups = spritesFor(all, 4, { ...front, female: true })
    expect(groups.map((g) => g.sprites[0].url)).toEqual([U('dp-f'), U('pt')])
  })
})

describe('spriteTimeline', () => {
  const all = collectSprites(raw)
  const front = { back: false, shiny: false, female: false }

  it('pega o primeiro jogo de cada geração, sem arte oficial nem ícones', () => {
    expect(spriteTimeline(all, front).map((e) => [e.gen, e.source, e.sprite.url])).toEqual([
      [1, 'red-blue', U('rb')],
      [2, 'gold', U('g')],
      [4, 'diamond-pearl', U('dp')],
      [8, 'sword-shield', U('swsh')],
    ])
  })

  it('respeita os filtros', () => {
    expect(spriteTimeline(all, { ...front, female: true }).find((e) => e.gen === 4)?.sprite.url).toBe(U('dp-f'))
    expect(spriteTimeline(all, { ...front, back: true }).map((e) => e.source)).toEqual(['yellow'])
  })
})

describe('helpers', () => {
  const all = collectSprites(raw)
  it('lista as gerações presentes e detecta fêmeas', () => {
    expect(spriteGenerations(all)).toEqual([0, 1, 2, 3, 4, 8])
    expect(hasFemaleSprites(all)).toBe(true)
    expect(hasFemaleSprites(all.filter((e) => !e.female))).toBe(false)
  })
})
