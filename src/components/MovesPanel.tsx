import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { defaultVersionGroup, sortedVersionGroups, versionGroupLabel } from '../lib/pokeapi'
import { learnsetQuery } from '../lib/queries'
import type { LearnedMove, Pokemon } from '../lib/types'
import { Alert, Spinner, TypeBadge } from './common'
import { Tabs } from './controls'

const MOVE_METHODS: [string, string][] = [
  ['level-up', 'Nível'],
  ['egg', 'Ovo'],
  ['machine', 'MT'],
  ['tutor', 'Tutor'],
]
const CATEGORY_LABELS: Record<string, string> = { physical: 'Físico', special: 'Especial', status: 'Status' }
const MACHINE_PREFIXES: [string, string][] = [
  ['TM', 'MT'],
  ['HM', 'MO'],
  ['TR', 'DT'],
]

function machineLabel(label: string): string {
  const match = MACHINE_PREFIXES.find(([en]) => label.startsWith(en))
  return match ? match[1] + label.slice(match[0].length) : label || '?'
}

function MovesTable({ rows, method }: { rows: LearnedMove[]; method: string }) {
  const firstHeader = method === 'level-up' ? 'Nv.' : method === 'machine' ? 'MT' : null
  return (
    <div className="mv-scroll">
      <table className="mv-table">
        <thead>
          <tr>
            {firstHeader && <th className="mv-first">{firstHeader}</th>}
            <th>Golpe</th>
            <th>Tipo</th>
            <th>Categoria</th>
            <th className="mv-num">Poder</th>
            <th className="mv-num">Precisão</th>
            <th className="mv-num">PP</th>
            <th className="mv-effect">Efeito</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.name}-${r.level}-${i}`}>
              {method === 'level-up' && <td className="mv-first">{r.level === 0 ? 'Evo.' : r.level}</td>}
              {method === 'machine' && <td className="mv-first">{machineLabel(r.machine)}</td>}
              <td className="mv-name">{r.name}</td>
              <td>
                <TypeBadge type={r.type} small />
              </td>
              <td>
                <span className={`mv-cat ${r.category}`}>{CATEGORY_LABELS[r.category] ?? r.category}</span>
              </td>
              <td className="mv-num">{r.power || '-'}</td>
              <td className="mv-num">{r.accuracy ? `${r.accuracy}%` : '-'}</td>
              <td className="mv-num">{r.pp || '-'}</td>
              <td className="mv-effect">{r.effect}</td>
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

  const { data: grouped, isPending, isError } = useQuery({
    ...learnsetQuery(pokemon.name, pokemon.learnset, selected ?? ''),
    enabled: selected !== null,
  })

  let body
  if (!selected) {
    body = <p className="caption">Nenhum golpe registrado para este Pokémon.</p>
  } else if (isError) {
    body = <Alert>Não foi possível carregar os golpes agora. Tente novamente em instantes.</Alert>
  } else if (isPending) {
    body = <Spinner label="Carregando golpes..." />
  } else {
    const known = new Set(MOVE_METHODS.map(([method]) => method))
    const sections = MOVE_METHODS.filter(([method]) => grouped[method]?.length).map(([method, label]) => ({ method, label, rows: grouped[method] }))
    const others = Object.entries(grouped)
      .filter(([method]) => !known.has(method))
      .flatMap(([, rows]) => rows)
      .sort((a, b) => a.name.localeCompare(b.name))
    if (others.length) sections.push({ method: 'other', label: 'Outros', rows: others })

    const current = sections.find((s) => s.method === activeTab) ?? sections[0]
    body = current ? (
      <>
        <Tabs
          label="Método de aprendizado"
          tabs={sections.map((s) => ({ value: s.method, label: `${s.label} (${s.rows.length})` }))}
          active={current.method}
          onChange={setActiveTab}
        />
        <MovesTable rows={current.rows} method={current.method} />
      </>
    ) : (
      <p className="caption">Nenhum golpe registrado neste jogo.</p>
    )
  }

  return (
    <section className="panel">
      <div className="moves-head">
        <h2 className="card-title">Golpes</h2>
        {selected && (
          <select className="select" aria-label="Jogo" value={selected} onChange={(e) => onVersionGroupChange(e.target.value)}>
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
