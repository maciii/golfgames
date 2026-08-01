import { useState } from 'react'
import { DEFAULT_GAME_ID, GAMES, getGame } from '../games'

const MAX_PLAYERS = 4
const HOLE_OPTIONS = [9, 18]

interface Props {
  onStart: (gameId: string, playerNames: string[], holeCount: number) => void
}

export default function SetupScreen({ onStart }: Props) {
  const [gameId, setGameId] = useState(DEFAULT_GAME_ID)
  const [playerCount, setPlayerCount] = useState(2)
  const [names, setNames] = useState<string[]>(Array(MAX_PLAYERS).fill(''))
  const [holeCount, setHoleCount] = useState(18)

  const game = getGame(gameId)
  const counts = Array.from(
    { length: game.maxPlayers - game.minPlayers + 1 },
    (_, i) => game.minPlayers + i,
  )
  const allowedCounts = game.playerCounts ?? counts

  function selectGame(id: string) {
    setGameId(id)
    const next = getGame(id)
    const allowed = next.playerCounts ?? [
      ...Array.from(
        { length: next.maxPlayers - next.minPlayers + 1 },
        (_, i) => next.minPlayers + i,
      ),
    ]
    // Přepnutí hry nesmí nechat nepovolený počet hráčů.
    if (!allowed.includes(playerCount)) setPlayerCount(allowed[0] ?? 2)
  }

  function updateName(index: number, value: string) {
    setNames((prev) => prev.map((n, i) => (i === index ? value : n)))
  }

  function start() {
    onStart(gameId, names.slice(0, playerCount), holeCount)
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
          <div className="segmented">
            {allowedCounts.map((count) => (
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
        </section>

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
      </main>

      <footer className="app-footer">
        <button type="button" className="primary-button" onClick={start}>
          Začít kolo
        </button>
      </footer>
    </div>
  )
}
