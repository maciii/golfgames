import { Fragment, useState } from 'react'
import type { BonusId, GameOptions, ResultTier } from '../types'
import { BONUSES, RESULT_TIERS } from '../types'
import { getGame } from '../games'
import { loadGameOptions, saveGameOptions } from '../storage'
import { APP_VERSION } from '../version'
import { dynamicKey, useT } from '../i18n'
import type { MessageKey } from '../i18n'

interface Props {
  gameId: string
  onBack: () => void
}

interface NumberControlProps {
  value: string
  suffix: string
  inputLabel: string
  decreaseLabel: string
  increaseLabel: string
  onChange: (value: string) => void
  onBlur: () => void
  onStep: (amount: number) => void
}

function NumberControl({
  value,
  suffix,
  inputLabel,
  decreaseLabel,
  increaseLabel,
  onChange,
  onBlur,
  onStep,
}: NumberControlProps) {
  return (
    <span className="value-control">
      <button
        type="button"
        className="value-step"
        onClick={() => onStep(-1)}
        aria-label={decreaseLabel}
        title={decreaseLabel}
      >
        −
      </button>
      <input
        className="name-input value-input"
        type="text"
        inputMode="decimal"
        enterKeyHint="done"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-label={inputLabel}
      />
      <button
        type="button"
        className="value-step"
        onClick={() => onStep(1)}
        aria-label={increaseLabel}
        title={increaseLabel}
      >
        +
      </button>
      <span className="field-suffix">{suffix}</span>
    </span>
  )
}

/**
 * Nastavení bodování konkrétní hry: hodnoty extra bodů a volby navíc.
 *
 * Každá hra má vlastní uložené nastavení, takže Best Aggregate a Skins si
 * nepřepisují hodnoty navzájem.
 */
