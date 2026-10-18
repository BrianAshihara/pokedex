import { useQuery } from '@tanstack/react-query'
import { useEffect, useState, type CSSProperties } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import { Alert, Footer, Skeleton, Spinner, TypeBadge } from '../components/common'
import { SegmentedControl, Tabs } from '../components/controls'
import { ChevronLeftIcon } from '../components/icons'
import { PokemonCard } from '../components/PokemonCard'
import { usePersistentState } from '../hooks/usePersistentState'
import { CATEGORY_LABELS, displayName, FROM_MOVE_LIST, machineLabel, MOVE_METHODS, typeColor } from '../lib/format'
import { versionGroupLabel } from '../lib/pokeapi'
import { moveLearnersQuery, moveQuery, moveVersionGroupsQuery } from '../lib/queries'
import type { Move, MoveLearner } from '../lib/types'
import { DexHeader } from './PokedexPage'

type LearnerSort = 'dex' | 'level'

const SORT_OPTIONS: { value: LearnerSort; label: string }[] = [
  { value: 'dex', label: 'Pokédex' },
  { value: 'level', label: 'Nível' },
]

function levelLabel(level: number): string {
  return level === 0 ? 'Evo.' : `Nv ${level}`
}

function MoveSummary({ move, machine }: { move: Move; machine: string }) {
  return (
    <div className="move-summary">
      <div className="move-title">
        <h1>{move.name}</h1>
        <TypeBadge type={move.type} />
        <span className={`mv-cat ${move.category}`}>{CATEGORY_LABELS[move.category] ?? move.category}</span>
        {machine && <span className="move-machine">{machineLabel(machine)}</span>}
      </div>
      <dl className="move-stats">
        <div>
          <dt>Poder</dt>
          <dd>{move.power || '-'}</dd>
        </div>
        <div>
          <dt>Precisão</dt>
          <dd>{move.accuracy ? `${move.accuracy}%` : '-'}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{move.pp || '-'}</dd>
        </div>
      </dl>
      {move.effect && <p className="move-effect">{move.effect}</p>}
    </div>
  )
}

function Learners({ slug, versionGroup }: { slug: string; versionGroup: string }) {
  const { data, isPending, isError } = useQuery(moveLearnersQuery(slug, versionGroup))
  const [activeTab, setActiveTab] = useState('level-up')
  const [filter, setFilter] = useState('')
  const [sort, setSort] = useState<LearnerSort>('dex')

  if (isError) return <Alert>Não foi possível carregar quem aprende este golpe. Tente novamente em instantes.</Alert>
  if (isPending) return <Spinner label="Buscando Pokémon que aprendem este golpe..." />

  const known = new Set(MOVE_METHODS.map(([method]) => method))
  const sections = MOVE_METHODS.filter(([method]) => data.byMethod[method]?.length).map(([method, label]) => ({ method, label, rows: data.byMethod[method] }))
  // Métodos raros (form-change, light-ball-egg…) viram "Outros", sem repetir Pokémon.
  const others = new Map<string, MoveLearner>()
  for (const [method, rows] of Object.entries(data.byMethod)) {
    if (!known.has(method)) for (const row of rows) others.set(row.name, row)
  }
  if (others.size) sections.push({ method: 'other', label: 'Outros', rows: [...others.values()].sort((a, b) => a.speciesId - b.speciesId || a.id - b.id) })

  const current = sections.find((s) => s.method === activeTab) ?? sections[0]
  if (!current) return <p className="caption">Nenhum Pokémon aprende este golpe neste jogo.</p>

  const query = filter.trim().toLowerCase()
  let rows = query ? current.rows.filter((r) => displayName(r.name).toLowerCase().includes(query) || r.name.includes(query)) : current.rows
  // Já vem por número da Pokédex; o sort é estável, então empates de nível mantêm essa ordem.
  if (current.method === 'level-up' && sort === 'level') rows = [...rows].sort((a, b) => a.levels[0] - b.levels[0])

  return (
    <>
      <div className="learners-head">
        <Tabs
          label="Método de aprendizado"
          tabs={sections.map((s) => ({ value: s.method, label: `${s.label} (${s.rows.length})` }))}
          active={current.method}
          onChange={setActiveTab}
        />
        <div className="learners-tools">
          {current.method === 'level-up' && <SegmentedControl label="Ordenar por" options={SORT_OPTIONS} value={sort} onChange={setSort} />}
          <input className="input sm" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filtrar Pokémon" aria-label="Filtrar Pokémon" />
        </div>
      </div>
      {rows.length ? (
        <div className="learner-grid">
          {rows.map((r) => (
            <PokemonCard
              key={r.name}
              name={r.name}
              speciesId={r.speciesId}
              types={r.types}
              sprite={r.sprite}
              note={current.method === 'level-up' ? r.levels.map(levelLabel).join(' · ') : undefined}
            />
          ))}
        </div>
      ) : (
        <p className="caption">Nenhum Pokémon com esse nome nesta aba.</p>
      )}
    </>
  )
}

