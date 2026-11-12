import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Alert, Brand, Footer, Spinner, TypeBadge } from '../components/common'
import { usePersistentState } from '../hooks/usePersistentState'
import { useI18n } from '../i18n/I18nProvider'
import { displayName, generationLabel } from '../lib/format'
import { isCorrectGuess, nameMask, pickSpecies, type GameSpecies } from '../lib/game'
import { artworkUrl, cryUrl, normalizeQuery } from '../lib/pokeapi'
import { gameSpeciesQuery } from '../lib/queries'

const MAX_ATTEMPTS = 3
/** Tipo, geração, grito e primeira letra, nessa ordem. */
const HINT_COUNT = 4
/** Quantas espécies recentes não voltam a ser sorteadas. */
const RECENT_LIMIT = 30
const MAX_SUGGESTIONS = 6

type Status = 'playing' | 'won' | 'lost'

interface Round {
  target: GameSpecies
  attempts: number
  hints: number
  status: Status
  feedback: string | null
}

const newRound = (target: GameSpecies): Round => ({ target, attempts: 0, hints: 0, status: 'playing', feedback: null })

interface Deck {
  round: Round | null
  /** Próxima espécie, já sorteada para a arte ser baixada enquanto o jogador pensa. */
  upcoming: GameSpecies | null
  /** Espécies recentes, que não voltam tão cedo. */
  recent: number[]
}

/** Começa uma rodada (com a espécie já sorteada, se ela fizer parte do grupo) e sorteia a seguinte. */
function deal(pool: GameSpecies[], recent: number[], upcoming: GameSpecies | null): Deck {
  const target = upcoming && pool.includes(upcoming) ? upcoming : pickSpecies(pool, recent)
  const nextRecent = target ? [target.id, ...recent].slice(0, RECENT_LIMIT) : recent
  return { round: target ? newRound(target) : null, upcoming: pickSpecies(pool, nextRecent), recent: nextRecent }
}

