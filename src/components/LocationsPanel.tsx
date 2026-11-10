import { useQuery } from '@tanstack/react-query'
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useI18n } from '../i18n/I18nProvider'
import {
  addPreEvolutions,
  conditionLabel,
  curatedEncounters,
  encounterKind,
  gameLabel,
  groupPlaces,
  howToText,
  rarityOf,
} from '../lib/encounters'
import type { EncounterPlace, PlaceRow, Rarity } from '../lib/encounters'
import { displayName } from '../lib/format'
import { encountersQuery, preEvolutionEncountersQuery } from '../lib/queries'
import { findOnMap, REGION_MAPS } from '../lib/region-maps'
import type { EncounterRow, Pokemon, Species } from '../lib/types'
import { Alert, Spinner } from './common'
import { EncounterKindIcon, MapPinIcon } from './icons'
import { IllustratedMapView } from './IllustratedMapView'

const RARITY_BARS: Record<Rarity, number> = { guaranteed: 4, common: 4, uncommon: 3, rare: 2, veryRare: 1 }

function RarityMeter({ row }: { row: EncounterRow }) {
  const { t } = useI18n()
  const rarity = rarityOf(row)
  if (!rarity) return null
  const bars = RARITY_BARS[rarity]
  return (
    <span className="loc-rarity" data-rarity={rarity}>
      <span className="loc-rarity-bars" aria-hidden="true">
        {[1, 2, 3, 4].map((n) => (
          <i key={n} className={n <= bars ? 'on' : undefined} />
        ))}
      </span>
      <span>
        {t.locations.rarity[rarity]}
        {row.chance !== null && <small> {row.chance}%</small>}
      </span>
    </span>
  )
}

function WayToFind({ row, place }: { row: PlaceRow; place: EncounterPlace }) {
  const { t, lang } = useI18n()
  const kind = encounterKind(row.method, place.name)
  const level = row.minLevel === null ? null : t.locations.levelValue(row.minLevel === row.maxLevel ? String(row.minLevel) : `${row.minLevel}-${row.maxLevel}`)
  const subArea = row.subAreas.length > 1 ? t.locations.areasCount(row.subAreas.length) : row.subAreas[0]
  const tags = row.conditions.map((c) => conditionLabel(c, t.locations))

  return (
    <li className="loc-way">
      <span className="loc-icon" data-kind={kind}>
        <EncounterKindIcon kind={kind} />
      </span>
      <div className="loc-way-text">
        <strong>{howToText(row.method, kind, t.locations)}</strong>
        {row.via && (
          <span className="loc-via">
            {t.locations.viaBefore} <Link to={`/pokemon/${row.via}`}>{displayName(row.via)}</Link>
            {t.locations.viaAfter}
          </span>
        )}
        {row.note && <span className="loc-note-text">{row.note[lang]}</span>}
        {(level || subArea || tags.length > 0) && (
          <span className="loc-tags">
            {level && <span className="loc-tag loc-tag-level">{level}</span>}
            {subArea && (
              <span className="loc-tag" title={row.subAreas.join(', ')}>
                {subArea}
              </span>
            )}
            {tags.map((tag) => (
              <span key={tag} className="loc-tag">
                {tag}
              </span>
            ))}
          </span>
        )}
      </div>
      <RarityMeter row={row} />
    </li>
  )
}

