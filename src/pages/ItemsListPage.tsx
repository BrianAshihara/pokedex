import { useQuery } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useDeferredValue, useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { Alert, Brand, Footer, Spinner } from '../components/common'
import { SegmentedControl } from '../components/controls'
import championsItems from '../data/champions-items.json'
import { useItemDescription } from '../hooks/useItemDescription'
import { useSearchField } from '../hooks/useSearchField'
import { useI18n } from '../i18n/I18nProvider'
import { generationLabel } from '../lib/format'
import { ITEM_GROUP_COLORS, ITEM_GROUPS } from '../lib/items'
import { normalizeQuery } from '../lib/pokeapi'
import { allItemsQuery } from '../lib/queries'
import type { ItemGroup, ItemListItem } from '../lib/types'

type SortKey = 'name' | 'group' | 'generation'

const COLUMNS: { key: SortKey; numeric?: boolean }[] = [{ key: 'name' }, { key: 'group' }, { key: 'generation', numeric: true }]

const ROW_ESTIMATE = 45
const ROW_OVERSCAN = 12

function compareItems(a: ItemListItem, b: ItemListItem, key: SortKey, desc: boolean, groupLabels: Record<ItemGroup, string>): number {
  if (key === 'generation' && (!a.generation || !b.generation)) {
    // Itens sem geração registrada vão sempre para o fim.
    if (a.generation !== b.generation) return a.generation ? -1 : 1
    return a.name.localeCompare(b.name)
  }
  const result = key === 'generation' ? a.generation - b.generation : key === 'group' ? groupLabels[a.group].localeCompare(groupLabels[b.group]) : a.name.localeCompare(b.name)
  return (desc ? -result : result) || a.name.localeCompare(b.name)
}

