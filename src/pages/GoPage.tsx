import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Alert, Brand, Footer, Spinner, TypeBadge } from '../components/common'
import { SegmentedControl } from '../components/controls'
import { CalendarIcon, SparkIcon, StarIcon, SwordIcon, TrophyIcon } from '../components/icons'
import { Pokeball } from '../components/Pokeball'
import { useNow } from '../hooks/useNow'
import { useI18n } from '../i18n/I18nProvider'
import { displayName } from '../lib/format'
import type { GoEvent, GoRaidBoss } from '../lib/go/feed'
import { resolveGoPokemon, type GoPokemon, type PokemonIndex } from '../lib/go/names'
import { eventCategory, eventPokemon, eventStatus, highlights, isBackdrop, type EventCategory } from '../lib/go/schedule'
import { countdownParts, dateParts, dayKey, formatDay, formatDuration, formatRange, formatTimeRange, progress } from '../lib/go/time'
import { bonusLabel, eventTitle, tierKey, tierLabel, tierRank, weatherLabel } from '../lib/go/translate'
import { artworkUrl, spriteUrl } from '../lib/pokeapi'
import { goEventsQuery, goRaidsQuery, pokemonIndexQuery } from '../lib/queries'

const DAY = 24 * 60 * 60 * 1000
/** A agenda mostra de cara as próximas duas semanas; o resto fica atrás do "Mostrar mais". */
const AGENDA_WINDOW = 14 * DAY
const AGENDA_MIN = 6
const HERO_BONUSES = 4
const FILTERS = ['all', 'raids', 'max', 'featured', 'league', 'other'] as const
type Filter = (typeof FILTERS)[number]

const CATEGORY_COLOR: Record<EventCategory, string> = {
  raids: '#f05a3c',
  max: '#d946ef',
  featured: '#ffcb05',
  league: '#38bdf8',
  other: '#94a3b8',
}

const CATEGORY_ICON: Record<EventCategory, typeof CalendarIcon> = {
  raids: SwordIcon,
  max: SparkIcon,
  featured: StarIcon,
  league: TrophyIcon,
  other: CalendarIcon,
}

const SCRAPEDDUCK_URL = 'https://github.com/bigfoott/ScrapedDuck'

const accentStyle = (event: GoEvent) => ({ '--accent': CATEGORY_COLOR[eventCategory(event.type)] }) as CSSProperties

const hideBroken = (e: { currentTarget: HTMLImageElement }) => {
  e.currentTarget.style.visibility = 'hidden'
}

/** Pokémon do evento que existem na PokeAPI (para as imagens). */
function resolvedPokemon(event: GoEvent, index: PokemonIndex | undefined): GoPokemon[] {
  if (!index) return []
  const seen = new Set<number>()
  return eventPokemon(event).flatMap((name) => {
    const pokemon = resolveGoPokemon(name, index)
    if (!pokemon || seen.has(pokemon.id)) return []
    seen.add(pokemon.id)
    return [pokemon]
  })
}

function SectionHead({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="go-head">
      <div>
        <h2 className="go-h2">{title}</h2>
        {sub && <p className="go-sub">{sub}</p>}
      </div>
      {children}
    </div>
  )
}

// ---------- Destaques ----------

function CountdownTiles({ ms }: { ms: number }) {
  const { t } = useI18n()
  const { days, hours, minutes } = countdownParts(ms)
  const tiles = [
    { value: days, label: t.go.units.days },
    { value: hours, label: t.go.units.hours },
    { value: minutes, label: t.go.units.minutes },
  ]
  return (
    <div className="go-tiles" role="timer" aria-label={t.go.startsIn(formatDuration(ms))}>
      {tiles.map((tile) => (
        <div key={tile.label} className="go-tile">
          <span className="go-tile-value">{String(tile.value).padStart(2, '0')}</span>
          <span className="go-tile-label">{tile.label}</span>
        </div>
      ))}
    </div>
  )
}

