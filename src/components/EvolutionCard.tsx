import { Link } from 'react-router'
import { displayName } from '../lib/format'
import type { EvolutionNode, EvolutionTree } from '../lib/types'
import { Card } from './common'

/** Métodos muito longos (ex.: Eevee) mostram só o principal e "+N"; o texto completo fica no tooltip. */
function shortMethod(method: string | null): [short: string, full: string] {
  const full = method || '?'
  const options = full.split(' / ')
  if (options.length <= 2) return [full, full]
  options.sort((a, b) => Number(!a.startsWith('Usar')) - Number(!b.startsWith('Usar')))
  return [`${options[0]} +${options.length - 1}`, full]
}

function Stage({ node, sprites, current }: { node: EvolutionNode; sprites: EvolutionTree['sprites']; current: string }) {
  const label = displayName(node.name)
  const sprite = sprites[node.name]
  const branchClass = ['evo-branches', node.children.length > 3 && 'many', node.children.length > 6 && 'wide'].filter(Boolean).join(' ')

  return (
    <div className="evo-stage">
      <Link className={node.name === current ? 'evo-node current' : 'evo-node'} to={`/pokemon/${node.name}`}>
        {sprite ? <img src={sprite} alt={label} loading="lazy" /> : <div className="img-placeholder" />}
        <span className="evo-name">{label}</span>
      </Link>
      {node.children.length > 0 && (
        <div className={branchClass}>
          {node.children.map((child) => {
            const [method, full] = shortMethod(child.method)
            return (
              <div key={child.name} className="evo-branch">
                <div className="evo-link">
                  <span className="evo-method" title={full}>
                    {method}
                  </span>
                  <span className="evo-arrow" />
                </div>
                <Stage node={child} sprites={sprites} current={current} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function EvolutionCard({ evolution, currentSpecies, accent }: { evolution: EvolutionTree | null; currentSpecies: string; accent: string }) {
  return (
    <Card title="Cadeia de evolução" accent={accent}>
      {!evolution || evolution.tree.children.length === 0 ? (
        <span className="muted">Este Pokémon não evolui.</span>
      ) : (
        <div className="evo-scroll">
          <div className="evo-tree">
            <Stage node={evolution.tree} sprites={evolution.sprites} current={currentSpecies} />
          </div>
        </div>
      )}
    </Card>
  )
}