export default function GameSettingsScreen({ gameId, onBack }: Props) {
  const t = useT()
  const game = getGame(gameId)
  const scoring = game.scoringOptions
  const [options, setOptions] = useState<GameOptions>(() => loadGameOptions(gameId))
  /** Rozepsané hodnoty držíme jako text, ať jde políčko vymazat. */
  const [texts, setTexts] = useState<Record<string, string>>(() => {
    const initial = loadGameOptions(gameId)
    const entries = BONUSES.filter((b) => scoring.bonusIds.includes(b.id)).map((b) => [
      b.id,
      `${initial.bonusValues[b.id] ?? 0}`,
    ])
    const tiers = scoring.resultMultipliers
      ? RESULT_TIERS.map((t) => [`tier-${t.id}`, `${initial.resultMultipliers[t.id]}`])
      : []
    return Object.fromEntries([
      ...entries,
      ...tiers,
      ...(scoring.doubleBest ? [['doubleBest', `${initial.doubleBest}`]] : []),
    ])
  })

  function update(next: GameOptions) {
    setOptions(next)
    saveGameOptions(gameId, next)
  }

  function parse(text: string): number {
    const parsed = Number.parseFloat(text.replace(',', '.'))
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
  }

  function setValue(key: BonusId | 'doubleBest', text: string) {
    setTexts((prev) => ({ ...prev, [key]: text }))
    const value = parse(text)

    if (key === 'doubleBest') update({ ...options, doubleBest: value })
    else update({ ...options, bonusValues: { ...options.bonusValues, [key]: value } })
  }

  function stepValue(key: BonusId | 'doubleBest', amount: number) {
    const current = parse(texts[key] ?? '')
    setValue(key, `${Math.max(0, current + amount)}`)
  }

  function normalizeValue(key: BonusId | 'doubleBest') {
    setValue(key, `${parse(texts[key] ?? '')}`)
  }

  function setTier(tier: ResultTier, text: string) {
    setTexts((prev) => ({ ...prev, [`tier-${tier}`]: text }))
    update({
      ...options,
      resultMultipliers: { ...options.resultMultipliers, [tier]: parse(text) },
    })
  }

  function stepTier(tier: ResultTier, amount: number) {
    const key = `tier-${tier}`
    const current = parse(texts[key] ?? '')
    setTier(tier, `${Math.max(0, current + amount)}`)
  }

  function normalizeTier(tier: ResultTier) {
    setTier(tier, `${parse(texts[`tier-${tier}`] ?? '')}`)
  }

  const pointBonuses = BONUSES.filter(
    (b) => b.kind === 'points' && scoring.bonusIds.includes(b.id),
  )
  const multiplierBonuses = BONUSES.filter(
    (b) => b.kind === 'multiplier' && scoring.bonusIds.includes(b.id),
  )
  const hasOtherOptions =
    multiplierBonuses.length > 0 ||
    game.supportsDoubleHoles ||
    scoring.noDoubleBonuses ||
    scoring.confirmLongest ||
    scoring.confirmNearest
  const hasScoringOptions =
    pointBonuses.length > 0 || scoring.resultMultipliers || hasOtherOptions
  const confirmNote =
    scoring.bonusScope === 'team'
      ? t('gameSettings.confirmNote')
      : t('gameSettings.confirmPlayerNote')

  return (
    <div className="screen">
      <header className="app-header">
        <h1>{t('gameSettings.title')}</h1>
        <p className="subtitle">{t(`games.${game.id}.name` as MessageKey)}</p>
      </header>

      <main className="content">
        {hasScoringOptions && (
          <p className="hint">
            {scoring.bonusScope === 'team'
              ? t('gameSettings.introTeam')
              : t('gameSettings.introPlayer')}
          </p>
        )}

        {pointBonuses.length > 0 && (
          <section className="section">
            <h2 className="section-title">{t('gameSettings.extraPoints')}</h2>
            {pointBonuses.map((bonus) => (
              <Fragment key={bonus.id}>
                <label className="field">
                  <span className="field-label">
                    {t(dynamicKey('bonus', bonus.id, 'name'))}
                    <span className="field-note">
                      {t(dynamicKey('bonus', bonus.id, 'description'))}
                    </span>
                  </span>
                  <NumberControl
                    value={texts[bonus.id] ?? '0'}
                    suffix={t('gameSettings.pointsSuffix')}
                    inputLabel={t('gameSettings.bonusValue', {
                      name: t(dynamicKey('bonus', bonus.id, 'name')),
                    })}
                    decreaseLabel={t('gameSettings.decreaseValue', {
                      name: t(dynamicKey('bonus', bonus.id, 'name')),
                    })}
                    increaseLabel={t('gameSettings.increaseValue', {
                      name: t(dynamicKey('bonus', bonus.id, 'name')),
                    })}
                    onChange={(text) => setValue(bonus.id, text)}
                    onBlur={() => normalizeValue(bonus.id)}
                    onStep={(amount) => stepValue(bonus.id, amount)}
                  />
                </label>
                {bonus.id === 'nearest' && scoring.doubleBest && (
                  <label className="field">
                    <span className="field-label">
                      {t('gameSettings.doubleBest')}
                      <span className="field-note">
                        {t('gameSettings.doubleBestNote')}
                      </span>
                    </span>
                    <NumberControl
                      value={texts.doubleBest ?? '0'}
                      suffix={t('gameSettings.pointsSuffix')}
                      inputLabel={t('gameSettings.doubleBestValue')}
                      decreaseLabel={t('gameSettings.decreaseValue', {
                        name: t('gameSettings.doubleBest'),
                      })}
                      increaseLabel={t('gameSettings.increaseValue', {
                        name: t('gameSettings.doubleBest'),
                      })}
                      onChange={(text) => setValue('doubleBest', text)}
                      onBlur={() => normalizeValue('doubleBest')}
                      onStep={(amount) => stepValue('doubleBest', amount)}
                    />
                  </label>
                )}
              </Fragment>
            ))}
          </section>
        )}

        {scoring.resultMultipliers && (
          <section className="section">
            <h2 className="section-title">{t('gameSettings.multipliers')}</h2>
            <p className="hint">{t('gameSettings.multipliersHint')}</p>
            {RESULT_TIERS.map((tier) => (
              <label key={tier.id} className="field">
                <span className="field-label">
                  {t(dynamicKey('tier', tier.id, 'name'))}
                  <span className="field-note">
                    {t(dynamicKey('tier', tier.id, 'note'))}
                  </span>
                </span>
                <NumberControl
                  value={texts[`tier-${tier.id}`] ?? '1'}
                  suffix="×"
                  inputLabel={t('gameSettings.multiplierFor', {
                    name: t(dynamicKey('tier', tier.id, 'name')),
                  })}
                  decreaseLabel={t('gameSettings.decreaseValue', {
                    name: t(dynamicKey('tier', tier.id, 'name')),
                  })}
                  increaseLabel={t('gameSettings.increaseValue', {
                    name: t(dynamicKey('tier', tier.id, 'name')),
                  })}
                  onChange={(text) => setTier(tier.id, text)}
                  onBlur={() => normalizeTier(tier.id)}
                  onStep={(amount) => stepTier(tier.id, amount)}
                />
              </label>
            ))}
          </section>
        )}

        {hasOtherOptions && (
          <section className="section">
            <h2 className="section-title">{t('gameSettings.otherOptions')}</h2>
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
                  {t(dynamicKey('bonus', bonus.id, 'name'))}
                  <em> {t(dynamicKey('bonus', bonus.id, 'description'))}</em>
                </span>
              </label>
            ))}

            {game.supportsDoubleHoles && (
              <label className="switch">
                <input
                  type="checkbox"
                  checked={options.doubleClosingHoles}
                  onChange={(e) =>
                    update({ ...options, doubleClosingHoles: e.target.checked })
                  }
                />
                <span>
                  {t('gameSettings.doubleClosing')}
                  <em> {t('gameSettings.doubleClosingNote')}</em>
                </span>
              </label>
            )}

            {scoring.noDoubleBonuses && (
              <label className="switch">
                <input
                  type="checkbox"
                  checked={options.noDoubleBonuses}
                  onChange={(e) =>
                    update({ ...options, noDoubleBonuses: e.target.checked })
                  }
                />
                <span>
                  {t('gameSettings.noDoubleBonuses')}
                  <em> {t('gameSettings.noDoubleBonusesNote')}</em>
                </span>
              </label>
            )}

            {scoring.confirmLongest && (
              <label className="switch">
                <input
                  type="checkbox"
                  checked={options.confirmLongest}
                  onChange={(e) =>
                    update({ ...options, confirmLongest: e.target.checked })
                  }
                />
                <span>
                  {t('gameSettings.confirmLongest')}
                  <em> {confirmNote}</em>
                </span>
              </label>
            )}

            {scoring.confirmNearest && (
              <label className="switch">
                <input
                  type="checkbox"
                  checked={options.confirmNearest}
                  onChange={(e) =>
                    update({ ...options, confirmNearest: e.target.checked })
                  }
                />
                <span>
                  {t('gameSettings.confirmNearest')}
                  <em> {confirmNote}</em>
                </span>
              </label>
            )}
          </section>
        )}

        {!hasScoringOptions && <p className="notice">{t('gameSettings.noOptions')}</p>}
      </main>

      <footer className="app-footer">
        <button type="button" className="primary-button" onClick={onBack}>
          {t('common.done')}
        </button>
        <p className="version">{t('common.version', { version: APP_VERSION })}</p>
      </footer>
    </div>
  )
}
