import { describe, expect, it } from 'vitest'
import { normalizeEvents, normalizeRaids, parseFeedDate } from './feed'
import { goSlug, resolveGoPokemon, splitNames, type PokemonIndex } from './names'
import { appearancesFor, buildSchedule, eventPokemon, eventStatus, highlights } from './schedule'
import { formatDuration } from './time'
import { bonusLabel, eventTitle, parseEventTitle, tierKey, tierLabel, weatherLabel } from './translate'

// Recorte do índice da PokeAPI, na ordem de id (forma padrão antes das alternativas).
const INDEX: PokemonIndex = new Map(
  Object.entries({
    meowth: 52,
    marowak: 105,
    'mr-mime': 122,
    larvitar: 246,
    'deoxys-normal': 386,
    banette: 354,
    espurr: 677,
    'tornadus-incarnate': 641,
    'deoxys-attack': 10001,
    'meowth-alola': 10107,
    'marowak-alola': 10115,
    'banette-mega': 10057,
    'charizard-mega-x': 10034,
    'kyogre-primal': 10077,
    'machamp-gmax': 10198,
    'yamask-galar': 10179,
    farfetchd: 83,
    'nidoran-f': 29,
    flabebe: 669,
    cresselia: 488,
    darkrai: 491,
    pawniard: 624,
    noibat: 714,
    grookey: 810,
    scorbunny: 813,
    sobble: 816,
  }),
)

describe('nomes do GO → PokeAPI', () => {
  it('limpa grafias especiais', () => {
    expect(goSlug('Mr. Mime')).toBe('mr-mime')
    expect(goSlug('Farfetch’d')).toBe('farfetchd')
    expect(goSlug('Flabébé')).toBe('flabebe')
    expect(goSlug('Nidoran♀')).toBe('nidoran-f')
  })

  it('resolve formas regionais, Mega, Primitiva e Gigantamax', () => {
    expect(resolveGoPokemon('Alolan Meowth', INDEX)?.name).toBe('meowth-alola')
    expect(resolveGoPokemon('Galarian Yamask', INDEX)?.name).toBe('yamask-galar')
    expect(resolveGoPokemon('Mega Banette', INDEX)?.name).toBe('banette-mega')
    expect(resolveGoPokemon('Mega Charizard X', INDEX)?.name).toBe('charizard-mega-x')
    expect(resolveGoPokemon('Primal Kyogre', INDEX)?.name).toBe('kyogre-primal')
    expect(resolveGoPokemon('Gigantamax Machamp', INDEX)).toMatchObject({ name: 'machamp-gmax', dynamax: true })
  })

  it('marca Sombroso e Dinamax e usa a forma do Pokémon base', () => {
    expect(resolveGoPokemon('Shadow Larvitar', INDEX)).toMatchObject({ name: 'larvitar', shadow: true, anyForm: false })
    expect(resolveGoPokemon('Dynamax Espurr', INDEX)).toMatchObject({ name: 'espurr', dynamax: true })
  })

  it('usa a forma entre parênteses ou a padrão quando o GO não diz', () => {
    expect(resolveGoPokemon('Shadow Tornadus (Incarnate)', INDEX)).toMatchObject({ name: 'tornadus-incarnate', shadow: true, anyForm: false })
    expect(resolveGoPokemon('Deoxys (Attack Forme)', INDEX)?.name).toBe('deoxys-attack')
    expect(resolveGoPokemon('Deoxys', INDEX)).toMatchObject({ name: 'deoxys-normal', species: 'deoxys', anyForm: true })
    expect(resolveGoPokemon('Deoxys (Normal, Defense, Attack, and Speed Formes)', INDEX)).toMatchObject({ name: 'deoxys-normal', anyForm: true })
  })

  it('não inventa Pokémon para textos que não são nomes', () => {
    expect(resolveGoPokemon('December', INDEX)).toBeNull()
    expect(resolveGoPokemon('', INDEX)).toBeNull()
  })

  it('separa listas sem quebrar formas entre parênteses', () => {
    expect(splitNames('Grookey, Scorbunny, and Sobble')).toEqual(['Grookey', 'Scorbunny', 'Sobble'])
    expect(splitNames('Cresselia and Darkrai')).toEqual(['Cresselia', 'Darkrai'])
    expect(splitNames('Deoxys (Normal, Defense, Attack, and Speed Formes)')).toEqual(['Deoxys (Normal, Defense, Attack, and Speed Formes)'])
  })
})

