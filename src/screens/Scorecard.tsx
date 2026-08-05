import { useEffect, useRef, useState } from 'react'
import type { Player, Round, ScoreCategory } from '../types'
import {
  holeNumber,
  parAt,
  scoreAt,
  scoreCategory,
  scorecardPlayers,
  strokeTotal,
  teamName,
} from '../types'
import type { ScorecardColumn, ScorecardPlayerCell, ScorecardPlayerTotal } from '../games'
import { getGame } from '../games'
import {
  isNetRound,
  roundStrokeIndex,
  strokesReceived,
  strokesRelativeToBest,
} from '../handicap'
import { dynamicKey, useT } from '../i18n'

/**
 * Scorekarta se značkami podle golfové konvence.
 *
 * Tvary i barvy vychází z toho, jak skóre zobrazují turnajové scorekarty:
 * podpar červeně v kroužku, nadpar modře ve čtverečku, eagle a Doble
 * s dvojitým orámováním. Par se nijak nezvýrazňuje.
 */

function ScoreCell({
  score,
  par,
  decoration,
  hcpDots,
}: {
  score: number | null
  par: number
  decoration?: ScorecardPlayerCell
  hcpDots?: { text: string; ariaLabel: string }
}) {
  return (
    <span className="scorecard-player-cell">
      <span className={`mark ${score === null ? 'empty' : scoreCategory(score, par)}`}>
        {score ?? '–'}
      </span>
      {hcpDots && (
        <span
          className="scorecard-hcp-dots"
          role="img"
          aria-label={hcpDots.ariaLabel}
          title={hcpDots.ariaLabel}
        >
          {hcpDots.text}
        </span>
      )}
      {decoration?.suffix && (
        <span
          className="scorecard-extra-suffix"
          role="img"
          aria-label={decoration.suffix.ariaLabel}
          title={decoration.suffix.ariaLabel}
        >
          {decoration.suffix.text}
        </span>
      )}
    </span>
  )
}

/** Ukázková rána pro každou kategorii v legendě (par 4). */
const LEGEND_EXAMPLES: [ScoreCategory, number][] = [
  ['eagle', 2],
  ['birdie', 3],
  ['par', 4],
  ['bogey', 5],
  ['double', 6],
  ['triple', 7],
]

/** Sloupec scorekarty: buď hráč, nebo vlastní sloupec hry (body, skiny). */
type Column =
  | { kind: 'player'; player: Player; playerIndex: number }
  | { kind: 'extra'; column: ScorecardColumn }

/**
 * Poskládá sloupce tak, aby vlastní sloupce hry stály za hráčem, ke kterému
 * patří (`afterPlayerId`); zbytek se přidá na konec.
 */
function buildColumns(round: Round, extras: ScorecardColumn[]): Column[] {
  const columns: Column[] = []
  for (const [playerIndex, player] of scorecardPlayers(round).entries()) {
    columns.push({ kind: 'player', player, playerIndex })
    for (const column of extras) {
      if (column.afterPlayerId === player.id) columns.push({ kind: 'extra', column })
    }
  }
  for (const column of extras) {
    if (!column.afterPlayerId) columns.push({ kind: 'extra', column })
  }
  return columns
}

function playerColumnClass(playerIndex: number): string {
  return `player-col ${playerColumnToneClass(playerIndex)}`
}

function playerColumnToneClass(playerIndex: number): string {
  return playerIndex % 2 === 0 ? 'player-col-a' : 'player-col-b'
}

function extraColumnClass(
  column: ScorecardColumn,
  playerIndexes: Map<string, number>,
): string {
  const playerIndex = column.afterPlayerId
    ? playerIndexes.get(column.afterPlayerId)
    : undefined
  return playerIndex === undefined
    ? 'extra-col'
    : `extra-col ${playerColumnToneClass(playerIndex)}`
}

interface Props {
  round: Round
  /** Živý náhled na šířku schová pomocné prvky a drží aktuální jamku na očích. */
  mode?: 'results' | 'live'
}