function Game({ species }: { species: GameSpecies[] }) {
  const { t } = useI18n()
  const [generation, setGeneration] = usePersistentState('pokedex:game-gen', 0)
  const [best, setBest] = usePersistentState('pokedex:game-best', 0)
  const [streak, setStreak] = useState(0)
  const [score, setScore] = useState({ correct: 0, played: 0 })
  const [guess, setGuess] = useState('')
  const [highlight, setHighlight] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)

  const pool = useMemo(() => species.filter((s) => !generation || s.generation === generation), [species, generation])
  const generations = useMemo(() => [...new Set(species.map((s) => s.generation))].filter(Boolean).sort((a, b) => a - b), [species])
  const allNames = useMemo(() => new Set(species.map((s) => normalizeQuery(s.name))), [species])

  const [deck, setDeck] = useState(() => deal(pool, [], null))
  const { round } = deck
  const setRound = (next: Round) => setDeck((d) => ({ ...d, round: next }))

  // Baixa a arte da próxima rodada para a silhueta aparecer sem atraso.
  useEffect(() => {
    if (deck.upcoming) new Image().src = artworkUrl(deck.upcoming.pokemonId)
  }, [deck.upcoming])

  const startNext = (from = pool) => {
    setDeck((d) => deal(from, d.recent, d.upcoming))
    setGuess('')
    setHighlight(-1)
  }

  const changeGeneration = (value: number) => {
    setGeneration(value)
    const from = species.filter((s) => !value || s.generation === value)
    // Trocar de geração no meio de uma rodada conta como desistência.
    if (round?.status === 'playing' && round.attempts + round.hints > 0) setStreak(0)
    startNext(from)
  }

  useEffect(() => {
    if (round?.status === 'playing') inputRef.current?.focus()
    else nextRef.current?.focus()
  }, [round?.status, round?.target.id])

  const suggestions = useMemo(() => {
    const q = normalizeQuery(guess)
    if (q.length < 2 || round?.status !== 'playing') return []
    return species.filter((s) => normalizeQuery(s.name).startsWith(q)).slice(0, MAX_SUGGESTIONS)
  }, [guess, species, round?.status])

  if (!round) return <Alert kind="info">{t.game.loadError}</Alert>
  const { target } = round
  const name = displayName(target.name)

  const finish = (won: boolean, feedback: string) => {
    setRound({ ...round, status: won ? 'won' : 'lost', feedback, attempts: round.attempts + (won ? 0 : 1) })
    setScore((s) => ({ correct: s.correct + (won ? 1 : 0), played: s.played + 1 }))
    const nextStreak = won ? streak + 1 : 0
    setStreak(nextStreak)
    if (nextStreak > best) setBest(nextStreak)
  }

  const submit = (value: string) => {
    if (round.status !== 'playing' || !value.trim()) return
    if (isCorrectGuess(value, target.name, allNames)) {
      finish(true, t.game.correct(name))
      return
    }
    const known = allNames.has(normalizeQuery(value))
    const attempts = round.attempts + 1
    if (attempts >= MAX_ATTEMPTS) {
      finish(false, t.game.revealed(name))
      return
    }
    setRound({ ...round, attempts, feedback: known ? t.game.wrong(displayName(value)) : t.game.notAPokemon })
    setGuess('')
    setHighlight(-1)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    submit(highlight >= 0 && suggestions[highlight] ? suggestions[highlight].name : guess)
  }

  const playing = round.status === 'playing'
  const attemptsLeft = MAX_ATTEMPTS - round.attempts
  const shownHints = playing ? round.hints : HINT_COUNT

  return (
    <div className="wtp">
      <div className={`wtp-stage ${round.status}`}>
        <div className="wtp-rays" aria-hidden="true" />
        <img
          key={target.id}
          className={playing ? 'wtp-art hidden' : 'wtp-art'}
          src={artworkUrl(target.pokemonId)}
          alt={playing ? t.game.silhouette : name}
          draggable={false}
        />
        {!playing && (
          <div className="wtp-reveal" role="status">
            <strong>{round.feedback}</strong>
          </div>
        )}
      </div>

      <div className="wtp-side">
        <dl className="wtp-score">
          <div>
            <dt>{t.game.streak}</dt>
            <dd>{streak}</dd>
          </div>
          <div>
            <dt>{t.game.best}</dt>
            <dd>{best}</dd>
          </div>
          <div>
            <dt>{t.game.score}</dt>
            <dd>
              {score.correct}/{score.played}
            </dd>
          </div>
        </dl>

        <label className="wtp-gen">
          <span>{t.game.pool}</span>
          <select className="select" value={generation} onChange={(e) => changeGeneration(Number(e.target.value))}>
            <option value={0}>{t.common.allGenerations}</option>
            {generations.map((g) => (
              <option key={g} value={g}>
                {t.common.generationOption(generationLabel(g))}
              </option>
            ))}
          </select>
        </label>

        {playing ? (
          <form className="wtp-form" onSubmit={onSubmit} autoComplete="off">
            <div className="wtp-input">
              <input
                ref={inputRef}
                className="input"
                value={guess}
                onChange={(e) => {
                  setGuess(e.target.value)
                  setHighlight(-1)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown' && suggestions.length) {
                    e.preventDefault()
                    setHighlight((h) => Math.min(h + 1, suggestions.length - 1))
                  } else if (e.key === 'ArrowUp' && suggestions.length) {
                    e.preventDefault()
                    setHighlight((h) => Math.max(h - 1, -1))
                  }
                }}
                placeholder={t.game.guessPlaceholder}
                aria-label={t.game.guessLabel}
                role="combobox"
                aria-expanded={suggestions.length > 0}
                aria-controls="wtp-suggestions"
                aria-autocomplete="list"
                spellCheck={false}
              />
              {suggestions.length > 0 && (
                <ul className="wtp-suggestions" id="wtp-suggestions" role="listbox" aria-label={t.game.suggestions}>
                  {suggestions.map((s, i) => (
                    <li
                      key={s.id}
                      role="option"
                      aria-selected={i === highlight}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        submit(s.name)
                      }}
                    >
                      {displayName(s.name)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="wtp-actions">
              <button type="submit" className="btn primary">
                {t.game.guess}
              </button>
              <button type="button" className="btn" onClick={() => setRound({ ...round, hints: round.hints + 1 })} disabled={round.hints >= HINT_COUNT}>
                {t.game.hint}
              </button>
              <button type="button" className="btn" onClick={() => finish(false, t.game.revealed(name))}>
                {t.game.giveUp}
              </button>
            </div>
            <p className={round.feedback ? 'wtp-feedback wrong' : 'wtp-feedback'} aria-live="polite">
              {round.feedback ?? t.game.attemptsLeft(attemptsLeft)}
              {round.feedback && <span> · {t.game.attemptsLeft(attemptsLeft)}</span>}
            </p>
          </form>
        ) : (
          <div className="wtp-actions">
            <button ref={nextRef} type="button" className="btn primary" onClick={() => startNext()}>
              {t.game.next}
            </button>
            <Link className="btn" to={`/pokemon/${target.name}`}>
              {t.game.openPage}
            </Link>
          </div>
        )}

        <div className="wtp-hints">
          <h2 className="card-title">{t.game.hints}</h2>
          {shownHints === 0 && <p className="caption">{t.game.noHints}</p>}
          {shownHints >= 1 && (
            <div className="wtp-hint">
              <span>{t.game.hintType}</span>
              <span className="types">
                {target.types.map((type) => (
                  <TypeBadge key={type} type={type} small />
                ))}
              </span>
            </div>
          )}
          {shownHints >= 2 && (
            <div className="wtp-hint">
              <span>{t.game.hintGeneration}</span>
              <strong>{t.common.generationOption(generationLabel(target.generation))}</strong>
            </div>
          )}
          {shownHints >= 3 && (
            <div className="wtp-hint">
              <span>{t.game.hintCry}</span>
              <audio key={target.id} controls preload="none" src={cryUrl(target.pokemonId)} />
            </div>
          )}
          {shownHints >= 4 && (
            <div className="wtp-hint">
              <span>{t.game.hintName}</span>
              <strong className="wtp-mask">{playing ? nameMask(target.name) : name}</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function WhoIsThatPage() {
  const { data, isPending, isError } = useQuery(gameSpeciesQuery())
  const { t } = useI18n()

  useEffect(() => {
    document.title = `${t.game.title} | Dexpedition`
  }, [t])

  return (
    <>
      <div className="page-header lab">
        <Brand />
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>
            {t.game.title}
          </h1>
          <div className="page-sub">{t.game.subtitle}</div>
        </div>
      </div>
      <section className="panel">{isError ? <Alert>{t.game.loadError}</Alert> : isPending ? <Spinner label={t.game.loading} /> : <Game species={data} />}</section>
      <Footer />
    </>
  )
}
