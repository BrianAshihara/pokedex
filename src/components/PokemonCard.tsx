import { memo } from 'react'
import { Link } from 'react-router'
import { dexNumber, displayName } from '../lib/format'
import { TypeBadge } from './common'

interface PokemonCardProps {
  name: string
  speciesId: number
  types: string[]
  sprite: string | null
  /** Linha extra em destaque, ex: "Nv 36" ou "Speed 130". */
  note?: string
}

// memo: listas com centenas de cards não precisam renderizar todos de novo a cada mudança no pai
// (ex.: troca de idioma); só os badges de tipo, que leem o idioma do contexto, se atualizam.
export const PokemonCard = memo(function PokemonCard({ name, speciesId, types, sprite, note }: PokemonCardProps) {
  return (
    <Link className="learner" to={`/pokemon/${name}`}>
      {sprite ? (
        // Algumas formas não têm sprite no repositório: some a imagem quebrada, fica o espaço.
        <img src={sprite} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
      ) : (
        <div className="img-placeholder" />
      )}
      <span className="learner-no">{dexNumber(speciesId)}</span>
      <span className="learner-name">{displayName(name)}</span>
      <span className="types">
        {types.map((t) => (
          <TypeBadge key={t} type={t} small link="pokemon" nested />
        ))}
      </span>
      {note && <span className="learner-how">{note}</span>}
    </Link>
  )
})
