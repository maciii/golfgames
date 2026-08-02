import { useRef, useState } from 'react'
import type { BonusId, Player, PlayerId, Round } from '../types'
import {
  MAX_STROKES,
  bonusesAt,
  formatHoleList,
  getBonus,
  playerBonusPoints,
  formatToPar,
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
import BonusSheet from './BonusSheet'

const PAR_OPTIONS = [3, 4, 5]

/** Jak dlouho se drží číslo, než se zápis smaže. */
const LONG_PRESS_MS = 500

interface Props {
  round: Round
  onSetScore: (playerId: PlayerId, hole: number, value: number | null) => void
  onToggleBonus: (playerId: PlayerId, hole: number, bonusId: BonusId) => void
  onSetPar: (hole: number, par: number) => void
  onGoToHole: (hole: number) => void
  onFinish: () => void
  onShowResults: () => void
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
  onGoToHole,
  onFinish,
  onShowResults,
}: Props) {
  // Na dotyku běží vždy jen jedno přidržení, takže stačí jeden ref pro celou
  // obrazovku.
  const longPress = useRef<{ timer: number | null; fired: boolean }>({
    timer: null,
    fired: false,
  })
  // Hráč, pro kterého je otevřený výběr extra bodů.
  const [bonusFor, setBonusFor] = useState<Player | null>(null)
  const game = getGame(round.gameId)
  const hole = round.currentHole
  const par = parAt(round, hole)
  const isLastHole = hole === round.holeCount - 1
  const holeDone = isHoleComplete(round, hole)
  // Ukončit jde jen kolo, ve kterém se aspoň něco zapsalo.
  const anyScore = round.players.some((p) => holesPlayed(round, p.id) > 0)
  const summaries = game.holeSummary?.(round, hole) ?? []
  // Shrnutí, které nepatří konkrétní dvojici, ale celé jamce (Skins, singles).
  const gameSummary = summaries.find((s) => s.id === '_game')

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

    const lines = ['Kolo není kompletní.', '']
    if (conceded.length > 0) {
      lines.push(
        `Chybí zápis na jamkách ${formatHoleList(conceded)} – budou se počítat jako vzdané.`,
      )
    }
    if (unplayed.length > 0) {
      lines.push(`Nehrané jamky ${formatHoleList(unplayed)} se do výsledku nezapočítají.`)
    }
    lines.push('', 'Uložit kolo i tak?')

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
    // Longest a Nearest jsou vidět písmenem přímo u hráče.
    const marks = bonuses.map((id) => getBonus(id)?.mark).filter(Boolean)

    return (
      <li key={player.id} className="player-row">
        <div className="player-info">
          <span className="player-name">
            {player.name}
            {marks.map((mark) => (
              <span key={mark} className="player-mark">
                {mark}
              </span>
            ))}
          </span>
          <span className="player-total">
            {played === 0
              ? 'zatím bez zápisu'
              : `${strokeTotal(round, player.id)} ran · ${formatToPar(toPar)}`}
          </span>
        </div>
        <button
          type="button"
          className={`bonus-button${bonuses.length > 0 ? ' active' : ''}`}
          onClick={() => setBonusFor(player)}
          aria-label={`${player.name}: extra body`}
        >
          {bonuses.length > 0 ? (bonusPoints > 0 ? bonusPoints : '•') : '★'}
        </button>
        <div className="stepper">
          <button
            type="button"
            className="step-button"
            onClick={() => adjust(player.id, -1)}
            aria-label={`${player.name}: ubrat ránu, z prázdné buňky birdie`}
          >
            −
          </button>
          <button
            type="button"
            className="score-value"
            onClick={() => handleScoreTap(player.id)}
            onPointerDown={() => startLongPress(player.id)}
            onPointerUp={cancelLongPress}
            onPointerLeave={cancelLongPress}
            onPointerCancel={cancelLongPress}
            onContextMenu={(e) => e.preventDefault()}
            aria-label={`${player.name}: zapsat par, přidržením smazat zápis`}
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
            aria-label={`${player.name}: přidat ránu, z prázdné buňky bogey`}
          >
            +
          </button>
        </div>
      </li>
    )
  }

  return (
    <div className="screen">
      <header className="app-header hole-header">
        <button
          type="button"
          className="nav-arrow"
          onClick={() => onGoToHole(hole - 1)}
          disabled={hole === 0}
          aria-label="Předchozí jamka"
        >
          ‹
        </button>
        <div className="hole-title">
          <span className="hole-number">Jamka {hole + 1}</span>
          <span className="hole-of">z {round.holeCount}</span>
        </div>
        <button
          type="button"
          className="nav-arrow"
          onClick={() => onGoToHole(hole + 1)}
          disabled={isLastHole}
          aria-label="Další jamka"
        >
          ›
        </button>
      </header>

      <main className="content">
        <div className="par-row">
          <span className="par-label">Par</span>
          <div className="segmented compact">
            {PAR_OPTIONS.map((value) => (
              <button
                key={value}
                type="button"
                className={`segment${value === par ? ' selected' : ''}`}
                onClick={() => onSetPar(hole, value)}
                aria-pressed={value === par}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

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

        <p className="hint">
          Klepnutím doprostřed zapíšeš par ({par}), tlačítkem − birdie a tlačítkem +
          bogey. Přidržením čísla zápis smažeš.
        </p>

        <div className="link-row">
          <button type="button" className="link-button" onClick={onShowResults}>
            Průběžné výsledky
          </button>
          {/* Kolo může skončit kdykoli - třeba když přijde bouřka. */}
          {!isLastHole && anyScore && (
            <button type="button" className="link-button" onClick={finish}>
              Ukončit kolo
            </button>
          )}
        </div>
      </main>

      <footer className="app-footer">
        {isLastHole ? (
          <button type="button" className="primary-button" onClick={finish}>
            Ukončit a uložit kolo
          </button>
        ) : (
          <button
            type="button"
            className="primary-button"
            onClick={() => onGoToHole(hole + 1)}
          >
            {holeDone ? 'Další jamka' : 'Přeskočit na další'}
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
