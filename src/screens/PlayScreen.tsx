import type { PlayerId, Round } from '../types'
import {
  holesPlayed,
  isHoleComplete,
  isRoundComplete,
  parAt,
  parForPlayedHoles,
  scoreAt,
  strokeTotal,
} from '../types'

const PAR_OPTIONS = [3, 4, 5]
const MAX_STROKES = 20

interface Props {
  round: Round
  onSetScore: (playerId: PlayerId, hole: number, value: number | null) => void
  onSetPar: (hole: number, par: number) => void
  onGoToHole: (hole: number) => void
  onFinish: () => void
  onShowResults: () => void
}

function formatToPar(toPar: number): string {
  if (toPar === 0) return 'E'
  return toPar > 0 ? `+${toPar}` : `${toPar}`
}

export default function PlayScreen({
  round,
  onSetScore,
  onSetPar,
  onGoToHole,
  onFinish,
  onShowResults,
}: Props) {
  const hole = round.currentHole
  const par = parAt(round, hole)
  const isLastHole = hole === round.holeCount - 1
  const holeDone = isHoleComplete(round, hole)
  const roundDone = isRoundComplete(round)

  function adjust(playerId: PlayerId, delta: number) {
    const current = scoreAt(round, playerId, hole)
    // Z prázdné buňky skáčeme rovnou na par - to je nejčastější zápis.
    const next = current === null ? par + (delta > 0 ? 0 : -1) : current + delta
    onSetScore(playerId, hole, Math.max(1, Math.min(MAX_STROKES, next)))
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

        <ul className="player-list">
          {round.players.map((player) => {
            const score = scoreAt(round, player.id, hole)
            const played = holesPlayed(round, player.id)
            const toPar = strokeTotal(round, player.id) - parForPlayedHoles(round, player.id)
            const diff = score === null ? null : score - par

            return (
              <li key={player.id} className="player-row">
                <div className="player-info">
                  <span className="player-name">{player.name}</span>
                  <span className="player-total">
                    {played === 0
                      ? 'zatím bez zápisu'
                      : `${strokeTotal(round, player.id)} ran · ${formatToPar(toPar)}`}
                  </span>
                </div>
                <div className="stepper">
                  <button
                    type="button"
                    className="step-button"
                    onClick={() => adjust(player.id, -1)}
                    aria-label={`${player.name}: ubrat ránu`}
                  >
                    −
                  </button>
                  <button
                    type="button"
                    className={`score-value${diff === null ? ' empty' : ''}${
                      diff !== null && diff < 0 ? ' under' : ''
                    }${diff !== null && diff > 0 ? ' over' : ''}`}
                    onClick={() => onSetScore(player.id, hole, null)}
                    aria-label={`${player.name}: smazat zápis`}
                  >
                    {score ?? '–'}
                  </button>
                  <button
                    type="button"
                    className="step-button"
                    onClick={() => adjust(player.id, 1)}
                    aria-label={`${player.name}: přidat ránu`}
                  >
                    +
                  </button>
                </div>
              </li>
            )
          })}
        </ul>

        <p className="hint">Klepnutím na číslo zápis smažeš.</p>

        <button type="button" className="link-button" onClick={onShowResults}>
          Průběžné výsledky
        </button>
      </main>

      <footer className="app-footer">
        {isLastHole ? (
          <button
            type="button"
            className="primary-button"
            onClick={onFinish}
            disabled={!roundDone}
          >
            {roundDone ? 'Ukončit kolo' : 'Doplň zbývající jamky'}
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
    </div>
  )
}
