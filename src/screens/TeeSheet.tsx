import { localeTag, localizedTeeName, useLocale } from '../i18n'

/**
 * Výběr odpaliště jednoho hráče.
 *
 * Vlastní list, ne rozbalovací nabídka: u odpaliště se nerozhoduje podle názvu
 * barvy, ale podle délky a normy - a hlavně podle toho, kolik ran z něj hráč
 * dostane. To poslední číslo nikde jinde není a je to přesně ta informace,
 * kvůli které se odpaliště mění.
 *
 * Komponenta je jen zobrazení; co která volba znamená, spočítá volající krok
 * zakládání kola (`SetupTeeScreen`, `SetupPlayersScreen`) a předá hotové řádky.
 */

export interface TeeSheetRow {
  id: string
  name: string
  /** Délka hraných jamek v metrech. */
  distance?: number
  courseRating?: number
  slopeRating?: number
  /** Rány, které by hráč z tohohle odpaliště dostal; bez handicapu chybí. */
  strokes?: number
}

interface Props {
  /** Jméno hráče v nadpisu - list se otevírá pro konkrétního hráče. */
  playerName: string
  rows: TeeSheetRow[]
  selectedId: string
  onSelect: (teeId: string) => void
  /** Nastaví odpaliště všem hráčům; nejčastější případ je, že hrají stejné. */
  onUseForAll: (teeId: string) => void
  onClose: () => void
}

const TEE_COLOR_IDS = new Set([
  'black',
  'blue',
  'bronze',
  'dark-green',
  'gold',
  'green',
  'jade',
  'members',
  'men',
  'middle',
  'orange',
  'players',
  'purple',
  'red',
  'silver',
  'tournament',
  'white',
  'yellow',
])

/** Barevná třída odpaliště; neznámé id dostane neutrální. */
export function teeColorClass(teeId: string): string {
  return TEE_COLOR_IDS.has(teeId) ? teeId : 'neutral'
}

export default function TeeSheet({
  playerName,
  rows,
  selectedId,
  onSelect,
  onUseForAll,
  onClose,
}: Props) {
  const { t } = useLocale()
  const meters = new Intl.NumberFormat(localeTag(), { maximumFractionDigits: 0 })

  return (
    <div
      className="sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={t('tee.sheetTitle', { name: playerName })}
      onClick={onClose}
    >
      {/* Klepnutí uvnitř listu ho nesmí zavřít, jinak by nešlo nic vybrat. */}
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-header">
          <h2>{t('tee.sheetTitle', { name: playerName })}</h2>
        </header>

        <div className="tee-rows" role="radiogroup">
          {rows.map((row) => {
            const selected = row.id === selectedId
            return (
              <button
                key={row.id}
                type="button"
                className={`tee-row tee-option-${teeColorClass(row.id)}${
                  selected ? ' selected' : ''
                }`}
                onClick={() => {
                  // Klepnutí na barvu rovnou vybere a zavře - volba je
                  // jednorázová, netřeba ji ještě potvrzovat druhým krokem.
                  onSelect(row.id)
                  onClose()
                }}
                aria-pressed={selected}
              >
                <span className="tee-swatch" aria-hidden="true" />
                <span className="tee-row-main">
                  <span className="tee-row-name">
                    {localizedTeeName(row.id, row.name)}
                  </span>
                  <span className="tee-row-meta">
                    {row.distance !== undefined && `${meters.format(row.distance)} m · `}
                    {row.slopeRating === undefined
                      ? t('tee.notRated')
                      : t('tee.rating', {
                          cr: row.courseRating ?? 0,
                          sr: row.slopeRating,
                        })}
                  </span>
                </span>
                {row.strokes !== undefined && (
                  <span className="tee-row-strokes">
                    {t('setup.strokesGiven', { count: row.strokes })}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={() => onUseForAll(selectedId)}
        >
          {t('tee.useForAll')}
        </button>
        <button type="button" className="link-button" onClick={onClose}>
          {t('common.close')}
        </button>
      </div>
    </div>
  )
}
