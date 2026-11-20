// Tradução dos textos do feed para pt-BR por modelos fixos (sem IA, sem custo em tempo de execução).
// Nomes de Pokémon são iguais em português; só o texto em volta muda. O que não casa com nenhum modelo
// fica em inglês, como veio. Em inglês, o app mostra sempre o texto original.

import { splitNames } from './names'

const MONTHS_EN = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
const MONTHS_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

const month = (value: string): string | null => {
  const index = MONTHS_EN.indexOf(value.trim().toLowerCase())
  return index < 0 ? null : MONTHS_PT[index]
}

/** "A, B, and C" → "A, B e C"; formas entre parênteses ficam como estão. */
export function joinPt(subject: string): string {
  const parts = splitNames(subject)
  if (parts.length < 2) return subject
  return `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`
}

/** "Dynamax Espurr" → "Espurr Dinamax", "Shadow Tornadus" → "Tornadus Sombroso". */
function pokemonPt(name: string): string {
  return name
    .replace(/^Dynamax (.+)$/, '$1 Dinamax')
    .replace(/^Gigantamax (.+)$/, '$1 Gigantamax')
    .replace(/^Shadow (.+)$/, '$1 Sombroso')
}

/** "(Normal, Attack, and Speed Formes)" → "(formas Normal, Attack e Speed)"; "(Incarnate Forme)" → "(forma Incarnate)". */
const formsPt = (text: string) =>
  text.replace(/\(([^)]+?) (Formes?)\)/g, (_, forms: string, word: string) => `(${word === 'Forme' ? 'forma' : 'formas'} ${joinPt(forms)})`)

const subjectPt = (subject: string) =>
  formsPt(joinPt(subject))
    .split(/(, | e )(?![^(]*\))/)
    .map(pokemonPt)
    .join('')

interface Template {
  pattern: RegExp
  /** Pokémon citados no título (para o selo "Agora no GO"). */
  subject?: (m: RegExpExecArray) => string
  pt: (m: RegExpExecArray) => string
}

// A ordem importa: o primeiro que casar vale.
const TEMPLATES: Template[] = [
  { pattern: /^(\w+) Community Day Classic$/, pt: (m) => (month(m[1]) ? `Dia Comunitário Clássico de ${month(m[1])}` : `Dia Comunitário Clássico: ${m[1]}`), subject: (m) => (month(m[1]) ? '' : m[1]) },
  { pattern: /^(.+) Community Day Classic$/, subject: (m) => m[1], pt: (m) => `Dia Comunitário Clássico: ${subjectPt(m[1])}` },
  { pattern: /^(\w+) Community Day$/, pt: (m) => (month(m[1]) ? `Dia Comunitário de ${month(m[1])}` : `Dia Comunitário: ${m[1]}`), subject: (m) => (month(m[1]) ? '' : m[1]) },
  { pattern: /^(.+) Community Day$/, subject: (m) => m[1], pt: (m) => `Dia Comunitário: ${subjectPt(m[1])}` },
  { pattern: /^(.+) Spotlight Hour$/, subject: (m) => m[1], pt: (m) => `Hora do Holofote: ${subjectPt(m[1])}` },
  { pattern: /^(.+) Raid Hour$/, subject: (m) => m[1], pt: (m) => `Hora da Reide: ${subjectPt(m[1])}` },
  { pattern: /^(.+) in (\d)-star Raid Battles$/i, subject: (m) => m[1], pt: (m) => `${subjectPt(m[1])} em Reides de ${m[2]} estrelas` },
  { pattern: /^(.+) in Shadow Raids$/i, subject: (m) => m[1], pt: (m) => `${subjectPt(m[1])} em Reides Sombrosas` },
  { pattern: /^(.+) in Mega Raids$/i, subject: (m) => m[1], pt: (m) => `${subjectPt(m[1])} em Mega Reides` },
  { pattern: /^(.+) in Elite Raids$/i, subject: (m) => m[1], pt: (m) => `${subjectPt(m[1])} em Reides de Elite` },
  { pattern: /^(.+) in Max Battles$/i, subject: (m) => m[1], pt: (m) => `${subjectPt(m[1])} em Batalhas Max` },
  { pattern: /^Super Mega Raid Day$/, pt: () => 'Dia de Super Mega Reides' },
  { pattern: /^(.+) Super Mega Raid Day$/, subject: (m) => m[1], pt: (m) => `Dia de Super Mega Reides: ${subjectPt(m[1])}` },
  { pattern: /^Mega Raid Day$/, pt: () => 'Dia de Mega Reides' },
  { pattern: /^(.+) Mega Raid Day$/, subject: (m) => `Mega ${m[1]}`, pt: (m) => `Dia de Mega Reides: Mega ${subjectPt(m[1])}` },
  { pattern: /^Shadow Raid Day$/, pt: () => 'Dia de Reides Sombrosas' },
  { pattern: /^(.+) Shadow Raid Day$/, subject: (m) => `Shadow ${m[1]}`, pt: (m) => `Dia de Reides Sombrosas: ${subjectPt(m[1])} Sombroso` },
  { pattern: /^Raid Day$/, pt: () => 'Dia de Reides' },
  { pattern: /^(.+) Raid Day$/, subject: (m) => m[1], pt: (m) => `Dia de Reides: ${subjectPt(m[1])}` },
  { pattern: /^(.+) during Max Monday$/, subject: (m) => m[1], pt: (m) => `Segunda Max: ${subjectPt(m[1])}` },
  { pattern: /^Max Monday$/, pt: () => 'Segunda Max' },
  { pattern: /^Max Battle Day$/, pt: () => 'Dia de Batalhas Max' },
  { pattern: /^(.+) Max Battle Day$/, subject: (m) => m[1], pt: (m) => `Dia de Batalhas Max: ${subjectPt(m[1])}` },
  { pattern: /^GO Pass: (\w+)$/, pt: (m) => `Passe GO: ${month(m[1]) ?? m[1]}` },
  { pattern: /^Hatch Day$/, pt: () => 'Dia de Eclosão' },
  { pattern: /^(.+) Hatch Day$/, subject: (m) => m[1], pt: (m) => `Dia de Eclosão: ${subjectPt(m[1])}` },
  { pattern: /^Research Day$/, pt: () => 'Dia de Pesquisa' },
  { pattern: /^(.+) Research Day$/, subject: (m) => m[1], pt: (m) => `Dia de Pesquisa: ${subjectPt(m[1])}` },
  { pattern: /^(.+) Timed Research$/, pt: (m) => `Pesquisa Temporária: ${joinPt(m[1])}` },
  { pattern: /^(.+) Special Research$/, pt: (m) => `Pesquisa Especial: ${joinPt(m[1])}` },
]

