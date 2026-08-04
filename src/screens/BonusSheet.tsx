import type { BonusId, Round } from '../types'
import { availableBonuses } from '../types'
import { getGame } from '../games'
import { dynamicKey, useT } from '../i18n'

interface Props {
  round: Round
  playerName: string
  hole: number
  /** Extra body, které má hráč na jamce zapsané. */
  selected: BonusId[]
  onToggle: (bonusId: BonusId) => void
  onClose: () => void
}

/**
 * Výběr extra bodů pro jednoho hráče na jedné jamce.
 *
 * Nabízí jen bonusy, které mají v nastavení hry nenulovou hodnotu - vypnuté
 * se vůbec neukazují, aby se seznam na hřišti nemusel prohledávat.
 */
export default function BonusSheet({
  round,
  playerName,
  hole,
  selected,
  onToggle,
  onClose,
}: Props) {
  const t = useT()
  // Longest a Nearest se nabízejí jen na svém paru a jdou první.
  const game = getGame(round.gameId)
  const available = availableBonuses(round, hole).filter((bonus) =>
    game.scoringOptions.bonusIds.includes(bonus.id),
  )
  const options = round.settings.options

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      {/* Klepnutí uvnitř panelu nesmí panel zavřít. */}
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-header">
          <h2>{t('bonus.sheetTitle')}</h2>
          <p className="subtitle">
            {t('bonus.sheetSubtitle', { name: playerName, hole: hole + 1 })}
          </p>
        </header>

        {available.length === 0 ? (
          <p className="hint">{t('bonus.none')}</p>
        ) : (
          <ul className="bonus-list">
            {available.map((bonus) => {
              const active = selected.includes(bonus.id)
              const value = options.bonusValues[bonus.id] ?? 0
              return (
                <li key={bonus.id}>
                  <button
                    type="button"
                    className={`bonus-option${active ? ' selected' : ''}`}
                    onClick={() => onToggle(bonus.id)}
                    aria-pressed={active}
                  >
                    <span className="bonus-check">{active ? '✓' : ''}</span>
                    <span className="bonus-text">
                      <span className="bonus-name">
                        {bonus.mark && <span className="bonus-mark">{bonus.mark}</span>}
                        {t(dynamicKey('bonus', bonus.id, 'name'))}
                      </span>
                      <span className="bonus-desc">
                        {t(dynamicKey('bonus', bonus.id, 'description'))}
                      </span>
                    </span>
                    <span className="bonus-value">
                      {bonus.kind === 'multiplier' ? '×2' : `+${value}`}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <p className="hint">
          {game.scoringOptions.bonusScope === 'team'
            ? t('bonus.footer')
            : t('bonus.footerPlayer')}
        </p>

        <button type="button" className="primary-button" onClick={onClose}>
          {t('common.done')}
        </button>
      </div>
    </div>
  )
}
