import { useQuery } from '@tanstack/react-query'
import { useMemo, type CSSProperties } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { COMPARE_COLORS, displayName } from '../lib/format'
import { spriteUrl } from '../lib/pokeapi'
import { speedRosterQuery } from '../lib/queries'
import {
  MAX_SP,
  MAX_STAGE,
  MIN_STAGE,
  SPEED_ABILITIES,
  finalSpeed,
  isSpeedAbility,
  turnOrder,
  type NatureEffect,
  type SpeedField,
  type SpeedPokemon,
  type SpeedResult,
  type SpeedSet,
  type Weather,
} from '../lib/speed'
import { newSpeedSet, useLabState, type SpeedFormat, type SpeedLabState } from '../state/LabState'
import { Alert, Skeleton } from './common'
import { Combobox, SegmentedControl, Slider, Toggle } from './controls'

const SIDE_COLORS = [COMPARE_COLORS[0], COMPARE_COLORS[1]]
const WEATHERS: Weather[] = ['none', 'rain', 'sun', 'sand', 'snow']
const NATURES: NatureEffect[] = ['plus', 'neutral', 'minus']
const STAGES = Array.from({ length: MAX_STAGE - MIN_STAGE + 1 }, (_, i) => MAX_STAGE - i)

/** Multiplicador com ponto e sem zeros sobrando (×1.5, ×0.67). */
const mult = (m: number) => `×${Number(m.toFixed(2))}`
const stageLabel = (s: number) => (s > 0 ? `+${s}` : String(s))

/** A habilidade escolhida, ou a primeira que mexe na Speed (é a que o jogador quer testar ao abrir). */
function effectiveAbility(set: SpeedSet, pokemon: SpeedPokemon | undefined): string | null {
  if (!pokemon) return null
  if (set.ability && pokemon.abilities.includes(set.ability)) return set.ability
  return pokemon.abilities.find(isSpeedAbility) ?? null
}

interface Slot {
  side: 0 | 1
  index: 0 | 1
  set: SpeedSet
  pokemon: SpeedPokemon | undefined
  result: SpeedResult | null
}

