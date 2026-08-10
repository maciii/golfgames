import type { Course } from '../courses/types'
import { getGame } from '../games'
import { playerCourseHandicap } from '../handicap'
import { loadGameOptions, saveSettings } from '../storage'
import type {
  Currency,
  CreateRoundOptions,
  RoundCourse,
  RoundSettings,
  RoundTee,
} from '../types'
import { DEFAULT_POINT_VALUE } from '../types'
import { useAccount } from '../sync/AccountContext'
import { useT } from '../i18n'
import { resolveCourseSetup } from './setupCourse'
import { APP_VERSION } from '../version'

const CURRENCIES: Currency[] = ['CZK', 'EUR']
const CURRENCY_LABEL: Record<Currency, string> = { CZK: 'Kč', EUR: '€' }

interface Props {
  courses: Course[]
  courseId: string
  loopIds: string[]
  secondNineId: string | undefined
  teeId: string
  playerTeeIds: string[]
  gameId: string
  playerCount: number
  names: string[]
  pairing: number
  netScoring: boolean
  handicapMode: 'index' | 'strokes'
  handicapText: string[]
  settings: RoundSettings
  onSettingsChange: (value: RoundSettings) => void
  pointValueText: string
  onPointValueTextChange: (value: string) => void
  onStart: (options: CreateRoundOptions) => void
  onBack: () => void
}

