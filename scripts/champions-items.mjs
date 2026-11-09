// Atualiza src/data/champions-items.json: quais itens estão liberados em Pokémon Champions.
//
//   npm run data:champions
//
// A PokeAPI não registra os itens desse jogo. A referência é o ladder de VGC do Smogon (Pokémon Showdown),
// que só aceita itens legais na regulação vigente. Rode de novo quando a regulação mudar.

import { writeFileSync } from 'node:fs'

const STATS_URL = 'https://www.smogon.com/stats/'
const GRAPHQL_URL = 'https://graphql.pokeapi.co/v1beta2'
const OUTPUT = new URL('../src/data/champions-items.json', import.meta.url)

const fetchText = async (url) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url} respondeu ${response.status}`)
  return response.text()
}

const normalize = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, '')

const months = [...(await fetchText(STATS_URL)).matchAll(/href="(\d{4}-\d{2})\/"/g)].map((m) => m[1]).sort()
const month = months.at(-1)
const chaos = await fetchText(`${STATS_URL}${month}/chaos/`)
const formats = [...chaos.matchAll(/href="(gen9championsvgc\d+reg(\w)(\w)-0\.json)"/g)].sort((a, b) => a[1].localeCompare(b[1]))
const latest = formats.at(-1)
if (!latest) throw new Error(`Nenhum formato VGC de Champions em ${month}`)

const { data } = JSON.parse(await fetchText(`${STATS_URL}${month}/chaos/${latest[1]}`))
const used = new Set(Object.values(data).flatMap((pokemon) => Object.keys(pokemon.Items)))
used.delete('nothing')

const response = await fetch(GRAPHQL_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: '{ item { name } }' }),
})
const body = await response.json()
if (body.errors) throw new Error(body.errors[0].message)

const slugs = new Map(body.data.item.map((item) => [normalize(item.name), item.name]))
// A PokeAPI ainda usa o nome antigo deste item.
slugs.set('leek', 'stick')
const missing = [...used].filter((id) => !slugs.has(id))
if (missing.length) throw new Error(`Sem correspondência na PokeAPI: ${missing.join(', ')}`)

const result = {
  regulation: `${latest[2]}-${latest[3]}`.toUpperCase(),
  month,
  items: [...used].map((id) => slugs.get(id)).sort(),
}
writeFileSync(OUTPUT, JSON.stringify(result, null, 2) + '\n')
console.log(`Regulação ${result.regulation} (${month}): ${result.items.length} itens`)
