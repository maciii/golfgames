import { useState } from 'react'
import type { Course } from '../courses/types'
import { layoutTee } from '../courses/layout'
import type { RosterEntry } from '../storage'
import { loadRoster, removeFromRoster } from '../storage'
import {
  formatHandicapIndex,
  parseHandicapIndex,
  playerCourseHandicap,
} from '../handicap'
import { localizedTeeName, useT } from '../i18n'
import { StarIcon, TeeFlagIcon } from './icons'
import TeeSheet, { teeColorClass, type TeeSheetRow } from './TeeSheet'
import { resolveCourseSetup } from './setupCourse'

const PLAYER_COUNT_OPTIONS = [1, 2, 3, 4]

interface Props {
  courses: Course[]
  courseId: string
  loopIds: string[]
  secondNineId: string | undefined
  /** Počet jamek zvolený v kroku odpališť; uplatní se jen u kola bez hřiště. */
  holeCount: number
  teeId: string
  playerCount: number
  onPlayerCountChange: (value: number) => void
  names: string[]
  onNameChange: (index: number, value: string) => void
  playerTeeIds: string[]
  onPlayerTeeIdChange: (index: number, value: string) => void
  onUseTeeForAll: (value: string) => void
  netScoring: boolean
  onNetScoringChange: (value: boolean) => void
  handicapMode: 'index' | 'strokes'
  onHandicapModeChange: (value: 'index' | 'strokes') => void
  handicapText: string[]
  onHandicapTextChange: (index: number, value: string) => void
  onBack: () => void
  onNext: () => void
}

/**
 * Krok 3 zakládání kola: kolik hráčů, jejich jména, odpaliště a handicapy.
 * Hra se vybírá až v dalším kroku - počet hráčů proto nabízí všechny čtyři
 * možnosti, ne jen ty, co podporuje aktuálně zvolená hra (ta se naopak
 * podle zvoleného počtu přefiltruje v kroku Hra).
 */