/** Krok 5, poslední: sázka, nebo hra bez peněz - a samotné založení kola. */
export default function SetupBetScreen({
  courses,
  courseId,
  loopIds,
  secondNineId,
  teeId,
  playerTeeIds,
  gameId,
  playerCount,
  names,
  pairing,
  netScoring,
  handicapMode,
  handicapText,
  settings,
  onSettingsChange,
  pointValueText,
  onPointValueTextChange,
  onStart,
  onBack,
}: Props) {
  const t = useT()
  const { status } = useAccount()
  const noBet = settings.pointValue <= 0

  const setup = resolveCourseSetup(courses, courseId, loopIds, secondNineId, teeId, 18, t)
  const { baseCourse, secondNine, course, layout, playedHoles, playedTee, layoutName } =
    setup

  const game = getGame(gameId)
  const usesTeams = game.usesTeams(playerCount)

  /**
   * Přepnutí měny nastaví obvyklou sázku dané měny, ale jen dokud si ji
   * uživatel sám nepřepsal - jinak by mu překlik smazal zadanou hodnotu.
   */
  function selectCurrency(currency: Currency) {
    const untouched = settings.pointValue === DEFAULT_POINT_VALUE[settings.currency]
    if (!untouched) {
      onSettingsChange({ ...settings, currency })
      return
    }
    const pointValue = DEFAULT_POINT_VALUE[currency]
    onSettingsChange({ ...settings, currency, pointValue })
    onPointValueTextChange(`${pointValue}`)
  }

  function updatePointValue(text: string) {
    onPointValueTextChange(text)
    const parsed = Number.parseFloat(text.replace(',', '.'))
    onSettingsChange({
      ...settings,
      pointValue: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
    })
  }

  function toggleNoBet(checked: boolean) {
    if (checked) {
      onSettingsChange({ ...settings, pointValue: 0 })
      return
    }
    const restored = DEFAULT_POINT_VALUE[settings.currency]
    onSettingsChange({ ...settings, pointValue: restored })
    onPointValueTextChange(`${restored}`)
  }

  /** Zadaná hodnota u hráče; prázdné pole znamená "hraje bez handicapu". */
  function handicapValue(index: number): number | undefined {
    const raw = handicapText[index] ?? ''
    if (!raw.trim()) return undefined
    const value = Number.parseFloat(raw.replace(',', '.'))
    return Number.isFinite(value) ? value : undefined
  }

  function playerTeeId(index: number): string {
    const own = playerTeeIds[index] ?? ''
    if (own && setup.teeOptions.some((option) => option.id === own)) return own
    return setup.tee?.id ?? ''
  }

  function playingHandicapFor(index: number): number | undefined {
    const value = handicapValue(index)
    if (value === undefined) return undefined
    if (handicapMode === 'strokes') return Math.round(value)
    const teeForPlayer =
      course && layout
        ? resolveCourseSetup(
            courses,
            courseId,
            loopIds,
            secondNineId,
            playerTeeId(index),
            18,
            t,
          ).playedTee
        : undefined
    return playerCourseHandicap(value, teeForPlayer, playedHoles, layout?.par ?? 0)
  }

  function start() {
    const teamIndices = usesTeams
      ? playerCount === 4
        ? PAIRINGS[pairing]
        : [[0, 1]]
      : undefined
    const gameOptions = loadGameOptions(gameId)
    const effective: RoundSettings = {
      ...settings,
      options: {
        ...gameOptions,
        doubleClosingHoles: game.supportsDoubleHoles && gameOptions.doubleClosingHoles,
      },
    }
    saveSettings(effective)

    const holePars = layout ? [...layout.pars] : []
    const roundPar =
      playedTee && playedTee.ratedHoles === playedHoles
        ? playedTee.par
        : (layout?.par ?? 0)

    const roundTees: RoundTee[] = course
      ? course.tees.map((option) => {
          const played = layout ? layoutTeeOf(option.id) : undefined
          return {
            id: option.id,
            name: option.name,
            ...(played?.courseRating !== undefined
              ? { courseRating: played.courseRating }
              : {}),
            ...(played?.slopeRating !== undefined
              ? { slopeRating: played.slopeRating }
              : {}),
            par:
              played && played.ratedHoles === playedHoles
                ? played.par
                : (layout?.par ?? 0),
            ...(played?.distance !== undefined ? { distance: played.distance } : {}),
          }
        })
      : []

    function layoutTeeOf(id: string) {
      return course && layout
        ? resolveCourseSetup(courses, courseId, loopIds, secondNineId, id, 18, t)
            .playedTee
        : undefined
    }

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
          ...(roundTees.length > 0 ? { tees: roundTees } : {}),
          ...(baseCourse && secondNine
            ? {
                composite: {
                  frontName: baseCourse.name,
                  backName: secondNine.name,
                  frontId: baseCourse.id,
                  backId: secondNine.id,
                },
              }
            : {}),
        }
      : undefined

    const indexes = Array.from({ length: playerCount }, (_, i) =>
      handicapMode === 'index' ? handicapValue(i) : undefined,
    )
    const strokes = Array.from({ length: playerCount }, (_, i) => playingHandicapFor(i))
    const tees = Array.from(
      { length: playerCount },
      (_, i) => playerTeeId(i) || undefined,
    )

    onStart({
      gameId,
      playerNames: names.slice(0, playerCount),
      holeCount: playedHoles,
      ...(setup.startHole > 1 ? { startHole: setup.startHole } : {}),
      teamIndices,
      settings: effective,
      ...(roundCourse ? { course: roundCourse, pars: holePars, playerTeeIds: tees } : {}),
      ...(netScoring
        ? { netScoring: true, handicapIndexes: indexes, playingHandicaps: strokes }
        : {}),
    })
  }

  return (
    <div className="screen">
      <header className="app-header">
        <button type="button" className="link-button" onClick={onBack}>
          {t('common.back')}
        </button>
        <h1>{t('setup.stake')}</h1>
        <p className="subtitle">{t('setup.subtitle')}</p>
      </header>

      <main className="content">
        <section className="section">
          <label className="switch">
            <input
              type="checkbox"
              checked={noBet}
              onChange={(e) => toggleNoBet(e.target.checked)}
            />
            <span>{t('setup.noBet')}</span>
          </label>

          {!noBet && (
            <>
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
                  <span className="field-suffix">
                    {CURRENCY_LABEL[settings.currency]}
                  </span>
                </span>
              </label>

              <p className="hint">{t('setup.stakeHint')}</p>
            </>
          )}

          {noBet && <p className="hint">{t('setup.noBetHint')}</p>}
        </section>
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