describe('tradução dos títulos', () => {
  const pt = (name: string, type = 'event') => eventTitle(name, type, 'pt')

  it('em inglês mostra sempre o original', () => {
    expect(eventTitle('Pawniard Community Day', 'community-day', 'en')).toBe('Pawniard Community Day')
  })

  it('traduz os formatos recorrentes', () => {
    expect(pt('Pawniard Community Day', 'community-day')).toBe('Dia Comunitário: Pawniard')
    expect(pt('December Community Day', 'community-day')).toBe('Dia Comunitário de dezembro')
    expect(pt('January Community Day Classic', 'community-day')).toBe('Dia Comunitário Clássico de janeiro')
    expect(pt('Grookey, Scorbunny, and Sobble Spotlight Hour', 'pokemon-spotlight-hour')).toBe('Hora do Holofote: Grookey, Scorbunny e Sobble')
    expect(pt('Cresselia and Darkrai Raid Hour', 'raid-hour')).toBe('Hora da Reide: Cresselia e Darkrai')
    expect(pt('Cresselia and Darkrai in 5-star Raid Battles', 'raid-battles')).toBe('Cresselia e Darkrai em Reides de 5 estrelas')
    expect(pt('Mega Banette in Mega Raids', 'raid-battles')).toBe('Mega Banette em Mega Reides')
    expect(pt('Shadow Tornadus (Incarnate Forme) in Shadow Raids', 'raid-battles')).toBe('Tornadus (forma Incarnate) Sombroso em Reides Sombrosas')
    expect(pt('Deoxys (Normal, Defense, Attack, and Speed Formes) Raid Hour', 'raid-hour')).toBe('Hora da Reide: Deoxys (formas Normal, Defense, Attack e Speed)')
    expect(pt('Clefable Super Mega Raid Day', 'raid-day')).toBe('Dia de Super Mega Reides: Clefable')
    expect(pt('Super Mega Raid Day', 'raid-day')).toBe('Dia de Super Mega Reides')
    expect(pt('Raid Day', 'raid-day')).toBe('Dia de Reides')
    expect(pt('Dynamax Espurr during Max Monday', 'max-mondays')).toBe('Segunda Max: Espurr Dinamax')
    expect(pt('Max Battle Day', 'max-battles')).toBe('Dia de Batalhas Max')
    expect(pt('GO Pass: November', 'go-pass')).toBe('Passe GO: novembro')
    expect(pt('Hatch Day')).toBe('Dia de Eclosão')
    expect(pt('Pokémon GO and Duolingo Timed Research', 'timed-research')).toBe('Pesquisa Temporária: Pokémon GO e Duolingo')
  })

  it('traduz as ligas da Liga de Batalha GO', () => {
    expect(pt('Great League, Ultra League: Mega Edition, and 2026 GO LAIC Cup | Twilight Trails', 'go-battle-league')).toBe(
      'Liga Grande, Liga Ultra: Edição Mega e Copa GO LAIC 2026',
    )
    expect(pt('Master League and Mega Catch Cup: Great League Edition | Twilight Trails', 'go-battle-league')).toBe(
      'Liga Mestra e Copa Mega Catch: Edição Liga Grande',
    )
  })

  it('nomes próprios sem modelo ficam como vieram', () => {
    expect(pt('Twilight Wishes')).toBe('Twilight Wishes')
    expect(pt('Pokémon GO Tour: Alola - Los Angeles 2027', 'pokemon-go-tour')).toBe('Pokémon GO Tour: Alola - Los Angeles 2027')
  })

  it('extrai os Pokémon citados no título', () => {
    expect(parseEventTitle('Noibat Spotlight Hour', 'pokemon-spotlight-hour').subject).toBe('Noibat')
    expect(parseEventTitle('December Community Day', 'community-day').subject).toBe('')
    expect(parseEventTitle('Clefable Mega Raid Day', 'raid-day').subject).toBe('Mega Clefable')
  })

  it('traduz níveis de reide, clima e bônus', () => {
    expect(tierKey('5-Star Raids')).toBe('5')
    expect(tierKey('Mega Legendary Raids')).toBe('mega-legendary')
    expect(tierLabel('5-Star Raids', 'pt')).toBe('Reides de 5 ★')
    expect(tierLabel('Mega Raids', 'pt')).toBe('Mega Reides')
    expect(tierLabel('Mega Raids', 'en')).toBe('Mega Raids')
    expect(weatherLabel('partly cloudy', 'pt')).toBe('Parcialmente nublado')
    expect(weatherLabel('windy', 'en')).toBe('Windy')
    expect(bonusLabel('2× Catch Candy', 'pt')).toBe('2× Doces por captura')
    expect(bonusLabel('1/4 Egg Hatch Distance', 'pt')).toBe('1/4 da distância para chocar Ovos')
    expect(bonusLabel('1-hour Lures*', 'pt')).toBe('Módulos Atrair de 1 hora*')
    expect(bonusLabel('Something brand new', 'pt')).toBe('Something brand new')
  })
})