function EncounterGuide({ rows, pokemonName }: { rows: EncounterRow[]; pokemonName: string }) {
  const { t } = useI18n()
  const places = useMemo(() => groupPlaces(rows), [rows])
  const pins = useMemo(() => places.flatMap((place) => {
    const spot = findOnMap(place.location)
    return spot ? [{ place, ...spot }] : []
  }), [places])
  // O mapa com mais locais vem primeiro: as ilhas menores não devem abrir no lugar da região principal.
  const pinsOn = (id: string) => pins.filter((p) => p.mapId === id).length
  const mapIds = [...new Set(pins.map((p) => p.mapId))].sort((a, b) => pinsOn(b) - pinsOn(a))

  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [chosenMap, setChosenMap] = useState<string | null>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const mapId = (chosenMap && mapIds.includes(chosenMap) ? chosenMap : mapIds[0]) ?? null
  const selected = places.find((p) => p.key === selectedKey) ?? pins.find((p) => p.mapId === mapId)?.place ?? places[0]
  const map = mapId ? REGION_MAPS[mapId] : null
  const onThisMap = pins.filter((p) => p.mapId === mapId)
  const selectedSlug = onThisMap.find((p) => p.place.key === selected.key)?.slug ?? null

  const select = (place: EncounterPlace) => {
    setSelectedKey(place.key)
    const pin = pins.find((p) => p.place.key === place.key)
    if (pin) setChosenMap(pin.mapId)
  }

  const selectOnMap = (slug: string) => {
    const pin = onThisMap.find((p) => p.slug === slug)
    if (!pin) return
    setSelectedKey(pin.place.key)
    listRef.current?.querySelector(`[data-key="${CSS.escape(pin.place.key)}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  const openMap = (id: string) => {
    setChosenMap(id)
    const first = pins.find((p) => p.mapId === id)
    if (first) setSelectedKey(first.place.key)
  }

  const onlyVia = rows.every((r) => r.via)
  const name = displayName(pokemonName)

  return (
    <>
      <p className="loc-summary">{onlyVia ? t.locations.summaryVia(name, displayName(rows[0].via!)) : t.locations.summary(name, places.length)}</p>

      <div className={`loc-layout${map ? '' : ' no-map'}`}>
        {map && (
          <div className="loc-map">
            {mapIds.length > 1 && (
              <div className="loc-map-tabs" role="group" aria-label={t.locations.chooseMap}>
                {mapIds.map((id) => (
                  <button key={id} type="button" aria-pressed={id === mapId} onClick={() => openMap(id)}>
                    {REGION_MAPS[id].name}
                  </button>
                ))}
              </div>
            )}
            <IllustratedMapView
              map={map}
              highlighted={new Set(onThisMap.map((p) => p.slug))}
              selected={selectedSlug}
              selectedName={selected.name}
              onSelect={selectOnMap}
              label={t.locations.mapLabel(map.name)}
            />
            <ul className="loc-legend">
              <li><i className="found" />{t.locations.legendFound}</li>
              <li><i className="town" />{t.locations.legendTown}</li>
              <li><i className="route" />{t.locations.legendRoute}</li>
              <li><i className="sea" />{t.locations.legendSea}</li>
            </ul>
          </div>
        )}

        <ul className="loc-places" ref={listRef}>
          {places.map((place, i) => (
            <li key={place.key} data-key={place.key} className={`loc-place${place.key === selected.key ? ' is-active' : ''}`} onClick={() => select(place)}>
              <button type="button" className="loc-place-head" aria-pressed={place.key === selected.key}>
                {pins.some((p) => p.place.key === place.key) && <MapPinIcon className="loc-pin-icon" />}
                <span className="loc-place-name">{place.name ?? t.locations.noPlace}</span>
                {i === 0 && places.length > 1 && <span className="loc-best">{t.locations.best}</span>}
              </button>
              <ul className="loc-ways">
                {place.rows.map((row, n) => (
                  <WayToFind key={n} row={row} place={place} />
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>

      {!map && <p className="caption">{t.locations.noMap}</p>}
    </>
  )
}

export function LocationsPanel({ pokemon, species }: { pokemon: Pokemon; species: Species | null }) {
  const { t } = useI18n()
  const own = useQuery(encountersQuery(pokemon.name))
  const [selected, setSelected] = useState<string | null>(null)

  // Curadoria e pré-evoluções só valem para a forma padrão: Megas e afins não são encontradas assim.
  const isDefaultForm = species?.varieties.find((v) => v.is_default)?.pokemon.name === pokemon.name
  const lineageOptions = preEvolutionEncountersQuery(species)
  const lineage = useQuery({ ...lineageOptions, enabled: !!lineageOptions.enabled && isDefaultForm })
  const lineageLoading = isDefaultForm && !!species?.evolves_from_species && lineage.isPending

  const ownGames = own.data?.length ? own.data : isDefaultForm && species ? curatedEncounters(species.name) : []
  // Se as pré-evoluções falharem, os encontros do próprio Pokémon continuam valendo.
  const games = lineage.data?.length ? addPreEvolutions(ownGames, lineage.data) : ownGames
  const current = games.find((g) => g.id === selected) ?? games.at(-1)
  const evolvesFrom = isDefaultForm ? species?.evolves_from_species?.name : undefined

  let body
  if (own.isError) {
    body = <Alert>{t.locations.error}</Alert>
  } else if (own.isPending || lineageLoading) {
    body = <Spinner label={t.locations.loading} />
  } else if (current) {
    body = <EncounterGuide key={current.id} rows={current.rows} pokemonName={pokemon.name} />
  } else if (evolvesFrom) {
    body = (
      <p className="loc-evolves">
        {t.locations.evolvesFrom} <Link to={`/pokemon/${evolvesFrom}`}>{displayName(evolvesFrom)}</Link>
      </p>
    )
  } else {
    body = <p className="caption">{t.locations.empty}</p>
  }

  return (
    <section className="panel">
      <div className="moves-head">
        <h2 className="card-title">{t.locations.title}</h2>
        {current && (
          <select className="select" aria-label={t.moves.game} value={current.id} onChange={(e) => setSelected(e.target.value)}>
            {[...games].reverse().map((g) => (
              <option key={g.id} value={g.id}>
                {gameLabel(g.versions)}
              </option>
            ))}
          </select>
        )}
      </div>
      <p className="caption loc-note">{t.locations.coverageWarning}</p>
      {body}
    </section>
  )
}