export function SpeedComparator() {
  const { t } = useI18n()
  const [lab, setLab] = useLabState()
  const { data: roster, isPending, isError } = useQuery(speedRosterQuery())
  const state = lab.speed
  const setSpeed = (fn: (s: SpeedLabState) => SpeedLabState) => setLab((l) => ({ ...l, speed: fn(l.speed) }))
  const setField = (patch: Partial<SpeedField>) => setSpeed((s) => ({ ...s, field: { ...s.field, ...patch } }))

  const byName = useMemo(() => new Map((roster ?? []).map((p) => [p.name, p])), [roster])
  const names = useMemo(() => (roster ?? []).map((p) => p.name), [roster])

  if (isError) return <Alert>{t.speed.loadError}</Alert>
  if (isPending) return <Skeleton height={420} />

  const perSide = state.format === 'singles' ? 1 : 2
  const slots: Slot[] = ([0, 1] as const).flatMap((side) =>
    ([0, 1] as const).slice(0, perSide).map((index) => {
      const stored = state.sides[side][index]
      const pokemon = byName.get(stored.pokemon)
      const set = { ...stored, ability: effectiveAbility(stored, pokemon) }
      const result = pokemon ? finalSpeed(pokemon.baseSpeed, set, state.field, state.field.tailwind[side]) : null
      return { side, index, set, pokemon, result }
    }),
  )

  const updateSet = (side: 0 | 1, index: 0 | 1, patch: Partial<SpeedSet>) =>
    setSpeed((s) => {
      const sides = s.sides.map((pair) => [...pair]) as SpeedLabState['sides']
      sides[side][index] = { ...sides[side][index], ...patch }
      return { ...s, sides }
    })

  const formats: { value: SpeedFormat; label: string }[] = [
    { value: 'singles', label: t.speed.singles },
    { value: 'doubles', label: t.speed.doubles },
  ]
  const weatherLabel = (w: Weather) => (w === 'none' ? t.speed.weatherNone : t.speed[w])
  const sideLabel = (side: 0 | 1) => (side === 0 ? t.speed.yourSide : t.speed.opponent)

  return (
    <div className="spd">
      <p className="caption">{t.speed.intro}</p>

      <section className="panel spd-field">
        <div className="field">
          <span className="field-label">{t.speed.format}</span>
          <SegmentedControl label={t.speed.format} options={formats} value={state.format} onChange={(format) => setSpeed((s) => ({ ...s, format }))} />
        </div>
        <div className="field">
          <span className="field-label">{t.speed.weather}</span>
          <SegmentedControl
            label={t.speed.weather}
            options={WEATHERS.map((w) => ({ value: w, label: weatherLabel(w) }))}
            value={state.field.weather}
            onChange={(weather) => setField({ weather })}
          />
        </div>
        <div className="field">
          <span className="field-label">{t.speed.field}</span>
          <div className="spd-toggles">
            <Toggle checked={state.field.electricTerrain} onChange={(electricTerrain) => setField({ electricTerrain })}>
              {t.speed.electricTerrain}
            </Toggle>
            <Toggle checked={state.field.trickRoom} onChange={(trickRoom) => setField({ trickRoom })}>
              {t.speed.trickRoom}
            </Toggle>
            {([0, 1] as const).map((side) => (
              <Toggle
                key={side}
                checked={state.field.tailwind[side]}
                onChange={(on) => setField({ tailwind: side === 0 ? [on, state.field.tailwind[1]] : [state.field.tailwind[0], on] })}
              >
                {t.speed.tailwind} · <span style={{ color: SIDE_COLORS[side] }}>{sideLabel(side)}</span>
              </Toggle>
            ))}
          </div>
        </div>
      </section>

      <SpeedResultPanel slots={slots} trickRoom={state.field.trickRoom} format={state.format} sideLabel={sideLabel} />

      <div className="spd-sides">
        {([0, 1] as const).map((side) => (
          <div key={side} className="spd-side" style={{ '--side': SIDE_COLORS[side] } as CSSProperties}>
            <h2 className="spd-side-title">{sideLabel(side)}</h2>
            {slots
              .filter((s) => s.side === side)
              .map((slot) => (
                <SpeedCard
                  key={slot.index}
                  slot={slot}
                  names={names}
                  field={state.field}
                  weatherLabel={weatherLabel}
                  onChange={(patch) => updateSet(side, slot.index, patch)}
                  onPokemonChange={(name) => updateSet(side, slot.index, { ...newSpeedSet(name), sp: slot.set.sp, nature: slot.set.nature })}
                />
              ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function SpeedCard({
  slot,
  names,
  field,
  weatherLabel,
  onChange,
  onPokemonChange,
}: {
  slot: Slot
  names: string[]
  field: SpeedField
  weatherLabel: (w: Weather) => string
  onChange: (patch: Partial<SpeedSet>) => void
  onPokemonChange: (name: string) => void
}) {
  const { t } = useI18n()
  const { set, pokemon, result } = slot
  const speedAbilities = pokemon?.abilities.filter(isSpeedAbility) ?? []
  const rule = set.ability ? SPEED_ABILITIES[set.ability] : undefined
  const label = `${t.speed.pokemon} · ${slot.side === 0 ? t.speed.yourSide : t.speed.opponent}`

  return (
    <article className="spd-card">
      <div className="spd-head">
        {pokemon && (
          <img
            className="spd-sprite"
            src={spriteUrl(pokemon.id)}
            alt=""
            loading="lazy"
            onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
            onLoad={(e) => (e.currentTarget.style.visibility = '')}
          />
        )}
        <div className="spd-pick">
          <Combobox label={label} options={names} value={set.pokemon} onChange={onPokemonChange} getLabel={displayName} />
          {pokemon && <span className="caption">{t.speed.baseSpeed(pokemon.baseSpeed)}</span>}
        </div>
        {result && (
          <div className="spd-final" aria-label={t.speed.final}>
            <strong>{result.final}</strong>
            <span>{t.speed.final}</span>
          </div>
        )}
      </div>

      {result && result.steps.length > 0 && (
        <p className="spd-steps">
          {t.speed.statLine(result.stat)}
          {result.steps.map((s, i) => (
            <span key={i}>
              {' · '}
              {mult(s.mult)} {s.kind === 'stage' ? `${t.speed.steps.stage} ${stageLabel(set.stage)}` : s.kind === 'ability' ? displayName(set.ability) : t.speed.steps[s.kind]}
            </span>
          ))}
        </p>
      )}

      <div className="spd-controls">
        <div className="field">
          <span className="field-label">{t.speed.sp}</span>
          <Slider label={t.speed.sp} value={set.sp} min={0} max={MAX_SP} step={1} onChange={(sp) => onChange({ sp })} />
        </div>
        <div className="spd-row">
          <div className="field">
            <span className="field-label">{t.speed.nature}</span>
            <SegmentedControl
              label={t.speed.nature}
              options={NATURES.map((n) => ({ value: n, label: t.speed.natureOptions[n] }))}
              value={set.nature}
              onChange={(nature) => onChange({ nature })}
            />
          </div>
          <label className="field">
            <span className="field-label">{t.speed.stage}</span>
            <select className="select spd-stage" value={set.stage} onChange={(e) => onChange({ stage: Number(e.target.value) })}>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {stageLabel(s)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {speedAbilities.length > 0 && pokemon && (
          <div className="field">
            <span className="field-label">{t.speed.ability}</span>
            <div className="spd-ability">
              <select className="select" value={set.ability ?? ''} onChange={(e) => onChange({ ability: e.target.value, abilityActive: false })}>
                {pokemon.abilities.map((a) => (
                  <option key={a} value={a}>
                    {displayName(a)}
                  </option>
                ))}
              </select>
              {rule?.kind === 'toggle' && (
                <Toggle checked={set.abilityActive} onChange={(abilityActive) => onChange({ abilityActive })}>
                  {set.ability === 'unburden' ? t.speed.unburdenActive : t.speed.quickFeetActive}
                </Toggle>
              )}
            </div>
            {rule?.kind === 'weather' && <span className={field.weather === rule.weather ? 'caption on' : 'caption'}>{t.speed.weatherHint(weatherLabel(rule.weather))}</span>}
            {rule?.kind === 'terrain' && <span className={field.electricTerrain ? 'caption on' : 'caption'}>{t.speed.terrainHint}</span>}
            {rule?.kind === 'hint' && <span className="caption">{t.speed.speedBoostHint}</span>}
          </div>
        )}

        <div className="spd-toggles">
          <Toggle checked={set.paralyzed} onChange={(paralyzed) => onChange({ paralyzed })}>
            {t.speed.paralyzed}
          </Toggle>
          <Toggle checked={set.ironBall} onChange={(ironBall) => onChange({ ironBall })}>
            {t.speed.ironBall}
          </Toggle>
        </div>
      </div>
    </article>
  )
}

function SpeedResultPanel({
  slots,
  trickRoom,
  format,
  sideLabel,
}: {
  slots: Slot[]
  trickRoom: boolean
  format: SpeedFormat
  sideLabel: (side: 0 | 1) => string
}) {
  const { t } = useI18n()
  const ready = slots.filter((s): s is Slot & { result: SpeedResult } => !!s.result)
  if (ready.length !== slots.length) return null
  const order = turnOrder(
    ready.map((s) => ({ item: s, speed: s.result.final })),
    trickRoom,
  )
  const notes = (
    <>
      {trickRoom && <p className="caption on">{t.speed.trickRoomNote}</p>}
      <p className="caption">{t.speed.priorityNote}</p>
    </>
  )

  if (format === 'singles') {
    const [first, second] = order
    const tie = first.tied
    return (
      <section className="panel spd-result" aria-live="polite">
        <span className="field-label">{t.speed.result}</span>
        <p className="spd-verdict" style={{ color: tie ? undefined : SIDE_COLORS[first.item.side] }}>
          {tie ? t.speed.tie : t.speed.movesFirst(displayName(first.item.set.pokemon))}
        </p>
        <p className="spd-margin">
          {first.speed} vs {second.speed} · {tie ? t.speed.tieNote : t.speed.margin(Math.abs(first.speed - second.speed))}
        </p>
        {notes}
      </section>
    )
  }

  return (
    <section className="panel spd-result" aria-live="polite">
      <span className="field-label">{t.speed.order}</span>
      <ol className="spd-order">
        {order.map(({ item, speed, position, tied }) => (
          <li key={`${item.side}-${item.index}`} style={{ '--side': SIDE_COLORS[item.side] } as CSSProperties}>
            <span className="spd-pos">{position}</span>
            {item.pokemon && <img className="spd-sprite sm" src={spriteUrl(item.pokemon.id)} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />}
            <span className="spd-name">{displayName(item.set.pokemon)}</span>
            <span className="spd-tag">{sideLabel(item.side)}</span>
            {tied && <span className="spd-tie">{t.speed.tiedTag}</span>}
            <strong>{speed}</strong>
          </li>
        ))}
      </ol>
      {notes}
    </section>
  )
}
