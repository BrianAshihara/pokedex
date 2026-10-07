import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { BaseStatsRadar, StatBars } from '../components/charts'
import { Alert, Brand, Card, Footer, Skeleton } from '../components/common'
import { SegmentedControl, Toggle } from '../components/controls'
import { EvolutionCard } from '../components/EvolutionCard'
import { ChevronLeftIcon, ChevronRightIcon, DiceIcon, FlaskIcon } from '../components/icons'
import { MovesPanel } from '../components/MovesPanel'
import { AbilitiesCard, Hero, InfoCard, MatchupsCard, type ImageMode } from '../components/pokemon'
import { usePersistentState } from '../hooks/usePersistentState'
import { accentColor, dexNumber, displayName } from '../lib/format'
import { getFlavorText, getGenus } from '../lib/pokeapi'
import { abilitiesQuery, evolutionQuery, matchupsQuery, pokemonQuery, speciesCountQuery, speciesQuery } from '../lib/queries'
import { baseStats } from '../lib/stats'
import type { Pokemon, PokemonSprites, Sprites } from '../lib/types'

const QUICK_PICKS: [number, string][] = [
  [25, 'pikachu'],
  [6, 'charizard'],
  [94, 'gengar'],
  [133, 'eevee'],
  [150, 'mewtwo'],
  [448, 'lucario'],
  [658, 'greninja'],
]

const IMAGE_MODES: { value: ImageMode; label: string }[] = [
  { value: 'art', label: 'Arte' },
  { value: 'pixel', label: 'Pixel' },
  { value: 'anim', label: 'Animado' },
]

function DexHeader() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const { data: speciesCount } = useQuery(speciesCountQuery())

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const value = search.trim().toLowerCase()
    if (value) navigate(`/pokemon/${encodeURIComponent(value)}`)
    setSearch('')
  }

  const goRandom = () => {
    if (speciesCount) navigate(`/pokemon/${Math.floor(Math.random() * speciesCount) + 1}`)
  }

  return (
    <div className="page-header">
      <Brand />
      <form onSubmit={onSubmit} role="search">
        <label htmlFor="search" className="visually-hidden">
          Buscar Pokémon
        </label>
        <input
          id="search"
          className="input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou número (ex: pikachu, 25, mr mime)"
          autoComplete="off"
        />
      </form>
      <button type="button" className="btn primary block" onClick={goRandom} disabled={!speciesCount}>
        <DiceIcon />
        Aleatório
      </button>
    </div>
  )
}

export function HomePage() {
  const [params] = useSearchParams()
  const legacyRef = params.get('p')

  useEffect(() => {
    document.title = 'Pokédex'
  }, [])

  // Links antigos usavam /?p=charizard.
  if (legacyRef) return <Navigate to={`/pokemon/${encodeURIComponent(legacyRef)}`} replace />

  return (
    <>
      <DexHeader />
      <Card title="Comece por aqui" style={{ marginTop: 18, textAlign: 'center' }}>
        <p className="muted" style={{ margin: '0 0 16px' }}>
          Busque um Pokémon pelo nome ou número, sorteie um aleatório ou escolha um abaixo.
        </p>
        <div className="quick-picks">
          {QUICK_PICKS.map(([id, name]) => (
            <Link key={name} className="evo-node" to={`/pokemon/${name}`}>
              <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`} alt={displayName(name)} />
              <span className="evo-name">{displayName(name)}</span>
            </Link>
          ))}
        </div>
      </Card>
      <Footer />
    </>
  )
}

export function PokemonPage() {
  const { ref = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: pokemon, isPending, isError } = useQuery(pokemonQuery(ref))

  // Normaliza a URL para o nome oficial (ex.: /pokemon/25 → /pokemon/pikachu).
  useEffect(() => {
    if (pokemon && pokemon.name !== ref) {
      queryClient.setQueryData(pokemonQuery(pokemon.name).queryKey, pokemon)
      navigate(`/pokemon/${pokemon.name}`, { replace: true })
    }
  }, [pokemon, ref, navigate, queryClient])

  useEffect(() => {
    document.title = pokemon ? `${displayName(pokemon.name)} | Pokédex` : 'Pokédex'
  }, [pokemon])

  let content
  if (isPending) {
    content = <LoadingSkeleton />
  } else if (isError) {
    content = <Alert>Não foi possível acessar a PokeAPI agora. Tente novamente em instantes.</Alert>
  } else if (!pokemon) {
    content = <Alert>Nenhum Pokémon encontrado para "{ref}". Confira a grafia ou tente pelo número.</Alert>
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
  return (
    <div role="status" aria-label="Carregando">
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
  const apiSlow = <Alert>A PokeAPI demorou para responder. Algumas informações podem estar incompletas; tente recarregar.</Alert>

  return (
    <>
      <nav className="dex-nav" aria-label="Navegação entre Pokémon">
        {species && speciesCount ? <SpeciesNavButton id={species.id > 1 ? species.id - 1 : speciesCount} direction="prev" /> : <span />}
        <div>
          {varieties.length > 1 && (
            <select
              className="select"
              aria-label="Forma"
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
              <SegmentedControl label="Estilo da imagem" options={IMAGE_MODES} value={imageMode} onChange={setImageMode} />
              <Toggle checked={shiny} onChange={setShiny}>
                Shiny
              </Toggle>
            </div>
            {cry ? (
              <div>
                <audio key={cry} controls preload="none" src={cry} />
                <p className="caption">Cuidado com o volume.</p>
              </div>
            ) : (
              <p className="caption">Grito indisponível para este Pokémon.</p>
            )}
            <Link className="btn block ghost-link" to={`/laboratorio?p=${pokemon.name}`}>
              <FlaskIcon />
              Abrir no Laboratório
            </Link>
          </div>
        </div>

        <div>
          <InfoCard pokemon={pokemon} species={species} flavor={getFlavorText(species)} accent={accent} />
          {abilities.data ? <AbilitiesCard abilities={abilities.data} accent={accent} /> : abilities.isError ? apiSlow : <Skeleton height={160} />}
          {matchups.data ? <MatchupsCard matchups={matchups.data} accent={accent} /> : matchups.isError ? apiSlow : <Skeleton height={180} />}
        </div>

        <div>
          {stats ? (
            <Card title="Atributos base" accent={accent}>
              <BaseStatsRadar key={pokemon.name} stats={stats} />
              <StatBars key={`bars-${pokemon.name}`} stats={stats} />
            </Card>
          ) : (
            <Alert kind="info">Dados de atributos não disponíveis.</Alert>
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
    </>
  )
}
