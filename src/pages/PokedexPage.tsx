import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { BaseStatsRadar, StatBars } from '../components/charts'
import { Alert, Brand, Card, Footer, Skeleton } from '../components/common'
import { SegmentedControl, Toggle } from '../components/controls'
import { DexSearch } from '../components/DexSearch'
import { EvolutionCard } from '../components/EvolutionCard'
import { ChevronLeftIcon, ChevronRightIcon, DiceIcon, FlaskIcon } from '../components/icons'
import { LocationsPanel } from '../components/LocationsPanel'
import { MovesPanel } from '../components/MovesPanel'
import { PokemonBrowser } from '../components/PokemonBrowser'
import { AbilitiesCard, Hero, InfoCard, MatchupsCard, type ImageMode } from '../components/pokemon'
import { usePersistentState } from '../hooks/usePersistentState'
import { useI18n } from '../i18n/I18nProvider'
import { accentColor, dexNumber, displayName } from '../lib/format'
import { getFlavorText, getGenus } from '../lib/pokeapi'
import { abilitiesQuery, evolutionQuery, matchupsQuery, pokemonQuery, speciesCountQuery, speciesQuery } from '../lib/queries'
import { baseStats } from '../lib/stats'
import type { Pokemon, PokemonSprites, Sprites } from '../lib/types'

export function DexHeader() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const { data: speciesCount } = useQuery(speciesCountQuery())

  const goRandom = () => {
    if (speciesCount) navigate(`/pokemon/${Math.floor(Math.random() * speciesCount) + 1}`)
  }

  return (
    <div className="page-header">
      <Brand />
      <DexSearch />
      <button type="button" className="btn primary block" onClick={goRandom} disabled={!speciesCount}>
        <DiceIcon />
        {t.search.random}
      </button>
    </div>
  )
}

export function HomePage() {
  const [params] = useSearchParams()
  const legacyRef = params.get('p')
  const { t } = useI18n()

  useEffect(() => {
    document.title = 'Dexpedition'
  }, [])

  // Links antigos usavam /?p=charizard.
  if (legacyRef) return <Navigate to={`/pokemon/${encodeURIComponent(legacyRef)}`} replace />

  return (
    <>
      <DexHeader />
      <section className="panel" style={{ marginTop: 18 }}>
        <h2 className="card-title">{t.browser.title}</h2>
        <PokemonBrowser />
      </section>
      <Footer />
    </>
  )
}

export function PokemonPage() {
  const { ref = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: pokemon, isPending, isError } = useQuery(pokemonQuery(ref))
  const { t } = useI18n()

  // Normaliza a URL para o nome oficial (ex.: /pokemon/25 → /pokemon/pikachu).
  useEffect(() => {
    if (pokemon && pokemon.name !== ref) {
      queryClient.setQueryData(pokemonQuery(pokemon.name).queryKey, pokemon)
      navigate(`/pokemon/${pokemon.name}`, { replace: true })
    }
  }, [pokemon, ref, navigate, queryClient])

  useEffect(() => {
    document.title = pokemon ? `${displayName(pokemon.name)} | Dexpedition` : 'Dexpedition'
  }, [pokemon])

  let content
  if (isPending) {
    content = <LoadingSkeleton />
  } else if (isError) {
    content = <Alert>{t.common.apiError}</Alert>
  } else if (!pokemon) {
    content = <Alert>{t.pokemon.notFound(ref)}</Alert>
  } else {
    content = <PokemonDetails pokemon={pokemon} />
  }

  return (
    <>
      <DexHeader />
      {content}
      <Footer />
    </>
  )
}

function LoadingSkeleton() {
  const { t } = useI18n()
  return (
    <div role="status" aria-label={t.common.loading}>
      <Skeleton height={46} />
      <div className="dex-grid">
        <Skeleton height={420} />
        <Skeleton height={420} />
        <Skeleton height={420} />
      </div>
    </div>
  )
}

function pickImage(sprites: PokemonSprites, mode: ImageMode, shiny: boolean): [string | null, ImageMode] {
  const other = sprites.other ?? {}
  const artwork: Sprites = other['official-artwork'] ?? {}
  const byMode: Record<ImageMode, Sprites[]> = { art: [artwork, other.home ?? {}], pixel: [sprites], anim: [other.showdown ?? {}, sprites] }
  const key = shiny ? 'front_shiny' : 'front_default'
  for (const source of [...byMode[mode], artwork, sprites]) {
    const url = source[key]
    if (url) return [url, source === artwork ? 'art' : mode]
  }
  return [null, mode]
}

function SpeciesNavButton({ id, direction }: { id: number; direction: 'prev' | 'next' }) {
  const { data: species } = useQuery(speciesQuery(id))
  const label = `${dexNumber(id)} ${displayName(species?.name)}`.trim()
  return (
    <Link className={`btn block ${direction}`} to={`/pokemon/${id}`}>
      {direction === 'prev' && <ChevronLeftIcon />}
      <span className="btn-label">{label}</span>
      {direction === 'next' && <ChevronRightIcon />}
    </Link>
  )
}

