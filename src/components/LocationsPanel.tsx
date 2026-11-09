import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { useI18n } from '../i18n/I18nProvider'
import { addPreEvolutions, conditionLabel, curatedEncounters, gameLabel, methodLabel } from '../lib/encounters'
import { displayName } from '../lib/format'
import { encountersQuery, preEvolutionEncountersQuery } from '../lib/queries'
import type { EncounterRow, Pokemon, Species } from '../lib/types'
import { Alert, Spinner } from './common'

function levelText(row: EncounterRow, level: (text: string) => string): string {
  if (row.minLevel === null) return '-'
  return level(row.minLevel === row.maxLevel ? String(row.minLevel) : `${row.minLevel}-${row.maxLevel}`)
}

export function LocationsPanel({ pokemon, species }: { pokemon: Pokemon; species: Species | null }) {
  const { t, lang } = useI18n()
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
    body = (
      <div className="mv-scroll">
        <table className="mv-table loc-table">
          <thead>
            <tr>
              <th>{t.locations.area}</th>
              <th>{t.locations.method}</th>
              <th className="mv-num">{t.locations.level}</th>
              <th className="mv-num">{t.locations.chance}</th>
              <th>{t.locations.details}</th>
            </tr>
          </thead>
          <tbody>
            {current.rows.map((row, i) => {
              const details = [...row.conditions.map((c) => conditionLabel(c, t.locations)), row.note?.[lang]].filter(Boolean).join(' · ')
              return (
                <tr key={i}>
                  <td className="mv-name loc-area">{row.areaName ?? '-'}</td>
                  <td>{methodLabel(row.method, t.locations)}</td>
                  <td className="mv-num">{levelText(row, t.locations.levelValue)}</td>
                  <td className="mv-num">{row.chance === null ? '-' : `${row.chance}%`}</td>
                  <td className="loc-details">
                    {row.via && (
                      <span className="loc-via">
                        {t.locations.viaBefore} <Link to={`/pokemon/${row.via}`}>{displayName(row.via)}</Link>
                        {t.locations.viaAfter}
                      </span>
                    )}
                    {details || (!row.via && '-')}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
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
