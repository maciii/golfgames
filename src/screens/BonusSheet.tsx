import type { BonusId, GameOptions } from '../types'
import { BONUSES } from '../types'

interface Props {
  playerName: string
  hole: number
  options: GameOptions
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
  playerName,
  hole,
  options,
  selected,
  onToggle,
  onClose,
}: Props) {
  const available = BONUSES.filter((bonus) => (options.bonusValues[bonus.id] ?? 0) > 0)

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      {/* Klepnutí uvnitř panelu nesmí panel zavřít. */}
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-header">
          <h2>Extra body</h2>
          <p className="subtitle">
            {playerName} · jamka {hole + 1}
          </p>
        </header>

        {available.length === 0 ? (
          <p className="hint">
            Pro tuhle hru nejsou zapnuté žádné extra body. Zapneš je v nastavení hry před
            začátkem kola.
          </p>
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
                      <span className="bonus-name">{bonus.name}</span>
                      <span className="bonus-desc">{bonus.description}</span>
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
          Extra bod se počítá celé dvojici. Hodnota platí za par, dvojnásobek za birdie a
          trojnásobek za eagle; při bogey a horším se nepočítá.
        </p>

        <button type="button" className="primary-button" onClick={onClose}>
          Hotovo
        </button>
      </div>
    </div>
  )
}