function PokemonDetails({ pokemon }: { pokemon: Pokemon }) {
  const navigate = useNavigate()
  const { t } = useI18n()
  const [imageMode, setImageMode] = usePersistentState<ImageMode>('pokedex:image-mode', 'art')
  const [shiny, setShiny] = usePersistentState('pokedex:shiny', false)
  const [versionGroup, setVersionGroup] = usePersistentState<string | null>('pokedex:version-group', null)

  const speciesName = pokemon.species.name
  const { data: species = null, isError: speciesError } = useQuery(speciesQuery(speciesName))
  const { data: speciesCount } = useQuery(speciesCountQuery())
  const abilities = useQuery(abilitiesQuery(pokemon))
  const matchups = useQuery(matchupsQuery(pokemon))
  const evolution = useQuery(evolutionQuery(speciesName))

  const accent = accentColor(pokemon)
  const varieties = species?.varieties.map((v) => v.pokemon.name) ?? []
  const [imageUrl, shownMode] = pickImage(pokemon.sprites, imageMode, shiny)
  const cry = pokemon.cries?.latest || pokemon.cries?.legacy
  const stats = pokemon.stats.length ? baseStats(pokemon) : null
  const apiSlow = <Alert>{t.pokemon.apiSlow}</Alert>
  const imageModes: { value: ImageMode; label: string }[] = [
    { value: 'art', label: t.pokemon.imageArt },
    { value: 'pixel', label: t.pokemon.imagePixel },
    { value: 'anim', label: t.pokemon.imageAnimated },
  ]

  return (
    <>
      <nav className="dex-nav" aria-label={t.pokemon.navLabel}>
        {species && speciesCount ? <SpeciesNavButton id={species.id > 1 ? species.id - 1 : speciesCount} direction="prev" /> : <span />}
        <div>
          {varieties.length > 1 && (
            <select
              className="select"
              aria-label={t.pokemon.form}
              value={varieties.includes(pokemon.name) ? pokemon.name : varieties[0]}
              onChange={(e) => navigate(`/pokemon/${e.target.value}`)}
            >
              {varieties.map((v) => (
                <option key={v} value={v}>
                  {displayName(v)}
                </option>
              ))}
            </select>
          )}
        </div>
        {species && speciesCount ? <SpeciesNavButton id={species.id < speciesCount ? species.id + 1 : 1} direction="next" /> : <span />}
      </nav>

      {speciesError && apiSlow}

      <div className="dex-grid">
        <div>
          <Hero pokemon={pokemon} species={species} genus={getGenus(species)} imageUrl={imageUrl} imageMode={shownMode} shiny={shiny} />
          <div className="hero-controls">
            <div className="hero-controls-row">
              <SegmentedControl label={t.pokemon.imageStyle} options={imageModes} value={imageMode} onChange={setImageMode} />
              <Toggle checked={shiny} onChange={setShiny}>
                Shiny
              </Toggle>
            </div>
            {cry ? (
              <div>
                <audio key={cry} controls preload="none" src={cry} />
                <p className="caption">{t.pokemon.cryWarning}</p>
              </div>
            ) : (
              <p className="caption">{t.pokemon.cryUnavailable}</p>
            )}
            <Link className="btn block ghost-link" to={`/laboratorio?p=${pokemon.name}`}>
              <FlaskIcon />
              {t.pokemon.openInLab}
            </Link>
          </div>
        </div>

        <div>
          <InfoCard pokemon={pokemon} species={species} flavor={getFlavorText(species)} accent={accent} />
          {abilities.data ? <AbilitiesCard abilities={abilities.data} accent={accent} /> : abilities.isError ? apiSlow : <Skeleton height={160} />}
          {matchups.data ? <MatchupsCard key={pokemon.name} matchups={matchups.data} abilities={abilities.data ?? []} accent={accent} /> : matchups.isError ? apiSlow : <Skeleton height={180} />}
        </div>

        <div>
          {stats ? (
            <Card title={t.stats.title} accent={accent}>
              <BaseStatsRadar key={pokemon.name} stats={stats} />
              <StatBars key={`bars-${pokemon.name}`} stats={stats} />
            </Card>
          ) : (
            <Alert kind="info">{t.stats.unavailable}</Alert>
          )}
        </div>
      </div>

      {evolution.isPending ? (
        <Skeleton height={170} />
      ) : evolution.isError ? (
        apiSlow
      ) : (
        <EvolutionCard evolution={evolution.data} currentSpecies={speciesName} accent={accent} />
      )}

      <MovesPanel key={pokemon.name} pokemon={pokemon} versionGroup={versionGroup} onVersionGroupChange={setVersionGroup} />

      <LocationsPanel key={`locations-${pokemon.name}`} pokemon={pokemon} species={species} />
    </>
  )
}
