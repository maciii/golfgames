import { beforeAll, describe, expect, it } from 'vitest'
import {
  courseHandicap,
  formatHandicapIndex,
  hasMixedTees,
  parseHandicapIndex,
  playerCourseHandicap,
  playerTee,
  exclusiveBonusOutcome,
  normalizeStrokeIndex,
  stablefordPoints,
  strokesForHole,
  strokesReceived,
  strokesRelativeToBest,
  netDiffToPar,
  bonusDiffToPar,
  playerBonusPoints,
} from './handicap'
import type { Round, RoundCourse } from './types'
import { DEFAULT_GAME_OPTIONS, createRound, toggleBonus } from './types'
import { makeRound } from './games/fixtures'
import { setActiveLocale } from './i18n'

/**
 * Testy handicapových výpočtů.
 *
 * Ověřují matematiku, ne UI - stejně jako u peněz je chyba tady nejdražší,
 * protože se podle ní hraje o peníze.
 */

beforeAll(() => setActiveLocale('cs'))

/** SI osmnáctijamkového hřiště: jamka 1 je nejtěžší, jamka 18 nejlehčí. */
const SI_18 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]

describe('zadání handicapového indexu', () => {
  it('parseHandicapIndex přijme tečku i čárku', () => {
    expect(parseHandicapIndex('30.1')).toBe(30.1)
    expect(parseHandicapIndex('30,1')).toBe(30.1)
  })

  it('parseHandicapIndex prázdné pole znamená bez handicapu', () => {
    expect(parseHandicapIndex('')).toBeUndefined()
    expect(parseHandicapIndex('   ')).toBeUndefined()
  })

  it('formatHandicapIndex zobrazí obojí zadání stejně', () => {
    expect(formatHandicapIndex(parseHandicapIndex('30.1'))).toBe(
      formatHandicapIndex(parseHandicapIndex('30,1')),
    )
    expect(formatHandicapIndex(18)).toBe('18')
    expect(formatHandicapIndex(undefined)).toBe('')
  })
})

describe('courseHandicap', () => {
  it('na neutrálním hřišti (SR 113, CR = par) vrací index zaokrouhlený', () => {
    expect(courseHandicap(18.4, 113, 72, 72)).toBe(18)
  })

  it('těžší slope handicap zvedá', () => {
    // 18.4 × 132/113 = 21.49 -> 21 (CR i par jsou stejné, druhý člen je nula)
    expect(courseHandicap(18.4, 132, 72, 72)).toBe(21)
  })

  it('rozdíl CR a paru se přičítá', () => {
    // 10 × 113/113 + (74.5 - 72) = 12.5 -> 13
    expect(courseHandicap(10, 113, 74.5, 72)).toBe(13)
  })

  it('plusový hráč dostává záporný handicap', () => {
    expect(courseHandicap(-2.4, 113, 72, 72)).toBe(-2)
  })

  it('devítka z osmnáctijamkové normy dává polovinu ran', () => {
    // 18.4 × 132/113 = 21.49; půlka je 10.74 -> 11, ne polovina z 21.
    expect(courseHandicap(18.4, 132, 72, 72, 9, 18)).toBe(11)
    expect(courseHandicap(18.4, 113, 72, 72, 9, 18)).toBe(9)
  })

  it('rozdíl CR a paru se u osmnáctijamkové normy dělí taky', () => {
    // (10 + 2.5) / 2 = 6.25 -> 6
    expect(courseHandicap(10, 113, 74.5, 72, 9, 18)).toBe(6)
  })

  it('devítka s vlastní devítkovou normou nedává dvojnásobek ran', () => {
    // Kácov, devítka Forest z černých: CR 38,0 / SR 149 / par 36. Norma sedí
    // na hrané jamky, takže se nekrátí - ale index ano, jinak by z indexu 18
    // vyšlo 26 ran místo čtrnácti.
    // 18/2 × 149/113 + (38 − 36) = 11.87 + 2 = 13.87 -> 14
    expect(courseHandicap(18, 149, 38, 36, 9, 9)).toBe(14)

    // Složená osmnáctka Forest & River (73,9 / 139) dá dvojnásobek devítky.
    expect(courseHandicap(18, 139, 73.9, 72, 18, 18)).toBe(24)
  })

  it('bez počtu jamek počítá plnou osmnáctku', () => {
    expect(courseHandicap(18, 139, 73.9, 72)).toBe(
      courseHandicap(18, 139, 73.9, 72, 18, 18),
    )
  })
})

