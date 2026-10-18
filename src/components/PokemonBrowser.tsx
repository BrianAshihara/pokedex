import { useQuery } from '@tanstack/react-query'
import { useDeferredValue, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { generationLabel, TYPE_COLORS } from '../lib/format'
import { allPokemonQuery } from '../lib/queries'
import { STATS } from '../lib/stats'
import type { PokemonListItem } from '../lib/types'
import { Alert, Spinner } from './common'
import { Toggle, TypeFilter } from './controls'
import { PokemonCard } from './PokemonCard'

// Número e nome em ordem crescente; atributos do maior para o menor (os mais fortes primeiro).
const SORTS: { value: string; label: string; key?: (p: PokemonListItem) => number }[] = [
  { value: '', label: 'Número' },
  { value: 'nome', label: 'Nome' },
  { value: 'total', label: 'Total', key: (p) => p.total },
  ...STATS.map((stat, i) => ({ value: stat.toLowerCase().replace(/\W+/g, '-'), label: stat, key: (p: PokemonListItem) => p.stats[i] })),
]

const TYPE_ORDER = Object.keys(TYPE_COLORS)

export function PokemonBrowser() {
  const [params, setParams] = useSearchParams()
  const { data, isPending, isError } = useQuery(allPokemonQuery())

  // Mesmo esquema da lista de Golpes: filtros na URL, campo de busca com estado próprio.
  const [query, setQuery] = useState(() => params.get('q') ?? '')
  const typesParam = params.get('tipo') ?? ''
  const selectedTypes = useMemo(() => typesParam.split(',').filter(Boolean), [typesParam])
  const generation = Number(params.get('ger')) || 0
  const sort = SORTS.find((s) => s.value === params.get('ordem')) ?? SORTS[0]
  const showForms = params.get('formas') === '1'

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

  // No máximo dois tipos (nenhum Pokémon tem três): um terceiro clique substitui o mais antigo.
  const toggleType = (type: string) => {
    const next = selectedTypes.includes(type) ? selectedTypes.filter((t) => t !== type) : [...selectedTypes, type].slice(-2)
    update({ tipo: next.join(',') })
  }

  const clearFilters = () => {
    setQuery('')
    update({ q: '', tipo: '', ger: '' })
  }

  const deferredQuery = useDeferredValue(query)
  const types = useMemo(() => [...new Set(data?.flatMap((p) => p.types))].sort((a, b) => TYPE_ORDER.indexOf(a) - TYPE_ORDER.indexOf(b)), [data])
  const generations = useMemo(() => [...new Set(data?.map((p) => p.generation))].filter(Boolean).sort((a, b) => a - b), [data])

  const rows = useMemo(() => {
    if (!data) return []
    const q = deferredQuery.trim().toLowerCase()
    const filtered = data.filter(
      (p) =>
        (showForms || p.isDefault) &&
        (!q || p.name.includes(q.replaceAll(' ', '-')) || String(p.speciesId) === q) &&
        selectedTypes.every((t) => p.types.includes(t)) &&
        (!generation || p.generation === generation),
    )
    // Já vem por número; o sort é estável, então empates mantêm a ordem da Pokédex.
    if (sort.value === 'nome') return [...filtered].sort((a, b) => a.name.localeCompare(b.name))
    if (sort.key) {
      const key = sort.key
      return [...filtered].sort((a, b) => key(b) - key(a))
    }
    return filtered
  }, [data, deferredQuery, selectedTypes, generation, sort, showForms])

  if (isError) return <Alert>Não foi possível carregar a lista de Pokémon. Tente novamente em instantes.</Alert>
  if (isPending) return <Spinner label="Buscando todos os Pokémon..." />

  const hasFilters = !!(query || selectedTypes.length || generation)

  return (
    <>
      <div className="pb-filters">
        <input className="input" value={query} onChange={(e) => changeQuery(e.target.value)} placeholder="Filtrar a lista por nome ou número" aria-label="Filtrar a lista de Pokémon" />
        <select className="select" aria-label="Geração" value={generation} onChange={(e) => update({ ger: e.target.value === '0' ? '' : e.target.value })}>
          <option value={0}>Todas as gerações</option>
          {generations.map((g) => (
            <option key={g} value={g}>
              Geração {generationLabel(g)}
            </option>
          ))}
        </select>
        <select className="select" aria-label="Ordenar por" value={sort.value} onChange={(e) => update({ ordem: e.target.value })}>
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              Ordenar: {s.label}
            </option>
          ))}
        </select>
      </div>
      <TypeFilter types={types} selected={selectedTypes} onToggle={toggleType} />
      <div className="ml-count">
        <span>{rows.length} Pokémon</span>
        {hasFilters && (
          <button type="button" className="link-btn" onClick={clearFilters}>
            Limpar filtros
          </button>
        )}
        <span className="pb-forms">
          <Toggle checked={showForms} onChange={(on) => update({ formas: on ? '1' : '' })}>
            Mostrar formas
          </Toggle>
        </span>
      </div>
      {rows.length ? (
        <div className="learner-grid">
          {rows.map((p) => (
            <PokemonCard key={p.name} name={p.name} speciesId={p.speciesId} types={p.types} sprite={p.sprite} note={sort.key ? `${sort.label} ${sort.key(p)}` : undefined} />
          ))}
        </div>
      ) : (
        <p className="caption">Nenhum Pokémon encontrado com esses filtros.</p>
      )}
    </>
  )
}
