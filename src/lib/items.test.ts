import { describe, expect, it } from 'vitest'
import { groupFlavorTexts, itemGroup, itemVariant, megaStoneUser, relatedItems } from './items'
import type { ItemListItem } from './types'

describe('groupFlavorTexts', () => {
  it('junta textos iguais, ignorando maiúsculas, com o mais recente primeiro', () => {
    const flavors = groupFlavorTexts([
      { versionGroup: 'ruby-sapphire', text: 'Heals a POKéMON.' },
      { versionGroup: 'emerald', text: 'Heals a Pokémon.' },
      { versionGroup: 'x-y', text: 'A spray.' },
    ])
    expect(flavors).toEqual([
      { versionGroups: ['x-y'], text: 'A spray.' },
      { versionGroups: ['ruby-sapphire', 'emerald'], text: 'Heals a Pokémon.' },
    ])
  })
})

describe('relatedItems', () => {
  const item = (slug: string, category: string) => ({ slug, category }) as ItemListItem
  const all = [item('a', 'x'), item('b', 'y'), item('c', 'x'), item('d', 'x'), item('e', 'x')]

  it('traz os vizinhos da mesma categoria, sem o próprio item', () => {
    expect(relatedItems(all, 'c', 2).map((i) => i.slug)).toEqual(['d', 'a'])
    expect(relatedItems(all, 'b')).toEqual([])
    expect(relatedItems(all, 'inexistente')).toEqual([])
  })
})

describe('itemGroup', () => {
  it('separa as Berries de cura dos remédios', () => {
    expect(itemGroup('medicine')).toBe('berries')
    expect(itemGroup('healing')).toBe('medicine')
  })

  it('agrupa itens de batalha e manda categorias desconhecidas para Outros', () => {
    expect(itemGroup('choice')).toBe('battle')
    expect(itemGroup('categoria-nova')).toBe('other')
  })
})

describe('itemVariant', () => {
  it('identifica o jogo de itens com nome repetido', () => {
    expect(itemVariant('laultra-ball')).toBe('Hisui')
    expect(itemVariant('ss-ticket--letsgo')).toBe("Let's Go")
    expect(itemVariant('fishing-rod--galar')).toBe('Galar')
    expect(itemVariant('ultra-ball')).toBeNull()
    expect(itemVariant('lagging-tail')).toBeNull()
    expect(itemVariant('firium-z--held')).toBeNull()
  })
})

describe('megaStoneUser', () => {
  it('tira a forma Mega do nome', () => {
    expect(megaStoneUser('venusaur-mega')).toBe('Venusaur')
    expect(megaStoneUser('charizard-mega-x')).toBe('Charizard')
    expect(megaStoneUser(undefined)).toBeNull()
  })
})
