import type { Player, Round } from '../types'
import { parAt, scoreAt, scorecardPlayers, strokeTotal, teamName } from '../types'
import type { ScorecardColumn } from '../games'
import { getGame } from '../games'

/**
 * Scorekarta se značkami podle golfové konvence.
 *
 * Tvary i barvy vychází z toho, jak skóre zobrazují turnajové scorekarty:
 * podpar červeně v kroužku, nadpar modře ve čtverečku, eagle a dvojbogey
 * s dvojitým orámováním. Par se nijak nezvýrazňuje.
 */

/** Zařazení rány vůči paru do jedné z kategorií se značkou. */
function markClass(score: number, par: number): string {
  const diff = score - par
  if (diff <= -2) return 'eagle'
  if (diff === -1) return 'birdie'
  if (diff === 0) return 'par'
  if (diff === 1) return 'bogey'
  return 'double'
}

function ScoreCell({ score, par }: { score: number | null; par: number }) {
  if (score === null) return <span className="mark empty">–</span>
  return <span className={`mark ${markClass(score, par)}`}>{score}</span>
}

/** Sloupec scorekarty: buď hráč, nebo vlastní sloupec hry (body, skiny). */
type Column =
  { kind: 'player'; player: Player } | { kind: 'extra'; column: ScorecardColumn }

/**
 * Poskládá sloupce tak, aby vlastní sloupce hry stály za hráčem, ke kterému
 * patří (`afterPlayerId`); zbytek se přidá na konec.
 */
function buildColumns(round: Round, extras: ScorecardColumn[]): Column[] {
  const columns: Column[] = []
  for (const player of scorecardPlayers(round)) {
    columns.push({ kind: 'player', player })
    for (const column of extras) {
      if (column.afterPlayerId === player.id) columns.push({ kind: 'extra', column })
    }
  }
  for (const column of extras) {
    if (!column.afterPlayerId) columns.push({ kind: 'extra', column })
  }
  return columns
}

export default function Scorecard({ round }: { round: Round }) {
  const game = getGame(round.gameId)
  const extras = game.scorecardColumns?.(round) ?? []
  const columns = buildColumns(round, extras)
  const parTotal = round.pars.reduce((sum, p) => sum + p, 0)

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
                <th scope="col" colSpan={2} />
                {teamGroups.map((group) => (
                  <th key={group.name} scope="colgroup" colSpan={group.span}>
                    {group.name}
                  </th>
                ))}
                {ungrouped > 0 && <th scope="col" colSpan={ungrouped} />}
              </tr>
            )}
            <tr>
              <th scope="col">J</th>
              <th scope="col">Par</th>
              {columns.map((column) =>
                column.kind === 'player' ? (
                  <th key={column.player.id} scope="col">
                    {/* Dlouhá jména se zkrátí, ať se tabulka vejde na šířku. */}
                    <span className="col-name">{column.player.name}</span>
                  </th>
                ) : (
                  <th key={column.column.id} scope="col" className="extra-col">
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
                {columns.map((column) =>
                  column.kind === 'player' ? (
                    <td key={column.player.id}>
                      <ScoreCell
                        score={scoreAt(round, column.player.id, hole)}
                        par={parAt(round, hole)}
                      />
                    </td>
                  ) : (
                    <td
                      key={column.column.id}
                      className={`extra-col${column.column.cell(round, hole) ? '' : ' empty'}`}
                    >
                      {column.column.cell(round, hole) || '–'}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Σ</th>
              <td className="par-cell">{parTotal}</td>
              {columns.map((column) =>
                column.kind === 'player' ? (
                  <td key={column.player.id}>{strokeTotal(round, column.player.id)}</td>
                ) : (
                  <td key={column.column.id} className="extra-col">
                    {column.column.total(round)}
                  </td>
                ),
              )}
            </tr>
          </tfoot>
        </table>
      </div>

      <ul className="legend">
        <li>
          <span className="mark eagle">2</span> eagle a lepší
        </li>
        <li>
          <span className="mark birdie">3</span> birdie
        </li>
        <li>
          <span className="mark bogey">5</span> bogey
        </li>
        <li>
          <span className="mark double">6</span> dvojbogey a horší
        </li>
      </ul>
    </section>
  )
}
