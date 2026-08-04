import type { Player, Round, ScoreCategory } from '../types'
import {
  parAt,
  scoreAt,
  scoreCategory,
  scorecardPlayers,
  strokeTotal,
  teamName,
} from '../types'
import type { ScorecardColumn, ScorecardPlayerCell, ScorecardPlayerTotal } from '../games'
import { getGame } from '../games'
import { isNetRound, roundStrokeIndex } from '../handicap'
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
}: {
  score: number | null
  par: number
  decoration?: ScorecardPlayerCell
}) {
  return (
    <span className="scorecard-player-cell">
      <span className={`mark ${score === null ? 'empty' : scoreCategory(score, par)}`}>
        {score ?? '–'}
      </span>
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

export default function Scorecard({ round }: { round: Round }) {
  const t = useT()
  const game = getGame(round.gameId)
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

  return (
    <section className="section">
      <h2 className="section-title">Scorecard</h2>
      <div className="scorecard-wrap">
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
              <tr key={hole}>
                <th scope="row">{hole + 1}</th>
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
                    return (
                      <td
                        key={column.player.id}
                        className={`${playerColumnClass(column.playerIndex)}${
                          decoration?.skin ? ' skin-awarded' : ''
                        }`}
                        aria-label={decoration?.skin?.ariaLabel}
                        title={decoration?.skin?.ariaLabel}
                      >
                        <ScoreCell
                          score={scoreAt(round, column.player.id, hole)}
                          par={parAt(round, hole)}
                          decoration={decoration}
                        />
                      </td>
                    )
                  }

                  return (
                    <td
                      key={column.column.id}
                      className={`${extraColumnClass(column.column, playerIndexes)}${
                        column.column.cell(round, hole) ? '' : ' empty'
                      }`}
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

      <ul className="legend">
        {LEGEND_EXAMPLES.map(([category, example]) => (
          <li key={category}>
            <span className={`mark ${category}`}>{example}</span>
            {t(dynamicKey('score', category))}
          </li>
        ))}
      </ul>
    </section>
  )
}
