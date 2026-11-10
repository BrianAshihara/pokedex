import { memo, useMemo } from 'react'
import type { KeyboardEvent } from 'react'
import { gridRuns, insidePolygon, layoutTownLabels, linePath, mapMarkers } from '../lib/illustrated-map'
import type { GridRun, IllustratedMap, SpotIcon } from '../lib/illustrated-map'

interface Props {
  map: IllustratedMap
  highlighted: Set<string>
  selected: string | null
  /** Nome oficial do local escolhido, vindo da PokeAPI. */
  selectedName: string | null
  onSelect: (slug: string) => void
  label: string
}

const CELL = 16

const SPOT_STYLE: Record<SpotIcon, { className: string; square?: boolean }> = {
  cave: { className: 'is-cave' },
  forest: { className: 'is-nature' },
  safari: { className: 'is-nature' },
  ice: { className: 'is-water' },
  ship: { className: 'is-water' },
  tower: { className: 'is-building', square: true },
  factory: { className: 'is-building', square: true },
  mansion: { className: 'is-building', square: true },
  league: { className: 'is-league', square: true },
}

function Blocks({ runs, fill, grow = 0 }: { runs: GridRun[]; fill: string; grow?: number }) {
  return (
    <g fill={fill}>
      {runs.map((run) => (
        <rect key={`${run.x}-${run.y}`} x={run.x - grow} y={run.y - grow} width={run.width + grow * 2} height={CELL + grow * 2} />
      ))}
    </g>
  )
}

/** Camada estática: separada para o pulso do marcador não redesenhar o terreno. */
const Terrain = memo(function Terrain({ map }: { map: IllustratedMap }) {
  const layers = useMemo(() => {
    const onLand = (x: number, y: number) => [map.coast, ...map.islands].some((shape) => insidePolygon(x, y, shape)) && !map.lakes.some((lake) => insidePolygon(x, y, lake))
    const runsOf = (inside: (x: number, y: number) => boolean) => gridRuns(map.width, map.height, CELL, (x, y) => onLand(x, y) && inside(x, y))
    const hill = (scale: number) => (x: number, y: number) => map.mountains.some((m) => Math.hypot(x - m.x, y - (m.y - m.size * 0.3)) < m.size * scale)
    return {
      land: runsOf(() => true),
      forest: runsOf((x, y) => map.forests.some((f) => ((x - f.x) / f.rx) ** 2 + ((y - f.y) / f.ry) ** 2 < 1)),
      hills: runsOf(hill(1.1)),
      peaks: runsOf(hill(0.55)),
    }
  }, [map])

  const roads = useMemo(() => Object.entries(map.roads).map(([slug, road]) => ({ slug, sea: road.sea, d: linePath(road.points) })), [map])

  return (
    <svg className="imap-layer" viewBox={`0 0 ${map.width} ${map.height}`} shapeRendering="crispEdges" aria-hidden="true">
      <rect width={map.width} height={map.height} fill="#55b4ea" />
      <Blocks runs={layers.land} fill="#8ccff2" grow={CELL} />
      <Blocks runs={layers.land} fill="#f7e8b2" grow={5} />
      <Blocks runs={layers.land} fill="#95dc72" />
      <Blocks runs={layers.forest} fill="#5fbd59" />
      <Blocks runs={layers.hills} fill="#d9b985" />
      <Blocks runs={layers.peaks} fill="#f2e3c4" />

      <g fill="none" strokeLinecap="square" strokeLinejoin="miter">
        {roads.filter((r) => r.sea).map((r) => <path key={r.slug} d={r.d} stroke="#ffffff" strokeOpacity="0.75" strokeWidth="10" strokeDasharray="12 10" strokeLinecap="butt" />)}
        {roads.filter((r) => !r.sea).map((r) => <path key={r.slug} d={r.d} stroke="#b08f50" strokeWidth="20" />)}
        {roads.filter((r) => !r.sea).map((r) => <path key={r.slug} d={r.d} stroke="#fff3c9" strokeWidth="14" />)}
      </g>
    </svg>
  )
})