/** Liga de Batalha GO: "Great League, Ultra League: Mega Edition, and 2026 GO LAIC Cup | Twilight Trails". */
function battleLeaguePt(name: string): string {
  const [leagues] = name.split(' | ')
  const parts = splitNames(leagues).map(leaguePt)
  return parts.length < 2 ? parts.join('') : `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`
}

const LEAGUES: Record<string, string> = { 'Great League': 'Liga Grande', 'Ultra League': 'Liga Ultra', 'Master League': 'Liga Mestra', 'Little Cup': 'Copa Mirim' }

/** Uma liga ou copa: "Ultra League: Mega Edition" → "Liga Ultra: Edição Mega", "2026 GO LAIC Cup" → "Copa GO LAIC 2026". */
function leaguePt(part: string): string {
  if (LEAGUES[part]) return LEAGUES[part]
  const edition = /^(.+?): (.+) Edition$/.exec(part)
  if (edition) return `${leaguePt(edition[1])}: Edição ${leaguePt(edition[2])}`
  const cup = /^(?:(\d{4}) )?(.+) Cup$/.exec(part)
  if (cup) return `Copa ${cup[2]}${cup[1] ? ` ${cup[1]}` : ''}`
  return part
}

export interface ParsedTitle {
  pt: string | null
  /** Trecho do título com os Pokémon citados (pode ter nomes de forma, "Shadow", "Dynamax"...). */
  subject: string
}

export function parseEventTitle(name: string, type: string): ParsedTitle {
  if (type === 'go-battle-league') return { pt: battleLeaguePt(name), subject: '' }
  for (const template of TEMPLATES) {
    const match = template.pattern.exec(name)
    if (match) return { pt: template.pt(match), subject: template.subject?.(match) ?? '' }
  }
  return { pt: null, subject: '' }
}

/** Título na língua escolhida: em inglês é o original; em português, o modelo ou o original se nenhum casar. */
export function eventTitle(name: string, type: string, lang: 'pt' | 'en'): string {
  return lang === 'pt' ? (parseEventTitle(name, type).pt ?? name) : name
}

// ---------- Reides, clima e bônus ----------

/** Chave estável do nível: "5-Star Raids" → "5", "Mega Raids" → "mega", "Mega Legendary Raids" → "mega-legendary". */
export function tierKey(tier: string): string {
  const stars = /^(\d)-Star/i.exec(tier)
  if (stars) return stars[1]
  return tier
    .toLowerCase()
    .replace(/\s*raids?$/, '')
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
}

