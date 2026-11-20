// Converte nomes como aparecem no Pokémon GO ("Alolan Meowth", "Shadow Tornadus (Incarnate)", "Mega Charizard X")
// no nome do Pokémon na PokeAPI ("meowth-alola", "tornadus-incarnate", "charizard-mega-x").

/** Nome da PokeAPI → id, na ordem de id (a forma padrão de cada espécie vem antes das demais). */
export type PokemonIndex = Map<string, number>

export interface GoPokemon {
  /** Nome na PokeAPI, já confirmado no índice. */
  name: string
  id: number
  /** Espécie (nome base, ex.: "deoxys"), para casar com qualquer forma quando o GO não diz qual. */
  species: string
  /** O nome do GO não indicava forma e foi usada a padrão (ex.: "Deoxys" → deoxys-normal). */
  anyForm: boolean
  shadow: boolean
  dynamax: boolean
}

const REGIONS: Record<string, string> = { Alolan: 'alola', Galarian: 'galar', Hisuian: 'hisui', Paldean: 'paldea' }

/** "Mr. Mime" → "mr-mime", "Farfetch’d" → "farfetchd", "Flabébé" → "flabebe", "Nidoran♀" → "nidoran-f". */
export function goSlug(value: string): string {
  return value
    .replace('♀', '-f')
    .replace('♂', '-m')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’'.:]/g, '')
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Forma entre parênteses: "(Incarnate)", "(Attack Forme)", "(Plant Cloak)" → "incarnate", "attack", "plant". */
function formSlug(form: string): string {
  return goSlug(form.replace(/\b(Formes?|Forms?|Cloak|Style|Mode|Size)\b/g, ''))
}

/** Primeiro nome do índice que começa com `${base}-`: a forma padrão (ex.: "tornadus" → "tornadus-incarnate"). */
function defaultForm(base: string, index: PokemonIndex): string | undefined {
  const prefix = `${base}-`
  for (const name of index.keys()) if (name.startsWith(prefix)) return name
  return undefined
}

/** Retorna null quando o nome não corresponde a nenhum Pokémon (ex.: texto que não é nome de Pokémon). */
export function resolveGoPokemon(raw: string, index: PokemonIndex): GoPokemon | null {
  let rest = raw.replace(/\*+$/, '').replace(/\s+/g, ' ').trim()
  if (!rest) return null

  const flag = (prefix: RegExp) => {
    const hit = prefix.test(rest)
    if (hit) rest = rest.replace(prefix, '')
    return hit
  }
  const shadow = flag(/^Shadow /i)
  const dynamax = flag(/^Dynamax /i)
  const gigantamax = flag(/^Gigantamax /i)
  const mega = flag(/^Mega /i)
  const primal = flag(/^Primal /i)

  let region = ''
  const regionMatch = /^(\w+) /.exec(rest)
  if (regionMatch && REGIONS[regionMatch[1]]) {
    region = REGIONS[regionMatch[1]]
    rest = rest.slice(regionMatch[0].length)
  }

  let form = ''
  const formMatch = /^(.+?)\s*\(([^)]+)\)$/.exec(rest)
  if (formMatch) {
    rest = formMatch[1]
    form = formSlug(formMatch[2])
  }

  // Mega X/Y: "Mega Charizard X" → charizard-mega-x.
  let megaVariant = ''
  if (mega) {
    const variant = /^(.+) ([XY])$/.exec(rest)
    if (variant) {
      rest = variant[1]
      megaVariant = variant[2].toLowerCase()
    }
  }

  const base = goSlug(rest)
  if (!base) return null

  const suffix = mega ? ['mega', megaVariant].filter(Boolean).join('-') : primal ? 'primal' : gigantamax ? 'gmax' : ''
  const parts = [base, region, form, suffix].filter(Boolean)
  const candidates = [parts.join('-')]
  // Formas que a PokeAPI não separa (ex.: uma forma só do GO) caem para a versão sem ela.
  if (form) candidates.push([base, region, suffix].filter(Boolean).join('-'))

  for (const candidate of candidates) {
    const id = index.get(candidate)
    if (id !== undefined) return { name: candidate, id, species: base, anyForm: false, shadow, dynamax: dynamax || gigantamax }
  }

  // Sem forma específica: a espécie pode não ter um Pokémon com o nome puro (ex.: "deoxys" → "deoxys-normal").
  if (!region && !suffix) {
    const id = index.get(base)
    if (id !== undefined) return { name: base, id, species: base, anyForm: !form, shadow, dynamax: dynamax || gigantamax }
    const fallback = defaultForm(base, index)
    if (fallback) return { name: fallback, id: index.get(fallback)!, species: base, anyForm: true, shadow, dynamax: dynamax || gigantamax }
  }
  return null
}

/** Separa "A, B, and C" / "A and B" no nível de fora dos parênteses (formas como "(Normal, Attack, and Speed Formes)" ficam juntas). */
export function splitNames(subject: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const char of subject) {
    if (char === '(') depth++
    if (char === ')') depth = Math.max(0, depth - 1)
    if (char === ',' && depth === 0) {
      parts.push(current)
      current = ''
    } else current += char
  }
  parts.push(current)
  return parts
    // "and" fora dos parênteses: o lookahead descarta os que vêm antes de um ")" ainda aberto.
    .flatMap((part) => part.split(/\s+(?:and|&)\s+(?![^(]*\))/))
    .map((part) => part.replace(/^\s*and\s+/, '').trim())
    .filter(Boolean)
}
