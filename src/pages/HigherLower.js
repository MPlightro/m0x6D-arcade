import React, { useState, useCallback, useEffect } from 'react';
import './HigherLower.css';

function loadStats() {
  try { return JSON.parse(localStorage.getItem('higherLower_stats') || '{"bestStreak":0,"totalGames":0,"totalCorrect":0}'); }
  catch { return { bestStreak: 0, totalGames: 0, totalCorrect: 0 }; }
}
function saveStats(s) { localStorage.setItem('higherLower_stats', JSON.stringify(s)); }

function randNum(exclude) {
  let n;
  do { n = Math.floor(Math.random() * 100) + 1; } while (n === exclude);
  return n;
}

export default function HigherLower({ navigate }) {
  const [current, setCurrent] = useState(() => randNum(null));
  const [next, setNext] = useState(() => randNum(null));
  const [revealed, setRevealed] = useState(false);
  const [result, setResult] = useState(null); // 'correct' | 'wrong'
  const [streak, setStreak] = useState(0);
  const [stats, setStats] = useState(loadStats);
  const [transitioning, setTransitioning] = useState(false);
  const [status, setStatus] = useState('idle');

  const startGame = useCallback(() => {
    const c = randNum(null);
    const n = randNum(c);
    setCurrent(c);
    setNext(n);
    setRevealed(false);
    setResult(null);
    setStreak(0);
    setTransitioning(false);
    setStatus('playing');
  }, []);

  const guess = useCallback((isHigher) => {
    if (revealed || transitioning || status !== 'playing') return;
    setRevealed(true);
    const correct = isHigher ? next > current : next < current;
    setResult(correct ? 'correct' : 'wrong');

    const newStats = { ...stats };
    newStats.totalGames += (streak === 0 ? 1 : 0);
    newStats.totalCorrect += (correct ? 1 : 0);

    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > newStats.bestStreak) {
        newStats.bestStreak = newStreak;
      }
      saveStats(newStats);
      setStats(newStats);
      setTransitioning(true);
      setTimeout(() => {
        const oldNext = next;
        const newNext = randNum(oldNext);
        setCurrent(oldNext);
        setNext(newNext);
        setRevealed(false);
        setResult(null);
        setTransitioning(false);
      }, 1000);
    } else {
      saveStats(newStats);
      setStats(newStats);
      setTimeout(() => setStatus('gameover'), 900);
    }
  }, [revealed, transitioning, status, next, current, streak, stats]);

  useEffect(() => {
    const onKey = (e) => {
      if (status !== 'playing' || revealed) return;
      if (e.key === 'ArrowUp' || e.key === 'h') guess(true);
      if (e.key === 'ArrowDown' || e.key === 'l') guess(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [guess, status, revealed]);

  const accuracy = stats.totalCorrect && stats.totalGames
    ? Math.round((stats.totalCorrect / (stats.totalCorrect + stats.totalGames)) * 100)
    : 0;

  return (
    <div className="hl-wrap">
      <div className="hl-header">
        <button className="hl-back" onClick={() => navigate('home')}>← BACK</button>
        <span className="hl-tag">// HIGHER OR LOWER</span>
      </div>

      <div className="hl-stats-row">
        <div className="hl-stat">
          <span className="hl-stat-label">STREAK</span>
          <span className="hl-stat-val">{streak}</span>
        </div>
        <div className="hl-stat">
          <span className="hl-stat-label">BEST</span>
          <span className="hl-stat-val">{stats.bestStreak}</span>
        </div>
        <div className="hl-stat">
          <span className="hl-stat-label">ACCURACY</span>
          <span className="hl-stat-val">{stats.totalGames ? `${accuracy}%` : '—'}</span>
        </div>
      </div>

      {status === 'idle' && (
        <div className="hl-idle">
          <div className="hl-big-title">HIGHER<br />OR<br />LOWER?</div>
          <p className="hl-idle-desc">Guess if the next number is higher or lower. Build your streak.</p>
          <div className="hl-keys-hint">
            <span>↑ HIGHER</span><span>↓ LOWER</span>
          </div>
          <button className="hl-play-btn" onClick={startGame}>START</button>
        </div>
      )}

      {status === 'gameover' && (
        <div className="hl-gameover">
          <div className="hl-go-label">GAME OVER</div>
          <div className="hl-go-streak">Streak: {streak}</div>
          {streak >= stats.bestStreak && streak > 0 && (
            <div className="hl-go-best">🏆 NEW BEST!</div>
          )}
          <button className="hl-play-btn" onClick={startGame}>TRY AGAIN</button>
        </div>
      )}

      {status === 'playing' && (
        <div className="hl-game">
          <div className="hl-card hl-card-current">
            <div className="hl-card-label">CURRENT</div>
            <div className="hl-card-number">{current}</div>
          </div>

          <div className="hl-vs">VS</div>

          <div className={`hl-card hl-card-next ${revealed ? 'revealed' : 'hidden'} ${result || ''}`}>
            <div className="hl-card-label">NEXT</div>
            {revealed
              ? <div className="hl-card-number">{next}</div>
              : <div className="hl-card-number hl-question">?</div>
            }
            {revealed && result === 'correct' && <div className="hl-result-badge correct">✓</div>}
            {revealed && result === 'wrong' && <div className="hl-result-badge wrong">✗</div>}
          </div>

          <div className="hl-buttons">
            <button
              className={`hl-btn hl-higher ${revealed ? 'disabled' : ''}`}
              onClick={() => guess(true)}
              disabled={revealed}
            >▲ HIGHER</button>
            <button
              className={`hl-btn hl-lower ${revealed ? 'disabled' : ''}`}
              onClick={() => guess(false)}
              disabled={revealed}
            >▼ LOWER</button>
          </div>

          <div className="hl-hint">↑ / ↓ arrow keys work too</div>
        </div>
      )}
    </div>
  );
}
