import { useEffect, useState } from 'react'
import { DEFAULT_GAME_ID, GAMES, getGame } from '../games'
import type { RosterEntry } from '../storage'
import {
  loadCourses,
  loadGameOptions,
  loadRoster,
  loadSettings,
  removeFromRoster,
  saveSettings,
} from '../storage'
import type { Course } from '../courses/types'
import { findTee } from '../courses/types'
import type { PlayableLoop } from '../courses/layout'
import {
  MAX_LAYOUT_HOLES,
  defaultLoopSelection,
  layoutTee,
  playableLoops,
  requiresLoopSelection,
  resolveLayout,
  selectionHoleCount,
} from '../courses/layout'
import { courseHandicap } from '../handicap'
import type { CreateRoundOptions, Currency, RoundCourse, RoundSettings } from '../types'
import { DEFAULT_POINT_VALUE } from '../types'
import { usePwaInstall } from '../pwa'
import { APP_VERSION } from '../version'
import { useAccount } from '../sync/AccountContext'
import {
  LOCALES,
  LOCALE_FLAG,
  LOCALE_LABEL,
  localizedTeeName,
  localeTag,
  useLocale,
} from '../i18n'
import type { MessageKey } from '../i18n'

const CURRENCIES: Currency[] = ['CZK', 'EUR']
const CURRENCY_LABEL: Record<Currency, string> = { CZK: 'Kč', EUR: '€' }

const MAX_PLAYERS = 4

/**
 * Počty jamek pro kolo bez hřiště. Šestka i dvanáctka existují - krátká
 * hřiště se staví právě takhle.
 */
const HOLE_OPTIONS = [6, 9, 12, 18]

/**
 * Půlky osmnáctky se v nabídce jmenují podle překladů, ne podle hřiště -
 * `playableLoops()` je proto vrací bez jména (viz `PlayableLoop.synthetic`).
 */
const SYNTHETIC_LOOP_LABEL: Record<string, MessageKey> = {
  front: 'setup.holesFront',
  back: 'setup.holesBack',
}

const TEE_COLOR_IDS = new Set([
  'black',
  'blue',
  'bronze',
  'dark-green',
  'gold',
  'green',
  'jade',
  'members',
  'men',
  'middle',
  'orange',
  'players',
  'purple',
  'red',
  'silver',
  'tournament',
  'white',
  'yellow',
])

function teeColorClass(teeId: string): string {
  return TEE_COLOR_IDS.has(teeId) ? teeId : 'neutral'
}

function initialTeeId(selectedCourseId: string | undefined, draftTeeId?: string): string {
  const course = selectedCourseId
    ? loadCourses().find((entry) => entry.id === selectedCourseId)
    : undefined
  if (course?.tees.some((tee) => tee.id === draftTeeId)) return draftTeeId ?? ''
  if (course?.tees.some((tee) => tee.id === 'yellow')) return 'yellow'
  return draftTeeId ?? ''
}

/**
 * Tři možná rozdělení čtyř hráčů do dvojic. Víc jich neexistuje - u čtyř
 * hráčů určuje dvojice už jen to, koho dostane první hráč za partnera.
 */
const PAIRINGS: number[][][] = [
  [
    [0, 1],
    [2, 3],
  ],
  [
    [0, 2],
    [1, 3],
  ],
  [
    [0, 3],
    [1, 2],
  ],
]

export interface SetupDraft {
  gameId: string
  playerCount: number
  names: string[]
  holeCount: number
  /** Smyčky hřiště v pořadí hry; prázdné znamená celé hřiště. */
  loopIds: string[]
  pairing: number
  settings: RoundSettings
  pointValueText: string
  teeId: string
  netScoring: boolean
  handicapMode: 'index' | 'strokes'
  handicapText: string[]
}

