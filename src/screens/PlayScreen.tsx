import { useEffect, useRef, useState } from 'react'
import type { BonusId, Player, PlayerId, Round } from '../types'
import {
  MAX_STROKES,
  availableBonuses,
  bonusesAt,
  formatHoleList,
  getBonus,
  formatToPar,
  holeNumber,
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
import type { Team } from '../types'
import { getGame } from '../games'
import type { HoleBreakdown, HoleSetup, HoleSetupSelection } from '../games'
import {
  exclusiveBonusOutcome,
  pairStrokesReceived,
  playerBonusPoints,
  strokesReceived,
} from '../handicap'
import BonusSheet from './BonusSheet'
import PointsSheet from './PointsSheet'
import Scorecard from './Scorecard'
import { useT } from '../i18n'

const PAR_OPTIONS = [3, 4, 5, 6]

/** Jak dlouho se drží číslo, než se zápis smaže. */
const LONG_PRESS_MS = 500
const MOBILE_LANDSCAPE_QUERY =
  '(orientation: landscape) and (pointer: coarse) and (max-height: 600px)'

/** Na desktopu zůstává zápis skóre vždy viditelný, i když je okno široké. */
function useMobileLandscape(): boolean {
  const [matches, setMatches] = useState(
    () => window.matchMedia(MOBILE_LANDSCAPE_QUERY).matches,
  )

  useEffect(() => {
    const media = window.matchMedia(MOBILE_LANDSCAPE_QUERY)
    const onChange = () => setMatches(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return matches
}

interface Props {
  round: Round
  /**
   * Dodatečná oprava odehraného kola. Zapisuje se do archivu, ne do
   * rozehraného kola, takže se kolo neukončuje - jen se oprava zavře.
   */
  editing?: boolean
  onSetScore: (playerId: PlayerId, hole: number, value: number | null) => void
  onToggleBonus: (playerId: PlayerId, hole: number, bonusId: BonusId) => void
  onSetPar: (hole: number, par: number) => void
  onSetHoleSetup: (hole: number, selection: HoleSetupSelection) => void
  onGoToHole: (hole: number) => void
  onFinish: () => void
  onShowResults: () => void
  /** Nastavení rozehraného kola - hra a dvojice. Chybí při opravě archivu. */
  onOpenSetup?: () => void
}

/**
 * Zápis skóre po jamkách.
 *
 * Ovládání je stavěné na hraní jednou rukou: velká tlačítka −/+, žádné
 * klávesnice a průběžný stav rovnou u zapisované jamky.
 */
export default function PlayScreen({
  round,
  editing = false,
  onSetScore,
  onToggleBonus,
  onSetPar,
  onSetHoleSetup,
  onGoToHole,
  onFinish,
  onShowResults,
  onOpenSetup,
}: Props) {
  const t = useT()
  // Na dotyku běží vždy jen jedno přidržení, takže stačí jeden ref pro celou
  // obrazovku.
  const longPress = useRef<{ timer: number | null; fired: boolean }>({
    timer: null,
    fired: false,
  })
  // Hráč, pro kterého je otevřený výběr extra bodů.
  const [bonusFor, setBonusFor] = useState<Player | null>(null)
  // Strana, pro kterou je otevřený rozpis bodů jamky.
  const [breakdownFor, setBreakdownFor] = useState<string | null>(null)
  const showLandscapeScorecard = useMobileLandscape()
  const game = getGame(round.gameId)
  const hole = round.currentHole
  const par = parAt(round, hole)
  const isLastHole = hole === round.holeCount - 1
  const holeDone = isHoleComplete(round, hole)
  // Ukončit jde jen kolo, ve kterém se aspoň něco zapsalo.
  const anyScore = round.players.some((p) => holesPlayed(round, p.id) > 0)
  const summaries = game.holeSummary?.(round, hole) ?? []
  const headerSummary = game.headerSummary?.(round, hole)
  const holeSetup: HoleSetup | undefined = game.holeSetup?.(round, hole)
  const scoreEntryEnabled = holeSetup?.complete ?? true
  /**
   * Nabízí se na téhle jamce vůbec nějaký extra bod?
   *
   * Nestačí, že je hra zná: u her, kde jsou extra body vedlejší sázka, mají
   * ve výchozím stavu nulovou hodnotu, takže by tlačítko otevíralo prázdný
   * panel a v zápisu čtyř hráčů by zabíralo místo pro nic.
   */
  const hasBonusOptions = availableBonuses(round, hole).some((bonus) =>
    game.scoringOptions.bonusIds.includes(bonus.id),
  )
  // Foursome zapisuje jedno skóre za dvojici, ne za hráče - řádek je proto
  // jeden na dvojici a ovládá společný míč.
  const sharedBall = game.sharedBall === true && round.teams.length > 0
  // Shrnutí, které nepatří konkrétní dvojici, ale celé jamce (Skins, singles).
  const gameSummary = summaries.find((s) => s.id === '_game')
  /**
   * Rozpis bodů jamky, pokud ho hra umí. „Proč máme tři body" se z hlavičky
   * dvojice přečíst nedá, takže vedle ní stojí modré „i".
   */
  // Z první jamky nevede šipka na předchozí jamku, ale na nastavení kola.
  // U opravy archivního kola se nikam neodbočuje, tam zůstává nečinná.
  const backToSetup = hole === 0 && onOpenSetup !== undefined
  const breakdowns: HoleBreakdown[] = game.holeBreakdown?.(round, hole) ?? []
  const openedBreakdown = breakdowns.find((entry) => entry.id === breakdownFor)
  /**
   * Popisek odkazu na nastavení kola. Pojmenovává to, co se za ním dá změnit -
   * a je krátký záměrně: „Hra a dvojice" zalomí řádek odkazů na dva a zápis
   * skóre se pak u čtyř hráčů přestane vejít na jednu obrazovku.
   */
  const setupLabel = game.usesTeams(round.players.length)
    ? game.pairingKind === 'opponents'
      ? t('singles.opponents')
      : t('setup.pairs')
    : t('setup.game')

  useEffect(() => {
    // Výběr bonusu by v přehledu překryl scorekartu a nejde v něm pokračovat
    // bez návratu k ovládání zápisu.
    if (showLandscapeScorecard) setBonusFor(null)
  }, [showLandscapeScorecard])

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
    // Oprava archivního kola se ukládá průběžně, takže tlačítko jen zavírá
    // zápis - vypisovat u odehraného kola chybějící jamky by nemělo co nabídnout.
    if (editing) {
      onFinish()
      return
    }

    const { conceded, unplayed, complete } = roundCompleteness(round)
    if (complete) {
      onFinish()
      return
    }

    const lines = [t('play.incompleteTitle'), '']
    if (conceded.length > 0) {
      lines.push(t('play.incompleteConceded', { holes: formatHoleList(conceded) }))
    }
    if (unplayed.length > 0) {
      lines.push(t('play.incompleteUnplayed', { holes: formatHoleList(unplayed) }))
    }
    lines.push('', t('play.incompleteConfirm'))

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
    /**
     * Značky u jména: L / N pro Longest a Nearest, ×2 pro double. U prvních
     * dvou barva říká, komu bonus připadne - zeleně své dvojici, červeně
     * soupeřům, neutrálně dokud hráč jamku nezapsal.
     */
    const marks = bonuses.flatMap((id) => {
      const bonus = getBonus(id)
      if (!bonus?.mark) return []
      const tone = bonus.exclusive
        ? exclusiveBonusOutcome(round, player.id, hole, id)
        : 'multiplier'
      return [{ key: id, text: bonus.mark, tone }]
    })

    /**
     * Co hráči vynesla právě zapisovaná jamka. U her jednotlivců to jinak není
     * kde vidět - týmové hry mají shrnutí v hlavičce dvojice, tady patří
     * rovnou k jménu. Celkový stav je nad tím v hlavičce jamky.
     */
    const holeGain = summaries.find((s) => s.id === player.id)

    return (
      <li key={player.id} className="player-row">
        <div className="player-info">
          {/* Jméno se zkracuje, značky ne: u dlouhého jména by se jinak tečky
              handicapu ani zisk z jamky nevešly a zmizely by úplně. */}
          <span className="player-name">
            <span className="player-name-text">{player.name}</span>
            {marks.map((mark) => (
              <span key={mark.key} className={`player-mark ${mark.tone}`}>
                {mark.text}
              </span>
            ))}
            {holeGain?.entries.map((entry) => (
              <span
                key={entry.label}
                className={`player-mark gain${entry.highlight ? ' best' : ''}`}
                title={entry.label}
                aria-label={`${entry.label}: ${entry.value}`}
              >
                {entry.value}
              </span>
            ))}
            {/* Rány, které hráč na téhle jamce dostává. Bez toho není poznat,
                proč má za stejný počet ran jiný výsledek než soupeř - a proto
                se počet teček **nesmí** zastropovat: hráč s HCP 54 dostává na
                nejtěžších jamkách čtyři rány a tři tečky by tvrdily, že mezi
                ním a soupeřem je o ránu menší rozdíl, než jaký se opravdu
                počítá. Scorekarta je vypisuje celé odjakživa. */}
            {strokesReceived(round, player.id, hole) > 0 && (
              <span
                className="player-mark strokes"
                title={t('play.strokesReceived', {
                  count: strokesReceived(round, player.id, hole),
                })}
              >
                {'•'.repeat(strokesReceived(round, player.id, hole))}
              </span>
            )}
          </span>
          <span className="player-total">
            {played === 0
              ? t('play.noScore')
              : t('play.total', {
                  strokes: strokeTotal(round, player.id),
                  toPar: formatToPar(toPar),
                })}
          </span>
        </div>
        {hasBonusOptions && scoreEntryEnabled && (
          <button
            type="button"
            className={`bonus-button${bonuses.length > 0 ? ' active' : ''}`}
            onClick={() => setBonusFor(player)}
            aria-label={t('play.bonusesFor', { name: player.name })}
          >
            {bonuses.length > 0 ? (bonusPoints > 0 ? bonusPoints : '•') : '★'}
          </button>
        )}
        <div className="stepper">
          <button
            type="button"
            className="step-button"
            onClick={() => adjust(player.id, -1)}
            disabled={!scoreEntryEnabled}
            aria-label={t('play.minus', { name: player.name })}
          >
            −
          </button>
          <button
            type="button"
            className="score-value"
            onClick={() => handleScoreTap(player.id)}
            disabled={!scoreEntryEnabled}
            onPointerDown={() => startLongPress(player.id)}
            onPointerUp={cancelLongPress}
            onPointerLeave={cancelLongPress}
            onPointerCancel={cancelLongPress}
            onContextMenu={(e) => e.preventDefault()}
            aria-label={t('play.score', { name: player.name })}
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
            disabled={!scoreEntryEnabled}
            aria-label={t('play.plus', { name: player.name })}
          >
            +
          </button>
        </div>
      </li>
    )
  }

  /**
   * Řádek dvojice, která hraje jedním míčem.
   *
   * Skóre se čte i zapisuje přes prvního partnera; `App.setScore()` ho uloží
   * oběma, takže je jedno, kdo je v poli první.
   */
  function renderBall(team: Team) {
    const players = teamPlayers(round, team)
    const first = players[0]
    if (!first) return null

    const score = scoreAt(round, first.id, hole)
    const played = holesPlayed(round, first.id)
    const toPar = strokeTotal(round, first.id) - parForPlayedHoles(round, first.id)
    const strokes = pairStrokesReceived(round, team.playerIds, hole)
    const holeGain = summaries.find((s) => s.id === team.id)

    return (
      <li key={team.id} className="player-row">
        <div className="player-info">
          <span className="player-name">
            <span className="player-name-text">
              {game.teamLabel?.(round, team) ?? teamName(round, team)}
            </span>
            {holeGain?.entries.map((entry) => (
              <span
                key={entry.label}
                className={`player-mark gain${entry.highlight ? ' best' : ''}`}
                title={entry.label}
                aria-label={`${entry.label}: ${entry.value}`}
              >
                {entry.value}
              </span>
            ))}
            {/* Rány dvojice na téhle jamce - u foursome z poloviny součtu HCP.
                Vypisují se všechny, viz tečky u hráče výš. */}
            {strokes > 0 && (
              <span
                className="player-mark strokes"
                title={t('play.strokesReceivedPair', { count: strokes })}
              >
                {'•'.repeat(strokes)}
              </span>
            )}
          </span>
          <span className="player-total">
            {played === 0
              ? t('play.noScore')
              : t('play.total', {
                  strokes: strokeTotal(round, first.id),
                  toPar: formatToPar(toPar),
                })}
          </span>
        </div>
        <div className="stepper">
          <button
            type="button"
            className="step-button"
            onClick={() => adjust(first.id, -1)}
            aria-label={t('play.minus', { name: teamName(round, team) })}
          >
            −
          </button>
          <button
            type="button"
            className="score-value"
            onClick={() => handleScoreTap(first.id)}
            onPointerDown={() => startLongPress(first.id)}
            onPointerUp={cancelLongPress}
            onPointerLeave={cancelLongPress}
            onPointerCancel={cancelLongPress}
            onContextMenu={(e) => e.preventDefault()}
            aria-label={t('play.score', { name: teamName(round, team) })}
          >
            <span
              className={`mark large ${score === null ? 'empty' : scoreCategory(score, par)}`}
            >
              {score ?? '–'}
            </span>
          </button>
          <button
            type="button"
            className="step-button"
            onClick={() => adjust(first.id, 1)}
            aria-label={t('play.plus', { name: teamName(round, team) })}
          >
            +
          </button>
        </div>
      </li>
    )
  }

  if (showLandscapeScorecard && scoreEntryEnabled) {
    return (
      <div className="landscape-scorecard">
        <Scorecard round={round} mode="live" />
      </div>
    )
  }

  return (
    <div className="screen">
      <header
        className={`app-header hole-header${
          headerSummary?.tone === 'outOfPlay' ? ' out-of-play' : ''
        }`}
      >
        <div className="hole-nav">
          {/* Na první jamce není kam listovat, ale zpět z ní vede - na krok
              zakládání kola, odkud se dá změnit hra i dvojice. */}
          <button
            type="button"
            className="nav-arrow"
            onClick={() => (backToSetup ? onOpenSetup?.() : onGoToHole(hole - 1))}
            disabled={hole === 0 && !backToSetup}
            aria-label={backToSetup ? t('play.backToSetup') : t('play.previousHole')}
          >
            ‹
          </button>
          <div className="hole-center">
            <div className="hole-title">
              <span
                className={`hole-number par-${par}`}
                aria-label={t('play.hole', { number: holeNumber(round, hole) })}
              >
                {holeNumber(round, hole)}
              </span>
            </div>
            {headerSummary && (
              <div className={`game-header-summary ${headerSummary.tone ?? 'normal'}`}>
                {/* Vlastní poznámka u stavu znamená víc samostatných zápasů
                    (dva zápasy ve flightu) - pak stojí každý na svém řádku,
                    aby bylo poznat, koho se dormie týká. */}
                <div
                  className={`game-header-score${
                    headerSummary.entries.some((entry) => entry.note) ? ' stacked' : ''
                  }`}
                >
                  {headerSummary.entries.map((entry, index) => (
                    <span
                      key={`${entry.label}-${index}`}
                      className={`game-header-entry${entry.highlight ? ' highlight' : ''}${
                        entry.tone ? ` ${entry.tone}` : ''
                      }`}
                    >
                      <span>{entry.label}</span>
                      <strong>{entry.value}</strong>
                      {entry.note && (
                        <span className="game-header-hint">{entry.note}</span>
                      )}
                    </span>
                  ))}
                </div>
                {headerSummary.note && (
                  <span className="game-header-note">{headerSummary.note}</span>
                )}
              </div>
            )}
          </div>
          {/* V patičce při opravě archivu není Předchozí/Další (jamky se tam
              neprochází, oprava se ukládá napřímo) - druhá šipka proto
              zůstává jen tady. Živá hra prochází jamky patičkou. */}
          {editing && (
            <button
              type="button"
              className="nav-arrow"
              onClick={() => onGoToHole(hole + 1)}
              disabled={isLastHole}
              aria-label={t('play.nextHole')}
            >
              ›
            </button>
          )}
        </div>
      </header>

      <main className="content">
        <div className="par-row">
          <span className="par-label">{t('play.par')}</span>
          <div className="segmented compact">
            {PAR_OPTIONS.map((value) => (
              <button
                key={value}
                type="button"
                className={`segment${value === par ? ' selected' : ''}`}
                onClick={() => onSetPar(hole, value)}
                aria-pressed={value === par}
                disabled={round.course !== undefined}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        {holeSetup && (
          <section
            className={`hole-setup${holeSetup.complete ? ' complete' : ''}${
              holeSetup.choices ? ' choices-mode' : ''
            }`}
          >
            <div className="hole-setup-heading">
              <h2 className="section-title">{holeSetup.title}</h2>
              <p className="hint">{holeSetup.message}</p>
            </div>
            {holeSetup.choices ? (
              <div className="game-list hole-setup-choices">
                {holeSetup.choices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    className={`game-card${choice.selected ? ' selected' : ''}`}
                    onClick={() =>
                      onSetHoleSetup(hole, { kind: 'choice', choiceId: choice.id })
                    }
                    aria-pressed={choice.selected === true}
                  >
                    <span className="pairing-line">
                      {choice.pairing ? (
                        <>
                          <span>{choice.pairing.left}</span>
                          <span className="pairing-vs">{t('setup.versus')}</span>
                          <span>{choice.pairing.right}</span>
                        </>
                      ) : (
                        choice.label
                      )}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <ul className="hole-setup-list">
                {holeSetup.entries.map((entry) => (
                  <li key={entry.playerId} className="hole-setup-row">
                    <span className="hole-setup-name">{entry.name}</span>
                    <div className="segmented hole-setup-options">
                      {holeSetup.options.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className={`segment${
                            entry.selectedOptionId === option.id ? ' selected' : ''
                          }`}
                          onClick={() =>
                            onSetHoleSetup(hole, {
                              kind: 'entry',
                              playerId: entry.playerId,
                              optionId: option.id,
                            })
                          }
                          aria-pressed={entry.selectedOptionId === option.id}
                          aria-label={`${entry.name}: ${option.label}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {holeSetup.complete && (
              <div className="hole-setup-groups">
                {holeSetup.groups.map((group) => (
                  <span key={group.optionId} className="hole-setup-group">
                    <strong>{group.label}</strong>
                    <span>{group.playerNames.join(', ')}</span>
                  </span>
                ))}
              </div>
            )}
          </section>
        )}

        {gameSummary && (
          <div className="game-summary">
            {gameSummary.entries.map((entry) => (
              <span key={entry.label} className="team-metric">
                {entry.label} <strong>{entry.value}</strong>
              </span>
            ))}
            {/* U dynamických dvojic patří rozpis k celé jamce, ne k bloku. */}
            {breakdowns.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className="info-button"
                onClick={() => setBreakdownFor(entry.id)}
                aria-label={t('breakdown.open', { name: entry.name })}
                title={entry.name}
              >
                i
              </button>
            ))}
          </div>
        )}

        {sharedBall ? (
          <ul className="player-list">{round.teams.map(renderBall)}</ul>
        ) : round.teams.length > 0 ? (
          round.teams.map((team) => {
            const summary = summaries.find((s) => s.id === team.id)
            return (
              <section
                key={team.id}
                className={`team-block${summary?.winner ? ' winning' : ''}`}
              >
                <div className="team-header">
                  <span className="team-name">
                    {game.teamLabel?.(round, team) ?? teamName(round, team)}
                  </span>
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
                      {/* Odkud se body vzaly, se z čísel přečíst nedá. */}
                      {breakdowns.some((entry) => entry.id === team.id) && (
                        <button
                          type="button"
                          className="info-button"
                          onClick={() => setBreakdownFor(team.id)}
                          aria-label={t('breakdown.open', {
                            name: game.teamLabel?.(round, team) ?? teamName(round, team),
                          })}
                          title={t('breakdown.title')}
                        >
                          i
                        </button>
                      )}
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

        <p className="hint">{t('play.hint', { par })}</p>

        {/* Při opravě archivního kola se nikam neodbočuje: jamky se prochází
            šipkami v hlavičce a výsledky jsou tam, odkud se oprava otevřela. */}
        {!editing && (
          <div className="link-row">
            <button type="button" className="link-button" onClick={onShowResults}>
              {t('play.standings')}
            </button>
            {/* Dvojice se na jamce mění, takže se k jejich volbě dá vrátit
                i z rozehraného kola. */}
            {onOpenSetup && (
              <button type="button" className="link-button" onClick={onOpenSetup}>
                {setupLabel}
              </button>
            )}
            {/* Kolo může skončit kdykoli - třeba když přijde bouřka. */}
            {!isLastHole && anyScore && (
              <button type="button" className="link-button" onClick={finish}>
                {t('play.finish')}
              </button>
            )}
          </div>
        )}
      </main>

      <footer className="app-footer">
        {editing ? (
          <button type="button" className="primary-button" onClick={finish}>
            {t('play.saveEdits')}
          </button>
        ) : (
          <div className="footer-row">
            {hole > 0 && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => onGoToHole(hole - 1)}
              >
                {t('play.previousHole')}
              </button>
            )}
            {isLastHole ? (
              <button type="button" className="primary-button" onClick={finish}>
                {t('play.finishAndSave')}
              </button>
            ) : (
              <button
                type="button"
                className="primary-button"
                onClick={() => onGoToHole(hole + 1)}
              >
                {holeDone ? t('play.next') : t('play.skip')}
              </button>
            )}
          </div>
        )}
      </footer>

      {openedBreakdown && (
        <PointsSheet
          round={round}
          hole={hole}
          breakdown={openedBreakdown}
          onClose={() => setBreakdownFor(null)}
        />
      )}

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
