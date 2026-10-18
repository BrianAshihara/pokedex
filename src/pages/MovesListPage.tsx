import { useQuery } from '@tanstack/react-query'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { Alert, Brand, Footer, Spinner, TypeBadge } from '../components/common'
import { SegmentedControl, TypeFilter } from '../components/controls'
import { CATEGORY_LABELS, FROM_MOVE_LIST, generationLabel, moveLink, TYPE_COLORS } from '../lib/format'
import { allMovesQuery } from '../lib/queries'
import type { MoveListItem } from '../lib/types'

type SortKey = 'name' | 'type' | 'category' | 'power' | 'accuracy' | 'pp' | 'generation'

const COLUMNS: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: 'name', label: 'Golpe' },
  { key: 'type', label: 'Tipo' },
  { key: 'category', label: 'Categoria' },
  { key: 'power', label: 'Poder', numeric: true },
  { key: 'accuracy', label: 'Precisão', numeric: true },
  { key: 'pp', label: 'PP', numeric: true },
  { key: 'generation', label: 'Ger.', numeric: true },
]

const CATEGORY_OPTIONS = [{ value: '', label: 'Todas' }, ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))]

const TYPE_ORDER = Object.keys(TYPE_COLORS)

function compareMoves(a: MoveListItem, b: MoveListItem, key: SortKey, desc: boolean): number {
  const va = a[key]
  const vb = b[key]
  // Golpes sem poder/precisão (status, golpes que nunca erram) vão sempre para o fim.
  if (va == null || vb == null) return va == null ? (vb == null ? 0 : 1) : -1
  const result = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))
  return (desc ? -result : result) || a.name.localeCompare(b.name)
}

