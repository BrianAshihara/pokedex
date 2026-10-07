import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { normalizeQuery } from '../lib/pokeapi'

interface Option<T extends string> {
  value: T
  label: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ checked, onChange, children }: { checked: boolean; onChange: (checked: boolean) => void; children: ReactNode }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" />
      {children}
    </label>
  )
}

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  label,
}: {
  tabs: Option<T>[]
  active: T
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button key={t.value} type="button" role="tab" aria-selected={t.value === active} onClick={() => onChange(t.value)}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function Slider({
  value,
  min,
  max,
  step,
  onChange,
  label,
}: {
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  label: string
}) {
  const fill = ((value - min) / (max - min)) * 100
  return (
    <div className="slider">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        style={{ '--fill': `${fill}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <output>{value}</output>
    </div>
  )
}

/** Campo numérico que aceita digitação livre e só aplica o limite ao sair do campo. */
export function NumberInput({
  value,
  min,
  max,
  onChange,
  label,
  small = false,
}: {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  label: string
  small?: boolean
}) {
  const [draft, setDraft] = useState(String(value))
  const [editing, setEditing] = useState(false)
  const commit = (text: string) => {
    const parsed = Number.parseInt(text, 10)
    const next = Number.isNaN(parsed) ? min : Math.max(min, Math.min(max, parsed))
    onChange(next)
    setDraft(String(next))
  }
  return (
    <input
      className={small ? 'input sm' : 'input'}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      aria-label={label}
      value={editing ? draft : value}
      onFocus={() => {
        setDraft(String(value))
        setEditing(true)
      }}
      onChange={(e) => {
        setDraft(e.target.value)
        const parsed = Number.parseInt(e.target.value, 10)
        if (!Number.isNaN(parsed) && parsed >= min && parsed <= max) onChange(parsed)
      }}
      onBlur={(e) => {
        commit(e.target.value)
        setEditing(false)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
    />
  )
}

const MAX_VISIBLE_OPTIONS = 60

/** Select pesquisável: digite para filtrar, use as setas e Enter para escolher. */
export function Combobox<T extends string>({
  options,
  value,
  onChange,
  label,
  placeholder,
  getLabel,
}: {
  options: readonly T[]
  value: T | null
  onChange: (value: T) => void
  label: string
  placeholder?: string
  getLabel: (value: T) => string
}) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)

  const filtered = useMemo(() => {
    const q = normalizeQuery(query)
    if (!q) return options
    return options.filter((o) => normalizeQuery(getLabel(o)).includes(q)).slice(0, MAX_VISIBLE_OPTIONS)
  }, [options, query, getLabel])

  useEffect(() => {
    if (open) listRef.current?.children[highlight]?.scrollIntoView({ block: 'nearest' })
  }, [open, highlight])

  const select = (option: T) => {
    onChange(option)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="combobox">
      <input
        className="input"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder={value ? getLabel(value) : placeholder}
        value={open ? query : value ? getLabel(value) : ''}
        onFocus={() => {
          setOpen(true)
          setQuery('')
          setHighlight(Math.max(0, value ? options.indexOf(value) : 0))
        }}
        onBlur={() => setOpen(false)}
        onChange={(e) => {
          setQuery(e.target.value)
          setHighlight(0)
          setOpen(true)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            setHighlight((h) => Math.min(h + 1, filtered.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlight((h) => Math.max(h - 1, 0))
          } else if (e.key === 'Enter' && open && filtered[highlight]) {
            e.preventDefault()
            select(filtered[highlight])
            e.currentTarget.blur()
          } else if (e.key === 'Escape') {
            setOpen(false)
            e.currentTarget.blur()
          }
        }}
      />
      {open && (
        <ul className="combobox-list" id={listId} role="listbox" ref={listRef}>
          {filtered.length === 0 && <li className="empty">Nenhum resultado</li>}
          {filtered.map((option, i) => (
            <li
              key={option}
              role="option"
              aria-selected={i === highlight}
              // mousedown em vez de click: dispara antes do blur do input.
              onMouseDown={(e) => {
                e.preventDefault()
                select(option)
                ;(document.activeElement as HTMLElement | null)?.blur()
              }}
              onMouseEnter={() => setHighlight(i)}
            >
              {getLabel(option)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function Toast({ message, onClose, icon }: { message: string | null; onClose: () => void; icon?: ReactNode }) {
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [message, onClose])

  if (!message) return null
  return (
    <div className="toast" role="status">
      {icon}
      {message}
    </div>
  )
}