describe('odpaliště hráče', () => {
  /** Colony Golf East podle scorekarty klubu. */
  const east: RoundCourse = {
    name: 'Colony Golf – East',
    teeId: 'yellow',
    teeName: 'Žlutá',
    courseRating: 72.9,
    slopeRating: 132,
    par: 73,
    strokeIndex: SI_18,
    tees: [
      { id: 'yellow', name: 'Žlutá', courseRating: 72.9, slopeRating: 132, par: 73 },
      { id: 'red', name: 'Červená', courseRating: 68.6, slopeRating: 122, par: 73 },
      { id: 'black', name: 'Černá', par: 73 },
    ],
  }

  const round = (): Round =>
    createRound({
      gameId: 'skins',
      playerNames: ['Martin', 'Eva'],
      holeCount: 18,
      course: east,
      playerTeeIds: [undefined, 'red'],
    })

  it('hráč bez vlastní volby hraje z odpaliště kola', () => {
    expect(round().players[0]?.teeId).toBe('yellow')
    expect(playerTee(round(), 'p1')?.name).toBe('Žlutá')
  })

  it('hráč s vlastní volbou si nese své odpaliště', () => {
    expect(round().players[1]?.teeId).toBe('red')
    expect(playerTee(round(), 'p2')?.courseRating).toBe(68.6)
  })

  it('z různých odpališť vyjdou různé rány', () => {
    // Kvůli tomuhle rozdílu to celé je: sedm ran, tedy dva Stablefordovy body
    // na skoro každé druhé jamce.
    expect(playerCourseHandicap(18.4, east.tees?.[0], 18, 73)).toBe(21)
    expect(playerCourseHandicap(30.1, east.tees?.[1], 18, 73)).toBe(28)
    expect(playerCourseHandicap(30.1, east.tees?.[0], 18, 73)).toBe(35)
  })

  it('odpaliště bez normy bere index rovnou jako rány', () => {
    expect(playerCourseHandicap(18.4, east.tees?.[2], 18, 73)).toBe(18)
    expect(playerCourseHandicap(18.4, undefined, 18, 73)).toBe(18)
  })

  it('devítka z osmnáctijamkové normy se krátí i tady', () => {
    const tee = { courseRating: 72.9, slopeRating: 132, par: 73, ratedHoles: 18 }
    expect(playerCourseHandicap(18.4, tee, 9, 73)).toBe(11)
  })

  it('starší kolo bez nabídky odpališť vrací odpaliště kola všem', () => {
    const { tees: _tees, ...withoutTees } = east
    const old = createRound({
      gameId: 'skins',
      playerNames: ['Martin', 'Eva'],
      holeCount: 18,
      course: withoutTees,
    })
    expect(playerTee(old, 'p2')).toEqual({
      id: 'yellow',
      name: 'Žlutá',
      courseRating: 72.9,
      slopeRating: 132,
      par: 73,
    })
  })

  it('pozná, že se hraje z víc odpališť', () => {
    expect(hasMixedTees(round())).toBe(true)
    expect(
      hasMixedTees(
        createRound({
          gameId: 'skins',
          playerNames: ['Martin', 'Eva'],
          holeCount: 18,
          course: east,
        }),
      ),
    ).toBe(false)
  })
})

