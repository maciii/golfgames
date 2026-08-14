import { useState } from 'react'
import type { Round } from '../types'
import { BONUSES, formatHoleList, formatRoundDate, roundCompleteness } from '../types'
import { getGame } from '../games'
import { formatMoney, settleGroups, settleRound, transfersEqual } from '../money'
import Scorecard from './Scorecard'
import { dynamicKey, useT } from '../i18n'
import type { MessageKey } from '../i18n'

interface Props {
  round: Round
  /** Odkaz na účet; u archivního kola se nenabízí. */
  onOpenAccount?: () => void
  /** Archivní kolo se jen prohlíží - nejde v něm pokračovat ani ho mazat. */
  readOnly?: boolean
  /** Dodatečná oprava skóre archivního kola. */
  onEdit?: () => void
  onResume?: () => void
  onNewRound?: () => void
  onOpenArchive?: () => void
  onBack?: () => void
}

type PaymentMode = 'individual' | 'optimized'

/** Výsledky kola: tabulky podle pravidel hry plus kompletní scorecard. */
export default function ResultsScreen({
  round,
  onOpenAccount,
  readOnly = false,
  onEdit,
  onResume,
  onNewRound,
  onOpenArchive,
  onBack,
}: Props) {
  const t = useT()
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('individual')
  const game = getGame(round.gameId)
  const scoring = game.scoringOptions
  const sections = game.computeStandings(round)
  const finished = Boolean(round.finishedAt)
  const completeness = roundCompleteness(round)
  // Při jediném řádku není co poměřovat a pořadí by jen mátlo.
  const showPositions = sections.some((s) => s.rows.length > 1)

  // Peníze se počítají z hlavní tabulky hry - body, skiny i vyhrané jamky
  // fungují stejně. Bez sázky nebo bez soupeře vyjde 'none' a sekce se skryje.
  // Hry s vedlejší sázkou (extra body u jamkovky, Stablefordu a Dots) dodají
  // strany samy: do tabulky se extra body přičíst nedají, protože ta drží
  // pořadí podle pravidel hry.
  const mainRows = sections[0]?.rows ?? []
  const parties =
    game.settlementParties?.(round) ??
    mainRows.map((row) => ({
      id: row.id,
      name: row.name,
      units: row.value,
    }))
  // Dvě jamkovky ve flightu jsou dvě hry v jednom kole: každá se vyrovnává
  // sama za sebe, jinak by si platili hráči z různých zápasů.
  const groups = game.settlementGroups?.(round)
  // U jednotlivců se přepínač týká jen způsobu zobrazení stejných zůstatků;
  // výchozí přímé platby zachovávají původní pravidlo každý proti každému.
  const settlement = groups
    ? settleGroups(
        round,
        groups.map((ids) => ids.flatMap((id) => parties.filter((p) => p.id === id))),
      )
    : settleRound(round, parties)
  // Optimalizace, která vyjde stejně jako přímé platby, není volba - je to
  // druhý identický seznam a přepínač nad ním jen zdržuje.
  const canOptimize =
    settlement.kind === 'balances' &&
    settlement.transfers.length > 0 &&
    !transfersEqual(settlement.transfers, settlement.optimizedTransfers)

  /**
   * Konfigurace, se kterou se kolo hrálo. U archivního kola je díky tomu
   * vidět, podle čeho se body počítaly, i když se předvolby mezitím změnily.
   */
  const configuration = [
    game.supportsDoubleHoles && round.settings.options.doubleClosingHoles
      ? t('results.configDoubleClosing')
      : null,
    scoring.doubleBest && round.settings.options.doubleBest > 0
      ? t('results.configDoubleBest', { count: round.settings.options.doubleBest })
      : null,
    ...BONUSES.filter(
      (b) =>
        scoring.bonusIds.includes(b.id) &&
        (round.settings.options.bonusValues[b.id] ?? 0) > 0,
    ).map((b) => {
      const name = t(dynamicKey('bonus', b.id, 'name'))
      if (b.kind === 'multiplier') return name
      const value = round.settings.options.bonusValues[b.id] ?? 0
      return `${name} ${t('common.points', { count: value })}`
    }),
    scoring.noDoubleBonuses && round.settings.options.noDoubleBonuses
      ? t('results.configNoDoubleBonuses')
      : null,
    scoring.confirmSkinsByPar && round.settings.options.confirmSkinsByPar
      ? t('results.configConfirmSkinsByPar')
      : null,
  ].filter(Boolean)

  function newRound() {
    if (finished || confirm(t('results.discardConfirm'))) {
      onNewRound?.()
    }
  }

  return (
    <div className="screen">
      <header className="app-header">
        <h1>
          {readOnly
            ? t('results.archived')
            : finished
              ? t('results.final')
              : t('results.live')}
        </h1>
        <p className="subtitle">
          {t(`games.${game.id}.name` as MessageKey)} · {formatRoundDate(round)}
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

        {!finished && !readOnly && <p className="hint">{t('results.onlyPlayed')}</p>}

        {finished && !completeness.complete && (
          <p className="hint">
            {completeness.conceded.length > 0 && (
              <>
                {t('results.conceded', {
                  holes: formatHoleList(completeness.conceded),
                })}{' '}
              </>
            )}
            {completeness.unplayed.length > 0 &&
              t('results.unplayed', { holes: formatHoleList(completeness.unplayed) })}
          </p>
        )}

        {settlement.kind !== 'none' && (
          <section className="section">
            <h2 className="section-title">
              {settlement.kind === 'balances'
                ? t('results.totalWinnings')
                : t('results.settlement')}
            </h2>

            {settlement.kind === 'transfers' ? (
              <ul className="settlement">
                {settlement.transfers.map((transfer) => (
                  <li
                    key={`${transfer.fromId}-${transfer.toId}`}
                    className="settlement-row"
                  >
                    <span className="settlement-name">
                      {transfer.fromName}
                      <span className="settlement-arrow">→</span>
                      {transfer.toName}
                    </span>
                    <span className="settlement-amount owes">
                      {formatMoney(transfer.amount, round.settings.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <ul className="settlement">
                  {settlement.rows.map((row) => (
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
                {settlement.transfers.length > 0 && (
                  <>
                    {canOptimize && (
                      <div className="segmented settlement-toggle">
                        <button
                          type="button"
                          className={`segment${
                            paymentMode === 'individual' ? ' selected' : ''
                          }`}
                          onClick={() => setPaymentMode('individual')}
                          aria-pressed={paymentMode === 'individual'}
                        >
                          {t('results.detailedPayments')}
                        </button>
                        <button
                          type="button"
                          className={`segment${
                            paymentMode === 'optimized' ? ' selected' : ''
                          }`}
                          onClick={() => setPaymentMode('optimized')}
                          aria-pressed={paymentMode === 'optimized'}
                        >
                          {t('results.optimizedPayments')}
                        </button>
                      </div>
                    )}
                    <h3 className="settlement-subtitle">
                      {canOptimize && paymentMode === 'optimized'
                        ? t('results.optimizedPayments')
                        : t('results.detailedPayments')}
                    </h3>
                    <ul className="settlement">
                      {(canOptimize && paymentMode === 'optimized'
                        ? settlement.optimizedTransfers
                        : settlement.transfers
                      ).map((transfer) => (
                        <li
                          key={`${transfer.fromId}-${transfer.toId}`}
                          className="settlement-row"
                        >
                          <span className="settlement-name">
                            {transfer.fromName}
                            <span className="settlement-arrow">→</span>
                            {transfer.toName}
                          </span>
                          <span className="settlement-amount owes">
                            {formatMoney(transfer.amount, round.settings.currency)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}

            <p className="hint">
              {canOptimize && paymentMode === 'optimized'
                ? t('money.optimizedSettlement')
                : settlement.summary}
              {settlement.kind === 'balances' && (
                <>
                  {' '}
                  {t('results.pointWorth', {
                    money: formatMoney(
                      round.settings.pointValue,
                      round.settings.currency,
                    ),
                  })}
                </>
              )}
              {game.supportsDoubleHoles &&
                round.settings.options.doubleClosingHoles &&
                ` ${t('results.doubleClosingNote')}`}
            </p>
          </section>
        )}

        <Scorecard round={round} />

        {configuration.length > 0 && (
          <section className="section">
            <h2 className="section-title">{t('results.configuration')}</h2>
            <p className="hint">{configuration.join(' · ')}</p>
          </section>
        )}

        {/* Rozcestník je i tady, protože s rozehraným kolem se uživatel na
            úvodní obrazovku nedostane. */}
        {!readOnly && (
          <div className="link-row">
            {onOpenArchive && (
              <button type="button" className="link-button" onClick={onOpenArchive}>
                {t('setup.archive')}
              </button>
            )}
            {onOpenAccount && (
              <button type="button" className="link-button" onClick={onOpenAccount}>
                {t('play.account')}
              </button>
            )}
          </div>
        )}
      </main>

      <footer className="app-footer">
        {readOnly ? (
          <div className="footer-row">
            {/* Zpětná oprava odehraného kola: skóre se dá spočítat i po hře,
                takže archiv nesmí být jen ke čtení. */}
            {onEdit && (
              <button type="button" className="secondary-button" onClick={onEdit}>
                {t('results.editScores')}
              </button>
            )}
            <button type="button" className="primary-button" onClick={onBack}>
              {t('results.backToArchive')}
            </button>
          </div>
        ) : finished ? (
          <div className="footer-row">
            <button type="button" className="secondary-button" onClick={onResume}>
              {t('results.editScores')}
            </button>
            <button type="button" className="secondary-button" onClick={newRound}>
              {t('results.newRound')}
            </button>
          </div>
        ) : (
          <>
            {/* Rozehrané kolo má jen jednu očekávanou akci - pokračovat ve hře.
                Zahodit rozehrané kolo je vzácná a nevratná volba, proto je to
                podřazený odkaz, ne rovnocenné tlačítko vedle "Zpět do hry". */}
            <button type="button" className="primary-button" onClick={onResume}>
              {t('results.backToPlay')}
            </button>
            <button type="button" className="link-button danger" onClick={newRound}>
              {t('results.discardRound')}
            </button>
          </>
        )}
      </footer>
    </div>
  )
}
