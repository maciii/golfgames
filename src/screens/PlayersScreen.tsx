import { useState } from 'react'
import type { RosterEntry } from '../storage'
import {
  addToRoster,
  loadRoster,
  removeFromRoster,
  setRosterHandicap,
  toggleRosterFavorite,
} from '../storage'
import { useT } from '../i18n'
import { formatHandicapIndex, parseHandicapIndex } from '../handicap'
import { BackIcon } from './icons'

interface Props {
  onBack: () => void
}

/**
 * Správa uložených spoluhráčů: kdo je zvýrazněný na domovské obrazovce,
 * handicapový index, přidání a smazání.
 *
 * Appka žádnou databázi hráčů nemá kam napojit - ČGF veřejné vyhledávání
 * kvůli GDPR zrušilo v roce 2018 a Týčko má na svá data jen uzavřené
 * partnerství, ne otevřené API. Seznam proto zůstává čistě lokální.
 */
export default function PlayersScreen({ onBack }: Props) {
  const t = useT()
  const [roster, setRoster] = useState<RosterEntry[]>(() => loadRoster())
  const [handicapText, setHandicapText] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      loadRoster().map((entry) => [entry.id, formatHandicapIndex(entry.handicapIndex)]),
    ),
  )
  const [newName, setNewName] = useState('')
  const [newHandicap, setNewHandicap] = useState('')

  function toggleFavorite(entryId: string) {
    setRoster(toggleRosterFavorite(entryId))
  }

  function commitHandicap(entryId: string) {
    const value = parseHandicapIndex(handicapText[entryId] ?? '')
    setRoster(setRosterHandicap(entryId, value))
    // Zpětně dosadí naformátovanou hodnotu - ať zadání "30,1" i "30.1"
    // skončí na displeji stejně.
    setHandicapText((prev) => ({ ...prev, [entryId]: formatHandicapIndex(value) }))
  }

  function remove(entry: RosterEntry) {
    if (!confirm(t('players.removeConfirm', { name: entry.name }))) return
    setRoster(removeFromRoster(entry.id))
  }

  function addPlayer() {
    const name = newName.trim()
    if (!name) return
    const handicapIndex = parseHandicapIndex(newHandicap)
    const updated = addToRoster(
      [name],
      handicapIndex === undefined ? undefined : [handicapIndex],
    )
    setRoster(updated)
    const added = updated.find((entry) => entry.name.toLowerCase() === name.toLowerCase())
    if (added) {
      setHandicapText((prev) => ({
        ...prev,
        [added.id]: formatHandicapIndex(handicapIndex),
      }))
    }
    setNewName('')
    setNewHandicap('')
  }

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
          <h1>{t('players.title')}</h1>
        </div>
        <p className="subtitle">
          {roster.length === 0
            ? t('players.empty')
            : t('players.count', { count: roster.length })}
        </p>
      </header>

      <main className="content">
        <form
          className="players-add-row"
          onSubmit={(e) => {
            e.preventDefault()
            addPlayer()
          }}
        >
          <input
            className="name-input"
            type="text"
            placeholder={t('players.namePlaceholder')}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            aria-label={t('players.namePlaceholder')}
          />
          <input
            className="name-input value-input"
            type="text"
            inputMode="decimal"
            placeholder={t('players.hcpPlaceholder')}
            value={newHandicap}
            onChange={(e) => setNewHandicap(e.target.value)}
            aria-label={t('players.hcpPlaceholder')}
          />
          <button
            type="submit"
            className="icon-button players-add-button"
            disabled={!newName.trim()}
            aria-label={t('players.add')}
          >
            <span aria-hidden="true">+</span>
          </button>
        </form>

        {roster.length === 0 ? (
          <p className="hint">{t('players.emptyHint')}</p>
        ) : (
          <ul className="players-list">
            {roster.map((entry) => (
              <li key={entry.id} className="players-row">
                <button
                  type="button"
                  className={`favorite-star${entry.favorite ? ' active' : ''}`}
                  onClick={() => toggleFavorite(entry.id)}
                  aria-label={
                    entry.favorite
                      ? t('players.removeFavorite', { name: entry.name })
                      : t('players.addFavorite', { name: entry.name })
                  }
                  aria-pressed={Boolean(entry.favorite)}
                >
                  {entry.favorite ? '★' : '☆'}
                </button>
                <span className="players-name">{entry.name}</span>
                <input
                  className="name-input value-input players-hcp"
                  type="text"
                  inputMode="decimal"
                  placeholder={t('players.hcpPlaceholder')}
                  value={handicapText[entry.id] ?? ''}
                  onChange={(e) =>
                    setHandicapText((prev) => ({ ...prev, [entry.id]: e.target.value }))
                  }
                  onBlur={() => commitHandicap(entry.id)}
                  aria-label={t('players.hcpFor', { name: entry.name })}
                />
                <button
                  type="button"
                  className="players-remove"
                  onClick={() => remove(entry)}
                  aria-label={t('players.remove', { name: entry.name })}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
