import { useState } from 'react'
import { DEFAULT_GAME_ID, GAMES, getGame } from '../games'
import type { RosterEntry } from '../storage'
import { loadRoster, removeFromRoster } from '../storage'
import { APP_VERSION } from '../version'

const MAX_PLAYERS = 4
const HOLE_OPTIONS = [9, 18]

/**
 * Tři možná rozdělení čtyř hráčů do dvojic. Víc jich neexistuje - u čtyř
 * hráčů určuje dvojice už jen to, koho dostane první hráč za partnera.
 */
const PAIRINGS: number[][][] = [
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
  onStart: (
    gameId: string,
    playerNames: string[],
    holeCount: number,
    teamIndices?: number[][],
  ) => void
  onOpenArchive: () => void
  archiveCount: number
}

/** Nastavení nového kola: hra, hráči, dvojice a počet jamek. */
export default function SetupScreen({ onStart, onOpenArchive, archiveCount }: Props) {
  const [gameId, setGameId] = useState(DEFAULT_GAME_ID)
  const [playerCount, setPlayerCount] = useState(
    getGame(DEFAULT_GAME_ID).playerCounts[0] ?? 2,
  )
  const [names, setNames] = useState<string[]>(Array(MAX_PLAYERS).fill(''))
  const [holeCount, setHoleCount] = useState(18)
  const [pairing, setPairing] = useState(0)
  const [roster, setRoster] = useState<RosterEntry[]>(() => loadRoster())
  const [rosterEditing, setRosterEditing] = useState(false)

  const game = getGame(gameId)
  const usesTeams = game.usesTeams(playerCount)
  const needsPairing = usesTeams && playerCount === 4
  const displayName = (index: number) => names[index]?.trim() || `Hráč ${index + 1}`

  function selectGame(id: string) {
    setGameId(id)
    const next = getGame(id)
    // Přepnutí hry nesmí nechat počet hráčů, který daná hra nepodporuje.
    if (!next.playerCounts.includes(playerCount)) {
      setPlayerCount(next.playerCounts[0] ?? 2)
    }
  }

  function updateName(index: number, value: string) {
    setNames((prev) => prev.map((n, i) => (i === index ? value : n)))
  }

  /** Klepnutí na uloženého hráče ho doplní do prvního volného políčka. */
  function useRosterName(name: string) {
    setNames((prev) => {
      const slot = prev.slice(0, playerCount).findIndex((n) => !n.trim())
      if (slot === -1) return prev
      return prev.map((n, i) => (i === slot ? name : n))
    })
  }

  function forgetPlayer(entry: RosterEntry) {
    setRoster(removeFromRoster(entry.id))
  }

  /** Jména, která už jsou rozepsaná, se v nabídce nenabízejí podruhé. */
  const used = new Set(
    names
      .slice(0, playerCount)
      .map((n) => n.trim().toLowerCase())
      .filter(Boolean),
  )
  const available = roster.filter((entry) => !used.has(entry.name.trim().toLowerCase()))

  function start() {
    const teamIndices = usesTeams
      ? playerCount === 4
        ? PAIRINGS[pairing]
        : [[0, 1]]
      : undefined
    onStart(gameId, names.slice(0, playerCount), holeCount, teamIndices)
  }

  return (
    <div className="screen">
      <header className="app-header">
        <h1>Golf Games</h1>
        <p className="subtitle">Nové kolo</p>
      </header>

      <main className="content">
        <section className="section">
          <h2 className="section-title">Hra</h2>
          <div className="game-list">
            {GAMES.map((g) => (
              <button
                key={g.id}
                type="button"
                className={`game-card${g.id === gameId ? ' selected' : ''}`}
                onClick={() => selectGame(g.id)}
                aria-pressed={g.id === gameId}
              >
                <span className="game-name">{g.name}</span>
                <span className="game-tagline">{g.tagline}</span>
              </button>
            ))}
          </div>
          <p className="hint">{game.rules}</p>
        </section>

        <section className="section">
          <h2 className="section-title">Hráči</h2>
          {game.playerCounts.length > 1 ? (
            <div className="segmented">
              {game.playerCounts.map((count) => (
                <button
                  key={count}
                  type="button"
                  className={`segment${count === playerCount ? ' selected' : ''}`}
                  onClick={() => setPlayerCount(count)}
                  aria-pressed={count === playerCount}
                >
                  {count}
                </button>
              ))}
            </div>
          ) : (
            <p className="hint">Tahle hra se hraje vždy ve {playerCount} hráčích.</p>
          )}

          <div className="name-list">
            {Array.from({ length: playerCount }, (_, i) => (
              <input
                key={i}
                className="name-input"
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="words"
                placeholder={`Hráč ${i + 1}`}
                value={names[i] ?? ''}
                onChange={(e) => updateName(i, e.target.value)}
              />
            ))}
          </div>

          {roster.length > 0 && (
            <div className="roster">
              <div className="roster-head">
                <span className="roster-label">Uložení hráči</span>
                <button
                  type="button"
                  className="roster-toggle"
                  onClick={() => setRosterEditing((v) => !v)}
                >
                  {rosterEditing ? 'Hotovo' : 'Upravit'}
                </button>
              </div>
              <div className="chip-row">
                {(rosterEditing ? roster : available).map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className={`chip${rosterEditing ? ' removable' : ''}`}
                    onClick={() =>
                      rosterEditing ? forgetPlayer(entry) : useRosterName(entry.name)
                    }
                    aria-label={
                      rosterEditing
                        ? `Odebrat ${entry.name} ze seznamu`
                        : `Přidat ${entry.name} do kola`
                    }
                  >
                    {entry.name}
                    {rosterEditing && <span className="chip-x">×</span>}
                  </button>
                ))}
                {!rosterEditing && available.length === 0 && (
                  <span className="hint">Všichni uložení hráči už jsou v kole.</span>
                )}
              </div>
            </div>
          )}
        </section>

        {needsPairing && (
          <section className="section">
            <h2 className="section-title">Dvojice</h2>
            <div className="game-list">
              {PAIRINGS.map((option, index) => (
                <button
                  key={index}
                  type="button"
                  className={`game-card${index === pairing ? ' selected' : ''}`}
                  onClick={() => setPairing(index)}
                  aria-pressed={index === pairing}
                >
                  <span className="pairing-line">
                    {(option[0] ?? []).map(displayName).join(' + ')}
                    <span className="pairing-vs">vs</span>
                    {(option[1] ?? []).map(displayName).join(' + ')}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="section">
          <h2 className="section-title">Počet jamek</h2>
          <div className="segmented">
            {HOLE_OPTIONS.map((count) => (
              <button
                key={count}
                type="button"
                className={`segment${count === holeCount ? ' selected' : ''}`}
                onClick={() => setHoleCount(count)}
                aria-pressed={count === holeCount}
              >
                {count}
              </button>
            ))}
          </div>
          <p className="hint">Par každé jamky nastavíš přímo při hře.</p>
        </section>

        <button type="button" className="link-button" onClick={onOpenArchive}>
          Archiv odehraných kol{archiveCount > 0 ? ` (${archiveCount})` : ''}
        </button>
      </main>

      <footer className="app-footer">
        <button type="button" className="primary-button" onClick={start}>
          Začít kolo
        </button>
        <p className="version">verze {APP_VERSION}</p>
      </footer>
    </div>
  )
}
