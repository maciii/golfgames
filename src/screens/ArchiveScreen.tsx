import type { Round } from '../types'
import { formatRoundDate } from '../types'
import { getGame } from '../games'
import { APP_VERSION } from '../version'

interface Props {
  rounds: Round[]
  onOpen: (roundId: string) => void
  onDelete: (roundId: string) => void
  onBack: () => void
}

/** Jednořádkové shrnutí vítěze pro přehled v archivu. */
function winnerLine(round: Round): string {
  const sections = getGame(round.gameId).computeStandings(round)
  const rows = sections[0]?.rows ?? []
  const winners = rows.filter((r) => r.position === 1 && r.holesPlayed > 0)
  if (winners.length === 0) return 'bez výsledku'
  if (winners.length > 1) return `remíza: ${winners.map((w) => w.name).join(', ')}`
  const winner = winners[0]
  return winner ? `${winner.name} · ${winner.valueLabel}` : 'bez výsledku'
}

/** Archiv odehraných kol - seznam s možností otevřít detail nebo smazat. */
export default function ArchiveScreen({ rounds, onOpen, onDelete, onBack }: Props) {
  function confirmDelete(round: Round) {
    if (confirm(`Smazat kolo z ${formatRoundDate(round)} z archivu?`)) {
      onDelete(round.id)
    }
  }

  return (
    <div className="screen">
      <header className="app-header">
        <h1>Archiv</h1>
        <p className="subtitle">
          {rounds.length === 0
            ? 'Zatím žádné odehrané kolo'
            : `${rounds.length} odehraných kol`}
        </p>
      </header>

      <main className="content">
        {rounds.length === 0 ? (
          <p className="hint">
            Dohraná kola se sem ukládají sama, jakmile na poslední jamce klepneš na
            „Ukončit a uložit kolo“.
          </p>
        ) : (
          <ul className="archive-list">
            {rounds.map((round) => (
              <li key={round.id} className="archive-item">
                <button
                  type="button"
                  className="archive-open"
                  onClick={() => onOpen(round.id)}
                >
                  <span className="archive-top">
                    <span className="archive-game">{getGame(round.gameId).name}</span>
                    <span className="archive-date">{formatRoundDate(round)}</span>
                  </span>
                  <span className="archive-winner">{winnerLine(round)}</span>
                  <span className="archive-players">
                    {round.players.map((p) => p.name).join(', ')} · {round.holeCount}{' '}
                    jamek
                  </span>
                </button>
                <button
                  type="button"
                  className="archive-delete"
                  onClick={() => confirmDelete(round)}
                  aria-label={`Smazat kolo z ${formatRoundDate(round)}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      <footer className="app-footer">
        <button type="button" className="primary-button" onClick={onBack}>
          Zpět
        </button>
        <p className="version">verze {APP_VERSION}</p>
      </footer>
    </div>
  )
}
