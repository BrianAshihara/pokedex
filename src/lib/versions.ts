// Jogos (version groups) da PokeAPI em ordem cronológica, com o nome de exibição.
// Fica separado de pokeapi.ts para ser usado também pela galeria de sprites sem import circular.

export const titleize = (text: string) => text.replaceAll('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())

export const VERSION_GROUPS: [string, string][] = [
  ['red-green-japan', 'Red / Green (JP)'],
  ['red-blue', 'Red / Blue'],
  ['blue-japan', 'Blue (JP)'],
  ['yellow', 'Yellow'],
  ['gold-silver', 'Gold / Silver'],
  ['crystal', 'Crystal'],
  ['ruby-sapphire', 'Ruby / Sapphire'],
  ['emerald', 'Emerald'],
  ['firered-leafgreen', 'FireRed / LeafGreen'],
  ['colosseum', 'Colosseum'],
  ['xd', 'XD'],
  ['diamond-pearl', 'Diamond / Pearl'],
  ['platinum', 'Platinum'],
  ['heartgold-soulsilver', 'HeartGold / SoulSilver'],
  ['black-white', 'Black / White'],
  ['black-2-white-2', 'Black 2 / White 2'],
  ['x-y', 'X / Y'],
  ['omega-ruby-alpha-sapphire', 'Omega Ruby / Alpha Sapphire'],
  ['sun-moon', 'Sun / Moon'],
  ['ultra-sun-ultra-moon', 'Ultra Sun / Ultra Moon'],
  ['lets-go-pikachu-lets-go-eevee', "Let's Go Pikachu / Eevee"],
  ['sword-shield', 'Sword / Shield'],
  ['the-isle-of-armor', 'The Isle of Armor'],
  ['the-crown-tundra', 'The Crown Tundra'],
  ['brilliant-diamond-shining-pearl', 'Brilliant Diamond / Shining Pearl'],
  ['legends-arceus', 'Legends: Arceus'],
  ['scarlet-violet', 'Scarlet / Violet'],
  ['the-teal-mask', 'The Teal Mask'],
  ['the-indigo-disk', 'The Indigo Disk'],
  ['legends-za', 'Legends: Z-A'],
  ['mega-dimension', 'Mega Dimension'],
  ['champions', 'Champions'],
]
const VERSION_ORDER = new Map(VERSION_GROUPS.map(([name], i) => [name, i]))
const VERSION_LABELS = new Map(VERSION_GROUPS)

export function versionGroupLabel(name: string): string {
  return VERSION_LABELS.get(name) ?? titleize(name)
}

/** Posição do jogo na ordem cronológica; desconhecidos vão para o fim. */
export const versionOrder = (name: string) => VERSION_ORDER.get(name) ?? VERSION_ORDER.size

export function sortVersionGroups(names: string[]): string[] {
  return [...names].sort((a, b) => versionOrder(a) - versionOrder(b) || a.localeCompare(b))
}
