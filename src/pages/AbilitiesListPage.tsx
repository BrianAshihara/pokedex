import { useQuery } from '@tanstack/react-query'
import { useDeferredValue, useEffect, useMemo } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { Alert, Brand, Footer, Spinner } from '../components/common'
import { useSearchField } from '../hooks/useSearchField'
import { useContentText } from '../i18n/content'
import { useI18n } from '../i18n/I18nProvider'
import { abilityLink, FROM_ABILITY_LIST, generationLabel } from '../lib/format'
import { allAbilitiesQuery } from '../lib/queries'
import type { AbilityListItem } from '../lib/types'

type SortKey = 'name' | 'count' | 'generation'

const COLUMNS: { key: SortKey; numeric?: boolean }[] = [{ key: 'name' }, { key: 'count', numeric: true }, { key: 'generation', numeric: true }]

function compareAbilities(a: AbilityListItem, b: AbilityListItem, key: SortKey, desc: boolean): number {
  const result = key === 'name' ? a.name.localeCompare(b.name) : a[key] - b[key]
  return (desc ? -result : result) || a.name.localeCompare(b.name)
}

export function AbilitiesListPage() {
  const [params, setParams] = useSearchParams()
  const { search } = useLocation()
  const navigate = useNavigate()
  const { data, isPending, isError } = useQuery(allAbilitiesQuery())
  const { t } = useI18n()
  const text = useContentText('abilities')

  useEffect(() => {
    document.title = `${t.abilityList.title} | Dexpedition`
  }, [t])

  const columnLabels: Record<SortKey, string> = {
    name: t.abilityList.ability,
    count: t.abilityList.pokemon,
    generation: t.abilityList.generationShort,
  }

  const [query, setQuery] = useSearchField(params.get('q') ?? '')
  const generation = Number(params.get('ger')) || 0
  const order = params.get('ordem') ?? 'name'
  const desc = order.startsWith('-')
  const sortKey = (COLUMNS.find((c) => c.key === order.replace(/^-/, ''))?.key ?? 'name') as SortKey

  // Filtros na URL, como em Golpes: o "Voltar para Habilidades" devolve a lista como estava.
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
    // Números começam do maior (as mais comuns primeiro); texto, de A a Z.
    const nextDesc = key === sortKey ? !desc : !!numeric
    const value = (nextDesc ? '-' : '') + key
    update({ ordem: value === 'name' ? '' : value })
  }

  const deferredQuery = useDeferredValue(query)
  const generations = useMemo(() => [...new Set(data?.map((a) => a.generation))].filter(Boolean).sort((a, b) => a - b), [data])

  const rows = useMemo(() => {
    if (!data) return []
    const q = deferredQuery.trim().toLowerCase()
    return data
      .filter((a) => (!q || a.name.toLowerCase().includes(q) || a.slug.includes(q.replaceAll(' ', '-'))) && (!generation || a.generation === generation))
      .sort((a, b) => compareAbilities(a, b, sortKey, desc))
  }, [data, deferredQuery, generation, sortKey, desc])

  const open = (slug: string) => navigate(abilityLink(slug, FROM_ABILITY_LIST), { state: { list: search } })
  const hasFilters = !!(query || generation)

  let body
  if (isError) body = <Alert>{t.abilityList.listError}</Alert>
  else if (isPending) body = <Spinner label={t.abilityList.listLoading} />
  else
    body = (
      <>
        <div className="ml-filters al-filters">
          <input
            className="input"
            value={query}
            onChange={(e) => changeQuery(e.target.value)}
            placeholder={t.abilityList.searchPlaceholder}
            aria-label={t.abilityList.searchLabel}
            autoFocus
          />
          <select className="select" aria-label={t.common.generation} value={generation} onChange={(e) => update({ ger: e.target.value === '0' ? '' : e.target.value })}>
            <option value={0}>{t.common.allGenerations}</option>
            {generations.map((g) => (
              <option key={g} value={g}>
                {t.common.generationOption(generationLabel(g))}
              </option>
            ))}
          </select>
        </div>
        <div className="ml-count">
          <span>{t.abilityList.count(rows.length)}</span>
          {hasFilters && (
            <button type="button" className="link-btn" onClick={clearFilters}>
              {t.common.clearFilters}
            </button>
          )}
        </div>
        {rows.length ? (
          <div className="mv-scroll ml-scroll">
            <table className="mv-table al-table">
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
                  <th className="mv-effect">{t.abilityList.description}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.slug} className="mv-row" onClick={() => open(a.slug)}>
                    <td className="mv-name">
                      <Link to={abilityLink(a.slug, FROM_ABILITY_LIST)} state={{ list: search }} onClick={(e) => e.stopPropagation()}>
                        {a.name}
                      </Link>
                    </td>
                    <td className="mv-num">{a.count}</td>
                    <td className="mv-num">{generationLabel(a.generation)}</td>
                    <td className="mv-effect">{text(a.slug, a.description)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="caption">{t.abilityList.empty}</p>
        )}
      </>
    )

  return (
    <>
      <div className="page-header lab">
        <Brand />
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>
            {t.abilityList.title}
          </h1>
          <div className="page-sub">{t.abilityList.subtitle}</div>
        </div>
      </div>
      <section className="panel">{body}</section>
      <Footer />
    </>
  )
}
