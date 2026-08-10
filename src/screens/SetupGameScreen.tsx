import { useEffect } from 'react'
import { GAMES, getGame } from '../games'
import { useT } from '../i18n'
import type { MessageKey } from '../i18n'
import { BackIcon } from './icons'

/**
 * Tři možná rozdělení čtyř hráčů do dvojic. Víc jich neexistuje - u čtyř
 * hráčů určuje dvojice už jen to, koho dostane první hráč za partnera.
 *
 * Vybírá se tady, ale uplatňuje se až při zakládání kola v `SetupBetScreen`,
 * a to podle indexu do tohohle pole - dvě kopie by se rozešly a hráči by
 * dostali jiné dvojice, než jaké si vybrali.
 */
export const PAIRINGS: number[][][] = [
  [
    [0, 1],
    [2, 3],
  ],
  [
    [0, 2],
    [1, 3],
  ],
  [
    [0, 3],
    [1, 2],
  ],
]

interface Props {
  playerCount: number
  names: string[]
  gameId: string
  onGameIdChange: (value: string) => void
  pairing: number
  onPairingChange: (value: number) => void
  onOpenGameSettings: (gameId: string) => void
  onBack: () => void
  onNext: () => void
}

/**
 * Krok 4 zakládání kola: hra a případně dvojice.
 *
 * Počet hráčů se vybírá dřív (krok Hráči), takže se tu nabízejí jen hry, co
 * ho podporují - ne naopak jako dřív, kdy hra omezovala počet hráčů.
 */
export default function SetupGameScreen({
  playerCount,
  names,
  gameId,
  onGameIdChange,
  pairing,
  onPairingChange,
  onOpenGameSettings,
  onBack,
  onNext,
}: Props) {
  const t = useT()
  const availableGames = GAMES.filter((g) => g.playerCounts.includes(playerCount))
  const game = getGame(gameId)
  const gameValid = availableGames.some((g) => g.id === gameId)
  const usesTeams = game.usesTeams(playerCount)
  const needsPairing = gameValid && usesTeams && playerCount === 4

  // Změna počtu hráčů v předchozím kroku mohla vyřadit dřív zvolenou hru -
  // ať appka pořád má vybranou hru, kterou jde s tímhle počtem hrát.
  useEffect(() => {
    if (!gameValid && availableGames[0]) onGameIdChange(availableGames[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameValid, availableGames[0]?.id])

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
          <h1>{t('setup.stepGameTitle')}</h1>
        </div>
        <p className="subtitle">{t('setup.subtitle')}</p>
      </header>

      <main className="content">
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

        {needsPairing && (
          <section className="section">
            <h2 className="section-title">{t('setup.pairs')}</h2>
            <div className="game-list">
              {PAIRINGS.map((option, index) => (
                <button
                  key={index}
                  type="button"
                  className={`game-card${index === pairing ? ' selected' : ''}`}
                  onClick={() => onPairingChange(index)}
                  aria-pressed={index === pairing}
                >
                  <span className="pairing-line">
                    {(option[0] ?? []).map(displayName).join(' + ')}
                    <span className="pairing-vs">{t('setup.versus')}</span>
                    {(option[1] ?? []).map(displayName).join(' + ')}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="app-footer">
        <button type="button" className="primary-button" onClick={onNext}>
          {t('setup.next')}
        </button>
      </footer>
    </div>
  )
}
