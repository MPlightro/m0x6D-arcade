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
    status: 'play',
    accent: '#47ffa0',
  },
  {
    id: 'tetris',
    title: 'Tetris',
    description: 'Stack blocks, clear lines.',
    icon: '🧩',
    status: 'play',
    accent: '#ff47e8',
  },
  {
    id: 'pong',
    title: 'Pong',
    description: 'The original. Two paddles. One ball.',
    icon: '🏓',
    status: 'play',
    accent: '#47c8ff',
  },
  {
    id: 'minesweeper',
    title: 'Minesweeper',
    description: 'Find the mines. Or don\'t.',
    icon: '💣',
    status: 'play',
    accent: '#ff6b47',
  },
  {
    id: 'wordle',
    title: 'Word Game',
    description: 'Guess the word in 6 tries.',
    icon: '🔤',
    status: 'play',
    accent: '#ffe047',
  },
    {
    id: 'gd-arrow',
    title: 'Geometry Arrow',
    description: 'Navigate the arrow through geometric mazes.',
    icon: '↗️',
    status: 'play',
    accent: '#ffe047',
  },
  {
    id: 'memory-match',
    title: 'Memory Match',
    description: 'Flip cards. Find the pairs. Beat your best.',
    icon: '🃏',
    status: 'play',
    accent: '#c47aff',
  },
  {
    id: 'higher-lower',
    title: 'Higher or Lower',
    description: 'Guess the next number. Build your streak.',
    icon: '🎲',
    status: 'play',
    accent: '#47ffa0',
  },
  {
    id: 'whack-mole',
    title: 'Whack-a-Mole',
    description: 'Click moles fast. Watch for bombs.',
    icon: '🐹',
    status: 'play',
    accent: '#ff8c47',
  },
  {
    id: 'game-2048',
    title: '2048',
    description: 'Slide tiles. Merge numbers. Hit 2048.',
    icon: '🔢',
    status: 'play',
    accent: '#47c8ff',
  },
  {
    id: 'alchemy-shop',
    title: 'Alchemy Shop',
    description: 'Brew potions. Sell them. Buy upgrades. Idle.',
    icon: '⚗️',
    status: 'play',
    accent: '#9bff47',
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