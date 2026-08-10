import type { Round } from '../types'
import { firstHoleNumber, formatRoundDate, holeNumber, roundCompleteness } from '../types'
import { getGame } from '../games'
import { t as translate, useT } from '../i18n'
import type { MessageKey } from '../i18n'
import { BackIcon } from './icons'

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
  if (winners.length === 0) return translate('archive.noResult')
  if (winners.length > 1) {
    return translate('archive.draw', { names: winners.map((w) => w.name).join(', ') })
  }
  const winner = winners[0]
  return winner ? `${winner.name} · ${winner.valueLabel}` : translate('archive.noResult')
}

/** Rozsah kola; u předčasně ukončených kol je vidět, kam se došlo. */
function playedHolesLabel(round: Round): string {
  const played = roundCompleteness(round).unplayed.length
  const done = round.holeCount - played
  const label =
    played === 0
      ? translate('archive.holes', { count: round.holeCount })
      : translate('archive.holesPartial', { done, total: round.holeCount })

  // U kola hraného ze zadní devítky by samotný počet jamek nerozlišil, která
  // půlka hřiště to byla.
  if (firstHoleNumber(round) === 1) return label
  const first = holeNumber(round, 0)
  const last = holeNumber(round, round.holeCount - 1)
  return `${label} (${first}–${last})`
}

function handicapModeLabel(round: Round): string {
  return translate(round.netScoring ? 'archive.netScoring' : 'archive.grossScoring')
}

/** Archiv odehraných kol - seznam s možností otevřít detail nebo smazat. */
export default function ArchiveScreen({ rounds, onOpen, onDelete, onBack }: Props) {
  const t = useT()

  function confirmDelete(round: Round) {
    if (confirm(t('archive.deleteConfirm', { date: formatRoundDate(round) }))) {
      onDelete(round.id)
    }
  }

  return (
    <div className="screen">
      <header className="app-header">
        <div className="screen-header-row">
          <button
            type="button"
            className="icon-button"
            onClick={onBack}
            aria-label={t('common.back')}
          >
            <BackIcon />
          </button>
          <h1>{t('archive.title')}</h1>
        </div>
        <p className="subtitle">
          {rounds.length === 0
            ? t('archive.empty')
            : t('archive.count', { count: rounds.length })}
        </p>
      </header>

      <main className="content">
        {rounds.length === 0 ? (
          <p className="hint">{t('archive.emptyHint')}</p>
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
                    <span className="archive-game">
                      {t(`games.${round.gameId}.name` as MessageKey)}
                    </span>
                    <span className="archive-date">{formatRoundDate(round)}</span>
                  </span>
                  <span className="archive-winner">{winnerLine(round)}</span>
                  <span className="archive-players">
                    {round.players.map((p) => p.name).join(', ')} ·{' '}
                    {handicapModeLabel(round)} · {playedHolesLabel(round)}
                  </span>
                </button>
                <button
                  type="button"
                  className="archive-delete"
                  onClick={() => confirmDelete(round)}
                  aria-label={t('archive.deleteLabel', {
                    date: formatRoundDate(round),
                  })}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
