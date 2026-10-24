import { useQuery } from '@tanstack/react-query'
import { useDeferredValue, useId, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router'
import { useI18n } from '../i18n/I18nProvider'
import { dexNumber, displayName } from '../lib/format'
import { allPokemonQuery } from '../lib/queries'
import { buildSearchIndex, searchPokemon } from '../lib/search'
import type { PokemonListItem } from '../lib/types'
import { TypeBadge } from './common'
import { ChevronRightIcon, SearchIcon } from './icons'

/** Busca principal com sugestões enquanto digita. */
export function DexSearch() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const listId = useId()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  // A lista (a mesma da página inicial, já em cache lá) só é baixada quando a busca é usada.
  const [wanted, setWanted] = useState(false)
  const { data, isPending } = useQuery({ ...allPokemonQuery(), enabled: wanted })

  const index = useMemo(() => (data ? buildSearchIndex(data) : []), [data])
  const deferredSearch = useDeferredValue(search)
  const suggestions = useMemo(() => searchPokemon(index, deferredSearch), [index, deferredSearch])
  const showList = open && !!search.trim() && (suggestions.length > 0 || !!data || isPending)

  const go = (ref: string) => {
    navigate(`/pokemon/${encodeURIComponent(ref)}`)
    setSearch('')
    setOpen(false)
  }

  // Enter ou a setinha vão para a sugestão destacada (a primeira, por padrão); sem sugestões, tenta o
  // texto digitado, que a PokeAPI ainda resolve por número ou apelido. Recalcula com o texto atual:
  // clicar na setinha fecha a lista (blur), e a lista adiada pode estar uma tecla atrás.
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const choice = searchPokemon(index, search)[highlight]
    const value = search.trim().toLowerCase()
    if (choice) go(choice.name)
    else if (value) go(value)
    ;(document.activeElement as HTMLElement | null)?.blur()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && suggestions.length) {
      e.preventDefault()
      setOpen(true)
      setHighlight((h) => (h + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp' && suggestions.length) {
      e.preventDefault()
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const optionId = (i: number) => `${listId}-${i}`

  return (
    <form className="dex-search" onSubmit={onSubmit} role="search">
      <label htmlFor="search" className="visually-hidden">
        {t.search.label}
      </label>
      <SearchIcon className="dex-search-icon" />
      <input
        id="search"
        className="input"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && suggestions[highlight] ? optionId(highlight) : undefined}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setHighlight(0)
          setOpen(true)
        }}
        onFocus={() => {
          setWanted(true)
          setOpen(true)
        }}
        onPointerEnter={() => setWanted(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        placeholder={t.search.placeholder}
        autoComplete="off"
        spellCheck={false}
      />
      <button type="submit" className="dex-search-go" aria-label={t.search.submit} disabled={!search.trim()}>
        <ChevronRightIcon />
      </button>
      {showList && (
        <ul className="dex-suggestions" id={listId} role="listbox" aria-label={t.search.suggestions}>
          {suggestions.map((p, i) => (
            <Suggestion
              key={p.name}
              id={optionId(i)}
              pokemon={p}
              selected={i === highlight}
              onHover={() => setHighlight(i)}
              // mousedown em vez de click: dispara antes do blur do campo fechar a lista.
              onPick={() => go(p.name)}
            />
          ))}
          {suggestions.length === 0 && <li className="dex-suggestions-empty">{data ? t.search.noMatches : t.search.loading}</li>}
        </ul>
      )}
    </form>
  )
}

interface SuggestionProps {
  id: string
  pokemon: PokemonListItem
  selected: boolean
  onHover: () => void
  onPick: () => void
}

function Suggestion({ id, pokemon, selected, onHover, onPick }: SuggestionProps) {
  return (
    <li
      id={id}
      role="option"
      aria-selected={selected}
      onMouseEnter={onHover}
      onMouseDown={(e) => {
        e.preventDefault()
        onPick()
      }}
    >
      <img src={pokemon.sprite} alt="" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
      <span className="dex-suggestion-name">
        {displayName(pokemon.name)}
        <small>{dexNumber(pokemon.speciesId)}</small>
      </span>
      <span className="types">
        {pokemon.types.map((type) => (
          <TypeBadge key={type} type={type} small />
        ))}
      </span>
    </li>
  )
}
