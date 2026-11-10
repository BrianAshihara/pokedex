import { peaks, poly, spot, town, woods } from '../../lib/illustrated-map'
import type { IllustratedMap } from '../../lib/illustrated-map'

export const orre: IllustratedMap = {
  name: 'Orre',
  width: 1000,
  height: 700,
  coast: poly(50, 110, 300, 40, 620, 25, 920, 90, 975, 300, 960, 540, 760, 610, 500, 650, 230, 620, 60, 500, 25, 280),
  islands: [poly(800, 610, 930, 605, 940, 672, 815, 680)],
  lakes: [],
  forests: woods(170, 180, 80, 54, 150, 300, 56, 40),
  mountains: peaks(470, 125, 96, 390, 120, 62, 560, 120, 66, 310, 95, 44, 640, 110, 46, 700, 500, 46),
  roads: {},
  towns: {
    'phenac-city': town(195, 406, 1.1),
    'pyrite-town': town(475, 397, 1),
    'agate-village': town(153, 172, 0.85),
    'gateon-port': town(820, 414, 1),
  },
  spots: {
    'outskirt-stand': spot(255, 470, 'mansion'),
    'mt-battle': spot(470, 86, 'tower', 'Mt. Battle'),
    'realgam-tower': spot(784, 242, 'tower'),
    'snagem-hideout': spot(600, 450, 'factory'),
    'pyrite-cave': spot(440, 455, 'cave'),
    'the-under': spot(510, 455, 'factory', 'The Under'),
    'cipher-lab': spot(355, 300, 'factory'),
    'pokemon-hq-lab': spot(310, 480, 'factory', 'Pokémon HQ Lab'),
    'cipher-key-lair': spot(860, 320, 'factory'),
    'citadark-isle': spot(870, 640, 'tower'),
    onbs: spot(620, 300, 'factory', 'ONBS'),
    pokespot: spot(250, 240, 'safari', 'Poké Spot'),
  },
  aliases: {
    'pyrite-bldg': 'pyrite-town',
    'shadow-pokemon-lab': 'cipher-lab',
  },
}
