import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router'
import { typeColor } from '../lib/format'
import { Pokeball } from './Pokeball'

export function TypeBadge({ type, small = false }: { type: string; small?: boolean }) {
  return (
    <span className={small ? 'type-badge sm' : 'type-badge'} style={{ '--t': typeColor(type) } as CSSProperties}>
      {type}
    </span>
  )
}

export function Brand() {
  return (
    <div className="brand">
      <Link to="/" aria-label="Início">
        <Pokeball />
      </Link>
      <div>
        <Link to="/" className="brand-title" style={{ textDecoration: 'none' }}>
          Poké<span>dex</span>
        </Link>
        <div className="brand-sub">
          Dados em tempo real da{' '}
          <a href="https://pokeapi.co/" target="_blank" rel="noreferrer">
            PokeAPI
          </a>
        </div>
      </div>
    </div>
  )
}

export function Card({ title, accent, children, style }: { title: string; accent?: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <section className="card" style={{ ...(accent && { '--accent': accent }), ...style } as CSSProperties}>
      <h2 className="card-title">{title}</h2>
      {children}
    </section>
  )
}

export function Alert({ kind = 'error', children }: { kind?: 'error' | 'info'; children: ReactNode }) {
  return (
    <div className={`alert ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  )
}

export function Spinner({ label }: { label: string }) {
  return (
    <div className="spinner" role="status">
      {label}
    </div>
  )
}

export function Skeleton({ height }: { height: number }) {
  return <div className="skeleton" style={{ height }} aria-hidden="true" />
}

export function Footer() {
  return (
    <footer className="footer">
      Feito por <b>Brian Ashihara</b> · Dados da PokeAPI · Pokémon é marca registrada da Nintendo/Game Freak
    </footer>
  )
}