export function MovePage() {
  const { slug = '' } = useParams()
  const [params, setParams] = useSearchParams()
  // Mesma preferência de jogo do painel de Golpes.
  const [savedGroup, setSavedGroup] = usePersistentState<string | null>('pokedex:version-group', null)
  const move = useQuery(moveQuery(slug))
  const groups = useQuery(moveVersionGroupsQuery(slug))

  useEffect(() => {
    document.title = move.data ? `${move.data.name} | Pokédex` : 'Pokédex'
  }, [move.data])

  const available = groups.data ?? []
  const requested = params.get('jogo')
  const versionGroup = [requested, savedGroup].find((vg) => vg && available.includes(vg)) ?? available[available.length - 1] ?? null

  const from = params.get('de')
  // Vindo da lista de Golpes, o state guarda a busca/filtros dela para o botão de voltar.
  const location = useLocation()
  const listSearch = (location.state as { list?: string } | null)?.list ?? ''
  const back = from === FROM_MOVE_LIST ? { to: `/golpes${listSearch}`, label: 'Golpes' } : from ? { to: `/pokemon/${from}`, label: displayName(from) } : null

  const changeGroup = (vg: string) => {
    setSavedGroup(vg)
    setParams({ jogo: vg, ...(from && { de: from }) }, { replace: true, state: location.state })
  }

  const learners = useQuery({ ...moveLearnersQuery(slug, versionGroup ?? ''), enabled: !!versionGroup })

  let content
  if (move.isPending) {
    content = <Skeleton height={180} />
  } else if (move.isError) {
    content = <Alert>Não foi possível acessar a PokeAPI agora. Tente novamente em instantes.</Alert>
  } else if (!move.data) {
    content = <Alert>Nenhum golpe encontrado para "{slug}".</Alert>
  } else {
    let body
    if (groups.isError) body = <Alert>Não foi possível carregar quem aprende este golpe. Tente novamente em instantes.</Alert>
    else if (groups.isPending) body = <Spinner label="Buscando jogos..." />
    else if (!versionGroup) body = <p className="caption">Nenhum Pokémon aprende este golpe.</p>
    else body = <Learners key={versionGroup} slug={slug} versionGroup={versionGroup} />

    content = (
      <>
        <section className="panel move-panel" style={{ '--accent': typeColor(move.data.type) } as CSSProperties}>
          <MoveSummary move={move.data} machine={learners.data?.machine ?? ''} />
        </section>
        <section className="panel">
          <div className="moves-head">
            <h2 className="card-title">Pokémon que aprendem</h2>
            {versionGroup && (
              <select className="select" aria-label="Jogo" value={versionGroup} onChange={(e) => changeGroup(e.target.value)}>
                {[...available].reverse().map((vg) => (
                  <option key={vg} value={vg}>
                    {versionGroupLabel(vg)}
                  </option>
                ))}
              </select>
            )}
          </div>
          {body}
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
          Voltar para {back.label}
        </Link>
      )}
      {content}
      <Footer />
    </>
  )
}
