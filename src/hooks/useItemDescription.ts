import extraDescriptions from '../data/item-descriptions.json'
import { useContentText } from '../i18n/content'
import { useI18n } from '../i18n/I18nProvider'
import type { ItemListItem } from '../lib/types'

// Itens de batalha recentes que a PokeAPI ainda não descreve.
const EXTRA = extraDescriptions as Record<string, { pt: string; en: string }>

/** Descrição de um item no idioma atual: API traduzida, texto curado ou um modelo pela categoria. */
export function useItemDescription(): (item: ItemListItem) => string {
  const { lang, t } = useI18n()
  const text = useContentText('items')
  return (item) => {
    if (item.effect) return text(item.slug, item.effect)
    const extra = EXTRA[item.slug]
    if (extra) return extra[lang]
    if (item.category === 'mega-stones' && item.megaUser) return t.items.megaStoneFallback(item.megaUser)
    if (item.category === 'tera-shard') return t.items.teraShardFallback
    return t.items.noDescription
  }
}
