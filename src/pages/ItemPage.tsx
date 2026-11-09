import { useQuery } from '@tanstack/react-query'
import { useEffect, type CSSProperties } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { Alert, Footer, Skeleton } from '../components/common'
import { ChevronLeftIcon } from '../components/icons'
import { PokemonCard } from '../components/PokemonCard'
import { useItemDescription } from '../hooks/useItemDescription'
import { useI18n } from '../i18n/I18nProvider'
import { displayName, generationLabel, moveLink } from '../lib/format'
import { ITEM_GROUP_COLORS, relatedItems } from '../lib/items'
import { versionGroupLabel } from '../lib/pokeapi'
import { allItemsQuery, itemQuery } from '../lib/queries'
import type { ItemDetail, ItemPokemon } from '../lib/types'
import { DexHeader } from './PokedexPage'

function PokemonSection({ title, pokemon, note }: { title: string; pokemon: ItemPokemon[]; note?: (p: ItemPokemon) => string }) {
  if (!pokemon.length) return null
  return (
    <section className="panel">
      <h2 className="card-title">{title}</h2>
      <div className="learner-grid">
        {pokemon.map((p) => (
          <PokemonCard key={p.name} name={p.name} speciesId={p.speciesId} types={p.types} sprite={p.sprite} note={note?.(p)} />
        ))}
      </div>
    </section>
  )
}

function ItemHero({ item }: { item: ItemDetail }) {
  const { t } = useI18n()
  const describe = useItemDescription()
  const facts = [
    { label: t.common.generation, value: item.generation ? generationLabel(item.generation) : '-' },
    ...(item.price?.buy ? [{ label: t.item.buyPrice, value: `₽${item.price.buy}` }] : []),
    ...(item.price?.sell ? [{ label: t.item.sellPrice, value: `₽${item.price.sell}` }] : []),
  ]
  const color = { '--t': ITEM_GROUP_COLORS[item.group], '--accent': ITEM_GROUP_COLORS[item.group] } as CSSProperties
  return (
    <section className="panel move-panel item-hero" style={color}>
      <div className="item-art">{item.sprite && <img src={item.sprite} alt="" width={96} height={96} />}</div>
      <div className="item-main">
        <div className="item-tags">
          <span className="il-group">{t.items.groups[item.group]}</span>
          {item.champions && <span className="item-champions">{t.item.inChampions}</span>}
        </div>
        <h1>{item.name}</h1>
        <p className="move-effect">{describe(item)}</p>
        {item.attributes.length > 0 && (
          <ul className="item-attrs" aria-label={t.item.attributesLabel}>
            {item.attributes.map((a) => (
              <li key={a}>{t.item.attributes[a] ?? displayName(a)}</li>
            ))}
          </ul>
        )}
      </div>
      <dl className="move-stats item-facts">
        {facts.map((f) => (
          <div key={f.label}>
            <dt>{f.label}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function FlavorSection({ item }: { item: ItemDetail }) {
  const { t } = useI18n()
  if (!item.flavors.length) return null
  return (
    <section className="panel">
      <h2 className="card-title">{t.item.flavorTitle}</h2>
      {t.item.flavorNote && <p className="caption item-flavor-note">{t.item.flavorNote}</p>}
      <ol className="item-flavors">
        {item.flavors.map((flavor) => (
          <li key={flavor.text} lang="en">
            <p>{flavor.text}</p>
            <div className="item-games">
              {flavor.versionGroups.map((vg) => (
                <span key={vg}>{versionGroupLabel(vg)}</span>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function FlingSection({ item }: { item: ItemDetail }) {
  const { t } = useI18n()
  if (!item.flingPower) return null
  return (
    <section className="panel">
      <h2 className="card-title">{t.item.flingTitle}</h2>
      <div className="item-fling">
        <strong>{item.flingPower}</strong>
        <div>
          <p>{t.item.flingExplain(item.flingPower)}</p>
          {item.flingEffect && <p>{t.item.flingEffects[item.flingEffect]}</p>}
          <Link to={moveLink('fling')}>{t.item.flingLink}</Link>
        </div>
      </div>
    </section>
  )
}

function RelatedSection({ slug, listSearch }: { slug: string; listSearch: string }) {
  const { t } = useI18n()
  const { data } = useQuery(allItemsQuery())
  const related = data ? relatedItems(data, slug) : []
  if (!related.length) return null
  return (
    <section className="panel">
      <h2 className="card-title">{t.item.relatedTitle}</h2>
      <div className="item-related">
        {related.map((item) => (
          <Link key={item.slug} to={`/item/${item.slug}`} state={{ list: listSearch }}>
            {item.sprite && <img src={item.sprite} alt="" width={30} height={30} loading="lazy" />}
            <span>{item.name}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

export function ItemPage() {
  const { slug = '' } = useParams()
  const { data: item, isPending, isError } = useQuery(itemQuery(slug))
  const { t } = useI18n()
  const location = useLocation()
  const listSearch = (location.state as { list?: string } | null)?.list ?? ''

  useEffect(() => {
    document.title = item ? `${item.name} | Dexpedition` : 'Dexpedition'
  }, [item])

  let content
  if (isPending) content = <Skeleton height={200} />
  else if (isError) content = <Alert>{t.common.apiError}</Alert>
  else if (!item) content = <Alert>{t.item.notFound(slug)}</Alert>
  else
    content = (
      <>
        <ItemHero item={item} />
        <PokemonSection title={t.item.megaForms} pokemon={item.megaForms} />
        <PokemonSection title={t.item.evolves} pokemon={item.evolves} />
        <div className="item-columns">
          <FlavorSection item={item} />
          <div>
            <FlingSection item={item} />
            <RelatedSection slug={item.slug} listSearch={listSearch} />
          </div>
        </div>
        <PokemonSection title={t.item.heldBy} pokemon={item.heldBy} note={(p) => t.item.heldChance(p.rarity ?? 0)} />
      </>
    )

  return (
    <>
      <DexHeader />
      <Link className="btn back-link" to={`/itens${listSearch}`}>
        <ChevronLeftIcon />
        {t.move.backTo(t.items.title)}
      </Link>
      {content}
      <Footer />
    </>
  )
}
