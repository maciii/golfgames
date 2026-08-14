import { PAIRINGS } from '../roundSetup'
import { getGame } from '../games'
import { useT } from '../i18n'
import type { MessageKey } from '../i18n'
import { BackIcon } from './icons'

interface Props {
  /** Jména hráčů kola v jeho pořadí - dvojice se vybírají po nich. */
  names: string[]
  gameId: string
  pairing: number
  onPairingChange: (value: number) => void
  /**
   * Úprava rozehraného kola. Volba se pak uplatní hned a kolo se přepočítá,
   * takže obrazovka nekončí krokem „Další", ale návratem ke hře.
   */
  editing?: boolean
  onBack: () => void
  onNext: () => void
}

/**
 * Volba dvojic - vlastní krok zakládání kola a zároveň jediné místo, kde se
 * dvojice mění v rozehraném kole.
 *
 * Dřív byla přilepená pod výběrem hry, takže na malém displeji nebyla vidět
 * bez rolování a nedalo se k ní vrátit, když se hráči na jamce přeskupili.
 */
export default function SetupPairingScreen({
  names,
  gameId,
  pairing,
  onPairingChange,
  editing = false,
  onBack,
  onNext,
}: Props) {
  const t = useT()
  const game = getGame(gameId)
  // U dvou jamkovek ve flightu nejsou dvojice partneři, ale soupeři jednoho
  // zápasu - jinak by volba tvrdila, že hrají spolu.
  const opponents = game.pairingKind === 'opponents'

  const displayName = (index: number) =>
    names[index]?.trim() || t('common.player', { number: index + 1 })

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
          <h1>{opponents ? t('singles.opponents') : t('setup.pairs')}</h1>
        </div>
        <p className="subtitle">
          {editing ? t('setup.editRoundSubtitle') : t('setup.subtitle')}
        </p>
      </header>

      <main className="content">
        <section className="section">
          <h2 className="section-title">{t(`games.${game.id}.name` as MessageKey)}</h2>
          <div className="game-list">
            {PAIRINGS.map((option, index) => (
              <button
                key={index}
                type="button"
                className={`game-card${index === pairing ? ' selected' : ''}`}
                onClick={() => onPairingChange(index)}
                aria-pressed={index === pairing}
              >
                <span className={`pairing-line${opponents ? ' stacked' : ''}`}>
                  {opponents ? (
                    // Dva samostatné zápasy, ne dvě strany jednoho: stojí každý
                    // na svém řádku, protože „vs" mezi nimi by tvrdilo, že hrají
                    // proti sobě.
                    <>
                      <span>
                        {(option[0] ?? []).map(displayName).join(t('singles.versusJoin'))}
                      </span>
                      <span>
                        {(option[1] ?? []).map(displayName).join(t('singles.versusJoin'))}
                      </span>
                    </>
                  ) : (
                    <>
                      {(option[0] ?? []).map(displayName).join(' + ')}
                      <span className="pairing-vs">{t('setup.versus')}</span>
                      {(option[1] ?? []).map(displayName).join(' + ')}
                    </>
                  )}
                </span>
              </button>
            ))}
          </div>
          <p className="hint">
            {editing
              ? t('setup.pairsEditHint')
              : opponents
                ? t('setup.opponentsHint')
                : t('setup.pairsHint')}
          </p>
        </section>
      </main>

      <footer className="app-footer">
        <button type="button" className="primary-button" onClick={onNext}>
          {editing ? t('setup.backToRound') : t('setup.next')}
        </button>
      </footer>
    </div>
  )
}