interface Props {
  onStart: (options: CreateRoundOptions) => void
  onOpenArchive: () => void
  onOpenGameSettings: (gameId: string) => void
  onOpenBackup: () => void
  onOpenAccount: () => void
  /** Otevře zadání hřiště; bez id se zakládá nové. */
  onEditCourse: (courseId?: string) => void
  /** Otevře výběr hřiště s hledáním. */
  onPickCourse: () => void
  /** Hřiště předvybrané po návratu ze zadání. */
  selectedCourseId?: string
  /** Rozepsané nastavení přežívající návrat z podobrazovky. */
  initialDraft?: SetupDraft
  onDraftChange?: (draft: SetupDraft) => void
  archiveCount: number
}

/** Nastavení nového kola: hra, hráči, dvojice a počet jamek. */
export default function SetupScreen({
  onStart,
  onOpenArchive,
  onOpenGameSettings,
  onOpenBackup,
  onOpenAccount,
  onEditCourse,
  onPickCourse,
  selectedCourseId,
  initialDraft,
  onDraftChange,
  archiveCount,
}: Props) {
  const { t, locale, setLocale } = useLocale()
  const { status, account } = useAccount()
  const { canInstall, install, isIOS, isMobile, isStandalone } = usePwaInstall()
  const [installHelp, setInstallHelp] = useState(false)
  const [gameId, setGameId] = useState(initialDraft?.gameId ?? DEFAULT_GAME_ID)
  const [playerCount, setPlayerCount] = useState(
    initialDraft?.playerCount ?? getGame(DEFAULT_GAME_ID).playerCounts[0] ?? 2,
  )
  const [names, setNames] = useState<string[]>(
    () => initialDraft?.names.slice() ?? Array(MAX_PLAYERS).fill(''),
  )
  // Počet jamek se vybírá jen u kola bez hřiště; se hřištěm ho určuje zvolený
  // výřez (viz `playedHoles`).
  const [holeCount, setHoleCount] = useState(() => initialDraft?.holeCount ?? 18)
  const [loopIds, setLoopIds] = useState<string[]>(
    () => initialDraft?.loopIds.slice() ?? [],
  )
  const [pairing, setPairing] = useState(initialDraft?.pairing ?? 0)
  const [roster, setRoster] = useState<RosterEntry[]>(() => loadRoster())
  const [rosterEditing, setRosterEditing] = useState(false)
  // Předvolby se pamatují z minulého kola, ať se sázka nezadává pořád dokola.
  const [settings, setSettings] = useState<RoundSettings>(
    () => initialDraft?.settings ?? loadSettings(),
  )
  const [pointValueText, setPointValueText] = useState(
    () => initialDraft?.pointValueText ?? `${loadSettings().pointValue}`,
  )

  // Hřiště je nepovinné - bez něj se kolo založí jako dosud, se samými čtyřkami
  // a bez handicapů.
  // Obrazovka se při odchodu na zadání hřiště odpojí, takže seznam stačí načíst
  // při připojení - po návratu je stejně nový.
  const [courses] = useState<Course[]>(() => loadCourses())
  // Výběr hřiště se děje na vlastní obrazovce, takže sem přichází hotový
  // zvenčí; obrazovka se mezitím odpojí a stav se stejně staví znovu.
  const courseId = selectedCourseId ?? ''
  // Prázdné id znamená "první odpaliště"; findTee() na něj spadne sám.
  const [teeId, setTeeId] = useState<string>(() =>
    initialTeeId(selectedCourseId, initialDraft?.teeId),
  )
  const [netScoring, setNetScoring] = useState(initialDraft?.netScoring ?? false)
  /**
   * Zadává se handicapový index, nebo rovnou počet ran?
   *
   * Index je běžnější, ale na hřišti bez normy odpaliště se z něj nedá počítat,
   * takže musí jít zadat i hotové rány.
   */
  const [handicapMode, setHandicapMode] = useState<'index' | 'strokes'>(
    initialDraft?.handicapMode ?? 'index',
  )
  /** Handicapové indexy jako text, ať jde pole vymazat bez skoku na nulu. */
  const [handicapText, setHandicapText] = useState<string[]>(
    () => initialDraft?.handicapText.slice() ?? Array(MAX_PLAYERS).fill(''),
  )

  useEffect(() => {
    onDraftChange?.({
      gameId,
      playerCount,
      names: [...names],
      holeCount,
      loopIds: [...loopIds],
      pairing,
      settings,
      pointValueText,
      teeId,
      netScoring,
      handicapMode,
      handicapText: [...handicapText],
    })
  }, [
    gameId,
    playerCount,
    names,
    holeCount,
    loopIds,
    pairing,
    settings,
    pointValueText,
    teeId,
    netScoring,
    handicapMode,
    handicapText,
    onDraftChange,
  ])

  const course = courses.find((c) => c.id === courseId)
  const tee = course ? findTee(course, teeId) : undefined
  const canUseNet = course !== undefined

  /**
   * Části hřiště, ze kterých jde kolo poskládat: pojmenované devítky resortu,
   * nebo dvě půlky osmnáctky. Kratší hřiště se hraje celé.
   */
  const loops: PlayableLoop[] = course ? playableLoops(course) : []
  /** Resort bez „celé" podoby si vždycky vybírá devítky, osmnáctka nemusí. */
  const requiresLoops = course !== undefined && requiresLoopSelection(course)
  const selection =
    course && requiresLoops && selectionHoleCount(course, loopIds) === 0
      ? defaultLoopSelection(course)
      : loopIds
  const layout = course ? resolveLayout(course, selection) : undefined
  const startHole = layout?.startHole ?? 1
  /** Počet jamek, na které se opravdu hraje. */
  const playedHoles = layout?.holeCount ?? holeCount
  /** Norma zvoleného odpaliště přepočtená na hrané jamky. */
  const playedTee = course && layout ? layoutTee(course, layout, teeId) : undefined

  const game = getGame(gameId)
  const usesTeams = game.usesTeams(playerCount)
  const needsPairing = usesTeams && playerCount === 4
  const showInstall = !isStandalone && (canInstall || isIOS || isMobile)
  const displayName = (index: number) =>
    names[index]?.trim() || t('common.player', { number: index + 1 })

  /** Půlky osmnáctky hřiště nepojmenovává, popisek je z překladů. */
  function loopLabel(loop: PlayableLoop): string {
    const key = SYNTHETIC_LOOP_LABEL[loop.id]
    return loop.name || (key ? t(key) : loop.id)
  }

  /** Jméno hraného výřezu pro kolo: „Forest + River"; celé hřiště ho nemá. */
  const layoutName =
    selection.length > 0
      ? selection
          .flatMap((id) => {
            const loop = loops.find((candidate) => candidate.id === id)
            return loop ? [loopLabel(loop)] : []
          })
          .join(' + ')
      : undefined

  /**
   * Přidá smyčku do kola.
   *
   * Skládá se po pořadí, protože na něm záleží - kombinace devítek má vlastní
   * normu i vlastní pořadí jamek. Další klepnutí na poslední smyčku ji zase
   * odebere a klepnutí, kterým by kolo přerostlo osmnáctku, začne nový výběr.
   */
  function addLoop(loop: PlayableLoop) {
    if (!course) return
    if (selection.length > 1 && selection[selection.length - 1] === loop.id) {
      setLoopIds(selection.slice(0, -1))
      return
    }
    const next = [...selection, loop.id]
    setLoopIds(selectionHoleCount(course, next) <= MAX_LAYOUT_HOLES ? next : [loop.id])
  }

  async function installApp() {
    const result = await install()
    if (result === 'unavailable') setInstallHelp(true)
  }

  function selectGame(id: string) {
    setGameId(id)
    const next = getGame(id)
    // Přepnutí hry nesmí nechat počet hráčů, který daná hra nepodporuje.
    if (!next.playerCounts.includes(playerCount)) {
      setPlayerCount(next.playerCounts[0] ?? 2)
    }
  }

  /**
   * Přepnutí měny nastaví obvyklou sázku dané měny, ale jen dokud si ji
   * uživatel sám nepřepsal - jinak by mu překlik smazal zadanou hodnotu.
   */
  function selectCurrency(currency: Currency) {
    const untouched = settings.pointValue === DEFAULT_POINT_VALUE[settings.currency]
    if (!untouched) {
      // Vlastní hodnota zůstává i s tím, jak si ji uživatel napsal ("2,5").
      setSettings({ ...settings, currency })
      return
    }
    const pointValue = DEFAULT_POINT_VALUE[currency]
    setSettings({ ...settings, currency, pointValue })
    setPointValueText(`${pointValue}`)
  }

  function updatePointValue(text: string) {
    // Desetinná čárka i tečka, ať jde zadat 0,5 € podle zvyku.
    setPointValueText(text)
    const parsed = Number.parseFloat(text.replace(',', '.'))
    setSettings({
      ...settings,
      pointValue: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
    })
  }

  function updateName(index: number, value: string) {
    setNames((prev) => prev.map((n, i) => (i === index ? value : n)))
  }

  /** Klepnutí na uloženého hráče doplní i jeho HCP index v každé hře. */
  function useRosterEntry(entry: RosterEntry) {
    const slot = names.slice(0, playerCount).findIndex((name) => !name.trim())
    if (slot === -1) return

    setNames((prev) => prev.map((name, index) => (index === slot ? entry.name : name)))
    if (entry.handicapIndex !== undefined) {
      setHandicapText((prev) =>
        prev.map((value, index) => (index === slot ? `${entry.handicapIndex}` : value)),
      )
    }
  }

  function forgetPlayer(entry: RosterEntry) {
    setRoster(removeFromRoster(entry.id))
  }

  /** Jména, která už jsou rozepsaná, se v nabídce nenabízejí podruhé. */
  const used = new Set(
    names
      .slice(0, playerCount)
      .map((n) => n.trim().toLowerCase())
      .filter(Boolean),
  )
  const available = roster.filter((entry) => !used.has(entry.name.trim().toLowerCase()))

  /** Zadaná hodnota u hráče; prázdné pole znamená "hraje bez handicapu". */
  function handicapValue(index: number): number | undefined {
    const raw = handicapText[index] ?? ''
    if (!raw.trim()) return undefined
    const value = Number.parseFloat(raw.replace(',', '.'))
    return Number.isFinite(value) ? value : undefined
  }

  /**
   * Hrací handicap hráče v ranách.
   *
   * V režimu indexu se počítá podle WHS z normy hraného výřezu. Kolik jamek se
   * hraje a kolika jamek se norma týká jsou dva různé údaje, proto jdou do
   * výpočtu oba: index se krátí hranými jamkami vždycky, `CR − par` jen když je
   * norma osmnáctijamková. Když odpaliště normu nemá (typicky ručně zadané
   * hřiště), bere se index rovnou jako počet ran - jinak by netto na takovém
   * hřišti nešlo hrát vůbec. Zadaný počet ran zůstává, jak ho hráč napsal: je
   * to rovnou hrací handicap pro tohle kolo, ne index k přepočtu.
   */
  function playingHandicapFor(index: number): number | undefined {
    const value = handicapValue(index)
    if (value === undefined) return undefined
    if (handicapMode === 'strokes') return Math.round(value)

    if (playedTee?.courseRating !== undefined && playedTee.slopeRating !== undefined) {
      return courseHandicap(
        value,
        playedTee.slopeRating,
        playedTee.courseRating,
        playedTee.par,
        playedHoles,
        playedTee.ratedHoles,
      )
    }
    return Math.round(value)
  }

  function updateHandicap(index: number, text: string) {
    setHandicapText((prev) => prev.map((value, i) => (i === index ? text : value)))
  }

  function start() {
    const teamIndices = usesTeams
      ? playerCount === 4
        ? PAIRINGS[pairing]
        : [[0, 1]]
      : undefined
    // Volby bodování se berou z nastavení zvolené hry; volbu, kterou hra
    // nepodporuje, do kola nepropustíme.
    const gameOptions = loadGameOptions(gameId)
    const effective: RoundSettings = {
      ...settings,
      options: {
        ...gameOptions,
        doubleClosingHoles: game.supportsDoubleHoles && gameOptions.doubleClosingHoles,
      },
    }
    saveSettings(effective)

    // Kolo si bere jen výřez parů a stroke indexů zvolených smyček. Vypadá pak
    // jako každé jiné kolo - jen si pamatuje, kterou jamkou začíná.
    const holePars = layout ? [...layout.pars] : []
    // Par kola je par normy jen tehdy, když norma sedí na hrané jamky; jinak
    // (devítka z osmnáctijamkové normy) se sečtou pary hraných jamek.
    const roundPar =
      playedTee && playedTee.ratedHoles === playedHoles
        ? playedTee.par
        : (layout?.par ?? 0)

    // Kolo dostane vlastní kopii hřiště; katalog se pak může měnit, aniž by to
    // přepočítalo odehraná kola.
    const roundCourse: RoundCourse | undefined = course
      ? {
          id: course.id,
          name: course.name,
          ...(layoutName ? { layoutName } : {}),
          ...(playedTee
            ? {
                teeId: playedTee.id,
                teeName: playedTee.name,
                ...(playedTee.courseRating !== undefined
                  ? { courseRating: playedTee.courseRating }
                  : {}),
                ...(playedTee.slopeRating !== undefined
                  ? { slopeRating: playedTee.slopeRating }
                  : {}),
              }
            : {}),
          par: roundPar,
          strokeIndex: layout ? [...layout.strokeIndex] : [],
        }
      : undefined

    const indexes = Array.from({ length: playerCount }, (_, i) =>
      handicapMode === 'index' ? handicapValue(i) : undefined,
    )
    const strokes = Array.from({ length: playerCount }, (_, i) => playingHandicapFor(i))

    onStart({
      gameId,
      playerNames: names.slice(0, playerCount),
      holeCount: playedHoles,
      ...(startHole > 1 ? { startHole } : {}),
      teamIndices,
      settings: effective,
      ...(roundCourse ? { course: roundCourse, pars: holePars } : {}),
      ...(netScoring
        ? { netScoring: true, handicapIndexes: indexes, playingHandicaps: strokes }
        : {}),
    })
  }

  return (
    <div className="screen">
      <header className="app-header">
        <div className="setup-header-row">
          <div>
            <h1>{t('setup.title')}</h1>
            <p className="subtitle">{t('setup.subtitle')}</p>
          </div>
          <div className="language-switcher" aria-label={t('setup.language')}>
            {LOCALES.map((code) => (
              <button
                key={code}
                type="button"
                className={`language-button${code === locale ? ' selected' : ''}`}
                onClick={() => setLocale(code)}
                aria-label={LOCALE_LABEL[code]}
                aria-pressed={code === locale}
                title={LOCALE_LABEL[code]}
              >
                {LOCALE_FLAG[code]}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="content">
        <section className="section">
          <h2 className="section-title">{t('setup.game')}</h2>
          <div className="game-list">
            {GAMES.map((g) => (
              <div key={g.id} className="game-choice">
                <button
                  type="button"
                  className={`game-card${g.id === gameId ? ' selected' : ''}`}
                  onClick={() => selectGame(g.id)}
                  aria-pressed={g.id === gameId}
                >
                  <span className="game-name">
                    {t(`games.${g.id}.name` as MessageKey)}
                  </span>
                  <span className="game-tagline">
                    {t(`games.${g.id}.tagline` as MessageKey)}
                  </span>
                </button>
                <button
                  type="button"
                  className="game-settings-button"
                  onClick={() => onOpenGameSettings(g.id)}
                  aria-label={t('setup.gameSettingsFor', {
                    name: t(`games.${g.id}.name` as MessageKey),
                  })}
                  title={t('setup.gameSettingsFor', {
                    name: t(`games.${g.id}.name` as MessageKey),
                  })}
                >
                  <span aria-hidden="true">⚙</span>
                </button>
              </div>
            ))}
          </div>
          <p className="hint">{t(`games.${game.id}.rules` as MessageKey)}</p>
        </section>

        <section className="section">
          <h2 className="section-title">{t('setup.players')}</h2>
          {game.playerCounts.length > 1 ? (
            <div className="segmented">
              {game.playerCounts.map((count) => (
                <button
                  key={count}
                  type="button"
                  className={`segment${count === playerCount ? ' selected' : ''}`}
                  onClick={() => setPlayerCount(count)}
                  aria-pressed={count === playerCount}
                >
                  {count}
                </button>
              ))}
            </div>
          ) : (
            <p className="hint">{t('setup.fixedPlayers', { count: playerCount })}</p>
          )}

          <div className="name-list">
            {Array.from({ length: playerCount }, (_, i) => (
              <input
                key={i}
                className="name-input"
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="words"
                placeholder={t('common.player', { number: i + 1 })}
                value={names[i] ?? ''}
                onChange={(e) => updateName(i, e.target.value)}
              />
            ))}
          </div>

          {roster.length > 0 && (
            <div className="roster">
              <div className="roster-head">
                <span className="roster-label">{t('setup.savedPlayers')}</span>
                <button
                  type="button"
                  className="roster-toggle"
                  onClick={() => setRosterEditing((v) => !v)}
                >
                  {rosterEditing ? t('common.done') : t('common.edit')}
                </button>
              </div>
              <div className="chip-row">
                {(rosterEditing ? roster : available).map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className={`chip${rosterEditing ? ' removable' : ''}`}
                    onClick={() =>
                      rosterEditing ? forgetPlayer(entry) : useRosterEntry(entry)
                    }
                    aria-label={
                      rosterEditing
                        ? t('setup.removePlayer', { name: entry.name })
                        : t('setup.addPlayer', { name: entry.name })
                    }
                  >
                    {entry.handicapIndex !== undefined
                      ? t('setup.savedPlayerWithHandicap', {
                          name: entry.name,
                          handicap: entry.handicapIndex,
                        })
                      : entry.name}
                    {rosterEditing && <span className="chip-x">×</span>}
                  </button>
                ))}
                {!rosterEditing && available.length === 0 && (
                  <span className="hint">{t('setup.allPlayersUsed')}</span>
                )}
              </div>
            </div>
          )}
        </section>

        {needsPairing && (
          <section className="section">
            <h2 className="section-title">{t('setup.pairs')}</h2>
            <div className="game-list">
              {PAIRINGS.map((option, index) => (
                <button
                  key={index}
                  type="button"
                  className={`game-card${index === pairing ? ' selected' : ''}`}
                  onClick={() => setPairing(index)}
                  aria-pressed={index === pairing}
                >
                  <span className="pairing-line">
                    {(option[0] ?? []).map(displayName).join(' + ')}
                    <span className="pairing-vs">{t('setup.versus')}</span>
                    {(option[1] ?? []).map(displayName).join(' + ')}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="section">
          <h2 className="section-title">{t('setup.stake')}</h2>
          <div className="segmented">
            {CURRENCIES.map((code) => (
              <button
                key={code}
                type="button"
                className={`segment${code === settings.currency ? ' selected' : ''}`}
                onClick={() => selectCurrency(code)}
                aria-pressed={code === settings.currency}
              >
                {CURRENCY_LABEL[code]}
              </button>
            ))}
          </div>

          <label className="field">
            <span className="field-label">{t('setup.pointValue')}</span>
            <span className="field-input">
              <input
                className="name-input value-input"
                type="text"
                inputMode="decimal"
                value={pointValueText}
                onChange={(e) => updatePointValue(e.target.value)}
                aria-label={t('setup.pointValueLabel')}
              />
              <span className="field-suffix">{CURRENCY_LABEL[settings.currency]}</span>
            </span>
          </label>

          <p className="hint">{t('setup.stakeHint')}</p>
        </section>

        <section className="section">
          <h2 className="section-title">{t('setup.course')}</h2>

          {/* Se třemi stovkami naimportovaných hřišť se v rozbalovací nabídce
              nedá nic najít, takže výběr má vlastní obrazovku s hledáním. */}
          <button type="button" className="secondary-button" onClick={onPickCourse}>
            {course
              ? layoutName
                ? `${course.name} · ${layoutName}`
                : course.name
              : t('setup.chooseCourse')}
          </button>

          <div className="link-row">
            <button type="button" className="link-button" onClick={() => onEditCourse()}>
              {t('setup.newCourse')}
            </button>
            {course && (
              <button
                type="button"
                className="link-button"
                onClick={() => onEditCourse(course.id)}
              >
                {t('setup.editCourse')}
              </button>
            )}
          </div>

          {course && course.tees.length > 0 && (
            <div className="field tee-field">
              <span className="field-label">{t('setup.tee')}</span>
              <div className="tee-options" role="radiogroup" aria-label={t('setup.tee')}>
                {course.tees.map((option) => {
                  const selected = tee?.id === option.id
                  // Délka i norma patří k hraným jamkám, ne k celému resortu.
                  const played = layout ? layoutTee(course, layout, option.id) : undefined
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`tee-option tee-option-${teeColorClass(option.id)}${
                        selected ? ' selected' : ''
                      }`}
                      onClick={() => setTeeId(option.id)}
                      aria-pressed={selected}
                    >
                      <span className="tee-swatch" aria-hidden="true" />
                      <span className="tee-option-label">
                        <span>{localizedTeeName(option.id, option.name)}</span>
                        {played?.distance !== undefined && (
                          <span className="tee-option-distance">
                            {new Intl.NumberFormat(localeTag(), {
                              maximumFractionDigits: 0,
                            }).format(played.distance)}{' '}
                            m
                          </span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <p className="hint">
            {/* Počet jamek je počet hraných, ne celého resortu - z 27 jamek se
                jich do kola dostane osmnáct. */}
            {course
              ? t('setup.courseHint', { count: playedHoles })
              : t('setup.noCourseHint')}
          </p>
        </section>

        {canUseNet && (
          <section className="section">
            <h2 className="section-title">{t('setup.handicaps')}</h2>

            <label className="switch">
              <input
                type="checkbox"
                checked={netScoring}
                onChange={(e) => setNetScoring(e.target.checked)}
              />
              <span>{t('setup.netScoring')}</span>
            </label>

            {netScoring && (
              <>
                <div className="segmented">
                  <button
                    type="button"
                    className={`segment${handicapMode === 'index' ? ' selected' : ''}`}
                    onClick={() => setHandicapMode('index')}
                    aria-pressed={handicapMode === 'index'}
                  >
                    {t('setup.handicapIndex')}
                  </button>
                  <button
                    type="button"
                    className={`segment${handicapMode === 'strokes' ? ' selected' : ''}`}
                    onClick={() => setHandicapMode('strokes')}
                    aria-pressed={handicapMode === 'strokes'}
                  >
                    {t('setup.handicapStrokes')}
                  </button>
                </div>

                <div className="name-list">
                  {Array.from({ length: playerCount }, (_, i) => {
                    const strokes = playingHandicapFor(i)
                    return (
                      <label key={i} className="field">
                        <span className="field-label">{displayName(i)}</span>
                        <span className="field-input">
                          <input
                            className="name-input value-input"
                            type="text"
                            inputMode="decimal"
                            value={handicapText[i] ?? ''}
                            onChange={(e) => updateHandicap(i, e.target.value)}
                            aria-label={t('setup.handicapFor', { name: displayName(i) })}
                          />
                          <span className="field-suffix">
                            {strokes === undefined
                              ? t('setup.noHandicap')
                              : t('setup.strokesGiven', { count: strokes })}
                          </span>
                        </span>
                      </label>
                    )
                  })}
                </div>

                <p className="hint">
                  {handicapMode === 'index' && playedTee?.slopeRating !== undefined
                    ? t('setup.handicapHintRated', {
                        tee: localizedTeeName(playedTee.id, playedTee.name),
                        cr: playedTee.courseRating ?? 0,
                        sr: playedTee.slopeRating,
                      })
                    : t('setup.handicapHintPlain')}
                </p>
              </>
            )}
          </section>
        )}

        <section className="section">
          <h2 className="section-title">{t('setup.holeCount')}</h2>
          {/* Se zvoleným hřištěm se nevybírá počet jamek, ale která jeho část
              se hraje - pary i stroke indexy se pak berou z ní. */}
          {course && requiresLoops ? (
            <>
              <div className="loop-options" role="group" aria-label={t('setup.loops')}>
                {loops.map((loop) => {
                  const order = selection.flatMap((id, index) =>
                    id === loop.id ? [index + 1] : [],
                  )
                  return (
                    <button
                      key={loop.id}
                      type="button"
                      className={`loop-option${order.length > 0 ? ' selected' : ''}`}
                      onClick={() => addLoop(loop)}
                      aria-pressed={order.length > 0}
                    >
                      <span className="loop-option-name">{loopLabel(loop)}</span>
                      <span className="loop-option-meta">
                        {order.length > 0
                          ? t('setup.loopOrder', { order: order.join(', ') })
                          : t('picker.holes', { count: loop.holeCount })}
                      </span>
                    </button>
                  )
                })}
              </div>
              <p className="hint">
                {t('setup.loopSelection', {
                  loops: layoutName ?? '',
                  count: playedHoles,
                })}
              </p>
              <p className="hint">{t('setup.loopsHint')}</p>
            </>
          ) : course && loops.length > 0 ? (
            <>
              <div className="segmented">
                {[[] as string[], ...loops.map((loop) => [loop.id])].map((option) => {
                  const selected = option.join() === selection.join()
                  const loop = loops.find((candidate) => candidate.id === option[0])
                  return (
                    <button
                      key={option.join() || 'full'}
                      type="button"
                      className={`segment${selected ? ' selected' : ''}`}
                      onClick={() => setLoopIds(option)}
                      aria-pressed={selected}
                    >
                      {loop ? loopLabel(loop) : t('setup.holesAll')}
                    </button>
                  )
                })}
              </div>
              <p className="hint">{t('setup.holeRangeHint')}</p>
            </>
          ) : course ? (
            <p className="hint">
              {t('setup.holeCountFromCourse')} {t('picker.holes', { count: playedHoles })}
            </p>
          ) : (
            <>
              <div className="segmented">
                {HOLE_OPTIONS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={`segment${count === playedHoles ? ' selected' : ''}`}
                    onClick={() => setHoleCount(count)}
                    aria-pressed={count === playedHoles}
                  >
                    {count}
                  </button>
                ))}
              </div>
              <p className="hint">{t('setup.holeCountHint')}</p>
            </>
          )}
        </section>

        <div className="link-row">
          <button type="button" className="link-button" onClick={onOpenArchive}>
            {archiveCount > 0
              ? t('setup.archiveWithCount', { count: archiveCount })
              : t('setup.archive')}
          </button>
          <button type="button" className="link-button" onClick={onOpenBackup}>
            {t('setup.backup')}
          </button>
          {/* Odkaz je vidět vždycky. I když cloud není nastavený, uživatel se
              aspoň dozví proč - mlčky schovaná funkce se nedá diagnostikovat. */}
          <button type="button" className="link-button" onClick={onOpenAccount}>
            {account ? t('setup.account') : t('setup.signIn')}
          </button>
        </div>

        {showInstall && (
          <section className="pwa-install">
            <button
              type="button"
              className="link-button pwa-install-button"
              onClick={() => void installApp()}
            >
              {t('setup.installApp')}
            </button>
            <p className="hint pwa-install-benefit">{t('setup.installAppBenefit')}</p>
            {installHelp && (
              <div className="pwa-install-help" role="status">
                <strong>
                  {t(isIOS ? 'setup.installIosTitle' : 'setup.installBrowserTitle')}
                </strong>
                <p>{t(isIOS ? 'setup.installIosHint' : 'setup.installBrowserHint')}</p>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => setInstallHelp(false)}
                >
                  {t('setup.installClose')}
                </button>
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="app-footer">
        <button type="button" className="primary-button" onClick={start}>
          {t('setup.start')}
        </button>
        <p className="version">
          {t('common.version', { version: APP_VERSION })}
          {status === 'synced' && ` · ${t('setup.syncedShort')}`}
          {status === 'syncing' && ` · ${t('setup.syncingShort')}`}
          {status === 'offline' && ` · ${t('setup.offlineShort')}`}
        </p>
      </footer>
    </div>
  )
}
