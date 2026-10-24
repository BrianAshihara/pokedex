import { useQuery } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useDeferredValue, useEffect, useMemo, useRef } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { Alert, Brand, Footer, Spinner, TypeBadge } from '../components/common'
import { SegmentedControl, TypeFilter } from '../components/controls'
import { useSearchField } from '../hooks/useSearchField'
import { useContentText } from '../i18n/content'
import { useI18n } from '../i18n/I18nProvider'
import { FROM_MOVE_LIST, generationLabel, moveLink, TYPE_COLORS } from '../lib/format'
import { allMovesQuery } from '../lib/queries'
import type { MoveListItem } from '../lib/types'

type SortKey = 'name' | 'type' | 'category' | 'power' | 'accuracy' | 'pp' | 'generation'

const COLUMNS: { key: SortKey; numeric?: boolean }[] = [
  { key: 'name' },
  { key: 'type' },
  { key: 'category' },
  { key: 'power', numeric: true },
  { key: 'accuracy', numeric: true },
  { key: 'pp', numeric: true },
  { key: 'generation', numeric: true },
]

const CATEGORIES = ['physical', 'special', 'status']

// Só as linhas visíveis (mais uma margem) são renderizadas: com 800+ golpes, filtrar, ordenar
// e trocar de idioma deixa de recalcular a tabela inteira.
const ROW_ESTIMATE = 41
const ROW_OVERSCAN = 12

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
  const { t } = useI18n()
  const text = useContentText('moves')

  useEffect(() => {
    document.title = `${t.moves.title} | Dexpedition`
  }, [t])

  const columnLabels: Record<SortKey, string> = {
    name: t.moves.move,
    type: t.common.type,
    category: t.moves.category,
    power: t.moves.power,
    accuracy: t.moves.accuracy,
    pp: t.moves.pp,
    generation: t.moves.generationShort,
  }
  const categoryOptions = [{ value: '', label: t.moves.allCategories }, ...CATEGORIES.map((value) => ({ value, label: t.moves.categories[value] }))]

  const [query, setQuery] = useSearchField(params.get('q') ?? '')
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

  const scrollRef = useRef<HTMLDivElement>(null)
  // O aviso é sobre o React Compiler, que o projeto não usa.
  // oxlint-disable-next-line react/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_ESTIMATE,
    getItemKey: (index) => rows[index].slug,
    overscan: ROW_OVERSCAN,
  })
  const visibleRows = virtualizer.getVirtualItems()
  // Linhas vazias acima e abaixo ocupam o espaço das que não estão renderizadas, mantendo a rolagem.
  const padTop = visibleRows[0]?.start ?? 0
  const padBottom = virtualizer.getTotalSize() - (visibleRows.at(-1)?.end ?? 0)

  const open = (slug: string) => navigate(moveLink(slug, undefined, FROM_MOVE_LIST), { state: { list: search } })
  const hasFilters = !!(query || type || category || generation)

  let body
  if (isError) body = <Alert>{t.moves.listError}</Alert>
  else if (isPending) body = <Spinner label={t.moves.listLoading} />
  else
    body = (
      <>
        <div className="ml-filters">
          <input
            className="input"
            value={query}
            onChange={(e) => changeQuery(e.target.value)}
            placeholder={t.moves.searchPlaceholder}
            aria-label={t.moves.searchLabel}
            autoFocus
          />
          <SegmentedControl label={t.moves.category} options={categoryOptions} value={category} onChange={(cat) => update({ cat })} />
          <select className="select" aria-label={t.common.generation} value={generation} onChange={(e) => update({ ger: e.target.value === '0' ? '' : e.target.value })}>
            <option value={0}>{t.common.allGenerations}</option>
            {generations.map((g) => (
              <option key={g} value={g}>
                {t.common.generationOption(generationLabel(g))}
              </option>
            ))}
          </select>
        </div>
        <TypeFilter types={types} selected={[type]} onToggle={(t) => update({ tipo: t === type ? '' : t })} />
        <div className="ml-count">
          <span>{t.moves.count(rows.length)}</span>
          {hasFilters && (
            <button type="button" className="link-btn" onClick={clearFilters}>
              {t.common.clearFilters}
            </button>
          )}
        </div>
        {rows.length ? (
          <div className="mv-scroll ml-scroll" ref={scrollRef}>
            <table className="mv-table">
              {/* Larguras fixas: com a virtualização, as colunas não podem depender das linhas visíveis. */}
              <colgroup>
                {COLUMNS.map((c) => (
                  <col key={c.key} className={`ml-col-${c.key}`} />
                ))}
                <col className="mv-effect" />
              </colgroup>
              <thead>
                <tr>
                  {COLUMNS.map((c) => (
                    <th key={c.key} className={c.numeric ? 'mv-num' : undefined} aria-sort={c.key === sortKey ? (desc ? 'descending' : 'ascending') : undefined}>
                      <button type="button" className="ml-sort" onClick={() => toggleSort(c.key, c.numeric)}>
                        {columnLabels[c.key]}
                        <span className="ml-arrow" aria-hidden="true">
                          {c.key === sortKey ? (desc ? '▼' : '▲') : ''}
                        </span>
                      </button>
                    </th>
                  ))}
                  <th className="mv-effect">{t.moves.effect}</th>
                </tr>
              </thead>
              <tbody>
                {padTop > 0 && (
                  <tr aria-hidden="true" className="ml-spacer">
                    <td colSpan={COLUMNS.length + 1} style={{ height: padTop }} />
                  </tr>
                )}
                {visibleRows.map(({ index, key }) => {
                  const m = rows[index]
                  return (
                    <tr key={key} data-index={index} ref={virtualizer.measureElement} className="mv-row" onClick={() => open(m.slug)}>
                      <td className="mv-name">
                        <Link to={moveLink(m.slug, undefined, FROM_MOVE_LIST)} state={{ list: search }} onClick={(e) => e.stopPropagation()}>
                          {m.name}
                        </Link>
                      </td>
                      <td>
                        <TypeBadge type={m.type} small link="move" />
                      </td>
                      <td>
                        <span className={`mv-cat ${m.category}`}>{t.moves.categories[m.category] ?? m.category}</span>
                      </td>
                      <td className="mv-num">{m.power || '-'}</td>
                      <td className="mv-num">{m.accuracy ? `${m.accuracy}%` : '-'}</td>
                      <td className="mv-num">{m.pp || '-'}</td>
                      <td className="mv-num">{generationLabel(m.generation)}</td>
                      <td className="mv-effect">{text(m.slug, m.effect)}</td>
                    </tr>
                  )
                })}
                {padBottom > 0 && (
                  <tr aria-hidden="true" className="ml-spacer">
                    <td colSpan={COLUMNS.length + 1} style={{ height: padBottom }} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="caption">{t.moves.empty}</p>
        )}
      </>
    )

  return (
    <>
      <div className="page-header lab">
        <Brand />
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>
            {t.moves.title}
          </h1>
          <div className="page-sub">{t.moves.subtitle}</div>
        </div>
      </div>
      <section className="panel">{body}</section>
      <Footer />
    </>
  )
}
