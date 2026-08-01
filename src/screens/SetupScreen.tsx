import { useState } from 'react'
import { DEFAULT_GAME_ID, GAMES, getGame } from '../games'

const MAX_PLAYERS = 4
const HOLE_OPTIONS = [9, 18]

/** Tři možná rozdělení čtyř hráčů do dvojic. */
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
}

export default function SetupScreen({ onStart }: Props) {
  const [gameId, setGameId] = useState(DEFAULT_GAME_ID)
  const [playerCount, setPlayerCount] = useState(getGame(DEFAULT_GAME_ID).playerCounts[0] ?? 2)
  const [names, setNames] = useState<string[]>(Array(MAX_PLAYERS).fill(''))
  const [holeCount, setHoleCount] = useState(18)
  const [pairing, setPairing] = useState(0)

  const game = getGame(gameId)
  const displayName = (index: number) => names[index]?.trim() || `Hráč ${index + 1}`
  const needsPairing = game.teamBased && playerCount === 4

  function selectGame(id: string) {
    setGameId(id)
    const next = getGame(id)
    // Přepnutí hry nesmí nechat nepovolený počet hráčů.
    if (!next.playerCounts.includes(playerCount)) {
      setPlayerCount(next.playerCounts[0] ?? 2)
    }
  }

  function updateName(index: number, value: string) {
    setNames((prev) => prev.map((n, i) => (i === index ? value : n)))
  }

  function start() {
    let teamIndices: number[][] | undefined
    if (game.teamBased) {
      teamIndices = playerCount === 4 ? PAIRINGS[pairing] : [[0, 1]]
    }
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

        {game.teamBased && playerCount === 2 && (
          <p className="hint">
            Dva hráči tvoří jednu dvojici – uvidíš její lepší míč i součet, ale
            bez soupeřícího týmu. Pro souboj dvojic zvol 4 hráče.
          </p>
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
      </main>

      <footer className="app-footer">
        <button type="button" className="primary-button" onClick={start}>
          Začít kolo
        </button>
      </footer>
    </div>
  )
}
