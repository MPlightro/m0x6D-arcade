import React from 'react';
import './Home.css';

const GAMES = [
  {
    id: 'flappy-bird',
    title: 'Flappy Bird',
    description: 'Tap to fly. Dodge the pipes. Classic.',
    icon: '🐦',
    status: 'play',
    accent: '#e8ff47',
  },
  {
    id: 'snake',
    title: 'Snake',
    description: 'Eat, grow, survive.',
    icon: '🐍',
    status: 'soon',
    accent: '#47ffa0',
  },
  {
    id: 'tetris',
    title: 'Tetris',
    description: 'Stack blocks, clear lines.',
    icon: '🧩',
    status: 'soon',
    accent: '#ff47e8',
  },
  {
    id: 'pong',
    title: 'Pong',
    description: 'The original. Two paddles. One ball.',
    icon: '🏓',
    status: 'soon',
    accent: '#47c8ff',
  },
  {
    id: 'minesweeper',
    title: 'Minesweeper',
    description: 'Find the mines. Or don\'t.',
    icon: '💣',
    status: 'soon',
    accent: '#ff6b47',
  },
  {
    id: 'wordle',
    title: 'Word Game',
    description: 'Guess the word in 6 tries.',
    icon: '🔤',
    status: 'soon',
    accent: '#ffe047',
  },
];

export default function Home({ navigate }) {
  return (
    <div className="home">
      <header className="home-header">
        <div className="home-title-block">
          <span className="home-tag">// ARCADE</span>
          <h1 className="home-title">GAME<br />HUB</h1>
          <p className="home-subtitle">Pick a game. Start playing.</p>
        </div>
        <div className="home-scanline" aria-hidden />
      </header>

      <main className="home-grid">
        {GAMES.map((game) => (
          <GameCard key={game.id} game={game} navigate={navigate} />
        ))}
      </main>

      <footer className="home-footer">
        <span>More games coming soon</span>
      </footer>
    </div>
  );
}

function GameCard({ game, navigate }) {
  const isPlayable = game.status === 'play';

  return (
    <div
      className={`game-card ${isPlayable ? 'playable' : 'placeholder'}`}
      style={{ '--card-accent': game.accent }}
      onClick={() => isPlayable && navigate(game.id)}
    >
      <div className="card-icon">{game.icon}</div>
      <div className="card-content">
        <h2 className="card-title">{game.title}</h2>
        <p className="card-desc">{game.description}</p>
      </div>
      <div className="card-status">
        {isPlayable ? (
          <button className="play-btn">PLAY →</button>
        ) : (
          <span className="soon-badge">SOON</span>
        )}
      </div>
      <div className="card-corner" aria-hidden />
    </div>
  );
}
