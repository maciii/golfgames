import { useEffect } from 'react'
import { GAMES, getGame } from '../games'
import { useT } from '../i18n'
import type { MessageKey } from '../i18n'
import { BackIcon } from './icons'

interface Props {
  playerCount: number
  gameId: string
  onGameIdChange: (value: string) => void
  /** Popis zvolených dvojic; chybí u her, které se ve dvojicích nehrají. */
  pairingLabel?: string
  onOpenPairing: () => void
  onOpenGameSettings: (gameId: string) => void
  /** Úprava rozehraného kola: volba se uplatní hned a kolo se přepočítá. */
  editing?: boolean
  onBack: () => void
  onNext: () => void
}

/**
 * Krok 4 zakládání kola: hra. Dvojice mají od té doby, co se dají měnit
 * i v rozehraném kole, vlastní krok (`SetupPairingScreen`).
 *
 * Počet hráčů se vybírá dřív (krok Hráči), takže se tu nabízejí jen hry, co
 * ho podporují - ne naopak jako dřív, kdy hra omezovala počet hráčů.
 */
export default function SetupGameScreen({
  playerCount,
  gameId,
  onGameIdChange,
  pairingLabel,
  onOpenPairing,
  onOpenGameSettings,
  editing = false,
  onBack,
  onNext,
}: Props) {
  const t = useT()
  const availableGames = GAMES.filter((g) => g.playerCounts.includes(playerCount))
  const game = getGame(gameId)
  const gameValid = availableGames.some((g) => g.id === gameId)
  const usesTeams = game.usesTeams(playerCount)
  const needsPairing = gameValid && usesTeams && playerCount === 4
  // U dvou jamkovek ve flightu nejsou dvojice partneři, ale soupeři jednoho
  // zápasu - jinak by odkaz tvrdil, že hrají spolu.
  const opponents = game.pairingKind === 'opponents'

  // Změna počtu hráčů v předchozím kroku mohla vyřadit dřív zvolenou hru -
  // ať appka pořád má vybranou hru, kterou jde s tímhle počtem hrát.
  useEffect(() => {
    if (!gameValid && availableGames[0]) onGameIdChange(availableGames[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameValid, availableGames[0]?.id])

  /**
   * Odkaz na krok s dvojicemi. Při zakládání kola stojí pod hrou (vybírá se
   * odshora dolů), při úpravě rozehraného kola nad ní - tam se chodí právě
   * kvůli dvojicím a seznam her by je odsunul pod okraj displeje.
   */
  const pairingSection = needsPairing ? (
    <section className="section">
      <h2 className="section-title">
        {opponents ? t('singles.opponents') : t('setup.pairs')}
      </h2>
      {/* Vlastní krok, ne sekce pod hrou: na malém displeji byla volba dvojic
          pod seznamem her mimo displej a po zahájení kola se k ní nedalo
          vrátit. */}
      <button type="button" className="secondary-button" onClick={onOpenPairing}>
        {pairingLabel ?? t('setup.pairsChoose')}
      </button>
    </section>
  ) : null

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
          <h1>{t('setup.stepGameTitle')}</h1>
        </div>
        <p className="subtitle">
          {editing ? t('setup.editRoundSubtitle') : t('setup.subtitle')}
        </p>
      </header>

      <main className="content">
        {editing && pairingSection}

        <section className="section">
          <h2 className="section-title">{t('setup.game')}</h2>
          <div className="game-list">
            {availableGames.map((g) => (
              <div key={g.id} className="game-choice">
                <button
                  type="button"
                  className={`game-card${g.id === gameId ? ' selected' : ''}`}
                  onClick={() => onGameIdChange(g.id)}
                  aria-pressed={g.id === gameId}
                >
                  <span className="game-name">
                    {t(`games.${g.id}.name` as MessageKey)}
                  </span>
                  <span className="game-tagline">
                    {t(`games.${g.id}.tagline` as MessageKey)}
                  </span>
                </button>
                <button
                  type="button"
                  className="game-settings-button"
                  onClick={() => onOpenGameSettings(g.id)}
                  aria-label={t('setup.gameSettingsFor', {
                    name: t(`games.${g.id}.name` as MessageKey),
                  })}
                  title={t('setup.gameSettingsFor', {
                    name: t(`games.${g.id}.name` as MessageKey),
                  })}
                >
                  <span aria-hidden="true">⚙</span>
                </button>
              </div>
            ))}
          </div>
          {gameValid && (
            <p className="hint">{t(`games.${game.id}.rules` as MessageKey)}</p>
          )}
        </section>

        {!editing && pairingSection}
      </main>

      <footer className="app-footer">
        <button type="button" className="primary-button" onClick={onNext}>
          {editing ? t('setup.backToRound') : t('setup.next')}
        </button>
      </footer>
    </div>
  )
}
