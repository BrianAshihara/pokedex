import { useQueries, useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { useSearchParams } from 'react-router'
import { CompareRadar, FinalStatsRadar } from '../components/charts'
import { Alert, Brand, Footer, Skeleton, Spinner } from '../components/common'
import { Combobox, NumberInput, SegmentedControl, Slider, Tabs, Toast } from '../components/controls'
import { BlockIcon } from '../components/icons'
import { MiniPokemon } from '../components/pokemon'
import { COMPARE_COLORS, displayName } from '../lib/format'
import { pokemonNamesQuery, pokemonQuery, speciesQuery } from '../lib/queries'
import {
  MAX_EV,
  MAX_IV,
  MAX_TOTAL_EV,
  NATURE_NAMES,
  STATS,
  baseStats,
  calcAll,
  mapStats,
  natureEffect,
  natureLabel,
  sumStats,
  type Nature,
  type StatName,
  type StatValues,
} from '../lib/stats'
import type { Pokemon } from '../lib/types'
import { useLabState, type CompareMode, type LabState, type LabTab } from '../state/LabState'

const TABS: { value: LabTab; label: string }[] = [
  { value: 'calc', label: 'Calculadora de atributos' },
  { value: 'compare', label: 'Comparador' },
]

const COMPARE_MODES: { value: CompareMode; label: string }[] = [
  { value: 'base', label: 'Atributos base' },
  { value: '50', label: 'Nível 50' },
  { value: '100', label: 'Nível 100' },
]

const EV_PRESETS: { label: string; evs: Partial<StatValues> }[] = [
  { label: 'Atacante físico (252 Atk / 252 Spe / 4 HP)', evs: { Attack: 252, Speed: 252, HP: 4 } },
  { label: 'Atacante especial (252 SpA / 252 Spe / 4 HP)', evs: { 'Sp. Atk': 252, Speed: 252, HP: 4 } },
  { label: 'Tanque físico (252 HP / 252 Def / 4 SpD)', evs: { HP: 252, Defense: 252, 'Sp. Def': 4 } },
  { label: 'Tanque especial (252 HP / 252 SpD / 4 Def)', evs: { HP: 252, 'Sp. Def': 252, Defense: 4 } },
]

/** Pokémon + número da Pokédex nacional (o id do /pokemon é diferente para formas alternativas). */
function usePokemonWithSpecies(name: string) {
  const pokemon = useQuery({ ...pokemonQuery(name), enabled: !!name })
  const species = useQuery({ ...speciesQuery(pokemon.data?.species.name ?? ''), enabled: !!pokemon.data })
  return { pokemon: pokemon.data, speciesId: species.data?.id, isPending: pokemon.isPending && !!name, isError: pokemon.isError }
}

export function LabPage() {
  const [state, setState] = useLabState()
  const [params, setParams] = useSearchParams()
  const linkedRef = params.get('p')
  const { data: names = [] } = useQuery(pokemonNamesQuery())
  const { data: linkedPokemon } = useQuery({ ...pokemonQuery(linkedRef ?? ''), enabled: !!linkedRef })

  useEffect(() => {
    document.title = 'Laboratório | Pokédex'
  }, [])

  // "Abrir no Laboratório" chega com ?p=nome: usa esse Pokémon na calculadora e no primeiro slot do comparador.
  useEffect(() => {
    const name = linkedPokemon?.name
    if (name && name !== state.linked) {
      setState((s) => ({ ...s, calcPokemon: name, compare: [name, s.compare[1], s.compare[2]], linked: name }))
    }
  }, [linkedPokemon, state.linked, setState])

  const setCalcPokemon = (name: string) => {
    setState((s) => ({ ...s, calcPokemon: name, linked: name }))
    setParams({ p: name }, { replace: true })
  }

  return (
    <>
      <div className="page-header lab">
        <Brand />
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>
            Laboratório
          </h1>
          <div className="page-sub">Calcule os atributos reais do seu Pokémon e compare Pokémon lado a lado.</div>
        </div>
      </div>

      <Tabs label="Ferramentas do laboratório" tabs={TABS} active={state.tab} onChange={(tab) => setState((s) => ({ ...s, tab }))} />

      {state.tab === 'calc' ? <Calculator names={names} onPokemonChange={setCalcPokemon} /> : <Comparator names={names} />}

      <Footer />
    </>
  )
}

function Calculator({ names, onPokemonChange }: { names: string[]; onPokemonChange: (name: string) => void }) {
  const [state, setState] = useLabState()
  const { calcPokemon, level, nature, ivs, evs } = state
  const { pokemon, speciesId, isPending, isError } = usePokemonWithSpecies(calcPokemon)
  const [toast, setToast] = useState<string | null>(null)
  const closeToast = useCallback(() => setToast(null), [])
  const [natureUp, natureDown] = natureEffect(nature)

  const setIvs = (fn: (s: StatName) => number) => setState((s) => ({ ...s, ivs: mapStats(fn) }))
  const setEvs = (fn: (s: StatName) => number) => setState((s) => ({ ...s, evs: mapStats(fn) }))

  const changeEv = (stat: StatName, value: number) => {
    const others = sumStats(evs) - evs[stat]
    const available = Math.floor((MAX_TOTAL_EV - others) / 2) * 2
    if (value > available) setToast(`Limite de ${MAX_TOTAL_EV} EVs atingido.`)
    setEvs((s) => (s === stat ? Math.min(value, available) : evs[s]))
  }

  return (
    <>
      <div className="lab-calc-top">
        <div className="field">
          <span className="field-label">Pokémon</span>
          <Combobox label="Pokémon" options={names} value={calcPokemon} onChange={onPokemonChange} getLabel={displayName} />
        </div>
        <label className="field">
          <span className="field-label">Nível</span>
          <NumberInput label="Nível" value={level} min={1} max={100} onChange={(value) => setState((s) => ({ ...s, level: value }))} />
        </label>
        <label className="field">
          <span className="field-label">Natureza</span>
          <select className="select" value={nature} onChange={(e) => setState((s) => ({ ...s, nature: e.target.value as Nature }))}>
            {NATURE_NAMES.map((n) => (
              <option key={n} value={n}>
                {natureLabel(n)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isError && <Alert>Não foi possível carregar este Pokémon agora. Tente novamente em instantes.</Alert>}
      {isPending && <Spinner label="Carregando Pokémon..." />}

      {pokemon && (
        <div className="lab-calc-body">
          <section className="panel">
            <h2 className="card-title">IVs e EVs</h2>
            <div className="button-row">
              <button type="button" className="btn" onClick={() => setIvs(() => MAX_IV)}>
                IVs 31
              </button>
              <button type="button" className="btn" onClick={() => setIvs(() => 0)}>
                IVs 0
              </button>
              <button type="button" className="btn" onClick={() => setEvs(() => 0)}>
                Zerar EVs
              </button>
            </div>
            <select
              className="select"
              aria-label="Distribuição rápida de EVs"
              value=""
              onChange={(e) => {
                const preset = EV_PRESETS[Number(e.target.value)]
                if (preset) setEvs((s) => preset.evs[s] ?? 0)
              }}
            >
              <option value="" disabled>
                Distribuição rápida de EVs
              </option>
              {EV_PRESETS.map((p, i) => (
                <option key={p.label} value={i}>
                  {p.label}
                </option>
              ))}
            </select>

            <CalcGrid
              pokemon={pokemon}
              ivs={ivs}
              evs={evs}
              natureUp={natureUp}
              natureDown={natureDown}
              onIvChange={(stat, value) => setIvs((s) => (s === stat ? value : ivs[s]))}
              onEvChange={changeEv}
            />

            <div className="ev-meter">
              <span>EVs usados</span>
              <div className="bar-track">
                <div
                  className="bar-fill static"
                  style={{ width: `${Math.min((sumStats(evs) / MAX_TOTAL_EV) * 100, 100)}%`, background: 'linear-gradient(90deg,#ffcb05,#ffe066)' }}
                />
              </div>
              <span>
                <b>{sumStats(evs)}</b> / {MAX_TOTAL_EV}
              </span>
            </div>
          </section>

          <CalcResult pokemon={pokemon} speciesId={speciesId} />
        </div>
      )}

      <Toast message={toast} onClose={closeToast} icon={<BlockIcon width={18} height={18} />} />
    </>
  )
}

interface CalcGridProps {
  pokemon: Pokemon
  ivs: StatValues
  evs: StatValues
  natureUp: StatName | null
  natureDown: StatName | null
  onIvChange: (stat: StatName, value: number) => void
  onEvChange: (stat: StatName, value: number) => void
}

function NatureTag({ stat, natureUp, natureDown }: { stat: StatName; natureUp: StatName | null; natureDown: StatName | null }) {
  if (stat === natureUp) return <span className="nat-tag up">+10%</span>
  if (stat === natureDown) return <span className="nat-tag down">-10%</span>
  return null
}

function CalcGrid({ pokemon, ivs, evs, natureUp, natureDown, onIvChange, onEvChange }: CalcGridProps) {
  const base = baseStats(pokemon)
  return (
    <div className="calc-grid">
      <div className="calc-head">Atributo</div>
      <div className="calc-head">Base</div>
      <div className="calc-head">IV (0 a 31)</div>
      <div className="calc-head">EV (0 a 252)</div>
      {STATS.map((s) => (
        <div key={s} style={{ display: 'contents' }}>
          <div className="calc-stat">
            {s}
            <NatureTag stat={s} natureUp={natureUp} natureDown={natureDown} />
          </div>
          <div className="calc-base">{base[s]}</div>
          <NumberInput small label={`IV ${s}`} value={ivs[s]} min={0} max={MAX_IV} onChange={(value) => onIvChange(s, value)} />
          <Slider label={`EV ${s}`} value={evs[s]} min={0} max={MAX_EV} step={2} onChange={(value) => onEvChange(s, value)} />
        </div>
      ))}
    </div>
  )
}

function CalcResult({ pokemon, speciesId }: { pokemon: Pokemon; speciesId?: number }) {
  const [{ level, nature, ivs, evs }] = useLabState()
  const [natureUp, natureDown] = natureEffect(nature)
  const base = baseStats(pokemon)
  const final = calcAll(base, ivs, evs, level, nature)

  return (
    <section className="card">
      <h2 className="card-title">Atributos no nível {level}</h2>
      <MiniPokemon pokemon={pokemon} speciesId={speciesId} subtitle={natureLabel(nature)} />
      <FinalStatsRadar key={pokemon.name} stats={final} natureUp={natureUp} natureDown={natureDown} />
      <table className="lab-table">
        <thead>
          <tr>
            <th>Atributo</th>
            <th>Base</th>
            <th>IV</th>
            <th>EV</th>
            <th>Final</th>
          </tr>
        </thead>
        <tbody>
          {STATS.map((s) => (
            <tr key={s}>
              <td className={`name ${s === natureUp ? 'up' : s === natureDown ? 'down' : ''}`}>{s}</td>
              <td className="dim">{base[s]}</td>
              <td className="dim">{ivs[s]}</td>
              <td className="dim">{evs[s]}</td>
              <td className="final">{final[s]}</td>
            </tr>
          ))}
          <tr className="total">
            <td>Total</td>
            <td>{sumStats(base)}</td>
            <td />
            <td>{sumStats(evs)}</td>
            <td>{sumStats(final)}</td>
          </tr>
        </tbody>
      </table>
    </section>
  )
}

function Comparator({ names }: { names: string[] }) {
  const [state, setState] = useLabState()
  const { compareMode: mode, compare } = state
  const optionalNames = [''].concat(names)

  const selected = compare.filter(Boolean)
  const results = useQueries({ queries: selected.map((name) => pokemonQuery(name)) })
  const speciesResults = useQueries({
    queries: results.map((r) => ({ ...speciesQuery(r.data?.species.name ?? ''), enabled: !!r.data })),
  })
  const loaded = results
    .map((r, i) => ({ pokemon: r.data, speciesId: speciesResults[i]?.data?.id }))
    .filter((r): r is { pokemon: Pokemon; speciesId: number | undefined } => !!r.pokemon)
  const loading = results.some((r) => r.isPending)

  const setSlot = (index: number, name: string) =>
    setState((s) => {
      const next = [...s.compare] as LabState['compare']
      next[index] = name
      return { ...s, compare: next }
    })

  const valuesList = loaded.map(({ pokemon }) => {
    const base = baseStats(pokemon)
    return mode === 'base' ? base : calcAll(base, {}, {}, Number(mode))
  })
  const cap = mode === 'base' ? 180 : Math.max(...valuesList.flatMap((v) => STATS.map((s) => v[s]))) * 1.05
  const shownNames = loaded.map(({ pokemon }) => pokemon.name)

  return (
    <>
      <div className="field">
        <span className="field-label">Comparar por</span>
        <SegmentedControl label="Comparar por" options={COMPARE_MODES} value={mode} onChange={(value) => setState((s) => ({ ...s, compareMode: value }))} />
      </div>

      <div className="lab-picks">
        {compare.map((name, i) => (
          <div key={i} className="field">
            <span className="field-label">Pokémon {i + 1}</span>
            <Combobox
              label={`Pokémon ${i + 1}`}
              options={i < 2 ? names : optionalNames}
              value={name || (i < 2 ? null : '')}
              onChange={(value) => setSlot(i, value)}
              getLabel={(n) => (n ? displayName(n) : 'Nenhum')}
              placeholder="Nenhum"
            />
          </div>
        ))}
      </div>

      {loading ? (
        <Skeleton height={380} />
      ) : loaded.length < 2 ? (
        <Alert kind="info">Escolha pelo menos dois Pokémon para comparar.</Alert>
      ) : (
        <section className="panel">
          <div className="cmp-cards" style={{ '--n': loaded.length } as CSSProperties}>
            {loaded.map(({ pokemon, speciesId }, i) => (
              <MiniPokemon key={i} pokemon={pokemon} speciesId={speciesId} color={COMPARE_COLORS[i]} />
            ))}
          </div>
          <div className="cmp-body">
            <div>
              <CompareRadar key={shownNames.join()} series={valuesList} cap={cap} />
              <div className="legend">
                {shownNames.map((n, i) => (
                  <span key={i}>
                    <i style={{ '--c': COMPARE_COLORS[i] } as CSSProperties} />
                    {displayName(n)}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <CompareTable names={shownNames} valuesList={valuesList} />
              {mode !== 'base' && <p className="caption">Valores no nível {mode} com IVs 31, sem EVs e natureza neutra.</p>}
            </div>
          </div>
        </section>
      )}
    </>
  )
}

function CompareTable({ names, valuesList }: { names: string[]; valuesList: StatValues[] }) {
  const rows: { label: string; values: number[] }[] = [
    ...STATS.map((s) => ({ label: s as string, values: valuesList.map((v) => v[s]) })),
    { label: 'Total', values: valuesList.map(sumStats) },
  ]
  return (
    <table className="lab-table">
      <thead>
        <tr>
          <th>Atributo</th>
          {names.map((n, i) => (
            <th key={i} style={{ color: COMPARE_COLORS[i] }}>
              {displayName(n)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(({ label, values }) => {
          const best = Math.max(...values)
          const tie = values.every((v) => v === best)
          return (
            <tr key={label} className={label === 'Total' ? 'total' : undefined}>
              <td className="name">{label}</td>
              {values.map((v, i) =>
                v === best && !tie ? (
                  <td key={i} className="best" style={{ color: COMPARE_COLORS[i] }}>
                    {v}
                  </td>
                ) : (
                  <td key={i}>{v}</td>
                ),
              )}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