describe('strokesForHole', () => {
  it('handicap 0 nedává rány nikde', () => {
    for (const si of SI_18) expect(strokesForHole(0, si, 18)).toBe(0)
  })

  it('handicap 9 dává ránu na devíti nejtěžších jamkách', () => {
    const total = SI_18.reduce((sum, si) => sum + strokesForHole(9, si, 18), 0)
    expect(total).toBe(9)
    expect(strokesForHole(9, 9, 18)).toBe(1)
    expect(strokesForHole(9, 10, 18)).toBe(0)
  })

  it('handicap 18 dává přesně jednu ránu na každou jamku', () => {
    for (const si of SI_18) expect(strokesForHole(18, si, 18)).toBe(1)
  })

  it('handicap 27 dává dvě rány na devíti nejtěžších, jinde jednu', () => {
    expect(strokesForHole(27, 1, 18)).toBe(2)
    expect(strokesForHole(27, 9, 18)).toBe(2)
    expect(strokesForHole(27, 10, 18)).toBe(1)
    const total = SI_18.reduce((sum, si) => sum + strokesForHole(27, si, 18), 0)
    expect(total).toBe(27)
  })

  it('plusový handicap rány naopak bere, a to od nejlehčí jamky', () => {
    // -3 znamená vrátit tři rány: na SI 18, 17 a 16.
    expect(strokesForHole(-3, 18, 18)).toBe(-1)
    expect(strokesForHole(-3, 16, 18)).toBe(-1)
    expect(strokesForHole(-3, 15, 18)).toBe(0)
    expect(strokesForHole(-3, 1, 18)).toBe(0)

    const total = SI_18.reduce((sum, si) => sum + strokesForHole(-3, si, 18), 0)
    expect(total).toBe(-3)
  })

  it('vysoký handicap dává na nejtěžších jamkách čtyři rány', () => {
    // Hráč s indexem 54 (nejvyšší, jaký WHS zná) má ze slopovaného odpaliště
    // hrací handicap nad 54, takže na nejtěžších jamkách dostává čtyři rány.
    // Zápis skóre je proto nesmí ukázat jako tři - viz tečky v `PlayScreen`.
    const playing = playerCourseHandicap(
      54,
      { courseRating: 71.2, slopeRating: 128, par: 71 },
      18,
      71,
    )
    expect(playing).toBe(61)

    expect(strokesForHole(playing, 1, 18)).toBe(4)
    expect(strokesForHole(playing, 7, 18)).toBe(4)
    expect(strokesForHole(playing, 8, 18)).toBe(3)
    const total = SI_18.reduce((sum, si) => sum + strokesForHole(playing, si, 18), 0)
    expect(total).toBe(61)
  })

  it('na devítijamkovém kole rozdává rány po devíti jamkách', () => {
    const si9 = [1, 2, 3, 4, 5, 6, 7, 8, 9]
    const total = si9.reduce((sum, si) => sum + strokesForHole(5, si, 9), 0)
    expect(total).toBe(5)
    expect(strokesForHole(5, 5, 9)).toBe(1)
    expect(strokesForHole(5, 6, 9)).toBe(0)
  })
})

