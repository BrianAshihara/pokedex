import { displayName } from './format'
import type { ItemFlavor, ItemGroup, ItemListItem } from './types'

/** Ordem dos filtros na aba de Itens. */
export const ITEM_GROUPS: ItemGroup[] = ['medicine', 'training', 'battle', 'mega', 'balls', 'berries', 'evolution', 'key', 'other']

export const ITEM_GROUP_COLORS: Record<ItemGroup, string> = {
  medicine: '#23cd5e',
  training: '#ff7f0f',
  battle: '#f34444',
  mega: '#a040a0',
  balls: '#ef5350',
  berries: '#ee99ac',
  evolution: '#38bdf8',
  key: '#ffcb05',
  other: '#8c888c',
}

const CATEGORY_GROUPS: Record<string, ItemGroup> = {
  healing: 'medicine',
  'status-cures': 'medicine',
  revival: 'medicine',
  'pp-recovery': 'medicine',
  vitamins: 'training',
  'nature-mints': 'training',
  'effort-training': 'training',
  training: 'training',
  'species-candies': 'training',
  'tera-shard': 'training',
  'held-items': 'battle',
  choice: 'battle',
  'bad-held-items': 'battle',
  'type-enhancement': 'battle',
  jewels: 'battle',
  plates: 'battle',
  memories: 'battle',
  'species-specific': 'battle',
  'stat-boosts': 'battle',
  flutes: 'battle',
  'miracle-shooter': 'battle',
  'mega-stones': 'mega',
  'z-crystals': 'mega',
  'standard-balls': 'balls',
  'special-balls': 'balls',
  'apricorn-balls': 'balls',
  'effort-drop': 'berries',
  'in-a-pinch': 'berries',
  'picky-healing': 'berries',
  'type-protection': 'berries',
  'baking-only': 'berries',
  'catching-bonus': 'berries',
  medicine: 'berries',
  other: 'berries',
  evolution: 'evolution',
  'plot-advancement': 'key',
  gameplay: 'key',
  'event-items': 'key',
  'data-cards': 'key',
  'apricorn-box': 'key',
}

export function itemGroup(category: string): ItemGroup {
  return CATEGORY_GROUPS[category] ?? 'other'
}

/** "ultra-ball" e "laultra-ball" têm o mesmo nome em inglês: o sufixo diz de qual jogo cada uma é. */
export function itemVariant(slug: string): string | null {
  if (/^la\w+-ball$/.test(slug)) return 'Hisui'
  const suffix = /--(.+)$/.exec(slug)?.[1]
  if (!suffix || suffix === 'held') return null
  return suffix === 'letsgo' ? "Let's Go" : displayName(suffix)
}

/** Agrupa os jogos com o mesmo texto (os antigos diferem só em "POKéMON") e deixa o mais recente primeiro. */
export function groupFlavorTexts(entries: { versionGroup: string; text: string }[]): ItemFlavor[] {
  const flavors = new Map<string, ItemFlavor>()
  for (const { versionGroup, text } of entries) {
    const key = text.toLowerCase()
    const flavor = flavors.get(key)
    if (flavor) {
      flavor.versionGroups.push(versionGroup)
      flavor.text = text
    } else {
      flavors.set(key, { versionGroups: [versionGroup], text })
    }
  }
  return [...flavors.values()].reverse()
}

/** Itens mais próximos na mesma categoria, na ordem da lista. */
export function relatedItems(all: ItemListItem[], slug: string, limit = 12): ItemListItem[] {
  const index = all.findIndex((item) => item.slug === slug)
  if (index < 0) return []
  const category = all[index].category
  return all
    .map((item, i) => ({ item, distance: Math.abs(i - index) }))
    .filter(({ item }) => item.category === category && item.slug !== slug)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map(({ item }) => item)
}

/** Pokémon que usa uma Mega Stone, a partir da forma Mega (ex.: "charizard-mega-x" → "Charizard"). */
export function megaStoneUser(formPokemon: string | undefined): string | null {
  return formPokemon ? displayName(formPokemon.replace(/-mega(-\w+)?$/, '')) : null
}