export function ItemsListPage() {
  const [params, setParams] = useSearchParams()
  const { search } = useLocation()
  const navigate = useNavigate()
  const { data, isPending, isError } = useQuery(allItemsQuery())
  const { t } = useI18n()
  const describe = useItemDescription()

  useEffect(() => {
    document.title = `${t.items.title} | Dexpedition`
  }, [t])

  const [query, setQuery] = useSearchField(params.get('q') ?? '')
  const groupParam = params.get('cat') ?? ''
  const group = (ITEM_GROUPS as string[]).includes(groupParam) ? (groupParam as ItemGroup) : null
  const generation = Number(params.get('ger')) || 0
  const championsOnly = params.get('jogo') === 'champions'
  const order = params.get('ordem') ?? 'name'
  const desc = order.startsWith('-')
  const sortKey = (COLUMNS.find((c) => c.key === order.replace(/^-/, ''))?.key ?? 'name') as SortKey

  const columnLabels: Record<SortKey, string> = { name: t.items.item, group: t.items.category, generation: t.moves.generationShort }

  // Filtros na URL: o "Voltar para Itens" devolve a lista exatamente como estava.
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
    const nextDesc = key === sortKey ? !desc : !!numeric
    const value = (nextDesc ? '-' : '') + key
    update({ ordem: value === 'name' ? '' : value })
  }

  const deferredQuery = useDeferredValue(query)
  const generations = useMemo(() => [...new Set(data?.map((i) => i.generation))].filter(Boolean).sort((a, b) => a - b), [data])

  const rows = useMemo(() => {
    if (!data) return []
    const q = normalizeQuery(deferredQuery)
    return data
      .filter((i) => (!q || normalizeQuery(i.name).includes(q)) && (!group || i.group === group) && (!generation || i.generation === generation) && (!championsOnly || i.champions))
      .sort((a, b) => compareItems(a, b, sortKey, desc, t.items.groups))
  }, [data, deferredQuery, group, generation, championsOnly, sortKey, desc, t])

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
  const padTop = visibleRows[0]?.start ?? 0
  const padBottom = virtualizer.getTotalSize() - (visibleRows.at(-1)?.end ?? 0)

  const hasFilters = !!(query || group || generation || championsOnly)
  const gameOptions = [
    { value: '', label: t.items.allGames },
    { value: 'champions', label: 'Champions' },
  ]

  let body
  if (isError) body = <Alert>{t.items.listError}</Alert>
  else if (isPending) body = <Spinner label={t.items.listLoading} />
  else
    body = (
      <>
        <div className="il-filters">
          <input className="input" value={query} onChange={(e) => changeQuery(e.target.value)} placeholder={t.items.searchPlaceholder} aria-label={t.items.searchLabel} autoFocus />
          <SegmentedControl label={t.items.gameFilter} options={gameOptions} value={championsOnly ? 'champions' : ''} onChange={(jogo) => update({ jogo })} />
          <select className="select" aria-label={t.common.generation} value={generation} onChange={(e) => update({ ger: e.target.value === '0' ? '' : e.target.value })}>
            <option value={0}>{t.common.allGenerations}</option>
            {generations.map((g) => (
              <option key={g} value={g}>
                {t.common.generationOption(generationLabel(g))}
              </option>
            ))}
          </select>
        </div>
        <div className="ml-types" role="group" aria-label={t.items.category}>
          {ITEM_GROUPS.map((g) => (
            <button
              key={g}
              type="button"
              className="type-badge sm ml-type"
              aria-pressed={g === group}
              style={{ '--t': ITEM_GROUP_COLORS[g] } as CSSProperties}
              onClick={() => update({ cat: g === group ? '' : g })}
            >
              {t.items.groups[g]}
            </button>
          ))}
        </div>
        {championsOnly && <p className="caption il-note">{t.items.championsNote(championsItems.regulation, championsItems.month)}</p>}
        <div className="ml-count">
          <span>{t.items.count(rows.length)}</span>
          {hasFilters && (
            <button type="button" className="link-btn" onClick={clearFilters}>
              {t.common.clearFilters}
            </button>
          )}
        </div>
        {rows.length ? (
          <div className="mv-scroll ml-scroll" ref={scrollRef}>
            <table className="mv-table il-table">
              <colgroup>
                {COLUMNS.map((c) => (
                  <col key={c.key} className={`il-col-${c.key}`} />
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
                  <th className="mv-effect">{t.items.description}</th>
                </tr>
              </thead>
              <tbody>
                {padTop > 0 && (
                  <tr aria-hidden="true" className="ml-spacer">
                    <td colSpan={COLUMNS.length + 1} style={{ height: padTop }} />
                  </tr>
                )}
                {visibleRows.map(({ index, key }) => {
                  const item = rows[index]
                  const to = `/item/${item.slug}`
                  return (
                    <tr key={key} data-index={index} ref={virtualizer.measureElement} className="mv-row" onClick={() => navigate(to, { state: { list: search } })}>
                      <td className="mv-name">
                        <Link className="il-name" to={to} state={{ list: search }} onClick={(e) => e.stopPropagation()}>
                          {item.sprite ? <img src={item.sprite} alt="" loading="lazy" width={30} height={30} /> : <span className="il-noimg" />}
                          <span>{item.name}</span>
                        </Link>
                      </td>
                      <td>
                        <span className="il-group" style={{ '--t': ITEM_GROUP_COLORS[item.group] } as CSSProperties}>
                          {t.items.groups[item.group]}
                        </span>
                      </td>
                      <td className="mv-num">{item.generation ? generationLabel(item.generation) : '-'}</td>
                      <td className="mv-effect">{describe(item)}</td>
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
          <p className="caption">{t.items.empty}</p>
        )}
      </>
    )

  return (
    <>
      <div className="page-header lab">
        <Brand />
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>
            {t.items.title}
          </h1>
          <div className="page-sub">{t.items.subtitle}</div>
        </div>
      </div>
      <section className="panel">{body}</section>
      <Footer />
    </>
  )
}
