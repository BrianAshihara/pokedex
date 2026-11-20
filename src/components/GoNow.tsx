import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { useNow } from '../hooks/useNow'
import { useI18n } from '../i18n/I18nProvider'
import { displayName } from '../lib/format'
import { appearancesFor, buildSchedule, type Appearance } from '../lib/go/schedule'
import { formatDate } from '../lib/go/time'
import { eventTitle, tierLabel } from '../lib/go/translate'
import { goEventsQuery, goRaidsQuery, pokemonIndexQuery } from '../lib/queries'

/**
 * Faixa "Agora no GO" na página do Pokémon: reides em que ele está e eventos dos próximos dias.
 * Não aparece enquanto carrega, se o feed falhar ou se o Pokémon não estiver em nada.
 */
export function GoNow({ pokemonName, speciesName }: { pokemonName: string; speciesName: string }) {
  const { t, lang } = useI18n()
  const now = useNow(60_000)
  const { data: events } = useQuery(goEventsQuery())
  const { data: raids } = useQuery(goRaidsQuery())
  const { data: index } = useQuery(pokemonIndexQuery())

  // O índice só muda quando os dados mudam; a hora entra arredondada ao minuto (useNow) e basta.
  const schedule = useMemo(() => (events && raids && index ? buildSchedule(events, raids, index, now) : null), [events, raids, index, now])
  const appearances = schedule ? appearancesFor(schedule, pokemonName, speciesName) : []
  if (!appearances.length) return null

  const label = (a: Appearance) => {
    const tags = [a.shadow && t.go.now.shadow, a.kind === 'event' && a.dynamax && t.go.now.dynamax].filter(Boolean).join(', ')
    const title = a.kind === 'raid' ? tierLabel(a.tier, lang) : (t.go.types[a.type] ?? displayName(a.type))
    const when =
      a.kind === 'raid'
        ? a.end && t.go.until(formatDate(a.end, lang))
        : a.live
          ? `${t.go.now.live}${a.end ? `, ${t.go.until(formatDate(a.end, lang))}` : ''}`
          : formatDate(a.start, lang)
    return { title: tags ? `${title} (${tags})` : title, when, detail: a.kind === 'event' ? eventTitle(a.name, a.type, lang) : null }
  }

  return (
    <section className="go-now" aria-label={t.go.now.title}>
      <span className="go-now-title">{t.go.now.title}</span>
      <ul>
        {appearances.map((a) => {
          const { title, when, detail } = label(a)
          const live = a.kind === 'raid' || a.live
          return (
            <li key={a.kind === 'raid' ? `raid-${a.tier}-${a.shadow}` : a.eventId} className={live ? 'live' : undefined} title={detail ?? undefined}>
              <b>{title}</b>
              {when && <span> · {when}</span>}
            </li>
          )
        })}
      </ul>
      <Link to="/go" className="go-now-link">
        {t.go.now.link} →
      </Link>
    </section>
  )
}