describe('normalizeStrokeIndex', () => {
  it('SI, které už je pořadím, nechává být', () => {
    expect(normalizeStrokeIndex([3, 1, 2], 3)).toEqual([3, 1, 2])
  })

  it('devítku podepsanou z osmnáctky přepočte na pořadí 1..9', () => {
    // Typické liché SI devítijamkového hřiště.
    const parent = [1, 3, 5, 7, 9, 11, 13, 15, 17]
    expect(normalizeStrokeIndex(parent, 9)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('zachovává pořadí obtížnosti, ne jen hodnoty', () => {
    const parent = [11, 3, 17, 1]
    expect(normalizeStrokeIndex(parent, 4)).toEqual([3, 2, 4, 1])
  })

  it('chybějící nebo nesedící SI nahradí pořadím jamek', () => {
    expect(normalizeStrokeIndex([], 3)).toEqual([1, 2, 3])
    expect(normalizeStrokeIndex([1, 2], 3)).toEqual([1, 2, 3])
  })
})

describe('stablefordPoints', () => {
  it('par jsou dva body, každá rána nad par jeden dolů', () => {
    expect(stablefordPoints(-3)).toBe(5) // albatros
    expect(stablefordPoints(-2)).toBe(4) // eagle
    expect(stablefordPoints(-1)).toBe(3) // birdie
    expect(stablefordPoints(0)).toBe(2) // par
    expect(stablefordPoints(1)).toBe(1) // bogey
  })

  it('netto dvojbogey a horší nedá nic, nikdy záporné body', () => {
    expect(stablefordPoints(2)).toBe(0)
    expect(stablefordPoints(5)).toBe(0)
  })
})

describe('výpočty nad kolem', () => {
  /** Kolo na třech jamkách: par 4, 3, 5 se SI 1, 3, 2. */
  function netRound(playingHandicap: number, scores: (number | null)[]) {
    const round = makeRound({
      gameId: 'stableford',
      players: ['A', 'B'],
      pars: [4, 3, 5],
      scores: [scores, [4, 3, 5]],
    })
    round.netScoring = true
    round.course = { name: 'Test', strokeIndex: [1, 3, 2] }
    const first = round.players[0]
    if (first) first.playingHandicap = playingHandicap
    return round
  }

  it('u brutto kola se rány neodečítají, i když je handicap zadaný', () => {
    const round = netRound(3, [5, 4, 6])
    round.netScoring = false
    expect(strokesReceived(round, 'p1', 0)).toBe(0)
    expect(netDiffToPar(round, 'p1', 0)).toBe(1)
  })

  it('rány se rozdělí podle stroke indexu jamky', () => {
    // Handicap 2 na tříjamkovém kole: rány jdou na SI 1 a SI 2.
    const round = netRound(2, [5, 4, 6])
    expect(strokesReceived(round, 'p1', 0)).toBe(1) // SI 1
    expect(strokesReceived(round, 'p1', 1)).toBe(0) // SI 3
    expect(strokesReceived(round, 'p1', 2)).toBe(1) // SI 2
  })

  it('netto výsledek je skóre po odečtení ran', () => {
    const round = netRound(2, [5, 4, 6])
    expect(netDiffToPar(round, 'p1', 0)).toBe(0) // 5 - 1 = 4 = par
    expect(netDiffToPar(round, 'p1', 1)).toBe(1) // bez rány zůstává bogey
    expect(netDiffToPar(round, 'p1', 2)).toBe(0) // 6 - 1 = 5 = par
  })

  it('nezapsaná jamka zůstává bez výsledku', () => {
    const round = netRound(2, [null, 4, 6])
    expect(netDiffToPar(round, 'p1', 0)).toBeNull()
  })

  it('hráč bez zadaného handicapu hraje brutto i v netto kole', () => {
    const round = netRound(2, [5, 4, 6])
    expect(strokesReceived(round, 'p2', 0)).toBe(0)
  })

  it('rozdíl vůči nejnižšímu HCP rozdělí podle stroke indexu', () => {
    // Anna má proti Bobovi o dvě rány k dobru, proto je dostane na SI 1 a 2.
    const round = netRound(2, [5, 4, 6])
    expect(strokesRelativeToBest(round, 'p1', 0)).toBe(1)
    expect(strokesRelativeToBest(round, 'p1', 1)).toBe(0)
    expect(strokesRelativeToBest(round, 'p1', 2)).toBe(1)
    expect(strokesRelativeToBest(round, 'p2', 0)).toBe(0)
  })

  it('relativní rány u brutto kola nezobrazuje', () => {
    const round = netRound(2, [5, 4, 6])
    round.netScoring = false
    expect(strokesRelativeToBest(round, 'p1', 0)).toBe(0)
  })

  it('devítka z osmnáctky rozdává rány podle pořadí uvnitř své půlky', () => {
    // Zadní devítka hřiště se sudými SI: samotné hodnoty 2-18 by hráči
    // s handicapem 5 daly rány jen na třech jamkách místo na pěti.
    const round = makeRound({
      gameId: 'stableford',
      players: ['A', 'B'],
      pars: [4, 4, 4, 4, 4, 4, 4, 4, 4],
      scores: [
        [4, 4, 4, 4, 4, 4, 4, 4, 4],
        [4, 4, 4, 4, 4, 4, 4, 4, 4],
      ],
      startHole: 10,
    })
    round.netScoring = true
    round.course = { name: 'Test', strokeIndex: [2, 4, 6, 8, 10, 12, 14, 16, 18] }
    const first = round.players[0]
    if (first) first.playingHandicap = 5

    const given = Array.from({ length: 9 }, (_, hole) =>
      strokesReceived(round, 'p1', hole),
    )

    expect(given).toEqual([1, 1, 1, 1, 1, 0, 0, 0, 0])
  })
})

/**
 * Komu na jamce připadne Longest / Nearest. Řídí barvu značky u jména při
 * zápisu i to, čí dvojici se bod započítá (viz bestAggregate.test.ts).
 *
 * Jamka je par 4; Adam ji zahraje podle testu, ostatní na par.
 */
describe('Přidělení Longest a Nearest', () => {
  function roundWith(adamScore: number | null, confirm: boolean) {
    return makeRound({
      gameId: 'best-aggregate',
      players: ['Adam', 'Bára', 'Cyril', 'Dana'],
      pars: [4],
      scores: [[adamScore], [4], [4], [4]],
      teams: [
        [0, 1],
        [2, 3],
      ],
      settings: {
        options: {
          ...DEFAULT_GAME_OPTIONS,
          confirmLongest: confirm,
          confirmNearest: confirm,
        },
      },
    })
  }

  it('bez potvrzování zůstává bonus vždy vlastní dvojici', () => {
    const round = roundWith(6, false)

    expect(exclusiveBonusOutcome(round, 'p1', 0, 'longest')).toBe('own')
  })

  it('s potvrzováním zůstává při paru vlastní dvojici', () => {
    const round = roundWith(4, true)

    expect(exclusiveBonusOutcome(round, 'p1', 0, 'longest')).toBe('own')
  })

  it('s potvrzováním zůstává i při lepším výsledku', () => {
    const round = roundWith(3, true)

    expect(exclusiveBonusOutcome(round, 'p1', 0, 'nearest')).toBe('own')
  })

  it('s potvrzováním propadá soupeřům při horším než par', () => {
    const round = roundWith(5, true)

    expect(exclusiveBonusOutcome(round, 'p1', 0, 'longest')).toBe('opponent')
  })

  it('dokud hráč jamku nezapsal, není rozhodnuto', () => {
    const round = roundWith(null, true)

    expect(exclusiveBonusOutcome(round, 'p1', 0, 'nearest')).toBe('pending')
  })

  it('Longest a Nearest se řídí každý vlastním přepínačem', () => {
    const round = makeRound({
      gameId: 'best-aggregate',
      players: ['Adam', 'Bára', 'Cyril', 'Dana'],
      pars: [4],
      scores: [[5], [4], [4], [4]],
      teams: [
        [0, 1],
        [2, 3],
      ],
      settings: {
        options: {
          ...DEFAULT_GAME_OPTIONS,
          confirmLongest: true,
          confirmNearest: false,
        },
      },
    })

    expect(exclusiveBonusOutcome(round, 'p1', 0, 'longest')).toBe('opponent')
    expect(exclusiveBonusOutcome(round, 'p1', 0, 'nearest')).toBe('own')
  })
})

/**
 * Potvrzování osobním parem.
 *
 * Adam má handicap 1 a jedinou jamku kola má jako SI 1, takže na ní dostává
 * ránu: bogey (5 na paru 4) je pro něj netto par. Se zapnutou volbou tím
 * Longest potvrdí, s vypnutou bod propadá soupeřům.
 */
describe('Potvrzování osobním parem', () => {
  function netRoundWith(personalPar: boolean): Round {
    const round = makeRound({
      gameId: 'best-aggregate',
      players: ['Adam', 'Bára', 'Cyril', 'Dana'],
      pars: [4],
      scores: [[5], [4], [4], [4]],
      teams: [
        [0, 1],
        [2, 3],
      ],
      settings: {
        options: { ...DEFAULT_GAME_OPTIONS, confirmByPersonalPar: personalPar },
      },
    })
    round.netScoring = true
    round.course = { name: 'Test', strokeIndex: [1] }
    const adam = round.players[0]
    if (adam) adam.playingHandicap = 1
    return round
  }

  it('se zapnutou volbou potvrdí bogey, které je netto parem', () => {
    expect(exclusiveBonusOutcome(netRoundWith(true), 'p1', 0, 'longest')).toBe('own')
  })

  it('s vypnutou volbou rozhoduje brutto par a bod propadá soupeřům', () => {
    expect(exclusiveBonusOutcome(netRoundWith(false), 'p1', 0, 'longest')).toBe(
      'opponent',
    )
  })

  it('netto dvojbogey bonus nepotvrdí ani s osobním parem', () => {
    const round = netRoundWith(true)
    round.scores.p1 = [7]

    expect(exclusiveBonusOutcome(round, 'p1', 0, 'longest')).toBe('opponent')
  })

  it('na brutto kole volba nic nemění', () => {
    const round = netRoundWith(true)
    round.netScoring = false

    expect(exclusiveBonusOutcome(round, 'p1', 0, 'longest')).toBe('opponent')
  })

  /**
   * Nearest se hraje na tříparovou jamku, kde délka hřiště slabšího hráče
   * netrestá - proto se potvrzuje vždycky brutto parem, i když má hráč na
   * jamce ránu a Longest by za stejných okolností prošel.
   */
  it('Nearest se osobním parem neřídí ani se zapnutou volbou', () => {
    const round = netRoundWith(true)

    expect(exclusiveBonusOutcome(round, 'p1', 0, 'nearest')).toBe('opponent')
    expect(exclusiveBonusOutcome(round, 'p1', 0, 'longest')).toBe('own')
  })

  it('Nearest zahraný na brutto par platí dál', () => {
    const round = netRoundWith(true)
    round.scores.p1 = [4]

    expect(exclusiveBonusOutcome(round, 'p1', 0, 'nearest')).toBe('own')
  })
})

describe('násobič extra bodů a handicap', () => {
  /**
   * Netto kolo, ve kterém Bára dostává na první jamce ránu. Oba zahrají par
   * jamky, takže brutto nemá birdie ani jeden - netto ho má Bára.
   */
  function betRound(withHandicap: boolean): Round {
    const round = makeRound({
      gameId: 'match-play',
      players: ['Adam', 'Bára'],
      pars: [4, 4],
      scores: [
        [4, 4],
        [4, 4],
      ],
    })
    round.netScoring = true
    round.course = { name: 'Testovací hřiště', strokeIndex: [1, 2] }
    round.players[1]!.playingHandicap = 1
    round.settings.options = {
      ...DEFAULT_GAME_OPTIONS,
      multipliersWithHandicap: withHandicap,
      bonusValues: { ...DEFAULT_GAME_OPTIONS.bonusValues, bunker: 5 },
    }
    return toggleBonus(toggleBonus(round, 'p1', 0, 'bunker'), 'p2', 0, 'bunker')
  }

  it('bez zaškrtnutí platí násobič jen za skutečné birdie', () => {
    const round = betRound(false)

    // Oba zahráli par jamky, takže ani jeden nemá násobič.
    expect(bonusDiffToPar(round, 'p1', 0)).toBe(0)
    expect(bonusDiffToPar(round, 'p2', 0)).toBe(0)
    expect(playerBonusPoints(round, 'p1', 0)).toBe(5)
    expect(playerBonusPoints(round, 'p2', 0)).toBe(5)
  })

  it('se zaškrtnutím se v netto kole bere osobní par', () => {
    const round = betRound(true)

    // Bára dostává na jamce ránu, takže par jamky je pro ni netto birdie.
    expect(bonusDiffToPar(round, 'p1', 0)).toBe(0)
    expect(bonusDiffToPar(round, 'p2', 0)).toBe(-1)
    expect(playerBonusPoints(round, 'p1', 0)).toBe(5)
    expect(playerBonusPoints(round, 'p2', 0)).toBe(10)
  })

  it('na brutto kolo volba vliv nemá', () => {
    const round = betRound(true)
    round.netScoring = false

    expect(bonusDiffToPar(round, 'p2', 0)).toBe(0)
    expect(playerBonusPoints(round, 'p2', 0)).toBe(5)
  })

  it('ve výchozím nastavení je volba vypnutá', () => {
    expect(DEFAULT_GAME_OPTIONS.multipliersWithHandicap).toBe(false)
  })
})