function ProgressBar({ event, now }: { event: GoEvent; now: number }) {
  const value = event.start ? progress(event.start, event.end, now) : null
  if (value === null) return null
  return (
    <div className="go-progress" aria-hidden="true">
      <span style={{ width: `${Math.max(3, value * 100)}%` }} />
    </div>
  )
}

function HeroCard({ label, event, index, now }: { label: string; event: GoEvent; index: PokemonIndex | undefined; now: number }) {
  const { t, lang } = useI18n()
  const [allBonuses, setAllBonuses] = useState(false)
  const live = eventStatus(event, now) === 'live'
  const pokemon = resolvedPokemon(event, index).slice(0, 3)
  const bonuses = allBonuses ? event.bonuses : event.bonuses.slice(0, HERO_BONUSES)
  const hidden = event.bonuses.length - bonuses.length

  return (
    <article className={`go-hero${pokemon.length ? '' : ' no-art'}`} style={accentStyle(event)}>
      <div className="go-hero-text">
        <span className="go-eyebrow">
          {live && <span className="go-live-dot" />}
          {live ? t.go.liveNow : label}
        </span>
        <h2 className="go-hero-title">{eventTitle(event.name, event.type, lang)}</h2>
        <p className="go-hero-when">{formatRange(event.start!, event.end, lang)}</p>
        {live ? (
          <div className="go-hero-live">
            <ProgressBar event={event} now={now} />
            {event.end && <span className="go-ends">{t.go.endsIn(formatDuration(event.end.getTime() - now))}</span>}
          </div>
        ) : (
          <CountdownTiles ms={event.start!.getTime() - now} />
        )}
        {bonuses.length > 0 && (
          <ul className="go-chips">
            {bonuses.map((b) => (
              <li key={b}>{bonusLabel(b, lang)}</li>
            ))}
            {hidden > 0 && (
              <li className="more">
                <button type="button" onClick={() => setAllBonuses(true)}>
                  +{hidden}
                </button>
              </li>
            )}
          </ul>
        )}
        {event.link && (
          <a className="go-ext" href={event.link} target="_blank" rel="noreferrer">
            {t.go.details} ↗
          </a>
        )}
      </div>
      <div className="go-hero-art" data-count={pokemon.length}>
        {pokemon.length ? (
          pokemon.map((p) => (
            <Link key={p.id} to={`/pokemon/${p.name}`} title={displayName(p.name)}>
              <img src={artworkUrl(p.id)} alt={displayName(p.name)} onError={hideBroken} />
            </Link>
          ))
        ) : (
          <Pokeball />
        )}
      </div>
    </article>
  )
}

// ---------- Cards de evento ----------

function EventArt({ event, pokemon }: { event: GoEvent; pokemon: GoPokemon[] }) {
  const Icon = CATEGORY_ICON[eventCategory(event.type)]
  if (!pokemon.length)
    return (
      <div className="go-card-art icon">
        <Icon />
      </div>
    )
  const shown = pokemon.slice(0, 3)
  return (
    <div className="go-card-art" data-count={shown.length}>
      {shown.map((p) => (
        <img key={p.id} src={spriteUrl(p.id)} alt="" loading="lazy" onError={hideBroken} />
      ))}
    </div>
  )
}

