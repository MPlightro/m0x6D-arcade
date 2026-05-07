import React, { useState, useEffect, useRef, useCallback } from 'react';
import './WhackMole.css';

const GRID = 9;
const GAME_DURATION = 30000;

const MOLE_TYPES = {
  normal: { emoji: '🐹', points: 1,  minMs: 700,  maxMs: 1400, label: 'NORMAL' },
  golden: { emoji: '✨',  points: 3,  minMs: 500,  maxMs: 900,  label: 'GOLDEN' },
  bomb:   { emoji: '💣',  points: -5, minMs: 800,  maxMs: 1500, label: 'BOMB'   },
};

function loadBest() {
  try { return parseInt(localStorage.getItem('whackMole_best') || '0', 10); }
  catch { return 0; }
}
function saveBest(b) { localStorage.setItem('whackMole_best', String(b)); }

function randMoleType() {
  const r = Math.random();
  if (r < 0.1) return 'golden';
  if (r < 0.2) return 'bomb';
  return 'normal';
}

export default function WhackMole({ navigate }) {
  const [status, setStatus] = useState('idle'); // idle | playing | over
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(loadBest);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [holes, setHoles] = useState(Array(GRID).fill(null)); // null | mole type key
  const [hits, setHits] = useState([]); // { id, emoji, pts }
  const moleTimers = useRef([]);
  const tickRef = useRef(null);
  const scoreRef = useRef(0);
  const nextHitId = useRef(0);

  const clearMoleTimers = useCallback(() => {
    moleTimers.current.forEach(t => clearTimeout(t));
    moleTimers.current = [];
  }, []);

  const popMole = useCallback(() => {
    const idx = Math.floor(Math.random() * GRID);
    const type = randMoleType();
    const moleInfo = MOLE_TYPES[type];
    const duration = moleInfo.minMs + Math.random() * (moleInfo.maxMs - moleInfo.minMs);

    setHoles(h => {
      const next = [...h];
      if (next[idx] !== null) return next;
      next[idx] = type;
      return next;
    });

    const hide = setTimeout(() => {
      setHoles(h => {
        const next = [...h];
        next[idx] = null;
        return next;
      });
    }, duration);

    moleTimers.current.push(hide);

    const nextDelay = 400 + Math.random() * 600;
    const schedule = setTimeout(popMole, nextDelay);
    moleTimers.current.push(schedule);
  }, []);

  const startGame = useCallback(() => {
    clearMoleTimers();
    clearInterval(tickRef.current);
    scoreRef.current = 0;
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setHoles(Array(GRID).fill(null));
    setHits([]);
    setStatus('playing');

    const t = setTimeout(popMole, 600);
    moleTimers.current.push(t);

    const start = Date.now();
    tickRef.current = setInterval(() => {
      const remaining = GAME_DURATION - (Date.now() - start);
      if (remaining <= 0) {
        clearInterval(tickRef.current);
        clearMoleTimers();
        setTimeLeft(0);
        setHoles(Array(GRID).fill(null));
        setStatus('over');
        const finalScore = scoreRef.current;
        if (finalScore > loadBest()) {
          saveBest(finalScore);
          setBest(finalScore);
        }
      } else {
        setTimeLeft(remaining);
      }
    }, 100);
  }, [clearMoleTimers, popMole]);

  useEffect(() => {
    return () => { clearMoleTimers(); clearInterval(tickRef.current); };
  }, [clearMoleTimers]);

  const whack = useCallback((idx) => {
    if (status !== 'playing') return;
    const type = holes[idx];
    if (!type) return;
    const mole = MOLE_TYPES[type];
    const pts = mole.points;
    scoreRef.current = Math.max(0, scoreRef.current + pts);
    setScore(scoreRef.current);
    setHoles(h => {
      const next = [...h];
      next[idx] = null;
      return next;
    });
    const id = nextHitId.current++;
    setHits(prev => [...prev, { id, emoji: mole.emoji, pts }]);
    setTimeout(() => setHits(prev => prev.filter(h => h.id !== id)), 700);
  }, [status, holes]);

  const pct = (timeLeft / GAME_DURATION) * 100;

  return (
    <div className="wm-wrap">
      <div className="wm-header">
        <button className="wm-back" onClick={() => navigate('home')}>← BACK</button>
        <span className="wm-tag">// WHACK-A-MOLE</span>
      </div>

      <div className="wm-stats">
        <div className="wm-stat">
          <span className="wm-stat-label">SCORE</span>
          <span className="wm-stat-val">{score}</span>
        </div>
        <div className="wm-stat">
          <span className="wm-stat-label">BEST</span>
          <span className="wm-stat-val">{best}</span>
        </div>
        <div className="wm-stat">
          <span className="wm-stat-label">TIME</span>
          <span className="wm-stat-val">{Math.ceil(timeLeft / 1000)}s</span>
        </div>
      </div>

      {status === 'playing' && (
        <div className="wm-timer-bar">
          <div className="wm-timer-fill" style={{ width: `${pct}%`, background: pct < 25 ? 'var(--accent2)' : 'var(--accent)' }} />
        </div>
      )}

      {status === 'idle' && (
        <div className="wm-overlay">
          <div className="wm-overlay-title">WHACK-A-MOLE</div>
          <div className="wm-legend">
            {Object.entries(MOLE_TYPES).map(([k, v]) => (
              <div key={k} className="wm-legend-row">
                <span>{v.emoji}</span>
                <span className="wm-legend-label">{v.label}</span>
                <span className={`wm-legend-pts ${v.points < 0 ? 'neg' : ''}`}>
                  {v.points > 0 ? `+${v.points}` : v.points} pts
                </span>
              </div>
            ))}
          </div>
          <button className="wm-play-btn" onClick={startGame}>START</button>
        </div>
      )}

      {status === 'over' && (
        <div className="wm-overlay">
          <div className="wm-overlay-title">TIME'S UP!</div>
          <div className="wm-final-score">{score} pts</div>
          {score >= best && score > 0 && <div className="wm-new-best">🏆 NEW BEST!</div>}
          <button className="wm-play-btn" onClick={startGame}>PLAY AGAIN</button>
        </div>
      )}

      <div className="wm-grid">
        {Array(GRID).fill(null).map((_, i) => {
          const type = holes[i];
          const mole = type ? MOLE_TYPES[type] : null;
          return (
            <div
              key={i}
              className={`wm-hole ${type ? 'has-mole' : ''} ${type || ''}`}
              onClick={() => whack(i)}
            >
              <div className="wm-dirt" />
              <div className={`wm-mole ${type ? 'up' : ''}`}>
                {mole && <span className="wm-mole-emoji">{mole.emoji}</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="wm-hits-layer" aria-hidden>
        {hits.map(h => (
          <div key={h.id} className={`wm-hit-popup ${h.pts < 0 ? 'neg' : 'pos'}`}>
            {h.pts > 0 ? `+${h.pts}` : h.pts}
          </div>
        ))}
      </div>
    </div>
  );
}
