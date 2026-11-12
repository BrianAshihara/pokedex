import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import { Alert, Footer, Skeleton } from '../components/common'
import { SegmentedControl, Toggle } from '../components/controls'
import { ChevronLeftIcon } from '../components/icons'
import { PokemonCard } from '../components/PokemonCard'
import { useContentText } from '../i18n/content'
import { useI18n } from '../i18n/I18nProvider'
import { displayName, FROM_ABILITY_LIST, generationLabel } from '../lib/format'
import { abilityPageQuery } from '../lib/queries'
import type { AbilityHolder } from '../lib/types'
import { DexHeader } from './PokedexPage'

type Slot = 'all' | 'regular' | 'hidden'

function Holders({ holders }: { holders: AbilityHolder[] }) {
  const { t } = useI18n()
  const [slot, setSlot] = useState<Slot>('all')
  const [filter, setFilter] = useState('')
  const [showForms, setShowForms] = useState(false)

  if (!holders.length) return <p className="caption">{t.ability.noHolders}</p>

  const visible = holders.filter((h) => showForms || h.isDefault)
  const counts = { all: visible.length, regular: visible.filter((h) => !h.hidden).length, hidden: visible.filter((h) => h.hidden).length }
  const slots: { value: Slot; label: string }[] = [
    { value: 'all', label: `${t.ability.all} (${counts.all})` },
    { value: 'regular', label: `${t.ability.regular} (${counts.regular})` },
    { value: 'hidden', label: `${t.ability.hidden} (${counts.hidden})` },
  ]

  const query = filter.trim().toLowerCase()
  const rows = visible.filter(
    (h) =>
      (slot === 'all' || (slot === 'hidden') === h.hidden) &&
      (!query || h.name.includes(query.replaceAll(' ', '-')) || displayName(h.name).toLowerCase().includes(query)),
  )

  return (
    <>
      <div className="learners-head ab-head">
        <SegmentedControl label={t.ability.slot} options={slots} value={slot} onChange={setSlot} />
        <div className="learners-tools">
          <Toggle checked={showForms} onChange={setShowForms}>
            {t.browser.showForms}
          </Toggle>
          <input className="input sm" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t.ability.filterPokemon} aria-label={t.ability.filterPokemon} />
        </div>
      </div>
      {rows.length ? (
        <div className="learner-grid">
          {rows.map((h) => (
            <PokemonCard key={h.name} name={h.name} speciesId={h.speciesId} types={h.types} sprite={h.sprite} note={h.hidden ? t.ability.hiddenNote : undefined} />
          ))}
        </div>
      ) : (
        <p className="caption">{t.ability.noHoldersMatching}</p>
      )}
    </>
  )
}

export function AbilityPage() {
  const { slug = '' } = useParams()
  const [params] = useSearchParams()
  const location = useLocation()
  const { data, isPending, isError } = useQuery(abilityPageQuery(slug))
  const { t } = useI18n()
  const text = useContentText('abilities')

  useEffect(() => {
    document.title = data ? `${data.ability.name} | Dexpedition` : 'Dexpedition'
  }, [data])

  const from = params.get('de')
  // Vinda da lista, o state guarda a busca/filtros dela para o botão de voltar.
  const listSearch = (location.state as { list?: string } | null)?.list ?? ''
  const back =
    from === FROM_ABILITY_LIST ? { to: `/habilidades${listSearch}`, label: t.abilityList.title } : from ? { to: `/pokemon/${from}`, label: displayName(from) } : null

  let content
  if (isPending) {
    content = <Skeleton height={180} />
  } else if (isError) {
    content = <Alert>{t.common.apiError}</Alert>
  } else if (!data) {
    content = <Alert>{t.ability.notFound(slug)}</Alert>
  } else {
    const { ability, holders } = data
    const species = new Set(holders.filter((h) => h.isDefault).map((h) => h.speciesId)).size
    content = (
      <>
        <section className="panel move-panel">
          <div className="move-summary">
            <div className="move-title">
              <h1>{ability.name}</h1>
              {ability.generation > 0 && <span className="move-machine">{t.ability.introduced(generationLabel(ability.generation))}</span>}
            </div>
            {ability.description && <p className="move-effect">{text(ability.slug, ability.description)}</p>}
          </div>
        </section>
        <section className="panel">
          <div className="moves-head">
            <h2 className="card-title">{t.ability.holdersTitle}</h2>
            <span className="caption ab-total">{t.ability.holdersCount(species)}</span>
          </div>
          <Holders key={slug} holders={holders} />
        </section>
      </>
    )
  }

  return (
    <>
      <DexHeader />
      {back && (
        <Link className="btn back-link" to={back.to}>
          <ChevronLeftIcon />
          {t.move.backTo(back.label)}
        </Link>
      )}
      {content}
      <Footer />
    </>
  )
}