function EventCard({ event, index, now }: { event: GoEvent; index: PokemonIndex | undefined; now: number }) {
  const { t, lang } = useI18n()
  const live = eventStatus(event, now) === 'live'
  const pokemon = resolvedPokemon(event, index)
  const typeLabel = t.go.types[event.type] ?? displayName(event.type)
  const spotlightBonus = event.type === 'pokemon-spotlight-hour' ? event.bonuses[0] : undefined

  return (
    <article className={`go-card${live ? ' live' : ''}${event.canceled ? ' canceled' : ''}`} style={accentStyle(event)}>
      <EventArt event={event} pokemon={pokemon} />
      <div className="go-card-body">
        <span className="go-eyebrow">
          {typeLabel}
          {event.canceled && <span className="go-canceled">{t.go.canceled}</span>}
        </span>
        <h3 className="go-card-title">{eventTitle(event.name, event.type, lang)}</h3>
        {live ? (
          <>
            <span className="go-ends">{event.end ? t.go.endsIn(formatDuration(event.end.getTime() - now)) : t.go.liveNow}</span>
            <ProgressBar event={event} now={now} />
          </>
        ) : (
          <div className="go-card-time">
            <span>{formatTimeRange(event.start!, event.end, lang)}</span>
            {!event.canceled && <span className="go-pill">{t.go.inTime(formatDuration(event.start!.getTime() - now))}</span>}
          </div>
        )}
        {spotlightBonus && <span className="go-card-bonus">{bonusLabel(spotlightBonus, lang)}</span>}
      </div>
      {event.link && (
        <a className="go-card-link" href={event.link} target="_blank" rel="noreferrer" aria-label={t.go.details} title={t.go.details}>
          ↗
        </a>
      )}
    </article>
  )
}

function LiveSection({ events, index, now }: { events: GoEvent[]; index: PokemonIndex | undefined; now: number }) {
  const { t } = useI18n()
  if (!events.length) return null
  return (
    <section className="go-section">
      <SectionHead title={t.go.liveTitle} sub={t.go.liveSub} />
      <div className="go-grid">
        {events.map((e) => (
          <EventCard key={e.id} event={e} index={index} now={now} />
        ))}
      </div>
    </section>
  )
}

function DayLabel({ date, now }: { date: Date; now: number }) {
  const { t, lang } = useI18n()
  const { day, month, weekday } = dateParts(date, lang)
  const key = dayKey(date)
  const relative = key === dayKey(new Date(now)) ? t.go.today : key === dayKey(new Date(now + DAY)) ? t.go.tomorrow : null
  return (
    <div className="go-day-label">
      <span className={`go-day-week${relative ? ' rel' : ''}`}>{relative ?? weekday}</span>
      <span className="go-day-num">{day}</span>
      <span className="go-day-month">{month}</span>
    </div>
  )
}

