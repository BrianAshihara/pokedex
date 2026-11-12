import { useMemo, useState } from 'react'
import { usePersistentState } from '../hooks/usePersistentState'
import { useI18n } from '../i18n/I18nProvider'
import { generationLabel } from '../lib/format'
import { ARTWORK_PREFIX, hasFemaleSprites, spriteGenerations, spritesFor, spriteTimeline, type SpriteEntry } from '../lib/sprites'
import { titleize, versionGroupLabel } from '../lib/versions'
import { SegmentedControl, Tabs, Toggle } from './controls'
import type { ImageMode } from './pokemon'

/** Sprite escolhido na galeria para aparecer no card principal. */
export interface SpritePick {
  url: string
  mode: ImageMode
  label: string
}

/** Aba com um sprite por geração; as demais abas usam o número da geração ("0" = especiais). */
const TIMELINE = 'timeline'

/** A partir desta largura o sprite é uma renderização em alta resolução (HOME, arte, Gen VIII+), não pixel art. */
const HI_RES_WIDTH = 160

function useSpriteLabels() {
  const { t } = useI18n()
  const source = (s: string) => {
    if (s.startsWith(ARTWORK_PREFIX)) {
      // "red-and-blue" → "Red / Blue"
      const game = s.slice(ARTWORK_PREFIX.length).split('-and-').map(titleize).join(' / ')
      return t.sprites.artwork(game)
    }
    return t.sprites.sources[s] ?? versionGroupLabel(s)
  }
  return { source, style: (entry: SpriteEntry) => t.sprites.styles[entry.style] }
}

interface TileProps {
  entry: SpriteEntry
  sourceLabel: string
  /** Legenda abaixo da imagem; por padrão, o estilo (Padrão, Cinza...). */
  caption?: string
  selected: boolean
  onSelect: (pick: SpritePick) => void
}

function SpriteTile({ entry, sourceLabel, caption, selected, onSelect }: TileProps) {
  const { t } = useI18n()
  const labels = useSpriteLabels()
  // Decidido pelo tamanho real da imagem: o formato da URL não diz se é pixel art.
  const [hiRes, setHiRes] = useState<boolean | null>(null)
  const [failed, setFailed] = useState(false)
  if (failed) return null

  const styleLabel = labels.style(entry)
  const label = `${sourceLabel} · ${styleLabel}`
  const pick = () => {
    const animated = entry.style === 'animated' || /\.gif$/i.test(entry.url)
    onSelect({ url: entry.url, mode: hiRes ? 'art' : animated ? 'anim' : 'pixel', label })
  }

  return (
    <button type="button" className="sg-tile" aria-pressed={selected} title={t.sprites.showInCard(label)} onClick={pick}>
      <span className="sg-img">
        <img
          src={entry.url}
          alt={label}
          loading="lazy"
          className={hiRes === false ? 'px' : undefined}
          onLoad={(e) => setHiRes(e.currentTarget.naturalWidth >= HI_RES_WIDTH || /\.svg$/i.test(entry.url))}
          onError={() => setFailed(true)}
        />
      </span>
      <span className="sg-cap">
        {caption ?? styleLabel}
        {entry.female && (
          <span className="sg-female" title={t.sprites.femaleBadge} aria-label={t.sprites.femaleBadge}>
            ♀
          </span>
        )}
      </span>
    </button>
  )
}

interface SpriteGalleryProps {
  gallery: SpriteEntry[]
  shiny: boolean
  onShinyChange: (shiny: boolean) => void
  selectedUrl: string | null
  onSelect: (pick: SpritePick) => void
}

export function SpriteGallery({ gallery, shiny, onShinyChange, selectedUrl, onSelect }: SpriteGalleryProps) {
  const { t } = useI18n()
  const labels = useSpriteLabels()
  const [savedTab, setSavedTab] = usePersistentState('pokedex:sprite-gen', TIMELINE)
  const [side, setSide] = useState<'front' | 'back'>('front')
  const [female, setFemale] = useState(false)

  const generations = useMemo(() => spriteGenerations(gallery), [gallery])
  const hasFemale = useMemo(() => hasFemaleSprites(gallery), [gallery])
  const filter = useMemo(() => ({ back: side === 'back', shiny, female: hasFemale && female }), [side, shiny, female, hasFemale])
  const timeline = useMemo(() => spriteTimeline(gallery, filter), [gallery, filter])
  // A aba salva pode não existir neste Pokémon (ex.: Gen I para um Pokémon da Gen IX).
  const tab = savedTab === TIMELINE || generations.includes(Number(savedTab)) ? savedTab : String(generations[0] ?? 0)
  const gen = Number(tab)
  const groups = useMemo(() => (tab === TIMELINE ? [] : spritesFor(gallery, gen, filter)), [gallery, tab, gen, filter])

  const tabs = [
    { value: TIMELINE, label: t.sprites.timeline },
    ...generations.map((g) => ({ value: String(g), label: g === 0 ? t.sprites.special : `Gen ${generationLabel(g)}` })),
  ]
  const sides = [
    { value: 'front' as const, label: t.sprites.front },
    { value: 'back' as const, label: t.sprites.back },
  ]

  return (
    <section className="panel">
      <div className="sg-head">
        <h2 className="card-title">
          {t.sprites.title}
          {gallery.length > 0 && <span className="sg-count">{t.sprites.count(gallery.length)}</span>}
        </h2>
        {gallery.length > 0 && (
          <div className="sg-controls">
            <SegmentedControl label={t.sprites.side} options={sides} value={side} onChange={setSide} />
            <Toggle checked={shiny} onChange={onShinyChange}>
              Shiny
            </Toggle>
            {hasFemale && (
              <Toggle checked={female} onChange={setFemale}>
                {t.sprites.female}
              </Toggle>
            )}
          </div>
        )}
      </div>

      {gallery.length === 0 ? (
        <p className="caption">{t.sprites.none}</p>
      ) : (
        <>
          <Tabs label={t.sprites.generations} tabs={tabs} active={tab} onChange={setSavedTab} />
          {tab === TIMELINE ? (
            timeline.length === 0 ? (
              <p className="caption">{t.sprites.timelineEmpty}</p>
            ) : (
              <div className="sg-timeline">
                {timeline.map(({ gen, source, sprite }) => (
                  <div key={gen} className="sg-step">
                    <SpriteTile
                      entry={sprite}
                      sourceLabel={labels.source(source)}
                      caption={labels.source(source)}
                      selected={sprite.url === selectedUrl}
                      onSelect={onSelect}
                    />
                    <span className="sg-gen">Gen {generationLabel(gen)}</span>
                  </div>
                ))}
              </div>
            )
          ) : groups.length === 0 ? (
            <p className="caption">{t.sprites.empty}</p>
          ) : (
            <div className="sg-groups">
              {groups.map((group) => {
                const sourceLabel = labels.source(group.source)
                return (
                  <div key={group.source} className="sg-group">
                    <h3 className="sg-title">{sourceLabel}</h3>
                    <div className="sg-row">
                      {group.sprites.map((entry) => (
                        <SpriteTile key={entry.url} entry={entry} sourceLabel={sourceLabel} selected={entry.url === selectedUrl} onSelect={onSelect} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </section>
  )
}