/** Cidades e pontos ficam acima das rotas destacadas, para nenhum sumir sob o traço. */
const Landmarks = memo(function Landmarks({ map }: { map: IllustratedMap }) {
  return (
    <g pointerEvents="none">
      {Object.entries(map.spots).map(([slug, spot]) => {
        const style = SPOT_STYLE[spot.icon]
        return style.square ? (
          <rect key={slug} className={`imap-spot ${style.className}`} x={spot.x - 11} y={spot.y - 11} width="22" height="22" />
        ) : (
          <circle key={slug} className={`imap-spot ${style.className}`} cx={spot.x} cy={spot.y} r="12" />
        )
      })}
      {Object.entries(map.towns).map(([slug, town]) => {
        const half = 13 + town.size * 7
        return <rect key={slug} className="imap-town" x={town.x - half} y={town.y - half} width={half * 2} height={half * 2} />
      })}
    </g>
  )
})

export function IllustratedMapView({ map, highlighted, selected, selectedName, onSelect, label }: Props) {
  const markers = useMemo(() => mapMarkers(map), [map])
  const current = markers.find((m) => m.slug === selected) ?? null
  const labels = useMemo(() => layoutTownLabels(markers.filter((m) => m.kind === 'town' && m.slug !== selected), current), [markers, selected, current])
  const routes = markers.filter((m) => highlighted.has(m.slug) && m.d)
  const places = markers.filter((m) => highlighted.has(m.slug) && !m.d)

  const pressKey = (e: KeyboardEvent, slug: string) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    onSelect(slug)
  }

  const hitProps = (slug: string, name: string) => ({
    className: `imap-hit${slug === selected ? ' is-selected' : ''}`,
    role: 'button',
    tabIndex: 0,
    'aria-label': name,
    'aria-pressed': slug === selected,
    onClick: () => onSelect(slug),
    onKeyDown: (e: KeyboardEvent) => pressKey(e, slug),
  })

  const anchor = current ? (current.x < map.width * 0.2 ? 'start' : current.x > map.width * 0.8 ? 'end' : 'middle') : 'middle'

  return (
    <div className="imap" style={{ aspectRatio: `${map.width} / ${map.height}` }}>
      <Terrain map={map} />
      <svg className="imap-layer" viewBox={`0 0 ${map.width} ${map.height}`} role="group" aria-label={label}>
        {markers.filter((m) => !highlighted.has(m.slug)).map((m) => (
          <g key={m.slug} className="imap-ghost">
            <title>{m.name}</title>
            {m.d ? <path d={m.d} /> : <circle cx={m.x} cy={m.y} r={m.r} />}
          </g>
        ))}

        {routes.map((m) => (
          <g key={m.slug} {...hitProps(m.slug, m.name)}>
            <title>{m.name}</title>
            <path className="imap-hit-area" d={m.d} />
            <path className={m.kind === 'sea' ? 'imap-route is-sea' : 'imap-route'} d={m.d} />
          </g>
        ))}

        <Landmarks map={map} />

        {places.map((m) => (
          <g key={m.slug} {...hitProps(m.slug, m.name)}>
            <title>{m.name}</title>
            <circle className="imap-hit-area-dot" cx={m.x} cy={m.y} r="26" />
            <circle className="imap-ring" cx={m.x} cy={m.y} r={m.kind === 'town' ? 24 : 18} />
          </g>
        ))}

        <g className="imap-labels">
          {labels.map(({ marker, y }) => (
            <text key={marker.slug} x={marker.x} y={y} textAnchor="middle">
              {marker.name}
            </text>
          ))}
        </g>

        {current && (
          <g className="imap-pin" key={selected}>
            <circle className="imap-pulse" cx={current.x} cy={current.y} r="26" />
            <g transform={`translate(${current.x} ${current.y}) scale(2.3) translate(-12 -24)`}>
              <path className="imap-pin-body" d="M12 24S2 14.5 2 9a10 10 0 0 1 20 0c0 5.5-10 15-10 15Z" />
              <circle className="imap-pin-eye" cx="12" cy="9" r="3.6" />
            </g>
            <text className="imap-current" x={current.x} y={current.y + 34} textAnchor={anchor}>
              {selectedName ?? current.name}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
