import type { Round } from '../types'
import { formatRoundDate, parAt, scoreAt, strokeTotal } from '../types'
import { getGame } from '../games'
import { APP_VERSION } from '../version'

interface Props {
  round: Round
  /** Archivní kolo se jen prohlíží - nejde v něm pokračovat ani ho mazat. */
  readOnly?: boolean
  onResume?: () => void
  onNewRound?: () => void
  onOpenArchive?: () => void
  onBack?: () => void
}

/** Barevné odlišení birdie/bogey ve scorecardu. */
function scoreClass(score: number | null, par: number): string {
  if (score === null) return 'empty'
  if (score <= par - 2) return 'eagle'
  if (score < par) return 'under'
  if (score > par) return 'over'
  return ''
}

/** Výsledky kola: tabulky podle pravidel hry plus kompletní scorecard. */
export default function ResultsScreen({
  round,
  readOnly = false,
  onResume,
  onNewRound,
  onOpenArchive,
  onBack,
}: Props) {
  const game = getGame(round.gameId)
  const sections = game.computeStandings(round)
  const finished = Boolean(round.finishedAt)
  const parTotal = round.pars.reduce((sum, p) => sum + p, 0)
  // Při jediném řádku není co poměřovat a pořadí by jen mátlo.
  const showPositions = sections.some((s) => s.rows.length > 1)

  function newRound() {
    if (finished || confirm('Rozehrané kolo se smaže. Opravdu chceš začít nové?')) {
      onNewRound?.()
    }
  }

  return (
    <div className="screen">
      <header className="app-header">
        <h1>
          {readOnly ? 'Archivní kolo' : finished ? 'Výsledky' : 'Průběžné výsledky'}
        </h1>
        <p className="subtitle">
          {game.name} · {formatRoundDate(round)}
        </p>
      </header>

      <main className="content">
        {sections.map((section) => (
          <section key={section.id} className="section">
            <h2 className="section-title">{section.title}</h2>
            <ol className="standings">
              {section.rows.map((row) => (
                <li
                  key={row.id}
                  className={`standing${
                    showPositions && row.position === 1 ? ' leader' : ''
                  }`}
                >
                  {showPositions && <span className="position">{row.position}.</span>}
                  <span className="standing-name">
                    {row.name}
                    {row.detail && <span className="standing-detail">{row.detail}</span>}
                  </span>
                  <span className="standing-score">
                    <strong>{row.valueLabel}</strong>
                    {row.secondary && (
                      <span className="standing-secondary">{row.secondary}</span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
            {section.description && <p className="hint">{section.description}</p>}
          </section>
        ))}

        {!finished && !readOnly && (
          <p className="hint">Počítají se jen jamky, které už mají zápis.</p>
        )}

        <section className="section">
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
        </section>

        {!readOnly && onOpenArchive && (
          <button type="button" className="link-button" onClick={onOpenArchive}>
            Archiv odehraných kol
          </button>
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-row">
          {readOnly ? (
            <button type="button" className="primary-button" onClick={onBack}>
              Zpět do archivu
            </button>
          ) : (
            <>
              <button
                type="button"
                className={finished ? 'secondary-button' : 'primary-button'}
                onClick={onResume}
              >
                {finished ? 'Upravit skóre' : 'Zpět do hry'}
              </button>
              <button type="button" className="secondary-button" onClick={newRound}>
                Nové kolo
              </button>
            </>
          )}
        </div>
        <p className="version">verze {APP_VERSION}</p>
      </footer>
    </div>
  )
}
