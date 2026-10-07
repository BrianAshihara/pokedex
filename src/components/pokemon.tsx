import type { CSSProperties } from 'react'
import { decimal, dexNumber, displayName, hexToRgba, pokemonArt, typeColor, typeNames } from '../lib/format'
import type { Ability, Matchups, Pokemon, Species } from '../lib/types'
import { Card, TypeBadge } from './common'
import { Pokeball } from './Pokeball'

export type ImageMode = 'art' | 'pixel' | 'anim'

interface HeroProps {
  pokemon: Pokemon
  species: Species | null
  genus: string
  imageUrl: string | null
  imageMode: ImageMode
  shiny: boolean
}

export function Hero({ pokemon, species, genus, imageUrl, imageMode, shiny }: HeroProps) {
  const types = typeNames(pokemon)
  const c1 = typeColor(types[0])
  const c2 = types[1] ? typeColor(types[1]) : c1
  const name = displayName(pokemon.name)

  let category: { cls: string; label: string } | null = null
  if (species?.is_legendary) category = { cls: 'tag legendary', label: 'Lendário' }
  else if (species?.is_mythical) category = { cls: 'tag mythical', label: 'Mítico' }
  else if (species?.is_baby) category = { cls: 'tag', label: 'Bebê' }

  const style = { '--tint1': hexToRgba(c1, 0.55), '--tint2': hexToRgba(c2, 0.22), '--glow': hexToRgba(c1, 0.55) } as CSSProperties

  return (
    <div className="hero" style={style}>
      <Pokeball className="hero-ball" top="none" bottom="none" stroke="#fff" />
      <div className="hero-top">
        <span className="dex-no">{dexNumber(species?.id ?? pokemon.id)}</span>
        <span className="hero-tags">
          {category && <span className={category.cls}>{category.label}</span>}
          {shiny && <span className="tag">Shiny</span>}
        </span>
      </div>
      <div className="hero-art">
        {imageUrl ? (
          <img key={imageUrl} className={imageMode === 'art' ? undefined : imageMode} src={imageUrl} alt={name} />
        ) : (
          <span className="no-art">Imagem indisponível</span>
        )}
      </div>
      <h1 className="hero-name">{name}</h1>
      <div className="hero-genus">{genus}</div>
      <div className="types">
        {types.map((t) => (
          <TypeBadge key={t} type={t} />
        ))}
      </div>
    </div>
  )
}

function Gender({ rate }: { rate: number | undefined }) {
  if (rate == null) return <>?</>
  if (rate < 0) return <>Sem gênero</>
  const female = (rate / 8) * 100
  return (
    <>
      <span className="m">♂ {decimal(100 - female, 1, true)}%</span> <span className="f">♀ {decimal(female, 1, true)}%</span>
    </>
  )
}

function generationLabel(name: string | undefined): string {
  const suffix = (name ?? '').replace('generation-', '')
  return suffix ? `Gen ${suffix.toUpperCase()}` : '?'
}

export function InfoCard({ pokemon, species, flavor, accent }: { pokemon: Pokemon; species: Species | null; flavor: string; accent: string }) {
  const tiles = [
    { k: 'Altura', v: `${decimal(pokemon.height / 10)} m` },
    { k: 'Peso', v: `${decimal(pokemon.weight / 10)} kg` },
    { k: 'Gênero', v: <Gender rate={species?.gender_rate} />, small: true },
    { k: 'Captura', v: species?.capture_rate ?? '?' },
    { k: 'Exp. base', v: pokemon.base_experience || '?' },
    { k: 'Geração', v: generationLabel(species?.generation?.name) },
  ]
  return (
    <Card title="Dados da Pokédex" accent={accent}>
      <div className="info-grid">
        {tiles.map(({ k, v, small }) => (
          <div key={k} className="tile">
            <span className="k">{k}</span>
            <span className={small ? 'v sm' : 'v'}>{v}</span>
          </div>
        ))}
      </div>
      {flavor && <div className="flavor">{flavor}</div>}
    </Card>
  )
}

export function AbilitiesCard({ abilities, accent }: { abilities: Ability[]; accent: string }) {
  return (
    <Card title="Habilidades" accent={accent}>
      {abilities.length === 0 && <span className="muted">Nenhuma habilidade registrada.</span>}
      {abilities.map((a) => (
        <div key={a.name + a.hidden} className="ability-row">
          <span className={a.hidden ? 'ability-pill hidden' : 'ability-pill'}>
            {a.name}
            {a.hidden && <small>oculta</small>}
          </span>
          {a.description && <div className="ability-desc">{a.description}</div>}
        </div>
      ))}
    </Card>
  )
}

const MATCHUP_ROWS: [number, string, string][] = [
  [4, 'x4', '4×'],
  [2, 'x2', '2×'],
  [0.5, 'x05', '½×'],
  [0.25, 'x025', '¼×'],
  [0, 'x0', '0×'],
]

export function MatchupsCard({ matchups, accent }: { matchups: Matchups; accent: string }) {
  const rows = MATCHUP_ROWS.filter(([mult]) => matchups.get(mult)?.length)
  return (
    <Card title="Dano recebido" accent={accent}>
      {rows.length === 0 && <span className="muted">Sem dados de tipo.</span>}
      {rows.map(([mult, cls, label]) => (
        <div key={cls} className="mu-row">
          <span className={`mu-mult ${cls}`}>{label}</span>
          <div className="mu-types">
            {[...matchups.get(mult)!].sort().map((t) => (
              <TypeBadge key={t} type={t} small />
            ))}
          </div>
        </div>
      ))}
    </Card>
  )
}

export function MiniPokemon({ pokemon, speciesId, color, subtitle }: { pokemon: Pokemon; speciesId?: number; color?: string; subtitle?: string }) {
  const types = typeNames(pokemon)
  const art = pokemonArt(pokemon)
  return (
    <div className="mini-mon" style={{ '--c': color ?? typeColor(types[0]) } as CSSProperties}>
      {art && <img src={art} alt="" />}
      <div>
        <div className="mini-no">{dexNumber(speciesId ?? pokemon.id)}</div>
        <div className="mini-name">{displayName(pokemon.name)}</div>
        <div className="types">
          {types.map((t) => (
            <TypeBadge key={t} type={t} small />
          ))}
        </div>
        {subtitle && <div className="mini-sub">{subtitle}</div>}
      </div>
    </div>
  )
}
