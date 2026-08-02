import type { Round } from '../types'
import { formatRoundDate } from '../types'
import { getGame } from '../games'
import { formatMoney, settle, settlementSummary } from '../money'
import { APP_VERSION } from '../version'
import Scorecard from './Scorecard'

interface Props {
  round: Round
  /** Archivní kolo se jen prohlíží - nejde v něm pokračovat ani ho mazat. */
  readOnly?: boolean
  onResume?: () => void
  onNewRound?: () => void
  onOpenArchive?: () => void
  onBack?: () => void
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
  // Při jediném řádku není co poměřovat a pořadí by jen mátlo.
  const showPositions = sections.some((s) => s.rows.length > 1)

  // Peníze se počítají z hlavní tabulky hry - body, skiny i vyhrané jamky
  // fungují stejně. Bez sázky nebo bez soupeře se sekce nezobrazuje.
  const mainRows = sections[0]?.rows ?? []
  const settlement =
    round.settings.pointValue > 0 && mainRows.length > 1
      ? settle(
          mainRows.map((row) => ({ id: row.id, name: row.name, units: row.value })),
          round.settings.pointValue,
        )
      : []

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

        {settlement.length > 0 && (
          <section className="section">
            <h2 className="section-title">Vyrovnání</h2>
            <ul className="settlement">
              {settlement.map((row) => (
                <li key={row.id} className="settlement-row">
                  <span className="settlement-name">{row.name}</span>
                  <span
                    className={`settlement-amount${
                      row.amount > 0 ? ' wins' : row.amount < 0 ? ' owes' : ''
                    }`}
                  >
                    {formatMoney(row.amount, round.settings.currency)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="hint">
              {settlementSummary(settlement, round.settings.currency)} Bod je{' '}
              {formatMoney(round.settings.pointValue, round.settings.currency)}
              {round.settings.doubleClosingHoles && ', 9. a 18. jamka za dvojnásobek'}.
            </p>
          </section>
        )}

        <Scorecard round={round} />

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
