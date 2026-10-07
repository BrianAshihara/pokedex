import { useId } from 'react'
import { COMPARE_COLORS, hexToRgba, statColor } from '../lib/format'
import { STATS, statRangeLv100, sumStats, type StatName, type StatValues } from '../lib/stats'

const RADAR_ORDER: StatName[] = ['HP', 'Attack', 'Defense', 'Speed', 'Sp. Def', 'Sp. Atk']
const NATURE_UP_COLOR = '#ff6b6b'
const NATURE_DOWN_COLOR = '#6ab0ff'
const LABEL_COLOR = '#8b93a7'

interface Series {
  values: StatValues
  color: string
  featured: boolean
}

interface AxisLabel {
  name: string
  nameColor: string
  valueText: string
  valueColor: string
}

const W = 380
const H = 340
const CX = W / 2
const CY = H / 2 + 2
const R = 118
const ANGLES = Array.from({ length: 6 }, (_, i) => -Math.PI / 2 + (i * Math.PI) / 3)

const point = (r: number, a: number, ox = 0, oy = 0): [number, number] => [ox + r * Math.cos(a), oy + r * Math.sin(a)]
const polygon = (radii: number[], ox = 0, oy = 0) =>
  radii.map((r, i) => point(r, ANGLES[i], ox, oy).map((v) => v.toFixed(1)).join(',')).join(' ')

/** Hexágono no estilo de Sword/Shield. */
function Radar({ series, cap, labels }: { series: Series[]; cap: number; labels: AxisLabel[] }) {
  // IDs únicos para os gradientes, caso haja mais de um hexágono na página.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const plateId = `hexPlate${uid}`
  const fillId = `hexFill${uid}`
  const glowId = `hexGlow${uid}`

  return (
    <div className="stats-hex">
      <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Gráfico hexagonal de atributos">
        <defs>
          <linearGradient id={plateId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a3145" />
            <stop offset="1" stopColor="#1a1f2d" />
          </linearGradient>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff07a" stopOpacity="0.95" />
            <stop offset="1" stopColor="#f5b700" stopOpacity="0.85" />
          </linearGradient>
          <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <polygon points={polygon(Array(6).fill(R + 8), CX, CY)} fill={`url(#${plateId})`} stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
        {[0.25, 0.5, 0.75, 1].map((lvl) => (
          <polygon
            key={lvl}
            points={polygon(Array(6).fill(R * lvl), CX, CY)}
            fill="none"
            stroke={`rgba(255,255,255,${lvl < 1 ? 0.07 : 0.22})`}
            strokeWidth={lvl < 1 ? 1 : 1.5}
          />
        ))}
        {ANGLES.map((a) => {
          const [x, y] = point(R, a, CX, CY)
          return <line key={a} x1={CX} y1={CY} x2={x.toFixed(1)} y2={y.toFixed(1)} stroke="rgba(255,255,255,0.08)" />
        })}

        <g transform={`translate(${CX.toFixed(1)},${CY.toFixed(1)})`}>
          {series.map(({ values, color, featured }, si) => {
            const radii = RADAR_ORDER.map((s) => Math.max(Math.min((values[s] || 0) / cap, 1), 0.04) * R)
            const [dotFill, dotStroke] = featured ? ['#fff6c2', '#e0a800'] : [color, '#0d0f14']
            return (
              <g key={si} className="hex-grow">
                <polygon
                  points={polygon(radii)}
                  fill={featured ? `url(#${fillId})` : hexToRgba(color, 0.18)}
                  filter={featured ? `url(#${glowId})` : undefined}
                  stroke={color}
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
                {radii.map((r, i) => {
                  const [x, y] = point(r, ANGLES[i])
                  return <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r="3.2" fill={dotFill} stroke={dotStroke} strokeWidth="1.5" />
                })}
              </g>
            )
          })}
        </g>

        {labels.map((label, i) => {
          const a = ANGLES[i]
          let [x, y] = point(R + 22, a, CX, CY)
          const ca = Math.cos(a)
          const vertical = Math.abs(ca) < 0.2
          const anchor = vertical ? 'middle' : ca > 0 ? 'start' : 'end'
          y += vertical ? (Math.sin(a) < 0 ? -14 : 8) : -6
          x = Number(x.toFixed(1))
          return (
            <text key={label.name} x={x} y={y.toFixed(1)} textAnchor={anchor} fontFamily="Outfit, sans-serif">
              <tspan x={x} fontSize="11" fontWeight="700" fill={label.nameColor} letterSpacing="0.6">
                {label.name.toUpperCase()}
              </tspan>
              {label.valueText && (
                <tspan x={x} dy="17" fontSize="16" fontWeight="800" fill={label.valueColor}>
                  {label.valueText}
                </tspan>
              )}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

export function BaseStatsRadar({ stats }: { stats: StatValues }) {
  const labels = RADAR_ORDER.map((s) => ({ name: s, nameColor: LABEL_COLOR, valueText: String(stats[s]), valueColor: statColor(stats[s]) }))
  return <Radar series={[{ values: stats, color: '#ffcb05', featured: true }]} cap={180} labels={labels} />
}

export function FinalStatsRadar({ stats, natureUp, natureDown }: { stats: StatValues; natureUp: StatName | null; natureDown: StatName | null }) {
  const cap = Math.max(...STATS.map((s) => stats[s]), 1) * 1.05
  const labels = RADAR_ORDER.map((s) => ({
    name: s,
    nameColor: s === natureUp ? NATURE_UP_COLOR : s === natureDown ? NATURE_DOWN_COLOR : LABEL_COLOR,
    valueText: String(stats[s]),
    valueColor: '#ffffff',
  }))
  return <Radar series={[{ values: stats, color: '#ffcb05', featured: true }]} cap={cap} labels={labels} />
}

export function CompareRadar({ series, cap }: { series: StatValues[]; cap: number }) {
  const labels = RADAR_ORDER.map((s) => ({ name: s, nameColor: LABEL_COLOR, valueText: '', valueColor: '' }))
  return <Radar series={series.map((values, i) => ({ values, color: COMPARE_COLORS[i], featured: false }))} cap={cap} labels={labels} />
}

export function StatBars({ stats, cap = 200 }: { stats: StatValues; cap?: number }) {
  const total = sumStats(stats)
  return (
    <>
      <table className="stat-table">
        <thead>
          <tr>
            <th />
            <th />
            <th />
            <th>Mín</th>
            <th>Máx</th>
          </tr>
        </thead>
        <tbody>
          {STATS.map((name, i) => {
            const value = stats[name]
            const [lo, hi] = statRangeLv100(name, value)
            return (
              <tr key={name}>
                <td className="s-name">{name}</td>
                <td className="s-val">{value}</td>
                <td>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${Math.min((value / cap) * 100, 100)}%`, background: statColor(value), animationDelay: `${i * 60}ms` }}
                    />
                  </div>
                </td>
                <td className="s-range">{lo}</td>
                <td className="s-range">{hi}</td>
              </tr>
            )
          })}
          <tr className="total">
            <td className="s-name">Total</td>
            <td className="s-val">{total}</td>
            <td>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${Math.min((total / 720) * 100, 100)}%`, background: 'linear-gradient(90deg,#ffcb05,#ffe066)' }} />
              </div>
            </td>
            <td />
            <td />
          </tr>
        </tbody>
      </table>
      <div className="stat-note">Mín / Máx no nível 100 (natureza, IVs e EVs)</div>
    </>
  )
}
