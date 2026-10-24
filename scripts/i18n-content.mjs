// Textos da PokeAPI traduzidos para PT-BR (a API não tem português).
//
//   npm run i18n:check    compara a API com as traduções e lista o que falta ou mudou
//   npm run i18n:extract  atualiza scripts/i18n-source.en.json (o inglês de onde cada tradução saiu)
//
// Fluxo para atualizar: rode o extract, traduza as chaves novas ou alteradas em
// src/i18n/content/pt/*.json e rode o check até não sobrar nada.
// A escolha de cada texto segue a mesma regra do app (src/lib/pokeapi.ts).

import { readFileSync, writeFileSync } from 'node:fs'

const GRAPHQL_URL = 'https://graphql.pokeapi.co/v1beta2'
const SOURCE_FILE = new URL('./i18n-source.en.json', import.meta.url)
const CONTENT_DIR = new URL('../src/i18n/content/pt/', import.meta.url)
const KINDS = ['pokedex', 'abilities', 'moves']

const EN = '{ language: { name: { _eq: "en" } } }'

const QUERY = `{
  pokemonspecies(order_by: { id: asc }) {
    name
    pokemonspeciesflavortexts(where: ${EN}, order_by: { version_id: desc }, limit: 1) { flavor_text }
  }
  ability(where: { is_main_series: { _eq: true } }, order_by: { id: asc }) {
    name
    abilityflavortexts(where: ${EN}, order_by: { version_group_id: desc }, limit: 1) { flavor_text }
    abilityeffecttexts(where: ${EN}) { short_effect }
  }
  move(where: { pokemonmoves: {} }, order_by: { id: asc }) {
    name
    moveeffect { moveeffecteffecttexts(where: ${EN}) { short_effect } }
    moveflavortexts(where: ${EN}, order_by: { version_group_id: desc }, limit: 1) { flavor_text }
  }
}`

/** Igual ao cleanText do app: tira quebras de linha e hifenização dos textos dos jogos. */
const clean = (text) =>
  (text ?? '').replaceAll('\f', ' ').replaceAll('\n', ' ').replaceAll('­ ', '').split(/\s+/).filter(Boolean).join(' ')

async function fetchSource() {
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: QUERY }),
  })
  const body = await response.json()
  if (body.errors) throw new Error(body.errors[0].message)
  const { pokemonspecies, ability, move } = body.data

  const entries = (rows, pick) => Object.fromEntries(rows.map((r) => [r.name, clean(pick(r))]).filter(([, text]) => text))
  return {
    pokedex: entries(pokemonspecies, (s) => s.pokemonspeciesflavortexts[0]?.flavor_text),
    // Habilidade: texto dos jogos; sem ele, o efeito resumido.
    abilities: entries(ability, (a) => a.abilityflavortexts[0]?.flavor_text || a.abilityeffecttexts[0]?.short_effect),
    // Golpe: efeito resumido; sem ele, o texto dos jogos.
    moves: entries(move, (m) => m.moveeffect?.moveeffecteffecttexts[0]?.short_effect || m.moveflavortexts[0]?.flavor_text),
  }
}

const readJson = (url) => {
  try {
    return JSON.parse(readFileSync(url, 'utf8'))
  } catch {
    return {}
  }
}

const command = process.argv[2]
const latest = await fetchSource()

if (command === 'extract') {
  writeFileSync(SOURCE_FILE, JSON.stringify(latest, null, 2) + '\n')
  for (const kind of KINDS) console.log(`${kind}: ${Object.keys(latest[kind]).length} textos`)
} else if (command === 'check') {
  const source = readJson(SOURCE_FILE)
  let problems = 0
  for (const kind of KINDS) {
    const translated = readJson(new URL(`${kind}.json`, CONTENT_DIR))
    const missing = Object.keys(latest[kind]).filter((key) => !translated[key])
    const changed = Object.keys(latest[kind]).filter((key) => translated[key] && source[kind]?.[key] !== latest[kind][key])
    // Chaves que a API não usa mais: tradução morta, pode sair do arquivo.
    const unused = Object.keys(translated).filter((key) => !latest[kind][key])
    problems += missing.length + changed.length + unused.length
    console.log(`${kind}: ${Object.keys(translated).length}/${Object.keys(latest[kind]).length} traduzidos`)
    if (missing.length) console.log(`  sem tradução (${missing.length}): ${missing.join(', ')}`)
    if (changed.length) console.log(`  inglês mudou desde a tradução (${changed.length}): ${changed.join(', ')}`)
    if (unused.length) console.log(`  não existem mais na API (${unused.length}): ${unused.join(', ')}`)
  }
  process.exitCode = problems ? 1 : 0
} else {
  console.log('Uso: node scripts/i18n-content.mjs <extract|check>')
  process.exitCode = 1
}