describe('feed', () => {
  it('lê horário local (sem fuso) e global (com Z)', () => {
    expect(parseFeedDate('2026-11-21T14:00:00.000')?.getHours()).toBe(14)
    expect(parseFeedDate('2026-11-18T21:00:00.000Z')?.toISOString()).toBe('2026-11-18T21:00:00.000Z')
    expect(parseFeedDate(null)).toBeNull()
    expect(parseFeedDate('amanhã')).toBeNull()
  })

  it('descarta entradas malformadas e marca cancelados', () => {
    const events = normalizeEvents([
      null,
      { name: 'Sem id' },
      {
        eventID: 'max-mondays-2026-11-16',
        name: '[Canceled] Max Monday',
        eventType: 'max-mondays',
        link: 'https://leekduck.com/events/max-mondays-2026-11-16/',
        start: null,
        end: null,
      },
      {
        eventID: 'spot',
        name: 'Noibat Spotlight Hour',
        eventType: 'pokemon-spotlight-hour',
        link: 'https://example.com/phishing',
        start: '2026-11-26T18:00:00.000',
        end: '2026-11-26T19:00:00.000',
        extraData: { spotlight: { name: 'Noibat', bonus: '2× Catch XP', list: [{ name: 'Noibat' }] } },
      },
    ])
    expect(events).toHaveLength(2)
    expect(events[0]).toMatchObject({ name: 'Max Monday', canceled: true, start: null })
    expect(events[1]).toMatchObject({ featured: ['Noibat'], bonuses: ['2× Catch XP'], link: null })
  })

  it('lê chefes de reide', () => {
    const [boss] = normalizeRaids([
      {
        name: 'Shadow Larvitar',
        tier: '1-Star Raids',
        canBeShiny: true,
        types: [{ name: 'Rock' }, { name: 'Ground' }],
        combatPower: { normal: { min: 513, max: 594 }, boosted: { min: 642, max: 743 } },
        boostedWeather: [{ name: 'partly cloudy' }],
      },
      { name: 'Sem nível' },
    ])
    expect(boss).toMatchObject({ shadow: true, shiny: true, types: ['rock', 'ground'], cp: { min: 513, max: 594 }, weather: ['partly cloudy'] })
  })
})

