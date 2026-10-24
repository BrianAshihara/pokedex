import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useContentText } from '../i18n/content'
import { useI18n } from '../i18n/I18nProvider'
import { machineLabel, MOVE_METHODS, moveLink } from '../lib/format'
import { defaultVersionGroup, sortedVersionGroups, versionGroupLabel } from '../lib/pokeapi'
import { learnsetQuery } from '../lib/queries'
import type { LearnedMove, Pokemon } from '../lib/types'
import { Alert, Spinner, TypeBadge } from './common'
import { Tabs } from './controls'

function MovesTable({ rows, method, versionGroup, pokemonName }: { rows: LearnedMove[]; method: string; versionGroup: string; pokemonName: string }) {
  const navigate = useNavigate()
  const { t } = useI18n()
  const text = useContentText('moves')
  const firstHeader = method === 'level-up' ? t.moves.levelShort : method === 'machine' ? t.moves.methods.machine : null
  return (
    <div className="mv-scroll">
      <table className="mv-table">
        <thead>
          <tr>
            {firstHeader && <th className="mv-first">{firstHeader}</th>}
            <th>{t.moves.move}</th>
            <th>{t.common.type}</th>
            <th>{t.moves.category}</th>
            <th className="mv-num">{t.moves.power}</th>
            <th className="mv-num">{t.moves.accuracy}</th>
            <th className="mv-num">{t.moves.pp}</th>
            <th className="mv-effect">{t.moves.effect}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.name}-${r.level}-${i}`} className="mv-row" onClick={() => navigate(moveLink(r.slug, versionGroup, pokemonName))}>
              {method === 'level-up' && <td className="mv-first">{r.level === 0 ? t.moves.evolutionShort : r.level}</td>}
              {method === 'machine' && <td className="mv-first">{machineLabel(r.machine, t.moves.machinePrefixes)}</td>}
              <td className="mv-name">
                <Link to={moveLink(r.slug, versionGroup, pokemonName)} onClick={(e) => e.stopPropagation()}>
                  {r.name}
                </Link>
              </td>
              <td>
                <TypeBadge type={r.type} small link="move" />
              </td>
              <td>
                <span className={`mv-cat ${r.category}`}>{t.moves.categories[r.category] ?? r.category}</span>
              </td>
              <td className="mv-num">{r.power || '-'}</td>
              <td className="mv-num">{r.accuracy ? `${r.accuracy}%` : '-'}</td>
              <td className="mv-num">{r.pp || '-'}</td>
              <td className="mv-effect">{text(r.slug, r.effect)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface MovesPanelProps {
  pokemon: Pokemon
  /** Jogo escolhido pelo usuário; mantido entre Pokémon enquanto existir no novo learnset. */
  versionGroup: string | null
  onVersionGroupChange: (value: string) => void
}

export function MovesPanel({ pokemon, versionGroup, onVersionGroupChange }: MovesPanelProps) {
  const groups = sortedVersionGroups(pokemon.learnset)
  const selected = versionGroup && groups.includes(versionGroup) ? versionGroup : defaultVersionGroup(pokemon.learnset)
  const [activeTab, setActiveTab] = useState<string>('level-up')
  const { t } = useI18n()

  const { data: grouped, isPending, isError } = useQuery({
    ...learnsetQuery(pokemon.name, pokemon.learnset, selected ?? ''),
    enabled: selected !== null,
  })

  let body
  if (!selected) {
    body = <p className="caption">{t.moves.noMovesForPokemon}</p>
  } else if (isError) {
    body = <Alert>{t.moves.panelError}</Alert>
  } else if (isPending) {
    body = <Spinner label={t.moves.panelLoading} />
  } else {
    const known = new Set(MOVE_METHODS)
    const sections = MOVE_METHODS.filter((method) => grouped[method]?.length).map((method) => ({ method, label: t.moves.methods[method], rows: grouped[method] }))
    const others = Object.entries(grouped)
      .filter(([method]) => !known.has(method))
      .flatMap(([, rows]) => rows)
      .sort((a, b) => a.name.localeCompare(b.name))
    if (others.length) sections.push({ method: 'other', label: t.moves.otherMethods, rows: others })

    const current = sections.find((s) => s.method === activeTab) ?? sections[0]
    body = current ? (
      <>
        <Tabs
          label={t.moves.learnMethod}
          tabs={sections.map((s) => ({ value: s.method, label: `${s.label} (${s.rows.length})` }))}
          active={current.method}
          onChange={setActiveTab}
        />
        <MovesTable rows={current.rows} method={current.method} versionGroup={selected} pokemonName={pokemon.name} />
      </>
    ) : (
      <p className="caption">{t.moves.noMovesInGame}</p>
    )
  }

  return (
    <section className="panel">
      <div className="moves-head">
        <h2 className="card-title">{t.moves.title}</h2>
        {selected && (
          <select className="select" aria-label={t.moves.game} value={selected} onChange={(e) => onVersionGroupChange(e.target.value)}>
            {[...groups].reverse().map((vg) => (
              <option key={vg} value={vg}>
                {versionGroupLabel(vg)}
              </option>
            ))}
          </select>
        )}
      </div>
      {body}
    </section>
  )
}
