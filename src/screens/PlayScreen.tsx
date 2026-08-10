import { useEffect, useRef, useState } from 'react'
import type { BonusId, Player, PlayerId, Round } from '../types'
import {
  MAX_STROKES,
  bonusesAt,
  formatHoleList,
  getBonus,
  playerBonusPoints,
  formatToPar,
  holeNumber,
  holesPlayed,
  isHoleComplete,
  parAt,
  parForPlayedHoles,
  roundCompleteness,
  scoreAt,
  scoreCategory,
  strokeTotal,
  teamName,
  teamPlayers,
} from '../types'
import { getGame } from '../games'
import type { HoleSetup, HoleSetupSelection } from '../games'
import { exclusiveBonusOutcome, strokesReceived } from '../handicap'
import BonusSheet from './BonusSheet'
import Scorecard from './Scorecard'
import { useT } from '../i18n'

const PAR_OPTIONS = [3, 4, 5, 6]

/** Jak dlouho se drží číslo, než se zápis smaže. */
const LONG_PRESS_MS = 500
const MOBILE_LANDSCAPE_QUERY =
  '(orientation: landscape) and (pointer: coarse) and (max-height: 600px)'

/** Na desktopu zůstává zápis skóre vždy viditelný, i když je okno široké. */
function useMobileLandscape(): boolean {
  const [matches, setMatches] = useState(
    () => window.matchMedia(MOBILE_LANDSCAPE_QUERY).matches,
  )

  useEffect(() => {
    const media = window.matchMedia(MOBILE_LANDSCAPE_QUERY)
    const onChange = () => setMatches(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return matches
}

interface Props {
  round: Round
  onSetScore: (playerId: PlayerId, hole: number, value: number | null) => void
  onToggleBonus: (playerId: PlayerId, hole: number, bonusId: BonusId) => void
  onSetPar: (hole: number, par: number) => void
  onSetHoleSetup: (hole: number, selection: HoleSetupSelection) => void
  onGoToHole: (hole: number) => void
  onFinish: () => void
  onShowResults: () => void
  onOpenAccount: () => void
}

/**
 * Zápis skóre po jamkách.
 *
 * Ovládání je stavěné na hraní jednou rukou: velká tlačítka −/+, žádné
 * klávesnice a průběžný stav rovnou u zapisované jamky.
 */
export default function PlayScreen({
  round,
  onSetScore,
  onToggleBonus,
  onSetPar,
  onSetHoleSetup,
  onGoToHole,
  onFinish,
  onShowResults,
  onOpenAccount,
}: Props) {
  const t = useT()
  // Na dotyku běží vždy jen jedno přidržení, takže stačí jeden ref pro celou
  // obrazovku.
  const longPress = useRef<{ timer: number | null; fired: boolean }>({
    timer: null,
    fired: false,
  })
  // Hráč, pro kterého je otevřený výběr extra bodů.
  const [bonusFor, setBonusFor] = useState<Player | null>(null)
  const showLandscapeScorecard = useMobileLandscape()
  const game = getGame(round.gameId)
  const hole = round.currentHole
  const par = parAt(round, hole)
  const isLastHole = hole === round.holeCount - 1
  const holeDone = isHoleComplete(round, hole)
  // Ukončit jde jen kolo, ve kterém se aspoň něco zapsalo.
  const anyScore = round.players.some((p) => holesPlayed(round, p.id) > 0)
  const summaries = game.holeSummary?.(round, hole) ?? []
  const headerSummary = game.headerSummary?.(round, hole)
  const holeSetup: HoleSetup | undefined = game.holeSetup?.(round, hole)
  const scoreEntryEnabled = holeSetup?.complete ?? true
  const hasBonusOptions = game.scoringOptions.bonusIds.length > 0
  // Shrnutí, které nepatří konkrétní dvojici, ale celé jamce (Skins, singles).
  const gameSummary = summaries.find((s) => s.id === '_game')

  useEffect(() => {
    // Výběr bonusu by v přehledu překryl scorekartu a nejde v něm pokračovat
    // bez návratu k ovládání zápisu.
    if (showLandscapeScorecard) setBonusFor(null)
  }, [showLandscapeScorecard])

  /**
   * Z prázdné buňky zapíše "+" bogey a "−" birdie; par se vkládá klepnutím
   * doprostřed. Tři nejčastější výsledky jsou tak na jedno klepnutí.
   */
  function adjust(playerId: PlayerId, delta: number) {
    const current = scoreAt(round, playerId, hole)
    const next = current === null ? par + delta : current + delta
    onSetScore(playerId, hole, Math.max(1, Math.min(MAX_STROKES, next)))
  }

  /**
   * Přidržení čísla zápis smaže. Krátké klepnutí je obsazené vkládáním paru,
   * takže mazání potřebuje vlastní gesto.
   */
  function startLongPress(playerId: PlayerId) {
    cancelLongPress()
    longPress.current.fired = false
    longPress.current.timer = window.setTimeout(() => {
      longPress.current.fired = true
      onSetScore(playerId, hole, null)
    }, LONG_PRESS_MS)
  }

  function cancelLongPress() {
    if (longPress.current.timer !== null) {
      clearTimeout(longPress.current.timer)
      longPress.current.timer = null
    }
  }

  /**
   * Ukončení kola. Kolo se dá uložit i nedohrané (třeba když hru ukončí
   * počasí), ale ne omylem - chybějící zápisy se nejdřív vypíšou a rozliší
   * se přitom vzdané jamky od těch, na které se vůbec nedošlo.
   */
  function finish() {
    const { conceded, unplayed, complete } = roundCompleteness(round)
    if (complete) {
      onFinish()
      return
    }

    const lines = [t('play.incompleteTitle'), '']
    if (conceded.length > 0) {
      lines.push(t('play.incompleteConceded', { holes: formatHoleList(conceded) }))
    }
    if (unplayed.length > 0) {
      lines.push(t('play.incompleteUnplayed', { holes: formatHoleList(unplayed) }))
    }
    lines.push('', t('play.incompleteConfirm'))

    if (confirm(lines.join('\n'))) onFinish()
  }

  function handleScoreTap(playerId: PlayerId) {
    // Po smazání přidržením nesmí doběhlý click zapsat par zpátky.
    if (longPress.current.fired) {
      longPress.current.fired = false
      return
    }
    onSetScore(playerId, hole, par)
  }

  function renderPlayer(player: Player) {
    const score = scoreAt(round, player.id, hole)
    const played = holesPlayed(round, player.id)
    const toPar = strokeTotal(round, player.id) - parForPlayedHoles(round, player.id)
    const bonuses = bonusesAt(round, player.id, hole)
    const bonusPoints = playerBonusPoints(round, player.id, hole)
    /**
     * Značky u jména: L / N pro Longest a Nearest, ×2 pro double. U prvních
     * dvou barva říká, komu bonus připadne - zeleně své dvojici, červeně
     * soupeřům, neutrálně dokud hráč jamku nezapsal.
     */
    const marks = bonuses.flatMap((id) => {
      const bonus = getBonus(id)
      if (!bonus?.mark) return []
      const tone = bonus.exclusive
        ? exclusiveBonusOutcome(round, player.id, hole, id)
        : 'multiplier'
      return [{ key: id, text: bonus.mark, tone }]
    })

    /**
     * Co hráči vynesla právě zapisovaná jamka. U her jednotlivců to jinak není
     * kde vidět - týmové hry mají shrnutí v hlavičce dvojice, tady patří
     * rovnou k jménu. Celkový stav je nad tím v hlavičce jamky.
     */
    const holeGain = summaries.find((s) => s.id === player.id)

    return (
      <li key={player.id} className="player-row">
        <div className="player-info">
          <span className="player-name">
            {player.name}
            {marks.map((mark) => (
              <span key={mark.key} className={`player-mark ${mark.tone}`}>
                {mark.text}
              </span>
            ))}
            {holeGain?.entries.map((entry) => (
              <span
                key={entry.label}
                className={`player-mark gain${entry.highlight ? ' best' : ''}`}
                title={entry.label}
                aria-label={`${entry.label}: ${entry.value}`}
              >
                {entry.value}
              </span>
            ))}
            {/* Rány, které hráč na téhle jamce dostává. Bez toho není poznat,
                proč má za stejný počet ran jiný výsledek než soupeř. */}
            {strokesReceived(round, player.id, hole) > 0 && (
              <span
                className="player-mark strokes"
                title={t('play.strokesReceived', {
                  count: strokesReceived(round, player.id, hole),
                })}
              >
                {'•'.repeat(Math.min(3, strokesReceived(round, player.id, hole)))}
              </span>
            )}
          </span>
          <span className="player-total">
            {played === 0
              ? t('play.noScore')
              : t('play.total', {
                  strokes: strokeTotal(round, player.id),
                  toPar: formatToPar(toPar),
                })}
          </span>
        </div>
        {hasBonusOptions && scoreEntryEnabled && (
          <button
            type="button"
            className={`bonus-button${bonuses.length > 0 ? ' active' : ''}`}
            onClick={() => setBonusFor(player)}
            aria-label={t('play.bonusesFor', { name: player.name })}
          >
            {bonuses.length > 0 ? (bonusPoints > 0 ? bonusPoints : '•') : '★'}
          </button>
        )}
        <div className="stepper">
          <button
            type="button"
            className="step-button"
            onClick={() => adjust(player.id, -1)}
            disabled={!scoreEntryEnabled}
            aria-label={t('play.minus', { name: player.name })}
          >
            −
          </button>
          <button
            type="button"
            className="score-value"
            onClick={() => handleScoreTap(player.id)}
            disabled={!scoreEntryEnabled}
            onPointerDown={() => startLongPress(player.id)}
            onPointerUp={cancelLongPress}
            onPointerLeave={cancelLongPress}
            onPointerCancel={cancelLongPress}
            onContextMenu={(e) => e.preventDefault()}
            aria-label={t('play.score', { name: player.name })}
          >
            {/* Stejná značka jako ve scorekartě, ať je barva výsledku
                poznat už při zápisu. */}
            <span
              className={`mark large ${score === null ? 'empty' : scoreCategory(score, par)}`}
            >
              {score ?? '–'}
            </span>
          </button>
          <button
            type="button"
            className="step-button"
            onClick={() => adjust(player.id, 1)}
            disabled={!scoreEntryEnabled}
            aria-label={t('play.plus', { name: player.name })}
          >
            +
          </button>
        </div>
      </li>
    )
  }

  if (showLandscapeScorecard && scoreEntryEnabled) {
    return (
      <div className="landscape-scorecard">
        <Scorecard round={round} mode="live" />
      </div>
    )
  }

  return (
    <div className="screen">
      <header
        className={`app-header hole-header${
          headerSummary?.tone === 'outOfPlay' ? ' out-of-play' : ''
        }`}
      >
        <div className="hole-nav">
          <button
            type="button"
            className="nav-arrow"
            onClick={() => onGoToHole(hole - 1)}
            disabled={hole === 0}
            aria-label={t('play.previousHole')}
          >
            ‹
          </button>
          <div className="hole-center">
            <div className="hole-title">
              <span
                className={`hole-number par-${par}`}
                aria-label={t('play.hole', { number: holeNumber(round, hole) })}
              >
                {holeNumber(round, hole)}
              </span>
            </div>
            {headerSummary && (
              <div className={`game-header-summary ${headerSummary.tone ?? 'normal'}`}>
                <div className="game-header-score">
                  {headerSummary.entries.map((entry, index) => (
                    <span
                      key={`${entry.label}-${index}`}
                      className={`game-header-entry${entry.highlight ? ' highlight' : ''}${
                        entry.tone ? ` ${entry.tone}` : ''
                      }`}
                    >
                      <span>{entry.label}</span>
                      <strong>{entry.value}</strong>
                    </span>
                  ))}
                </div>
                {headerSummary.note && (
                  <span className="game-header-note">{headerSummary.note}</span>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            className="nav-arrow"
            onClick={() => onGoToHole(hole + 1)}
            disabled={isLastHole}
            aria-label={t('play.nextHole')}
          >
            ›
          </button>
        </div>
      </header>

      <main className="content">
        <div className="par-row">
          <span className="par-label">{t('play.par')}</span>
          <div className="segmented compact">
            {PAR_OPTIONS.map((value) => (
              <button
                key={value}
                type="button"
                className={`segment${value === par ? ' selected' : ''}`}
                onClick={() => onSetPar(hole, value)}
                aria-pressed={value === par}
                disabled={round.course !== undefined}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        {holeSetup && (
          <section
            className={`hole-setup${holeSetup.complete ? ' complete' : ''}${
              holeSetup.choices ? ' choices-mode' : ''
            }`}
          >
            <div className="hole-setup-heading">
              <h2 className="section-title">{holeSetup.title}</h2>
              <p className="hint">{holeSetup.message}</p>
            </div>
            {holeSetup.choices ? (
              <div className="game-list hole-setup-choices">
                {holeSetup.choices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    className={`game-card${choice.selected ? ' selected' : ''}`}
                    onClick={() =>
                      onSetHoleSetup(hole, { kind: 'choice', choiceId: choice.id })
                    }
                    aria-pressed={choice.selected === true}
                  >
                    <span className="pairing-line">
                      {choice.pairing ? (
                        <>
                          <span>{choice.pairing.left}</span>
                          <span className="pairing-vs">{t('setup.versus')}</span>
                          <span>{choice.pairing.right}</span>
                        </>
                      ) : (
                        choice.label
                      )}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <ul className="hole-setup-list">
                {holeSetup.entries.map((entry) => (
                  <li key={entry.playerId} className="hole-setup-row">
                    <span className="hole-setup-name">{entry.name}</span>
                    <div className="segmented hole-setup-options">
                      {holeSetup.options.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className={`segment${
                            entry.selectedOptionId === option.id ? ' selected' : ''
                          }`}
                          onClick={() =>
                            onSetHoleSetup(hole, {
                              kind: 'entry',
                              playerId: entry.playerId,
                              optionId: option.id,
                            })
                          }
                          aria-pressed={entry.selectedOptionId === option.id}
                          aria-label={`${entry.name}: ${option.label}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {holeSetup.complete && (
              <div className="hole-setup-groups">
                {holeSetup.groups.map((group) => (
                  <span key={group.optionId} className="hole-setup-group">
                    <strong>{group.label}</strong>
                    <span>{group.playerNames.join(', ')}</span>
                  </span>
                ))}
              </div>
            )}
          </section>
        )}

        {gameSummary && (
          <div className="game-summary">
            {gameSummary.entries.map((entry) => (
              <span key={entry.label} className="team-metric">
                {entry.label} <strong>{entry.value}</strong>
              </span>
            ))}
          </div>
        )}

        {round.teams.length > 0 ? (
          round.teams.map((team) => {
            const summary = summaries.find((s) => s.id === team.id)
            return (
              <section
                key={team.id}
                className={`team-block${summary?.winner ? ' winning' : ''}`}
              >
                <div className="team-header">
                  <span className="team-name">{teamName(round, team)}</span>
                  {summary && (
                    <span className="team-summary">
                      {summary.entries.map((entry) => (
                        <span
                          key={entry.label}
                          className={`team-metric${entry.highlight ? ' highlight' : ''}`}
                        >
                          {entry.label} <strong>{entry.value}</strong>
                        </span>
                      ))}
                    </span>
                  )}
                </div>
                <ul className="player-list">
                  {teamPlayers(round, team).map(renderPlayer)}
                </ul>
              </section>
            )
          })
        ) : (
          <ul className="player-list">{round.players.map(renderPlayer)}</ul>
        )}

        <p className="hint">{t('play.hint', { par })}</p>

        <div className="link-row">
          <button type="button" className="link-button" onClick={onShowResults}>
            {t('play.standings')}
          </button>
          {/* Kolo může skončit kdykoli - třeba když přijde bouřka. */}
          {!isLastHole && anyScore && (
            <button type="button" className="link-button" onClick={finish}>
              {t('play.finish')}
            </button>
          )}
          <button type="button" className="link-button" onClick={onOpenAccount}>
            {t('play.account')}
          </button>
        </div>
      </main>

      <footer className="app-footer">
        {isLastHole ? (
          <button type="button" className="primary-button" onClick={finish}>
            {t('play.finishAndSave')}
          </button>
        ) : (
          <button
            type="button"
            className="primary-button"
            onClick={() => onGoToHole(hole + 1)}
          >
            {holeDone ? t('play.next') : t('play.skip')}
          </button>
        )}
      </footer>

      {bonusFor && (
        <BonusSheet
          round={round}
          playerName={bonusFor.name}
          hole={hole}
          selected={bonusesAt(round, bonusFor.id, hole)}
          onToggle={(bonusId) => onToggleBonus(bonusFor.id, hole, bonusId)}
          onClose={() => setBonusFor(null)}
        />
      )}
    </div>
  )
}
