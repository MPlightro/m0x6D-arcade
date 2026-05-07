import React, { useState, useEffect, useCallback } from 'react';
import './MemoryMatch.css';

const ICONS = ['🔥','⚡','💎','🎯','🚀','👾','🎸','🌊','🍄','🦊','🎭','💀','🌙','⭐','🎪','🔮'];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(size) {
  const icons = ICONS.slice(0, size / 2);
  return shuffle([...icons, ...icons]).map((icon, i) => ({
    id: i, icon, isFlipped: false, isMatched: false,
  }));
}

const DIFFICULTIES = {
  easy:   { size: 12, label: 'EASY',   cols: 4 },
  medium: { size: 16, label: 'MEDIUM', cols: 4 },
  hard:   { size: 24, label: 'HARD',   cols: 6 },
};

function loadBest() {
  try { return JSON.parse(localStorage.getItem('memoryMatch_best') || '{}'); } catch { return {}; }
}
function saveBest(best) {
  localStorage.setItem('memoryMatch_best', JSON.stringify(best));
}

export default function MemoryMatch({ navigate }) {
  const [difficulty, setDifficulty] = useState('medium');
  const [deck, setDeck] = useState(() => buildDeck(DIFFICULTIES.medium.size));
  const [flipped, setFlipped] = useState([]);
  const [locked, setLocked] = useState(false);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | playing | won
  const [best, setBest] = useState(loadBest);
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  const total = DIFFICULTIES[difficulty].size / 2;

  useEffect(() => {
    if (status !== 'playing') return;
    const id = setInterval(() => setElapsed(Date.now() - startTime), 1000);
    return () => clearInterval(id);
  }, [status, startTime]);

  const startGame = useCallback((diff = difficulty) => {
    setDifficulty(diff);
    setDeck(buildDeck(DIFFICULTIES[diff].size));
    setFlipped([]);
    setLocked(false);
    setMoves(0);
    setMatches(0);
    setStatus('playing');
    setStartTime(Date.now());
    setElapsed(0);
  }, [difficulty]);

  const handleFlip = useCallback((id) => {
    if (locked || status !== 'playing') return;
    const card = deck.find(c => c.id === id);
    if (!card || card.isFlipped || card.isMatched) return;
    if (flipped.length === 1 && flipped[0].id === id) return;

    const newFlipped = [...flipped, card];
    const newDeck = deck.map(c => c.id === id ? { ...c, isFlipped: true } : c);
    setDeck(newDeck);
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      setLocked(true);
      const [a, b] = newFlipped;
      if (a.icon === b.icon) {
        const matched = newDeck.map(c =>
          c.id === a.id || c.id === b.id ? { ...c, isMatched: true } : c
        );
        setDeck(matched);
        setFlipped([]);
        setLocked(false);
        const newMatches = matches + 1;
        setMatches(newMatches);
        if (newMatches === total) {
          setStatus('won');
          const finalMoves = moves + 1;
          const newBest = { ...best };
          if (!newBest[difficulty] || finalMoves < newBest[difficulty]) {
            newBest[difficulty] = finalMoves;
            setBest(newBest);
            saveBest(newBest);
          }
        }
      } else {
        setTimeout(() => {
          setDeck(d => d.map(c =>
            c.id === a.id || c.id === b.id ? { ...c, isFlipped: false } : c
          ));
          setFlipped([]);
          setLocked(false);
        }, 800);
      }
    }
  }, [deck, flipped, locked, status, matches, total, moves, best, difficulty]);

  const fmt = (ms) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  };

  const cols = DIFFICULTIES[difficulty].cols;

  return (
    <div className="mm-wrap">
      <div className="mm-header">
        <button className="mm-back" onClick={() => navigate('home')}>← BACK</button>
        <span className="mm-tag">// MEMORY MATCH</span>
      </div>

      <div className="mm-stats">
        <div className="mm-stat">
          <span className="mm-stat-label">MOVES</span>
          <span className="mm-stat-val">{moves}</span>
        </div>
        <div className="mm-stat">
          <span className="mm-stat-label">PAIRS</span>
          <span className="mm-stat-val">{matches}/{total}</span>
        </div>
        <div className="mm-stat">
          <span className="mm-stat-label">TIME</span>
          <span className="mm-stat-val">{status === 'playing' ? fmt(elapsed) : '—'}</span>
        </div>
        <div className="mm-stat">
          <span className="mm-stat-label">BEST ({difficulty})</span>
          <span className="mm-stat-val">{best[difficulty] ? `${best[difficulty]} mv` : '—'}</span>
        </div>
      </div>

      <div className="mm-diff-row">
        {Object.entries(DIFFICULTIES).map(([key, val]) => (
          <button
            key={key}
            className={`mm-diff-btn ${difficulty === key ? 'active' : ''}`}
            onClick={() => startGame(key)}
          >{val.label}</button>
        ))}
      </div>

      {status === 'won' && (
        <div className="mm-won">
          <div className="mm-won-title">YOU WIN!</div>
          <div className="mm-won-detail">{moves} moves · {fmt(elapsed)}</div>
          {best[difficulty] === moves && <div className="mm-won-best">🏆 NEW BEST!</div>}
          <button className="mm-play-btn" onClick={() => startGame()}>PLAY AGAIN</button>
        </div>
      )}

      {status === 'idle' && (
        <div className="mm-idle">
          <div className="mm-idle-title">MEMORY MATCH</div>
          <p className="mm-idle-desc">Flip cards and find matching pairs.</p>
          <button className="mm-play-btn" onClick={() => startGame()}>START GAME</button>
        </div>
      )}

      {status !== 'idle' && (
        <div
          className="mm-grid"
          style={{ '--cols': cols }}
        >
          {deck.map(card => (
            <div
              key={card.id}
              className={`mm-card ${card.isFlipped || card.isMatched ? 'flipped' : ''} ${card.isMatched ? 'matched' : ''}`}
              onClick={() => handleFlip(card.id)}
            >
              <div className="mm-card-inner">
                <div className="mm-card-back">?</div>
                <div className="mm-card-front">{card.icon}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
