import { Fragment, useState } from 'react'
import type { BonusId, DotVariant, GameOptions, ResultTier } from '../types'
import { BONUSES, RESULT_TIERS } from '../types'
import { getGame } from '../games'
import { NINE_DOT, SIX_DOT } from '../games/dots'
import { loadGameOptions, saveGameOptions } from '../storage'
import { dynamicKey, useT } from '../i18n'
import type { MessageKey } from '../i18n'

interface Props {
  gameId: string
  onBack: () => void
}

/** Varianty hry Dots; liší se jen tabulkou bodů (viz src/games/dots.ts). */
const DOT_VARIANTS: { id: DotVariant; key: MessageKey }[] = [
  { id: 'nine', key: 'gameSettings.dotVariantNine' },
  { id: 'six', key: 'gameSettings.dotVariantSix' },
]

/** Kolik bodů je na jamce v sázce - dosazuje se do popisků obou nadstaveb. */
function dotPointsPerHole(variant: DotVariant): number {
  return (variant === 'six' ? SIX_DOT : NINE_DOT).perHole
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
 * Každá hra má vlastní uložené nastavení, takže Best + Součet a Skins si
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
  /** Potvrzuje tahle hra vůbec Longest nebo Nearest? */
  const confirmsExclusive = scoring.confirmLongest || scoring.confirmNearest
  const hasOtherOptions =
    multiplierBonuses.length > 0 ||
    game.supportsDoubleHoles ||
    scoring.noDoubleBonuses ||
    confirmsExclusive ||
    scoring.confirmSkinsByPar === true ||
    scoring.sweepOnTwoStrokes === true
  const hasScoringOptions =
    pointBonuses.length > 0 ||
    scoring.resultMultipliers ||
    scoring.dotVariant === true ||
    hasOtherOptions
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
        {/* Úvod mluví o hodnotách extra bodů, takže u hry bez nich nedává smysl. */}
        {pointBonuses.length > 0 && (
          <p className="hint">
            {scoring.bonusScope === 'team'
              ? t('gameSettings.introTeam')
              : t('gameSettings.introPlayer')}
          </p>
        )}

        {/* U her, kde extra body nejsou součástí bodování, je potřeba říct,
            že se o ně hraje teprve po zadání hodnoty - nula znamená vypnuto. */}
        {scoring.bonusesAsSideBet && <p className="hint">{t('sideBets.settingsHint')}</p>}

        {scoring.dotVariant && (
          <section className="section">
            <h2 className="section-title">{t('gameSettings.dotVariant')}</h2>
            <div className="segmented">
              {DOT_VARIANTS.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  className={`segment${options.dotVariant === variant.id ? ' selected' : ''}`}
                  onClick={() => update({ ...options, dotVariant: variant.id })}
                  aria-pressed={options.dotVariant === variant.id}
                >
                  {t(variant.key)}
                </button>
              ))}
            </div>
            <p className="hint">{t('gameSettings.dotVariantNote')}</p>
          </section>
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

            {/* Bez zaškrtnutí platí násobič jen za skutečné birdie a lepší;
                se zaškrtnutím se v netto kole bere osobní par. */}
            <label className="switch">
              <input
                type="checkbox"
                checked={options.multipliersWithHandicap}
                onChange={(e) =>
                  update({ ...options, multipliersWithHandicap: e.target.checked })
                }
              />
              <span>{t('gameSettings.multipliersWithHandicap')}</span>
            </label>
            <p className="hint">{t('gameSettings.multipliersWithHandicapNote')}</p>
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

            {/* Nabízí se, i když se zrovna hraje brutto - nastavení hry se
                otevírá dřív, než je jasné, jestli se zapne netto. */}
            {confirmsExclusive && (
              <label className="switch">
                <input
                  type="checkbox"
                  checked={options.confirmByPersonalPar}
                  onChange={(e) =>
                    update({ ...options, confirmByPersonalPar: e.target.checked })
                  }
                />
                <span>
                  {t('gameSettings.confirmByPersonalPar')}
                  <em> {t('gameSettings.confirmByPersonalParNote')}</em>
                </span>
              </label>
            )}

            {scoring.confirmSkinsByPar && (
              <label className="switch">
                <input
                  type="checkbox"
                  checked={options.confirmSkinsByPar}
                  onChange={(e) =>
                    update({ ...options, confirmSkinsByPar: e.target.checked })
                  }
                />
                <span>
                  {t('gameSettings.confirmSkinsByPar')}
                  <em> {t('gameSettings.confirmSkinsByParNote')}</em>
                </span>
              </label>
            )}

            {scoring.sweepOnTwoStrokes && (
              <label className="switch">
                <input
                  type="checkbox"
                  checked={options.sweepOnTwoStrokes}
                  onChange={(e) =>
                    update({
                      ...options,
                      sweepOnTwoStrokes: e.target.checked,
                      // Zdvojnásobení nemá bez čeho zdvojnásobit; vypnutím
                      // hlavní volby se proto vypíná i nadstavba nad ní.
                      ...(e.target.checked ? {} : { doubleSweepOnBirdie: false }),
                    })
                  }
                />
                <span>
                  {t('gameSettings.sweepOnTwoStrokes', {
                    count: dotPointsPerHole(options.dotVariant),
                  })}
                  <em> {t('gameSettings.sweepOnTwoStrokesNote')}</em>
                </span>
              </label>
            )}

            {scoring.doubleSweepOnBirdie && options.sweepOnTwoStrokes && (
              <label className="switch">
                <input
                  type="checkbox"
                  checked={options.doubleSweepOnBirdie}
                  onChange={(e) =>
                    update({ ...options, doubleSweepOnBirdie: e.target.checked })
                  }
                />
                <span>
                  {t('gameSettings.doubleSweepOnBirdie', {
                    count: dotPointsPerHole(options.dotVariant) * 2,
                  })}
                  <em> {t('gameSettings.doubleSweepOnBirdieNote')}</em>
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
      </footer>
    </div>
  )
}