export function MovesListPage() {
  const [params, setParams] = useSearchParams()
  const { search } = useLocation()
  const navigate = useNavigate()
  const { data, isPending, isError } = useQuery(allMovesQuery())

  useEffect(() => {
    document.title = 'Golpes | Pokédex'
  }, [])

  // O campo tem estado próprio: a URL atualiza um instante depois e, lida direto, engoliria letras digitadas rápido.
  const [query, setQuery] = useState(() => params.get('q') ?? '')
  const type = params.get('tipo') ?? ''
  const category = params.get('cat') ?? ''
  const generation = Number(params.get('ger')) || 0
  const order = params.get('ordem') ?? 'name'
  const desc = order.startsWith('-')
  const sortKey = (COLUMNS.find((c) => c.key === order.replace(/^-/, ''))?.key ?? 'name') as SortKey

  // Filtros vivem na URL: assim o "Voltar para Golpes" devolve a lista exatamente como estava.
  const update = (changes: Record<string, string>) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value)
          else next.delete(key)
        }
        return next
      },
      { replace: true },
    )
  }

  const changeQuery = (value: string) => {
    setQuery(value)
    update({ q: value })
  }

  const clearFilters = () => {
    setQuery('')
    setParams(order === 'name' ? {} : { ordem: order }, { replace: true })
  }

  const toggleSort = (key: SortKey, numeric?: boolean) => {
    // Números começam do maior (o mais forte primeiro); texto, de A a Z.
    const nextDesc = key === sortKey ? !desc : !!numeric
    const value = (nextDesc ? '-' : '') + key
    update({ ordem: value === 'name' ? '' : value })
  }

  const deferredQuery = useDeferredValue(query)
  const types = useMemo(() => [...new Set(data?.map((m) => m.type))].sort((a, b) => TYPE_ORDER.indexOf(a) - TYPE_ORDER.indexOf(b)), [data])
  const generations = useMemo(() => [...new Set(data?.map((m) => m.generation))].sort((a, b) => a - b), [data])

  const rows = useMemo(() => {
    if (!data) return []
    const q = deferredQuery.trim().toLowerCase()
    return data
      .filter(
        (m) =>
          (!q || m.name.toLowerCase().includes(q) || m.slug.includes(q)) &&
          (!type || m.type === type) &&
          (!category || m.category === category) &&
          (!generation || m.generation === generation),
      )
      .sort((a, b) => compareMoves(a, b, sortKey, desc))
  }, [data, deferredQuery, type, category, generation, sortKey, desc])

  const open = (slug: string) => navigate(moveLink(slug, undefined, FROM_MOVE_LIST), { state: { list: search } })
  const hasFilters = !!(query || type || category || generation)

  let body
  if (isError) body = <Alert>Não foi possível carregar a lista de golpes. Tente novamente em instantes.</Alert>
  else if (isPending) body = <Spinner label="Buscando todos os golpes..." />
  else
    body = (
      <>
        <div className="ml-filters">
          <input
            className="input"
            value={query}
            onChange={(e) => changeQuery(e.target.value)}
            placeholder="Buscar golpe (ex: Flamethrower)"
            aria-label="Buscar golpe"
            autoFocus
          />
          <SegmentedControl label="Categoria" options={CATEGORY_OPTIONS} value={category} onChange={(cat) => update({ cat })} />
          <select className="select" aria-label="Geração" value={generation} onChange={(e) => update({ ger: e.target.value === '0' ? '' : e.target.value })}>
            <option value={0}>Todas as gerações</option>
            {generations.map((g) => (
              <option key={g} value={g}>
                Geração {generationLabel(g)}
              </option>
            ))}
          </select>
        </div>
        <TypeFilter types={types} selected={[type]} onToggle={(t) => update({ tipo: t === type ? '' : t })} />
        <div className="ml-count">
          <span>
            {rows.length} {rows.length === 1 ? 'golpe' : 'golpes'}
          </span>
          {hasFilters && (
            <button type="button" className="link-btn" onClick={clearFilters}>
              Limpar filtros
            </button>
          )}
        </div>
        {rows.length ? (
          <div className="mv-scroll ml-scroll">
            <table className="mv-table">
              <thead>
                <tr>
                  {COLUMNS.map((c) => (
                    <th key={c.key} className={c.numeric ? 'mv-num' : undefined} aria-sort={c.key === sortKey ? (desc ? 'descending' : 'ascending') : undefined}>
                      <button type="button" className="ml-sort" onClick={() => toggleSort(c.key, c.numeric)}>
                        {c.label}
                        <span className="ml-arrow" aria-hidden="true">
                          {c.key === sortKey ? (desc ? '▼' : '▲') : ''}
                        </span>
                      </button>
                    </th>
                  ))}
                  <th className="mv-effect">Efeito</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.slug} className="mv-row" onClick={() => open(m.slug)}>
                    <td className="mv-name">
                      <Link to={moveLink(m.slug, undefined, FROM_MOVE_LIST)} state={{ list: search }} onClick={(e) => e.stopPropagation()}>
                        {m.name}
                      </Link>
                    </td>
                    <td>
                      <TypeBadge type={m.type} small />
                    </td>
                    <td>
                      <span className={`mv-cat ${m.category}`}>{CATEGORY_LABELS[m.category] ?? m.category}</span>
                    </td>
                    <td className="mv-num">{m.power || '-'}</td>
                    <td className="mv-num">{m.accuracy ? `${m.accuracy}%` : '-'}</td>
                    <td className="mv-num">{m.pp || '-'}</td>
                    <td className="mv-num">{generationLabel(m.generation)}</td>
                    <td className="mv-effect">{m.effect}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="caption">Nenhum golpe encontrado com esses filtros.</p>
        )}
      </>
    )

  return (
    <>
      <div className="page-header lab">
        <Brand />
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>
            Golpes
          </h1>
          <div className="page-sub">Explore todos os golpes e descubra quais Pokémon aprendem cada um.</div>
        </div>
      </div>
      <section className="panel">{body}</section>
      <Footer />
    </>
  )
}
