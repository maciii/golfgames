import type { Round } from '../types'
import { holeMultiplier, holeNumber } from '../types'
import { isNetRound } from '../handicap'
import type { HoleBreakdown } from '../games'
import { useT } from '../i18n'

interface Props {
  round: Round
  hole: number
  breakdown: HoleBreakdown
  onClose: () => void
}

/**
 * Rozpis bodů jedné strany na jedné jamce - odpověď na „proč máme tři body".
 *
 * Otevírá se z modrého „i" u shrnutí jamky. Vypisuje každý zdroj zvlášť
 * i s číslem, ze kterého se rozhodovalo, protože nejčastější nejasnost je
 * právě netto: kdo dostane ránu, může mít za sedm ran netto birdie.
 */
export default function PointsSheet({ round, hole, breakdown, onClose }: Props) {
  const t = useT()
  const doubled = holeMultiplier(round, hole) > 1
  const withHandicap = round.settings.options.multipliersWithHandicap && isNetRound(round)

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      {/* Klepnutí uvnitř panelu nesmí panel zavřít. */}
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-header">
          <h2>{t('breakdown.title')}</h2>
          <p className="subtitle">
            {t('breakdown.subtitle', {
              name: breakdown.name,
              hole: holeNumber(round, hole),
            })}
          </p>
        </header>

        {breakdown.lines.length === 0 ? (
          <p className="hint">{t('breakdown.empty')}</p>
        ) : (
          <ul className="breakdown-list">
            {breakdown.lines.map((line, index) => (
              <li
                key={`${line.label}-${index}`}
                className={`breakdown-row${line.points > 0 ? ' earned' : ''}`}
              >
                <span className="breakdown-text">
                  <span className="breakdown-label">{line.label}</span>
                  {line.note && <span className="breakdown-note">{line.note}</span>}
                </span>
                <span className="breakdown-points">{line.points}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="breakdown-total">
          <span>{t('breakdown.total')}</span>
          <strong>{breakdown.total}</strong>
        </div>

        {doubled && <p className="hint">{t('breakdown.doubled')}</p>}
        {isNetRound(round) && (
          <p className="hint">
            {withHandicap ? t('breakdown.handicapOn') : t('breakdown.handicapOff')}
          </p>
        )}

        <button type="button" className="primary-button" onClick={onClose}>
          {t('common.done')}
        </button>
      </div>
    </div>
  )
}
