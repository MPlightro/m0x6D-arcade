import React, { useState, useEffect, useCallback, useRef } from 'react';
import './Game2048.css';

function emptyGrid() {
  return Array.from({ length: 4 }, () => Array(4).fill(0));
}

function addRandom(grid) {
  const empty = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (grid[r][c] === 0) empty.push([r, c]);
  if (!empty.length) return grid;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const next = grid.map(row => [...row]);
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function slideRow(row) {
  const nums = row.filter(x => x !== 0);
  let score = 0;
  const merged = [];
  let i = 0;
  while (i < nums.length) {
    if (i + 1 < nums.length && nums[i] === nums[i + 1]) {
      merged.push(nums[i] * 2);
      score += nums[i] * 2;
      i += 2;
    } else {
      merged.push(nums[i]);
      i++;
    }
  }
  while (merged.length < 4) merged.push(0);
  return { row: merged, score };
}

function moveLeft(grid) {
  let score = 0;
  const next = grid.map(row => {
    const { row: r, score: s } = slideRow(row);
    score += s;
    return r;
  });
  return { grid: next, score };
}

function rotateGrid(grid) {
  return grid[0].map((_, c) => grid.map(row => row[c]).reverse());
}

function move(grid, dir) {
  let g = grid.map(r => [...r]);
  let rotations = { left: 0, right: 2, up: 3, down: 1 };
  const times = rotations[dir];
  for (let i = 0; i < times; i++) g = rotateGrid(g);
  const { grid: moved, score } = moveLeft(g);
  let result = moved;
  for (let i = 0; i < (4 - times) % 4; i++) result = rotateGrid(result);
  const changed = JSON.stringify(grid) !== JSON.stringify(result);
  return { grid: result, score, changed };
}

function isGameOver(grid) {
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) {
      if (grid[r][c] === 0) return false;
      if (c < 3 && grid[r][c] === grid[r][c + 1]) return false;
      if (r < 3 && grid[r][c] === grid[r + 1][c]) return false;
    }
  return true;
}

function initGrid() {
  let g = emptyGrid();
  g = addRandom(g);
  g = addRandom(g);
  return g;
}

function loadBest() {
  try { return parseInt(localStorage.getItem('game2048_best') || '0', 10); }
  catch { return 0; }
}
function saveBest(b) { localStorage.setItem('game2048_best', String(b)); }

const TILE_COLORS = {
  0:    ['#1a1a24', '#666680'],
  2:    ['#2a2a3a', '#f0f0f0'],
  4:    ['#2a2a4a', '#f0f0f0'],
  8:    ['#3a2a0a', '#ffe047'],
  16:   ['#4a2a0a', '#ffe047'],
  32:   ['#5a1a0a', '#ff6b47'],
  64:   ['#6a0a0a', '#ff6b47'],
  128:  ['#0a3a0a', '#47ffa0'],
  256:  ['#0a4a2a', '#47ffa0'],
  512:  ['#0a2a4a', '#47c8ff'],
  1024: ['#0a0a6a', '#47c8ff'],
  2048: ['#3a0a6a', '#e8ff47'],
};

function getTileStyle(val) {
  const [bg, color] = TILE_COLORS[val] || ['#4a0a6a', '#fff'];
  return { background: bg, color };
}

export default function Game2048({ navigate }) {
  const [grid, setGrid] = useState(initGrid);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(loadBest);
  const [status, setStatus] = useState('playing'); // playing | over | won
  const [won, setWon] = useState(false);
  const touchStart = useRef(null);

  const handleMove = useCallback((dir) => {
    setGrid(prev => {
      const { grid: next, score: gained, changed } = move(prev, dir);
      if (!changed) return prev;
      const withNew = addRandom(next);
      setScore(s => {
        const ns = s + gained;
        setBest(b => {
          if (ns > b) { saveBest(ns); return ns; }
          return b;
        });
        return ns;
      });
      if (!won && withNew.some(row => row.includes(2048))) {
        setWon(true);
        setStatus('won');
      } else if (isGameOver(withNew)) {
        setStatus('over');
      }
      return withNew;
    });
  }, [won]);

  useEffect(() => {
    const onKey = (e) => {
      const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
      if (map[e.key] && status === 'playing') {
        e.preventDefault();
        handleMove(map[e.key]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleMove, status]);

  const handleTouchStart = (e) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e) => {
    if (!touchStart.current || status !== 'playing') return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      handleMove(dx > 0 ? 'right' : 'left');
    } else {
      handleMove(dy > 0 ? 'down' : 'up');
    }
    touchStart.current = null;
  };

  const restart = () => {
    setGrid(initGrid());
    setScore(0);
    setStatus('playing');
    setWon(false);
  };

  return (
    <div className="g2048-wrap">
      <div className="g2048-header">
        <button className="g2048-back" onClick={() => navigate('home')}>← BACK</button>
        <span className="g2048-tag">// 2048</span>
      </div>

      <div className="g2048-top">
        <div className="g2048-scores">
          <div className="g2048-score">
            <span className="g2048-score-label">SCORE</span>
            <span className="g2048-score-val">{score}</span>
          </div>
          <div className="g2048-score">
            <span className="g2048-score-label">BEST</span>
            <span className="g2048-score-val">{best}</span>
          </div>
        </div>
        <button className="g2048-new-btn" onClick={restart}>NEW GAME</button>
      </div>

      {(status === 'over' || status === 'won') && (
        <div className="g2048-banner" data-type={status}>
          <span>{status === 'won' ? '🎉 YOU REACHED 2048!' : 'GAME OVER'}</span>
          <button onClick={restart}>AGAIN →</button>
        </div>
      )}

      <div
        className="g2048-grid"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {grid.map((row, r) =>
          row.map((val, c) => (
            <div
              key={`${r}-${c}`}
              className={`g2048-tile ${val ? 'filled' : ''}`}
              style={getTileStyle(val)}
            >
              {val !== 0 && <span>{val}</span>}
            </div>
          ))
        )}
      </div>

      <div className="g2048-hint">Arrow keys or swipe to play</div>
    </div>
  );
}
