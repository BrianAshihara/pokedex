import type { CSSProperties, KeyboardEvent, MouseEvent, ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useI18n } from '../i18n/I18nProvider'
import { typeColor } from '../lib/format'
import { Pokeball } from './Pokeball'

interface TypeBadgeProps {
  type: string
  small?: boolean
  /** Para onde o clique leva: Pokémon desse tipo (página inicial) ou golpes desse tipo (/golpes). */
  link?: 'pokemon' | 'move'
  /** Badge dentro de outro link (cards de Pokémon): <a> dentro de <a> é inválido, então vira um span clicável. */
  nested?: boolean
}

export function TypeBadge({ type, small = false, link, nested = false }: TypeBadgeProps) {
  const navigate = useNavigate()
  const { t } = useI18n()
  const className = small ? 'type-badge sm' : 'type-badge'
  const style = { '--t': typeColor(type) } as CSSProperties
  if (!link) {
    return (
      <span className={className} style={style}>
        {type}
      </span>
    )
  }

  const to = `${link === 'pokemon' ? '/' : '/golpes'}?tipo=${type}`
  const title = link === 'pokemon' ? t.common.viewPokemonOfType(type) : t.common.viewMovesOfType(type)
  // Linhas de tabela também navegam no clique: o badge não pode deixar o clique chegar até elas.
  const stop = (e: MouseEvent) => e.stopPropagation()

  if (nested) {
    const go = (e: MouseEvent | KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      navigate(to)
    }
    return (
      <span
        role="link"
        tabIndex={0}
        className={`${className} clickable`}
        style={style}
        title={title}
        onClick={go}
        onKeyDown={(e) => e.key === 'Enter' && go(e)}
      >
        {type}
      </span>
    )
  }

  return (
    <Link to={to} className={`${className} clickable`} style={style} title={title} onClick={stop}>
      {type}
    </Link>
  )
}

export function Brand() {
  const { t } = useI18n()
  return (
    <div className="brand">
      <Link to="/" aria-label={t.brand.home}>
        <Pokeball />
      </Link>
      <div>
        <Link to="/" className="brand-title" style={{ textDecoration: 'none' }}>
          Dex<span>pedition</span>
        </Link>
        <div className="brand-sub">
          {t.brand.liveData}{' '}
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
  const { t } = useI18n()
  return (
    <footer className="footer">
      {t.footer.madeBy} <b>Brian Ashihara</b> · {t.footer.data} · {t.footer.trademark}
    </footer>
  )
}
