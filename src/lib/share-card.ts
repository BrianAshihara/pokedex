// Imagem de compartilhamento (1080×1350, retrato 4:5) desenhada em canvas, sem biblioteca.
// Segue o visual do card: degradê do tipo, hexágono de atributos e barras com as mesmas cores.

import { hexToRgba, statColor, typeColor } from './format'
import { STATS, sumStats, type StatName, type StatValues } from './stats'

export const SHARE_WIDTH = 1080
export const SHARE_HEIGHT = 1350

export interface ShareCardData {
  name: string
  dexNumber: string
  genus: string
  types: string[]
  imageUrl: string | null
  /** Pixel art é ampliada sem suavização, como no card. */
  pixelated: boolean
  tags: string[]
  stats: StatValues | null
  abilities: { name: string; hidden: boolean }[]
  hiddenLabel: string
  totalLabel: string
  footer: string
}

const FONT = 'Outfit, system-ui, sans-serif'
const RADAR_ORDER: StatName[] = ['HP', 'Attack', 'Defense', 'Speed', 'Sp. Def', 'Sp. Atk']
const RADAR_CAP = 180
const BAR_CAP = 200

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    // Sem isso o canvas fica "contaminado" e não pode ser exportado. O GitHub responde com CORS liberado.
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, radii: number[]) {
  ctx.beginPath()
  radii.forEach((r, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 3
    const x = cx + r * Math.cos(a)
    const y = cy + r * Math.sin(a)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.closePath()
}

function drawBackground(ctx: CanvasRenderingContext2D, c1: string, c2: string) {
  ctx.fillStyle = '#0d0f14'
  ctx.fillRect(0, 0, SHARE_WIDTH, SHARE_HEIGHT)
  const tint = ctx.createLinearGradient(0, 0, SHARE_WIDTH * 0.6, SHARE_HEIGHT)
  tint.addColorStop(0, hexToRgba(c1, 0.6))
  tint.addColorStop(0.45, hexToRgba(c2, 0.25))
  tint.addColorStop(0.75, 'rgba(21, 25, 34, 0)')
  ctx.fillStyle = tint
  ctx.fillRect(0, 0, SHARE_WIDTH, SHARE_HEIGHT)
  const glow = ctx.createRadialGradient(540, 380, 0, 540, 380, 420)
  glow.addColorStop(0, hexToRgba(c1, 0.55))
  glow.addColorStop(1, hexToRgba(c1, 0))
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, SHARE_WIDTH, SHARE_HEIGHT)

  // Pokébola de fundo, como no card.
  ctx.save()
  ctx.globalAlpha = 0.07
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 26
  ctx.beginPath()
  ctx.arc(900, 300, 330, 0, Math.PI * 2)
  ctx.moveTo(570, 300)
  ctx.lineTo(1230, 300)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(900, 300, 90, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

function drawPill(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, h: number, fill: string, color: string, fontSize: number): number {
  ctx.font = `700 ${fontSize}px ${FONT}`
  const w = ctx.measureText(text).width + h * 0.9
  roundRect(ctx, x, y, w, h, h / 2)
  ctx.fillStyle = fill
  ctx.fill()
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x + w / 2, y + h / 2 + 1)
  return w
}

function drawTypes(ctx: CanvasRenderingContext2D, types: string[], centerX: number, y: number) {
  const h = 56
  const gap = 16
  ctx.font = `700 28px ${FONT}`
  const widths = types.map((t) => ctx.measureText(t.toUpperCase()).width + h * 0.9)
  let x = centerX - (widths.reduce((a, b) => a + b, 0) + gap * (types.length - 1)) / 2
  for (const type of types) {
    x += drawPill(ctx, type.toUpperCase(), x, y, h, typeColor(type), '#fff', 28) + gap
  }
}

function drawRadar(ctx: CanvasRenderingContext2D, stats: StatValues, cx: number, cy: number, r: number) {
  hexPath(ctx, cx, cy, Array(6).fill(r + 10))
  const plate = ctx.createLinearGradient(0, cy - r, 0, cy + r)
  plate.addColorStop(0, '#2a3145')
  plate.addColorStop(1, '#1a1f2d')
  ctx.fillStyle = plate
  ctx.fill()
  for (const lvl of [0.25, 0.5, 0.75, 1]) {
    hexPath(ctx, cx, cy, Array(6).fill(r * lvl))
    ctx.strokeStyle = `rgba(255,255,255,${lvl < 1 ? 0.08 : 0.22})`
    ctx.lineWidth = lvl < 1 ? 1.5 : 2.5
    ctx.stroke()
  }
  const radii = RADAR_ORDER.map((s) => Math.max(Math.min(stats[s] / RADAR_CAP, 1), 0.04) * r)
  hexPath(ctx, cx, cy, radii)
  const fill = ctx.createLinearGradient(0, cy - r, 0, cy + r)
  fill.addColorStop(0, 'rgba(255, 240, 122, 0.95)')
  fill.addColorStop(1, 'rgba(245, 183, 0, 0.85)')
  ctx.save()
  ctx.shadowColor = 'rgba(255, 203, 5, 0.6)'
  ctx.shadowBlur = 24
  ctx.fillStyle = fill
  ctx.fill()
  ctx.restore()
  ctx.strokeStyle = '#ffcb05'
  ctx.lineWidth = 3.5
  ctx.lineJoin = 'round'
  ctx.stroke()

  // Rótulos nas pontas: nome do atributo e valor na cor da faixa.
  RADAR_ORDER.forEach((stat, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 3
    const ca = Math.cos(a)
    const vertical = Math.abs(ca) < 0.2
    let x = cx + (r + 34) * ca
    let y = cy + (r + 34) * Math.sin(a)
    ctx.textAlign = vertical ? 'center' : ca > 0 ? 'left' : 'right'
    if (vertical) y += Math.sin(a) < 0 ? -22 : 4
    else x += ca > 0 ? -6 : 6
    ctx.textBaseline = 'alphabetic'
    ctx.font = `700 19px ${FONT}`
    ctx.fillStyle = '#8b93a7'
    ctx.fillText(stat.toUpperCase(), x, y)
    ctx.font = `800 28px ${FONT}`
    ctx.fillStyle = statColor(stats[stat])
    ctx.fillText(String(stats[stat]), x, y + 30)
  })
}

function drawBars(ctx: CanvasRenderingContext2D, stats: StatValues, x: number, y: number, width: number, totalLabel: string) {
  const row = 40
  ctx.textBaseline = 'middle'
  STATS.forEach((stat, i) => {
    const cy = y + i * row
    ctx.font = `600 24px ${FONT}`
    ctx.fillStyle = '#c9cfdc'
    ctx.textAlign = 'left'
    ctx.fillText(stat, x, cy)
    ctx.font = `800 26px ${FONT}`
    ctx.fillStyle = statColor(stats[stat])
    ctx.textAlign = 'right'
    ctx.fillText(String(stats[stat]), x + 150, cy)
    const barX = x + 170
    const barW = width - 170
    roundRect(ctx, barX, cy - 8, barW, 16, 8)
    ctx.fillStyle = 'rgba(255,255,255,0.07)'
    ctx.fill()
    roundRect(ctx, barX, cy - 8, Math.max(barW * Math.min(stats[stat] / BAR_CAP, 1), 16), 16, 8)
    ctx.fillStyle = statColor(stats[stat])
    ctx.fill()
  })
  const cy = y + STATS.length * row + 4
  ctx.font = `700 24px ${FONT}`
  ctx.fillStyle = '#ffcb05'
  ctx.textAlign = 'left'
  ctx.fillText(totalLabel, x, cy)
  ctx.font = `800 28px ${FONT}`
  ctx.textAlign = 'right'
  ctx.fillText(String(sumStats(stats)), x + 150, cy)
}

export async function drawShareCard(data: ShareCardData): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = SHARE_WIDTH
  canvas.height = SHARE_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponível')

  // A fonte do site precisa estar carregada antes de desenhar texto no canvas.
  await Promise.all(['500', '600', '700', '800'].map((w) => document.fonts?.load(`${w} 32px Outfit`).catch(() => null)))
  const image = data.imageUrl ? await loadImage(data.imageUrl) : null

  const c1 = typeColor(data.types[0])
  const c2 = data.types[1] ? typeColor(data.types[1]) : c1
  drawBackground(ctx, c1, c2)

  // Cabeçalho: número e marcações.
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.font = `800 46px ${FONT}`
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.fillText(data.dexNumber, 64, 104)
  let tagX = SHARE_WIDTH - 64
  for (const tag of [...data.tags].reverse()) {
    ctx.font = `700 24px ${FONT}`
    const w = ctx.measureText(tag).width + 44
    tagX -= w
    drawPill(ctx, tag, tagX, 66, 48, 'rgba(0,0,0,0.38)', '#fff', 24)
    tagX -= 12
  }

  // Arte: até 540 px, centralizada, com sombra.
  if (image) {
    const box = 540
    const scale = Math.min(box / image.naturalWidth, box / image.naturalHeight)
    const w = image.naturalWidth * scale
    const h = image.naturalHeight * scale
    ctx.save()
    ctx.imageSmoothingEnabled = !data.pixelated
    ctx.shadowColor = 'rgba(0,0,0,0.5)'
    ctx.shadowBlur = 40
    ctx.shadowOffsetY = 24
    ctx.drawImage(image, (SHARE_WIDTH - w) / 2, 130 + (box - h) / 2, w, h)
    ctx.restore()
  }

  // Nome, categoria e tipos.
  ctx.textAlign = 'center'
  ctx.fillStyle = '#fff'
  ctx.font = `800 92px ${FONT}`
  ctx.fillText(data.name, SHARE_WIDTH / 2, 770, SHARE_WIDTH - 120)
  ctx.font = `500 32px ${FONT}`
  ctx.fillStyle = 'rgba(238,241,246,0.75)'
  ctx.fillText(data.genus, SHARE_WIDTH / 2, 820)
  drawTypes(ctx, data.types, SHARE_WIDTH / 2, 846)

  // Painel de atributos.
  roundRect(ctx, 48, 930, SHARE_WIDTH - 96, 300, 28)
  ctx.fillStyle = 'rgba(21,25,34,0.88)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 2
  ctx.stroke()
  if (data.stats) {
    drawRadar(ctx, data.stats, 290, 1075, 78)
    drawBars(ctx, data.stats, 540, 976, 470, data.totalLabel)
  }

  // Habilidades e rodapé.
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `600 28px ${FONT}`
  ctx.fillStyle = '#eef1f6'
  const abilities = data.abilities.map((a) => (a.hidden ? `${a.name} (${data.hiddenLabel})` : a.name)).join('  ·  ')
  ctx.fillText(abilities, SHARE_WIDTH / 2, 1280, SHARE_WIDTH - 120)
  ctx.font = `600 22px ${FONT}`
  ctx.fillStyle = 'rgba(139,147,167,0.9)'
  ctx.textAlign = 'left'
  ctx.fillText('Dexpedition', 64, 1324)
  ctx.textAlign = 'right'
  ctx.fillText(data.footer, SHARE_WIDTH - 64, 1324)

  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar a imagem'))), 'image/png'))
}