export default function SetupPlayersScreen({
  courses,
  courseId,
  loopIds,
  secondNineId,
  holeCount,
  teeId,
  playerCount,
  onPlayerCountChange,
  names,
  onNameChange,
  playerTeeIds,
  onPlayerTeeIdChange,
  onUseTeeForAll,
  netScoring,
  onNetScoringChange,
  handicapMode,
  onHandicapModeChange,
  handicapText,
  onHandicapTextChange,
  onBack,
  onNext,
}: Props) {
  const t = useT()
  const [roster, setRoster] = useState<RosterEntry[]>(() => loadRoster())
  const [rosterEditing, setRosterEditing] = useState(false)
  const [teeSheetFor, setTeeSheetFor] = useState<number | null>(null)

  const setup = resolveCourseSetup(
    courses,
    courseId,
    loopIds,
    secondNineId,
    teeId,
    holeCount,
    t,
  )
  const { course, layout, teeOptions, playedHoles, playedTee } = setup
  const canUseNet = course !== undefined

  const displayName = (index: number) =>
    names[index]?.trim() || t('common.player', { number: index + 1 })

  /** Odpaliště hráče; bez vlastní volby hraje z toho, co má celé kolo. */
  function playerTeeId(index: number): string {
    const own = playerTeeIds[index] ?? ''
    if (own && teeOptions.some((option) => option.id === own)) return own
    return setup.tee?.id ?? ''
  }

  /** Norma odpaliště hráče pro hrané jamky. */
  function playedTeeFor(index: number) {
    return course && layout ? layoutTee(course, layout, playerTeeId(index)) : undefined
  }

  /** Zadaná hodnota u hráče; prázdné pole znamená "hraje bez handicapu". */
  function handicapValue(index: number): number | undefined {
    return parseHandicapIndex(handicapText[index] ?? '')
  }

  function playingHandicapFor(index: number): number | undefined {
    const value = handicapValue(index)
    if (value === undefined) return undefined
    if (handicapMode === 'strokes') return Math.round(value)
    return playerCourseHandicap(value, playedTeeFor(index), playedHoles, layout?.par ?? 0)
  }

  function teeRowsFor(index: number): TeeSheetRow[] {
    const value = handicapValue(index)
    return teeOptions.map((option) => {
      const played = course && layout ? layoutTee(course, layout, option.id) : undefined
      const strokes =
        netScoring && handicapMode === 'index' && value !== undefined
          ? playerCourseHandicap(value, played, playedHoles, layout?.par ?? 0)
          : undefined
      return {
        id: option.id,
        name: option.name,
        ...(played?.distance !== undefined ? { distance: played.distance } : {}),
        ...(played?.courseRating !== undefined
          ? { courseRating: played.courseRating }
          : {}),
        ...(played?.slopeRating !== undefined ? { slopeRating: played.slopeRating } : {}),
        ...(strokes !== undefined ? { strokes } : {}),
      }
    })
  }

  /** Klepnutí na uloženého hráče doplní i jeho HCP index a odpaliště. */
  function useRosterEntry(entry: RosterEntry) {
    const slot = names.slice(0, playerCount).findIndex((name) => !name.trim())
    if (slot === -1) return
    onNameChange(slot, entry.name)
    if (entry.handicapIndex !== undefined) {
      onHandicapTextChange(slot, formatHandicapIndex(entry.handicapIndex))
    }
    const preferred = entry.preferredTeeId
    if (preferred && teeOptions.some((option) => option.id === preferred)) {
      onPlayerTeeIdChange(slot, preferred)
    }
  }

  function rosterLabel(entry: RosterEntry): string {
    const teeName = entry.preferredTeeId
      ? localizedTeeName(
          entry.preferredTeeId,
          teeOptions.find((option) => option.id === entry.preferredTeeId)?.name ??
            entry.preferredTeeId,
        )
      : undefined
    if (entry.handicapIndex !== undefined && teeName) {
      return t('setup.savedPlayerWithHandicapAndTee', {
        name: entry.name,
        handicap: formatHandicapIndex(entry.handicapIndex),
        tee: teeName,
      })
    }
    if (entry.handicapIndex !== undefined) {
      return t('setup.savedPlayerWithHandicap', {
        name: entry.name,
        handicap: formatHandicapIndex(entry.handicapIndex),
      })
    }
    if (teeName) return t('setup.savedPlayerWithTee', { name: entry.name, tee: teeName })
    return entry.name
  }

  function forgetPlayer(entry: RosterEntry) {
    setRoster(removeFromRoster(entry.id))
  }

  const used = new Set(
    names
      .slice(0, playerCount)
      .map((n) => n.trim().toLowerCase())
      .filter(Boolean),
  )
  const available = roster.filter((entry) => !used.has(entry.name.trim().toLowerCase()))
  const favoriteAvailable = available.filter((entry) => entry.favorite)

  return (
    <div className="screen">
      <header className="app-header">
        <button type="button" className="link-button" onClick={onBack}>
          {t('common.back')}
        </button>
        <h1>{t('setup.players')}</h1>
        <p className="subtitle">{t('setup.subtitle')}</p>
      </header>

      <main className="content">
        <section className="section">
          <div className="segmented">
            {PLAYER_COUNT_OPTIONS.map((count) => (
              <button
                key={count}
                type="button"
                className={`segment${count === playerCount ? ' selected' : ''}`}
                onClick={() => onPlayerCountChange(count)}
                aria-pressed={count === playerCount}
              >
                {count}
              </button>
            ))}
          </div>

          {favoriteAvailable.length > 0 && (
            <div className="favorite-players">
              <span className="roster-label">{t('home.favoritePlayers')}</span>
              <div className="chip-row">
                {favoriteAvailable.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="chip"
                    onClick={() => useRosterEntry(entry)}
                    aria-label={t('setup.addPlayer', { name: entry.name })}
                  >
                    <StarIcon />
                    {rosterLabel(entry)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="setup-player-list">
            {Array.from({ length: playerCount }, (_, i) => {
              const rowTeeId = playerTeeId(i)
              const rowTee = teeOptions.find((option) => option.id === rowTeeId)
              const strokes = playingHandicapFor(i)
              return (
                <div key={i} className="setup-player-row">
                  <div className="setup-player-main">
                    <input
                      className="name-input"
                      type="text"
                      inputMode="text"
                      autoComplete="off"
                      autoCapitalize="words"
                      placeholder={t('common.player', { number: i + 1 })}
                      value={names[i] ?? ''}
                      onChange={(e) => onNameChange(i, e.target.value)}
                    />
                    {teeOptions.length > 0 && (
                      <button
                        type="button"
                        className={`tee-dot tee-option-${teeColorClass(rowTeeId)}`}
                        onClick={() => setTeeSheetFor(i)}
                        aria-label={t('setup.playerTee', { name: displayName(i) })}
                        title={localizedTeeName(rowTeeId, rowTee?.name ?? rowTeeId)}
                      >
                        <TeeFlagIcon />
                      </button>
                    )}
                  </div>
                  {netScoring && (
                    <div className="setup-player-meta">
                      <input
                        className="name-input value-input setup-player-handicap"
                        type="text"
                        inputMode="decimal"
                        value={handicapText[i] ?? ''}
                        onChange={(e) => onHandicapTextChange(i, e.target.value)}
                        aria-label={t('setup.handicapFor', { name: displayName(i) })}
                      />
                      <span className="setup-player-strokes">
                        {strokes === undefined
                          ? t('setup.noHandicap')
                          : t('setup.strokesGiven', { count: strokes })}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
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
                    {rosterLabel(entry)}
                    {rosterEditing && <span className="chip-x">×</span>}
                  </button>
                ))}
                {!rosterEditing && available.length === 0 && (
                  <span className="hint">{t('setup.allPlayersUsed')}</span>
                )}
              </div>
            </div>
          )}

          {canUseNet && (
            <>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={netScoring}
                  onChange={(e) => onNetScoringChange(e.target.checked)}
                />
                <span>{t('setup.netScoring')}</span>
              </label>

              {netScoring && (
                <>
                  <div className="segmented">
                    <button
                      type="button"
                      className={`segment${handicapMode === 'index' ? ' selected' : ''}`}
                      onClick={() => onHandicapModeChange('index')}
                      aria-pressed={handicapMode === 'index'}
                    >
                      {t('setup.handicapIndex')}
                    </button>
                    <button
                      type="button"
                      className={`segment${handicapMode === 'strokes' ? ' selected' : ''}`}
                      onClick={() => onHandicapModeChange('strokes')}
                      aria-pressed={handicapMode === 'strokes'}
                    >
                      {t('setup.handicapStrokes')}
                    </button>
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
            </>
          )}
        </section>
      </main>

      {teeSheetFor !== null && course && (
        <TeeSheet
          playerName={displayName(teeSheetFor)}
          rows={teeRowsFor(teeSheetFor)}
          selectedId={playerTeeId(teeSheetFor)}
          onSelect={(nextTeeId) => onPlayerTeeIdChange(teeSheetFor, nextTeeId)}
          onUseForAll={(nextTeeId) => {
            onUseTeeForAll(nextTeeId)
            setTeeSheetFor(null)
          }}
          onClose={() => setTeeSheetFor(null)}
        />
      )}

      <footer className="app-footer">
        <button type="button" className="primary-button" onClick={onNext}>
          {t('setup.next')}
        </button>
      </footer>
    </div>
  )
}
