import { useQuery, useQueryClient } from '@tanstack/react-query'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { BaseStatsRadar, StatBars } from '../components/charts'
import { Alert, Brand, Card, Footer, Skeleton, Spinner } from '../components/common'
import { SegmentedControl, Toggle } from '../components/controls'
import { DexSearch } from '../components/DexSearch'
import { EvolutionCard } from '../components/EvolutionCard'
import { ChevronLeftIcon, ChevronRightIcon, DiceIcon, FlaskIcon, QuestionIcon } from '../components/icons'
import { MovesPanel } from '../components/MovesPanel'
import { PokemonBrowser } from '../components/PokemonBrowser'
import { ShareCardButton } from '../components/ShareCard'
import { SpriteGallery, type SpritePick } from '../components/SpriteGallery'
import { AbilitiesCard, Hero, InfoCard, MatchupsCard, type ImageMode } from '../components/pokemon'
import { usePersistentState } from '../hooks/usePersistentState'
import { useI18n } from '../i18n/I18nProvider'
import { accentColor, dexNumber, displayName, typeNames } from '../lib/format'
import { getFlavorText, getGenus } from '../lib/pokeapi'
import { abilitiesQuery, evolutionQuery, matchupsQuery, pokemonQuery, speciesCountQuery, speciesQuery } from '../lib/queries'
import { baseStats } from '../lib/stats'
import type { Pokemon, PokemonSprites, Sprites } from '../lib/types'

// Os mapas pesam cerca de 90 KB: só carregam quando a página de um Pokémon abre.
const LocationsPanel = lazy(() => import('../components/LocationsPanel').then((m) => ({ default: m.LocationsPanel })))

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
      <div className="header-actions">
        <button type="button" className="btn primary block" onClick={goRandom} disabled={!speciesCount}>
          <DiceIcon />
          {t.search.random}
        </button>
        <Link className="btn block game-link" to="/quem-e-esse" title={t.game.title}>
          <QuestionIcon />
          {t.game.open}
        </Link>
      </div>
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
  // Sprite escolhido na galeria; vale só para o Pokémon em que foi escolhido.
  const [pick, setPick] = useState<(SpritePick & { pokemon: string }) | null>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const [versionGroup, setVersionGroup] = usePersistentState<string | null>('pokedex:version-group', null)

  const speciesName = pokemon.species.name
  const { data: species = null, isError: speciesError } = useQuery(speciesQuery(speciesName))
  const { data: speciesCount } = useQuery(speciesCountQuery())
  const abilities = useQuery(abilitiesQuery(pokemon))
  const matchups = useQuery(matchupsQuery(pokemon))
  const evolution = useQuery(evolutionQuery(speciesName))

  const accent = accentColor(pokemon)
  const varieties = species?.varieties.map((v) => v.pokemon.name) ?? []
  const activePick = pick?.pokemon === pokemon.name ? pick : null
  const [imageUrl, shownMode] = activePick ? [activePick.url, activePick.mode] : pickImage(pokemon.sprites, imageMode, shiny)
  const cry = pokemon.cries?.latest || pokemon.cries?.legacy
  const stats = pokemon.stats.length ? baseStats(pokemon) : null
  const apiSlow = <Alert>{t.pokemon.apiSlow}</Alert>
  const shareData = {
    name: displayName(pokemon.name),
    dexNumber: dexNumber(species?.id ?? pokemon.id),
    genus: getGenus(species),
    types: typeNames(pokemon),
    imageUrl,
    pixelated: shownMode !== 'art',
    tags: [
      species?.is_legendary ? t.pokemon.legendary : species?.is_mythical ? t.pokemon.mythical : species?.is_baby ? t.pokemon.baby : '',
      shiny && !activePick ? 'Shiny' : '',
    ].filter(Boolean),
    stats,
    abilities: (abilities.data ?? []).map((a) => ({ name: a.name, hidden: a.hidden })),
    hiddenLabel: t.abilities.hidden,
    totalLabel: 'Total',
    footer: `${window.location.host}/pokemon/${pokemon.name}`,
  }
  const imageModes: { value: ImageMode; label: string }[] = [
    { value: 'art', label: t.pokemon.imageArt },
    { value: 'pixel', label: t.pokemon.imagePixel },
    { value: 'anim', label: t.pokemon.imageAnimated },
  ]

  // Mudar estilo ou shiny volta o card para o padrão.
  const changeImageMode = (mode: ImageMode) => {
    setPick(null)
    setImageMode(mode)
  }
  const changeShiny = (value: boolean) => {
    setPick(null)
    setShiny(value)
  }
  const pickSprite = (sprite: SpritePick) => {
    setPick({ ...sprite, pokemon: pokemon.name })
    // A galeria fica bem abaixo do card: rola até ele para o clique ter efeito visível.
    const hero = heroRef.current
    if (hero && hero.getBoundingClientRect().top < 0) {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      hero.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    }
  }

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
        <div ref={heroRef}>
          <Hero pokemon={pokemon} species={species} genus={getGenus(species)} imageUrl={imageUrl} imageMode={shownMode} shiny={shiny} picked={activePick !== null} />
          <div className="hero-controls">
            <div className="hero-controls-row">
              <SegmentedControl label={t.pokemon.imageStyle} options={imageModes} value={activePick ? null : imageMode} onChange={changeImageMode} />
              <Toggle checked={shiny} onChange={changeShiny}>
                Shiny
              </Toggle>
            </div>
            {activePick && (
              <div className="hero-pick">
                <span className="caption">
                  {t.sprites.showing} <strong>{activePick.label}</strong>
                </span>
                <button type="button" className="btn sm" onClick={() => setPick(null)}>
                  {t.sprites.reset}
                </button>
              </div>
            )}
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
            <ShareCardButton data={shareData} fileName={pokemon.name} />
          </div>
        </div>

        <div>
          <InfoCard pokemon={pokemon} species={species} flavor={getFlavorText(species)} accent={accent} />
          {abilities.data ? <AbilitiesCard abilities={abilities.data} accent={accent} pokemonName={pokemon.name} /> : abilities.isError ? apiSlow : <Skeleton height={160} />}
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

      <SpriteGallery gallery={pokemon.gallery} shiny={shiny} onShinyChange={changeShiny} selectedUrl={activePick?.url ?? null} onSelect={pickSprite} />

      <Suspense fallback={<section className="panel"><Spinner label={t.locations.loading} /></section>}>
        <LocationsPanel key={`locations-${pokemon.name}`} pokemon={pokemon} species={species} />
      </Suspense>
    </>
  )
}
