import { useState } from 'react'
import type { BonusId, GameOptions } from '../types'
import { BONUSES } from '../types'
import { getGame } from '../games'
import { loadGameOptions, saveGameOptions } from '../storage'
import { APP_VERSION } from '../version'

interface Props {
  gameId: string
  onBack: () => void
}

/**
 * Nastavení bodování konkrétní hry: hodnoty extra bodů a volby navíc.
 *
 * Každá hra má vlastní uložené nastavení, takže Best Aggregate a Skins si
 * nepřepisují hodnoty navzájem.
 */
export default function GameSettingsScreen({ gameId, onBack }: Props) {
  const game = getGame(gameId)
  const [options, setOptions] = useState<GameOptions>(() => loadGameOptions(gameId))
  /** Rozepsané hodnoty držíme jako text, ať jde políčko vymazat. */
  const [texts, setTexts] = useState<Record<string, string>>(() => {
    const initial = loadGameOptions(gameId)
    const entries = BONUSES.map((b) => [b.id, `${initial.bonusValues[b.id] ?? 0}`])
    return Object.fromEntries([...entries, ['doubleBest', `${initial.doubleBest}`]])
  })

  function update(next: GameOptions) {
    setOptions(next)
    saveGameOptions(gameId, next)
  }

  function setValue(key: BonusId | 'doubleBest', text: string) {
    setTexts((prev) => ({ ...prev, [key]: text }))
    const parsed = Number.parseFloat(text.replace(',', '.'))
    const value = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0

    if (key === 'doubleBest') update({ ...options, doubleBest: value })
    else update({ ...options, bonusValues: { ...options.bonusValues, [key]: value } })
  }

  const pointBonuses = BONUSES.filter((b) => b.kind === 'points')
  const multiplierBonuses = BONUSES.filter((b) => b.kind === 'multiplier')

  return (
    <div className="screen">
      <header className="app-header">
        <h1>Bodování</h1>
        <p className="subtitle">{game.name}</p>
      </header>

      <main className="content">
        <p className="hint">
          Nula znamená vypnuto – takový extra bod se při zápisu vůbec nenabídne. Hodnota
          platí za par, dvojnásobek za birdie a trojnásobek za eagle; při bogey a horším
          se extra bod nepočítá. Bonus vždy získává celá dvojice.
        </p>

        <section className="section">
          <h2 className="section-title">Extra body</h2>
          {pointBonuses.map((bonus) => (
            <label key={bonus.id} className="field">
              <span className="field-label">
                {bonus.name}
                <span className="field-note">{bonus.description}</span>
              </span>
              <span className="field-input">
                <input
                  className="name-input value-input"
                  type="text"
                  inputMode="decimal"
                  value={texts[bonus.id] ?? '0'}
                  onChange={(e) => setValue(bonus.id, e.target.value)}
                  aria-label={`Hodnota bonusu ${bonus.name}`}
                />
                <span className="field-suffix">b.</span>
              </span>
            </label>
          ))}
        </section>

        <section className="section">
          <h2 className="section-title">Násobiče</h2>
          {multiplierBonuses.map((bonus) => (
            <label key={bonus.id} className="switch">
              <input
                type="checkbox"
                checked={(options.bonusValues[bonus.id] ?? 0) > 0}
                onChange={(e) =>
                  update({
                    ...options,
                    bonusValues: {
                      ...options.bonusValues,
                      [bonus.id]: e.target.checked ? 1 : 0,
                    },
                  })
                }
              />
              <span>
                {bonus.name}
                <em> {bonus.description}</em>
              </span>
            </label>
          ))}

          <label className="switch">
            <input
              type="checkbox"
              checked={options.noDoubleBonuses}
              onChange={(e) => update({ ...options, noDoubleBonuses: e.target.checked })}
            />
            <span>
              Nenásobit extra body
              <em> dvojnásobná jamka ani „double“ nenásobí extra body</em>
            </span>
          </label>

          <label className="switch">
            <input
              type="checkbox"
              checked={options.confirmLongest}
              onChange={(e) => update({ ...options, confirmLongest: e.target.checked })}
            />
            <span>
              Potvrzovat Longest
              <em> při horším než par bod propadá soupeřům</em>
            </span>
          </label>

          <label className="switch">
            <input
              type="checkbox"
              checked={options.confirmNearest}
              onChange={(e) => update({ ...options, confirmNearest: e.target.checked })}
            />
            <span>
              Potvrzovat Nearest
              <em> při horším než par bod propadá soupeřům</em>
            </span>
          </label>
        </section>

        {game.id === 'best-aggregate' && (
          <section className="section">
            <h2 className="section-title">Double Best</h2>
            <label className="field">
              <span className="field-label">
                Double Best
                <span className="field-note">
                  Bod navíc, když oba partneři zahráli líp než oba soupeři.
                </span>
              </span>
              <span className="field-input">
                <input
                  className="name-input value-input"
                  type="text"
                  inputMode="decimal"
                  value={texts.doubleBest ?? '0'}
                  onChange={(e) => setValue('doubleBest', e.target.value)}
                  aria-label="Hodnota Double Best"
                />
                <span className="field-suffix">b.</span>
              </span>
            </label>
          </section>
        )}
      </main>

      <footer className="app-footer">
        <button type="button" className="primary-button" onClick={onBack}>
          Hotovo
        </button>
        <p className="version">verze {APP_VERSION}</p>
      </footer>
    </div>
  )
}