function UpcomingSection({ events, index, now }: { events: GoEvent[]; index: PokemonIndex | undefined; now: number }) {
  const { t } = useI18n()
  const [params, setParams] = useSearchParams()
  const [expanded, setExpanded] = useState(false)
  const filter = (FILTERS.find((f) => f === params.get('filtro')) ?? 'all') as Filter

  const filtered = useMemo(() => events.filter((e) => filter === 'all' || eventCategory(e.type) === filter), [events, filter])
  const inWindow = filtered.filter((e) => e.start!.getTime() - now <= AGENDA_WINDOW).length
  const limit = Math.max(inWindow, Math.min(AGENDA_MIN, filtered.length))
  const shown = expanded ? filtered : filtered.slice(0, limit)
  const hidden = filtered.length - limit

  const days = useMemo(() => {
    const groups: { key: string; date: Date; items: GoEvent[] }[] = []
    for (const event of shown) {
      const key = dayKey(event.start!)
      const last = groups[groups.length - 1]
      if (last?.key === key) last.items.push(event)
      else groups.push({ key, date: event.start!, items: [event] })
    }
    return groups
  }, [shown])

  const options = FILTERS.map((f) => ({ value: f, label: t.go.filters[f] }))
  const changeFilter = (value: Filter) => {
    setExpanded(false)
    setParams(value === 'all' ? {} : { filtro: value }, { replace: true })
  }

  return (
    <section className="go-section">
      <SectionHead title={t.go.upcomingTitle} sub={t.go.upcomingSub}>
        <SegmentedControl label={t.go.filterLabel} options={options} value={filter} onChange={changeFilter} />
      </SectionHead>
      {days.length ? (
        <div className="go-agenda">
          {days.map((d) => (
            <div key={d.key} className="go-day">
              <DayLabel date={d.date} now={now} />
              <div className="go-grid">
                {d.items.map((e) => (
                  <EventCard key={e.id} event={e} index={index} now={now} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="caption">{t.go.noEvents}</p>
      )}
      {hidden > 0 && (
        <button type="button" className="btn go-more" onClick={() => setExpanded(!expanded)}>
          {expanded ? t.go.showLess : t.go.showMore(hidden)}
        </button>
      )}
    </section>
  )
}

// ---------- Reides ----------

function RaidBoss({ boss, index, featured }: { boss: GoRaidBoss; index: PokemonIndex | undefined; featured: boolean }) {
  const { t, lang } = useI18n()
  const pokemon = index ? resolveGoPokemon(boss.name, index) : null
  const image = pokemon ? (featured ? artworkUrl(pokemon.id) : spriteUrl(pokemon.id)) : null
  const name = boss.shadow ? boss.name.replace(/^Shadow /i, '') : boss.name
  const content = (
    <>
      <div className="go-raid-art">{image && <img src={image} alt="" loading="lazy" onError={hideBroken} />}</div>
      <div className="go-raid-info">
        <div className="go-raid-name">
          {name}
          {boss.shiny && (
            <span className="go-shiny" title={t.go.shiny} aria-label={t.go.shiny}>
              ✦
            </span>
          )}
        </div>
        <div className="go-raid-types">
          {boss.types.map((type) => (
            <TypeBadge key={type} type={type} small />
          ))}
        </div>
        {boss.cp && (
          <dl className="go-raid-stats" title={t.go.cpHint}>
            <div>
              <dt>{t.go.cp}</dt>
              <dd>{`${boss.cp.min}–${boss.cp.max}`}</dd>
            </div>
            {boss.boostedCp && (
              <div>
                <dt>{t.go.boosted}</dt>
                <dd>{`${boss.boostedCp.min}–${boss.boostedCp.max}`}</dd>
              </div>
            )}
          </dl>
        )}
        {boss.weather.length > 0 && (
          <div className="go-weather" aria-label={t.go.weather}>
            {boss.weather.map((w) => (
              <span key={w}>{weatherLabel(w, lang)}</span>
            ))}
          </div>
        )}
      </div>
    </>
  )
  const className = `go-raid${featured ? ' featured' : ''}${boss.shadow ? ' shadow' : ''}`
  return pokemon ? (
    <Link to={`/pokemon/${pokemon.name}`} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  )
}

/** Um bloco por nível. Nível com um chefe só (o lendário da semana, por exemplo) ganha um card largo, não uma grade. */
function RaidTiers({ bosses, index }: { bosses: GoRaidBoss[]; index: PokemonIndex | undefined }) {
  const { lang } = useI18n()
  const tiers = useMemo(() => {
    const byTier = new Map<string, GoRaidBoss[]>()
    for (const boss of bosses) byTier.set(boss.tier, [...(byTier.get(boss.tier) ?? []), boss])
    return [...byTier].sort(([a], [b]) => tierRank(tierKey(a)) - tierRank(tierKey(b)))
  }, [bosses])

  return tiers.map(([tier, list]) => (
    <div key={tier} className="go-tier">
      <h3 className="go-tier-title">{tierLabel(tier, lang)}</h3>
      <div className={`go-raids${list.length === 1 ? ' single' : ''}`}>
        {list.map((boss) => (
          <RaidBoss key={boss.name} boss={boss} index={index} featured={list.length === 1} />
        ))}
      </div>
    </div>
  ))
}

function RaidsSection({ raids, index }: { raids: GoRaidBoss[]; index: PokemonIndex | undefined }) {
  const { t } = useI18n()
  const regular = raids.filter((r) => !r.shadow)
  const shadow = raids.filter((r) => r.shadow)
  return (
    <section className="go-section">
      <SectionHead title={t.go.raids} sub={t.go.raidsSub} />
      {raids.length ? (
        <div className="go-raid-blocks">
          {regular.length > 0 && (
            <div className="go-raid-block">
              <RaidTiers bosses={regular} index={index} />
            </div>
          )}
          {shadow.length > 0 && (
            <div className="go-raid-block shadow">
              <h3 className="go-block-title">{t.go.shadowRaids}</h3>
              <RaidTiers bosses={shadow} index={index} />
            </div>
          )}
        </div>
      ) : (
        <p className="caption">{t.go.noRaids}</p>
      )}
    </section>
  )
}

// ---------- Página ----------

function SeasonChips({ events, now }: { events: GoEvent[]; now: number }) {
  const { t, lang } = useI18n()
  const current = events.filter((e) => isBackdrop(e.type) && eventStatus(e, now) === 'live')
  if (!current.length) return null
  return (
    <div className="go-season">
      {current.map((e) => (
        <span key={e.id} className="go-season-chip">
          <span className="go-season-kind">{e.type === 'season' ? t.go.season : t.go.types['go-pass']}</span>
          <b>{e.type === 'season' ? e.name : eventTitle(e.name, e.type, lang).replace(/^(Passe GO|GO Pass): /, '')}</b>
          {e.end && <span className="go-season-until">{t.go.until(formatDay(e.end, lang))}</span>}
        </span>
      ))}
    </div>
  )
}

function Credits() {
  const { t } = useI18n()
  return (
    <p className="go-credits">
      {t.go.credits}{' '}
      <a href={SCRAPEDDUCK_URL} target="_blank" rel="noreferrer">
        ScrapedDuck
      </a>
      . {t.go.timezone}
    </p>
  )
}

export function GoPage() {
  const { t } = useI18n()
  const now = useNow()
  const events = useQuery(goEventsQuery())
  const raids = useQuery(goRaidsQuery())
  // Os sprites dependem do índice da PokeAPI; sem ele, os cards mostram o ícone da categoria.
  const { data: index } = useQuery(pokemonIndexQuery())

  useEffect(() => {
    document.title = `${t.go.title} | Dexpedition`
  }, [t])

  const list = useMemo(() => events.data ?? [], [events.data])
  const { communityDay, major } = highlights(list, now)
  const heroIds = new Set([communityDay?.id, major?.id])
  const listed = list.filter((e) => !isBackdrop(e.type) && !heroIds.has(e.id) && e.start)
  const live = listed
    .filter((e) => eventStatus(e, now) === 'live')
    .sort((a, b) => (a.end?.getTime() ?? Infinity) - (b.end?.getTime() ?? Infinity))
  const upcoming = listed.filter((e) => eventStatus(e, now) === 'upcoming').sort((a, b) => a.start!.getTime() - b.start!.getTime())

  let body
  if (events.isPending && raids.isPending) body = <Spinner label={t.go.loading} />
  else if (events.isError && raids.isError) body = <Alert>{t.go.error}</Alert>
  else
    body = (
      <>
        {(communityDay || major) && (
          <div className="go-heroes">
            {communityDay && <HeroCard label={t.go.nextCommunityDay} event={communityDay} index={index} now={now} />}
            {major && <HeroCard label={t.go.nextMajor} event={major} index={index} now={now} />}
          </div>
        )}
        {events.isError ? (
          <Alert>{t.go.error}</Alert>
        ) : (
          <>
            <LiveSection events={live} index={index} now={now} />
            <UpcomingSection events={upcoming} index={index} now={now} />
          </>
        )}
        {raids.isError ? <Alert>{t.go.error}</Alert> : <RaidsSection raids={raids.data ?? []} index={index} />}
        <Credits />
      </>
    )

  return (
    <>
      <div className="page-header lab">
        <Brand />
        <div className="go-title-block">
          <h1 className="page-title" style={{ margin: 0 }}>
            {t.go.title}
          </h1>
          <div className="page-sub">{t.go.subtitle}</div>
          <SeasonChips events={list} now={now} />
        </div>
      </div>
      {body}
      <Footer />
    </>
  )
}
