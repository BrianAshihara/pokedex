import { Link } from 'react-router'
import { useI18n } from '../i18n/I18nProvider'
import { displayName } from '../lib/format'
import { evolutionOptions, type EvolutionOption } from '../lib/pokeapi'
import type { EvolutionNode, EvolutionTree } from '../lib/types'
import { Card } from './common'

/** Métodos muito longos (ex.: Eevee) mostram só o principal e "+N"; o texto completo fica no tooltip. */
function shortMethod(options: EvolutionOption[]): [short: string, full: string] {
  const full = options.map((o) => o.text).join(' / ') || '?'
  if (options.length <= 2) return [full, full]
  const main = options.find((o) => o.usesItem) ?? options[0]
  return [`${main.text} +${options.length - 1}`, full]
}

function Stage({ node, sprites, current }: { node: EvolutionNode; sprites: EvolutionTree['sprites']; current: string }) {
  const { t } = useI18n()
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
            const [method, full] = shortMethod(evolutionOptions(child.details, t.evolution))
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
  const { t } = useI18n()
  return (
    <Card title={t.evolution.title} accent={accent}>
      {!evolution || evolution.tree.children.length === 0 ? (
        <span className="muted">{t.evolution.none}</span>
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
