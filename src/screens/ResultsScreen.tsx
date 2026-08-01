import type { Round } from '../types'
import { parAt, scoreAt, strokeTotal } from '../types'
import { getGame } from '../games'

interface Props {
  round: Round
  onResume: () => void
  onNewRound: () => void
}

function formatToPar(toPar: number): string {
  if (toPar === 0) return 'E'
  return toPar > 0 ? `+${toPar}` : `${toPar}`
}

/** Barevné odlišení birdie/bogey ve scorecardu. */
function scoreClass(score: number | null, par: number): string {
  if (score === null) return 'empty'
  if (score < par) return 'under'
  if (score > par) return 'over'
  return ''
}

export default function ResultsScreen({ round, onResume, onNewRound }: Props) {
  const game = getGame(round.gameId)
  const standings = game.computeStandings(round)
  const finished = Boolean(round.finishedAt)
  const parTotal = round.pars.reduce((sum, p) => sum + p, 0)

  function newRound() {
    if (
      finished ||
      confirm('Rozehrané kolo se smaže. Opravdu chceš začít nové?')
    ) {
      onNewRound()
    }
  }

  return (
    <div className="screen">
      <header className="app-header">
        <h1>{finished ? 'Výsledky' : 'Průběžné výsledky'}</h1>
        <p className="subtitle">{game.name}</p>
      </header>

      <main className="content">
        <ol className="standings">
          {standings.map((row) => (
            <li key={row.id} className={`standing${row.position === 1 ? ' leader' : ''}`}>
              <span className="position">{row.position}.</span>
              <span className="standing-name">
                {row.name}
                {row.detail && <span className="standing-detail">{row.detail}</span>}
              </span>
              <span className="standing-score">
                <strong>{row.strokes}</strong>
                <span className="standing-topar">{formatToPar(row.toPar)}</span>
              </span>
            </li>
          ))}
        </ol>
        {!finished && (
          <p className="hint">
            Pořadí se počítá jen z jamek, které už mají zápis.
          </p>
        )}

        <h2 className="section-title">Scorecard</h2>
        <div className="scorecard-wrap">
          <table className="scorecard">
            <thead>
              <tr>
                <th scope="col">J</th>
                <th scope="col">Par</th>
                {round.players.map((p) => (
                  <th key={p.id} scope="col">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: round.holeCount }, (_, hole) => (
                <tr key={hole}>
                  <th scope="row">{hole + 1}</th>
                  <td className="par-cell">{parAt(round, hole)}</td>
                  {round.players.map((p) => {
                    const score = scoreAt(round, p.id, hole)
                    return (
                      <td key={p.id} className={scoreClass(score, parAt(round, hole))}>
                        {score ?? '–'}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Σ</th>
                <td className="par-cell">{parTotal}</td>
                {round.players.map((p) => (
                  <td key={p.id}>{strokeTotal(round, p.id)}</td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </main>

      <footer className="app-footer footer-row">
        {!finished && (
          <button type="button" className="primary-button" onClick={onResume}>
            Zpět do hry
          </button>
        )}
        {finished && (
          <button type="button" className="secondary-button" onClick={onResume}>
            Upravit skóre
          </button>
        )}
        <button type="button" className="secondary-button" onClick={newRound}>
          Nové kolo
        </button>
      </footer>
    </div>
  )
}