const TIER_ORDER = ['6', '5', 'mega-legendary', 'elite', 'primal', 'mega', '4', '3', '2', '1']
export const tierRank = (key: string) => (TIER_ORDER.includes(key) ? TIER_ORDER.indexOf(key) : TIER_ORDER.length)

const TIER_PT: Record<string, string> = {
  mega: 'Mega Reides',
  'mega-legendary': 'Mega Reides Lendárias',
  elite: 'Reides de Elite',
  primal: 'Reides Primitivas',
}

export function tierLabel(tier: string, lang: 'pt' | 'en'): string {
  const key = tierKey(tier)
  if (/^\d$/.test(key)) return lang === 'pt' ? `Reides de ${key} ★` : `${key}-Star Raids`
  return lang === 'pt' ? (TIER_PT[key] ?? tier) : tier
}

const WEATHER_PT: Record<string, string> = {
  sunny: 'Ensolarado',
  clear: 'Ensolarado',
  'partly cloudy': 'Parcialmente nublado',
  cloudy: 'Nublado',
  rainy: 'Chuvoso',
  rain: 'Chuvoso',
  windy: 'Ventania',
  snow: 'Neve',
  fog: 'Neblina',
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

export function weatherLabel(weather: string, lang: 'pt' | 'en'): string {
  return lang === 'pt' ? (WEATHER_PT[weather] ?? capitalize(weather)) : capitalize(weather)
}

const BONUSES: [RegExp, (m: RegExpExecArray) => string][] = [
  [/^(\d+(?:\.\d+)?)\s*[x×] Catch Candy$/i, (m) => `${m[1]}× Doces por captura`],
  [/^(\d+(?:\.\d+)?)\s*[x×] Catch Stardust$/i, (m) => `${m[1]}× Poeira Estelar por captura`],
  [/^(\d+(?:\.\d+)?)\s*[x×] Catch XP$/i, (m) => `${m[1]}× XP por captura`],
  [/^(\d+(?:\.\d+)?)\s*[x×] Evolution XP$/i, (m) => `${m[1]}× XP por evolução`],
  [/^(\d+(?:\.\d+)?)\s*[x×] Evolution Candy$/i, (m) => `${m[1]}× Doces por evolução`],
  [/^(\d+(?:\.\d+)?)\s*[x×] Transfer Candy$/i, (m) => `${m[1]}× Doces por transferência`],
  [/^(\d+(?:\.\d+)?)\s*[x×] Hatch Candy$/i, (m) => `${m[1]}× Doces ao chocar`],
  [/^(\d+(?:\.\d+)?)\s*[x×] Hatch Stardust$/i, (m) => `${m[1]}× Poeira Estelar ao chocar`],
  [/^(\d+(?:\.\d+)?)\s*[x×] Hatch XP$/i, (m) => `${m[1]}× XP ao chocar`],
  [/^Increased Spawns$/i, () => 'Mais Pokémon aparecendo'],
  [/^([\d/½¼]+) Egg Hatch Distance$/i, (m) => `${m[1]} da distância para chocar Ovos`],
  [/^(\d+)-hour Incense$/i, (m) => `Incenso de ${m[1]} ${m[1] === '1' ? 'hora' : 'horas'}`],
  [/^(\d+)-hour Lures?$/i, (m) => `Módulos Atrair de ${m[1]} ${m[1] === '1' ? 'hora' : 'horas'}`],
  [/^(\d+)[x×] Chance for Trainers level (\d+) and up to receive Candy XL/i, (m) => `${m[1]}× chance de Doce GG para Treinadores nível ${m[2]}+`],
  [/^One additional Special Trade/i, () => 'Uma Troca Especial extra (até duas no dia)'],
  [/^Trades made will require 50% less Stardust$/i, () => 'Trocas custam 50% menos Poeira Estelar'],
  [/^Increased chance to encounter Shiny/i, () => 'Mais chance de encontrar Pokémon brilhantes'],
]

/** Bônus de evento; o "*" do fim (horário estendido) é mantido. */
export function bonusLabel(bonus: string, lang: 'pt' | 'en'): string {
  if (lang === 'en') return bonus
  const star = /\*+$/.exec(bonus)?.[0] ?? ''
  const clean = bonus.replace(/\*+$/, '').trim()
  for (const [pattern, pt] of BONUSES) {
    const match = pattern.exec(clean)
    if (match) return pt(match) + star
  }
  return bonus
}