export default function Scorecard({ round, mode = 'results' }: Props) {
  const t = useT()
  const wrapRef = useRef<HTMLDivElement>(null)
  const currentHoleRef = useRef<HTMLTableRowElement>(null)
  const game = getGame(round.gameId)
  const showHcpDots = isNetRound(round)
  const [hcpDotsMode, setHcpDotsMode] = useState<'course' | 'best-player'>('best-player')
  const extras = game.scorecardColumns?.(round) ?? []
  const columns = buildColumns(round, extras)
  const playerTotals = new Map<string, ScorecardPlayerTotal>()
  if (game.scorecardPlayerTotal) {
    for (const player of scorecardPlayers(round)) {
      playerTotals.set(player.id, game.scorecardPlayerTotal(round, player.id))
    }
  }
  const playerIndexes = new Map(
    scorecardPlayers(round).map((player, playerIndex) => [player.id, playerIndex]),
  )
  const parTotal = round.pars.reduce((sum, p) => sum + p, 0)

  // Stroke index se ukazuje jen u netto kola - u hrubého je to sloupec navíc
  // s číslem, které na nic nemá vliv, a mřížka je na telefonu úzká.
  const showStrokeIndex = isNetRound(round)
  const strokeIndex = roundStrokeIndex(round)
  /** Kolik sloupců stojí před hráči: jamka, par a případně SI. */
  const leadingColumns = showStrokeIndex ? 3 : 2

  // Nadřazený řádek se jmény dvojic; každá zabírá své hráče i sloupec bodů.
  const teamGroups = round.teams.map((team) => ({
    name: teamName(round, team),
    span: columns.filter(
      (c) =>
        (c.kind === 'player' && team.playerIds.includes(c.player.id)) ||
        (c.kind === 'extra' &&
          c.column.afterPlayerId !== undefined &&
          team.playerIds.includes(c.column.afterPlayerId)),
    ).length,
  }))
  const groupedSpan = teamGroups.reduce((sum, g) => sum + g.span, 0)
  const ungrouped = columns.length - groupedSpan

  useEffect(() => {
    setHcpDotsMode('best-player')
  }, [round.id, showHcpDots])

  useEffect(() => {
    if (mode !== 'live') return

    const wrap = wrapRef.current
    const row = currentHoleRef.current
    if (!wrap || !row) return

    wrap.scrollTop = Math.max(
      0,
      row.offsetTop - (wrap.clientHeight - row.offsetHeight) / 2,
    )
  }, [mode, round.currentHole])

  return (
    <section
      className={`section scorecard-section${mode === 'live' ? ' scorecard-live' : ''}`}
    >
      {mode === 'results' && (
        <div className="scorecard-title-row">
          <h2 className="section-title">{t('scorecard.title')}</h2>
          {showHcpDots && (
            <div className="segmented scorecard-control">
              {[
                { id: 'course', label: t('scorecard.dotsCourse') },
                { id: 'best-player', label: t('scorecard.dotsBestPlayer') },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`segment${option.id === hcpDotsMode ? ' selected' : ''}`}
                  onClick={() => setHcpDotsMode(option.id as 'course' | 'best-player')}
                  aria-pressed={option.id === hcpDotsMode}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div ref={wrapRef} className="scorecard-wrap">
        <table className="scorecard">
          <thead>
            {teamGroups.length > 0 && (
              <tr className="group-row">
                <th scope="col" colSpan={leadingColumns} />
                {teamGroups.map((group) => (
                  <th key={group.name} scope="colgroup" colSpan={group.span}>
                    {group.name}
                  </th>
                ))}
                {ungrouped > 0 && <th scope="col" colSpan={ungrouped} />}
              </tr>
            )}
            <tr>
              {/* Sloupec jamek má zkratku, na plné slovo v mřížce není místo. */}
              <th scope="col">{t('scorecard.holeShort')}</th>
              <th scope="col">{t('scorecard.par')}</th>
              {showStrokeIndex && (
                <th scope="col" title={t('scorecard.strokeIndex')}>
                  {t('scorecard.strokeIndexShort')}
                </th>
              )}
              {columns.map((column) =>
                column.kind === 'player' ? (
                  <th
                    key={column.player.id}
                    scope="col"
                    className={playerColumnClass(column.playerIndex)}
                  >
                    {/* Dlouhá jména se zkrátí, ať se tabulka vejde na šířku. */}
                    <span className="col-name">{column.player.name}</span>
                  </th>
                ) : (
                  <th
                    key={column.column.id}
                    scope="col"
                    className={extraColumnClass(column.column, playerIndexes)}
                    aria-label={column.column.ariaLabel}
                    title={column.column.ariaLabel}
                  >
                    {column.column.label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: round.holeCount }, (_, hole) => (
              <tr
                key={hole}
                ref={
                  mode === 'live' && hole === round.currentHole
                    ? currentHoleRef
                    : undefined
                }
                className={
                  mode === 'live' && hole === round.currentHole
                    ? 'current-hole'
                    : undefined
                }
              >
                <th scope="row">{holeNumber(round, hole)}</th>
                <td className="par-cell">{parAt(round, hole)}</td>
                {showStrokeIndex && (
                  <td className="par-cell si-cell">{strokeIndex[hole] ?? hole + 1}</td>
                )}
                {columns.map((column) => {
                  if (column.kind === 'player') {
                    const decoration = game.scorecardPlayerCell?.(
                      round,
                      column.player.id,
                      hole,
                    )
                    const dotCount =
                      showHcpDots && hcpDotsMode === 'course'
                        ? strokesReceived(round, column.player.id, hole)
                        : showHcpDots
                          ? strokesRelativeToBest(round, column.player.id, hole)
                          : 0
                    const visibleDots = Math.max(0, dotCount)
                    const player = round.players.find(
                      (entry) => entry.id === column.player.id,
                    )
                    const hcpDots =
                      visibleDots > 0
                        ? {
                            text: '•'.repeat(visibleDots),
                            ariaLabel: t(
                              hcpDotsMode === 'course'
                                ? 'scorecard.dotsCourseAria'
                                : 'scorecard.dotsBestPlayerAria',
                              {
                                name: player?.name ?? column.player.id,
                                count: visibleDots,
                              },
                            ),
                          }
                        : undefined
                    const labels = [
                      decoration?.pairing?.ariaLabel,
                      decoration?.skin?.ariaLabel,
                    ].filter((label): label is string => Boolean(label))
                    const decorationLabel = labels.join(' · ')
                    return (
                      <td
                        key={column.player.id}
                        className={`${playerColumnClass(column.playerIndex)}${
                          decoration?.skin ? ' skin-awarded' : ''
                        }${decoration?.pairing ? ' pairing-marked' : ''}`}
                        aria-label={decorationLabel || undefined}
                        title={decorationLabel || undefined}
                      >
                        <ScoreCell
                          score={scoreAt(round, column.player.id, hole)}
                          par={parAt(round, hole)}
                          decoration={decoration}
                          hcpDots={hcpDots}
                        />
                      </td>
                    )
                  }

                  const pairingDecoration = column.column.afterPlayerId
                    ? game.scorecardPlayerCell?.(round, column.column.afterPlayerId, hole)
                    : undefined
                  return (
                    <td
                      key={column.column.id}
                      className={`${extraColumnClass(column.column, playerIndexes)}${
                        column.column.cell(round, hole) ? '' : ' empty'
                      }${pairingDecoration?.pairing ? ' pairing-marked-extra' : ''}`}
                      aria-label={pairingDecoration?.pairing?.ariaLabel}
                      title={pairingDecoration?.pairing?.ariaLabel}
                    >
                      {column.column.cell(round, hole) || '–'}
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
              {showStrokeIndex && <td className="par-cell si-cell" />}
              {columns.map((column) => {
                if (column.kind === 'player') {
                  return (
                    <td
                      key={column.player.id}
                      className={playerColumnClass(column.playerIndex)}
                    >
                      {strokeTotal(round, column.player.id)}
                    </td>
                  )
                }

                return (
                  <td
                    key={column.column.id}
                    className={extraColumnClass(column.column, playerIndexes)}
                  >
                    {column.column.total(round)}
                  </td>
                )
              })}
            </tr>
            {playerTotals.size > 0 && (
              <tr className="scorecard-game-total-row">
                <th
                  scope="row"
                  colSpan={leadingColumns}
                  className="scorecard-total-label"
                >
                  {t('scorecard.gameTotal')}
                </th>
                {columns.map((column) => {
                  if (column.kind === 'player') {
                    const total = playerTotals.get(column.player.id)
                    return (
                      <td
                        key={column.player.id}
                        className={playerColumnClass(column.playerIndex)}
                      >
                        {total && (
                          <span
                            className="scorecard-game-total-value"
                            role="img"
                            aria-label={total.ariaLabel}
                            title={total.ariaLabel}
                          >
                            {total.text}
                          </span>
                        )}
                      </td>
                    )
                  }

                  return (
                    <td
                      key={column.column.id}
                      className={extraColumnClass(column.column, playerIndexes)}
                    />
                  )
                })}
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      {mode === 'results' && (
        <ul className="legend">
          {LEGEND_EXAMPLES.map(([category, example]) => (
            <li key={category}>
              <span className={`mark ${category}`}>{example}</span>
              {t(dynamicKey('score', category))}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