describe('agenda', () => {
  const now = new Date('2026-11-20T12:00:00').getTime()
  const event = (id: string, name: string, type: string, start: string, end: string, featured: string[] = []) => ({
    id,
    name,
    type,
    start: new Date(start),
    end: new Date(end),
    canceled: false,
    link: null,
    featured,
    bonuses: [],
  })
  const events = [
    event('raids', 'Cresselia and Darkrai in 5-star Raid Battles', 'raid-battles', '2026-11-16T06:00:00', '2026-11-24T22:00:00'),
    event('deoxys', 'Deoxys (Normal, Defense, Attack, and Speed Formes) in 5-star Raid Battles', 'raid-battles', '2026-11-25T06:00:00', '2026-12-01T22:00:00'),
    event('cd', 'Pawniard Community Day', 'community-day', '2026-11-21T14:00:00', '2026-11-21T17:00:00', ['Pawniard']),
    event('cd-dec', 'December Community Day', 'community-day', '2026-12-12T14:00:00', '2026-12-12T17:00:00'),
    event('spot', 'Grookey, Scorbunny, and Sobble Spotlight Hour', 'pokemon-spotlight-hour', '2026-11-19T18:00:00', '2026-11-19T19:00:00'),
    event('tour', 'Pokémon GO Tour: Alola - Los Angeles 2027', 'pokemon-go-tour', '2027-02-19T08:00:00Z', '2027-02-22T07:59:59Z'),
  ]
  const raids = normalizeRaids([
    { name: 'Cresselia', tier: '5-Star Raids', types: [{ name: 'psychic' }] },
    { name: 'Shadow Tornadus (Incarnate)', tier: '5-Star Raids', types: [{ name: 'flying' }] },
  ])

  it('lista os Pokémon do evento sem repetir e com as formas separadas', () => {
    expect(eventPokemon(events[1])).toEqual(['Deoxys (Normal)', 'Deoxys (Defense)', 'Deoxys (Attack)', 'Deoxys (Speed)'])
    const shadowRaid = { ...events[0], name: 'Shadow Tornadus (Incarnate Forme) in Shadow Raids', featured: ['Tornadus (Incarnate)'] }
    expect(eventPokemon(shadowRaid)).toEqual(['Shadow Tornadus (Incarnate)'])
  })

  it('classifica a situação do evento', () => {
    expect(eventStatus(events[0], now)).toBe('live')
    expect(eventStatus(events[2], now)).toBe('upcoming')
    expect(eventStatus(events[4], now)).toBe('ended')
    expect(eventStatus({ start: null, end: null }, now)).toBe('unknown')
  })

  it('destaca o próximo Dia Comunitário e o próximo grande evento', () => {
    const { communityDay, major } = highlights(events, now)
    expect(communityDay?.id).toBe('cd')
    expect(major?.id).toBe('tour')
  })

  it('monta o "Agora no GO" com a reide atual, a próxima e eventos', () => {
    const schedule = buildSchedule(events, raids, INDEX, now)
    const cresselia = appearancesFor(schedule, 'cresselia', 'cresselia')
    // A reide em andamento aparece uma vez só, com o fim tirado do evento.
    expect(cresselia).toHaveLength(1)
    expect(cresselia[0]).toMatchObject({ kind: 'raid', tier: '5-Star Raids', end: new Date('2026-11-24T22:00:00') })

    expect(appearancesFor(schedule, 'tornadus-incarnate', 'tornadus')[0]).toMatchObject({ kind: 'raid', shadow: true })
    expect(appearancesFor(schedule, 'pawniard', 'pawniard')[0]).toMatchObject({ kind: 'event', eventId: 'cd', live: false })
    // "Deoxys" sem forma vale para qualquer forma da espécie.
    expect(appearancesFor(schedule, 'deoxys-attack', 'deoxys')[0]).toMatchObject({ kind: 'event', eventId: 'deoxys' })
    // Evento já encerrado não aparece.
    expect(appearancesFor(schedule, 'grookey', 'grookey')).toEqual([])
    expect(appearancesFor(schedule, 'meowth', 'meowth')).toEqual([])
  })

  it('formata a contagem regressiva', () => {
    expect(formatDuration(2 * 86_400_000 + 4 * 3_600_000)).toBe('2d 4h')
    expect(formatDuration(5 * 3_600_000 + 12 * 60_000)).toBe('5h 12min')
    expect(formatDuration(30_000)).toBe('1min')
  })
})
