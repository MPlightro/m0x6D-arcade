import React, { useState, useCallback, useEffect, useRef } from 'react';
import './Minesweeper.css';

// ── Difficulty presets ────────────────────────────────────────
const PRESETS = {
  easy:   { cols: 9,  rows: 9,  mines: 10, label: 'EASY' },
  medium: { cols: 16, rows: 16, mines: 40, label: 'MEDIUM' },
  hard:   { cols: 30, rows: 16, mines: 99, label: 'HARD' },
};

// ── Board helpers ─────────────────────────────────────────────
function buildEmpty(cols, rows) {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({
      r, c,
      mine: false,
      revealed: false,
      flagged: false,
      adj: 0,
    }))
  );
}

function placeMines(board, cols, rows, mines, safeR, safeC) {
  const safe = new Set();
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++)
      safe.add(`${safeR + dr},${safeC + dc}`);

  const cells = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (!safe.has(`${r},${c}`)) cells.push([r, c]);

  // Fisher-Yates shuffle then take first `mines`
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  const next = board.map(row => row.map(cell => ({ ...cell })));
  cells.slice(0, mines).forEach(([r, c]) => { next[r][c].mine = true; });

  // compute adjacency
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (next[r][c].mine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && next[nr][nc].mine) count++;
        }
      next[r][c].adj = count;
    }
  }
  return next;
}

function floodReveal(board, cols, rows, startR, startC) {
  const next = board.map(row => row.map(cell => ({ ...cell })));
  const queue = [[startR, startC]];
  const visited = new Set([`${startR},${startC}`]);

  while (queue.length) {
    const [r, c] = queue.shift();
    if (next[r][c].flagged) continue;
    next[r][c].revealed = true;
    if (next[r][c].adj === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          const key = `${nr},${nc}`;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
              && !visited.has(key) && !next[nr][nc].revealed && !next[nr][nc].mine) {
            visited.add(key);
            queue.push([nr, nc]);
          }
        }
      }
    }
  }
  return next;
}

function checkWin(board, mines) {
  let revealed = 0;
  for (const row of board)
    for (const cell of row)
      if (cell.revealed) revealed++;
  const total = board.length * board[0].length;
  return revealed === total - mines;
}

// ── Chord (reveal around a numbered cell) ────────────────────
function chord(board, cols, rows, r, c) {
  const cell = board[r][c];
  if (!cell.revealed || cell.adj === 0) return { board, hit: false };
  let flags = 0;
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].flagged) flags++;
    }
  if (flags !== cell.adj) return { board, hit: false };

  let next = board.map(row => row.map(c => ({ ...c })));
  let hit = false;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        const nb = next[nr][nc];
        if (!nb.flagged && !nb.revealed) {
          if (nb.mine) { hit = true; next[nr][nc].revealed = true; }
          else next = floodReveal(next, cols, rows, nr, nc);
        }
      }
    }
  }
  return { board: next, hit };
}

// ── Adjacency colours ─────────────────────────────────────────
const ADJ_COLOR = ['', '#47c8ff', '#47ffa0', '#ff6b47', '#c847ff', '#ff9f47', '#47ffe8', '#f0f0f0', '#888'];

function loadMsWins() { try { return JSON.parse(localStorage.getItem('minesweeper_wins') || '{}'); } catch { return {}; } }
function saveMsWins(w) { try { localStorage.setItem('minesweeper_wins', JSON.stringify(w)); } catch {} }

// ── Main component ────────────────────────────────────────────
export default function Minesweeper({ navigate }) {
  const [difficulty, setDifficulty] = useState('easy');
  const [board, setBoard]           = useState(() => buildEmpty(9, 9));
  const [status, setStatus]         = useState('idle'); // idle | playing | won | dead
  const [minesLeft, setMinesLeft]   = useState(10);
  const [time, setTime]             = useState(0);
  const [detonated, setDetonated]   = useState(null); // {r,c} of clicked mine
  const [wins, setWins]             = useState(loadMsWins);

  const timerRef    = useRef(null);
  const startTimeRef = useRef(null);

  const { cols, rows, mines } = PRESETS[difficulty];

  // ── Timer ───────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'playing') {
      startTimeRef.current = Date.now() - time * 1000;
      timerRef.current = setInterval(() => {
        setTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 200);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [status]);

  // ── New game ─────────────────────────────────────────────────
  const newGame = useCallback((diff = difficulty) => {
    const p = PRESETS[diff];
    setBoard(buildEmpty(p.cols, p.rows));
    setStatus('idle');
    setMinesLeft(p.mines);
    setTime(0);
    setDetonated(null);
  }, [difficulty]);

  const changeDifficulty = useCallback((diff) => {
    setDifficulty(diff);
    newGame(diff);
  }, [newGame]);

  // ── Reveal ───────────────────────────────────────────────────
  const reveal = useCallback((r, c) => {
    setBoard(prev => {
      const cell = prev[r][c];
      if (cell.revealed || cell.flagged) return prev;

      let next = prev;

      // first click: place mines
      if (status === 'idle') {
        next = placeMines(prev, cols, rows, mines, r, c);
        setStatus('playing');
      }

      if (next[r][c].mine) {
        // reveal all mines
        const exploded = next.map(row => row.map(cell =>
          cell.mine ? { ...cell, revealed: true } : cell
        ));
        setDetonated({ r, c });
        setStatus('dead');
        return exploded;
      }

      const revealed = floodReveal(next, cols, rows, r, c);
      if (checkWin(revealed, mines)) {
        setStatus('won');
        setWins(prev => {
          const next2 = { ...prev, [difficulty]: (prev[difficulty] || 0) + 1 };
          saveMsWins(next2);
          return next2;
        });
        // auto-flag remaining mines
        return revealed.map(row => row.map(cell =>
          cell.mine ? { ...cell, flagged: true } : cell
        ));
      }
      return revealed;
    });
  }, [status, cols, rows, mines]);

  // ── Flag ────────────────────────────────────────────────────
  const flag = useCallback((e, r, c) => {
    e.preventDefault();
    if (status === 'dead' || status === 'won') return;
    setBoard(prev => {
      const cell = prev[r][c];
      if (cell.revealed) return prev;
      const next = prev.map(row => row.map(c => ({ ...c })));
      next[r][c].flagged = !next[r][c].flagged;
      setMinesLeft(m => next[r][c].flagged ? m - 1 : m + 1);
      return next;
    });
    if (status === 'idle') setStatus('idle'); // keep idle until first reveal
  }, [status]);

  // ── Chord on double-click / middle-click ─────────────────────
  const chordCell = useCallback((r, c) => {
    if (status !== 'playing') return;
    setBoard(prev => {
      const { board: next, hit } = chord(prev, cols, rows, r, c);
      if (hit) {
        setDetonated({ r, c });
        setStatus('dead');
        return next.map(row => row.map(cell =>
          cell.mine ? { ...cell, revealed: true } : cell
        ));
      }
      if (checkWin(next, mines)) {
        setStatus('won');
        setWins(prev => {
          const nw = { ...prev, [difficulty]: (prev[difficulty] || 0) + 1 };
          saveMsWins(nw);
          return nw;
        });
        return next.map(row => row.map(cell =>
          cell.mine ? { ...cell, flagged: true } : cell
        ));
      }
      return next;
    });
  }, [status, cols, rows, mines]);

  // ── Keyboard shortcut: R to restart ─────────────────────────
  useEffect(() => {
    const onKey = (e) => { if (e.code === 'KeyR') newGame(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [newGame]);

  const fmtTime = (t) => String(Math.min(t, 999)).padStart(3, '0');

  return (
    <div className="ms-page">
      {/* Topbar */}
      <div className="ms-topbar">
        <button className="ms-back" onClick={() => navigate('home')}>← BACK</button>
        <span className="ms-game-label">MINESWEEPER</span>
        <div className="ms-difficulty">
          {Object.entries(PRESETS).map(([key, p]) => (
            <button
              key={key}
              className={`ms-diff-btn ${difficulty === key ? 'active' : ''}`}
              onClick={() => changeDifficulty(key)}
            >{p.label}</button>
          ))}
        </div>
      </div>

      {/* HUD */}
      <div className="ms-hud">
        <div className="ms-hud-display">
          <span className="ms-hud-icon">💣</span>
          <span className="ms-hud-val">{String(Math.max(minesLeft, 0)).padStart(3, '0')}</span>
        </div>

        <button className="ms-face" onClick={() => newGame()} title="New game (R)">
          {status === 'dead' ? '💀' : status === 'won' ? '😎' : '🙂'}
        </button>

        <div className="ms-hud-display">
          <span className="ms-hud-icon">⏱</span>
          <span className="ms-hud-val">{fmtTime(time)}</span>
        </div>
      </div>

      {/* Board */}
      <div className="ms-scroll">
        <div
          className="ms-board"
          style={{ '--cols': cols, '--rows': rows }}
        >
          {board.map((row, r) =>
            row.map((cell, c) => (
              <Cell
                key={`${r}-${c}`}
                cell={cell}
                detonated={detonated?.r === r && detonated?.c === c}
                status={status}
                onReveal={() => reveal(r, c)}
                onFlag={(e) => flag(e, r, c)}
                onChord={() => chordCell(r, c)}
              />
            ))
          )}
        </div>
      </div>

      {/* Win / dead overlay */}
      {(status === 'won' || status === 'dead') && (
        <div className="ms-overlay" onClick={() => newGame()}>
          <div className="ms-overlay-box">
            {status === 'won'
              ? <><span className="ms-overlay-title ms-win">YOU WIN</span>
                  <span className="ms-overlay-sub">cleared in {fmtTime(time)}s</span>
                  <span className="ms-overlay-sub">wins ({difficulty}): {wins[difficulty] || 0}</span></>
              : <><span className="ms-overlay-title ms-lose">BOOM</span>
                  <span className="ms-overlay-sub">better luck next time</span></>
            }
            <span className="ms-overlay-hint">click to play again</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Cell ──────────────────────────────────────────────────────
function Cell({ cell, detonated, status, onReveal, onFlag, onChord }) {
  const { revealed, flagged, mine, adj } = cell;

  const handleClick = (e) => {
    if (e.button === 1) { e.preventDefault(); onChord(); return; }
    onReveal();
  };

  const handleDoubleClick = () => onChord();

  let cls = 'ms-cell';
  if (revealed) {
    cls += ' ms-revealed';
    if (mine) cls += detonated ? ' ms-detonated' : ' ms-mine-shown';
  } else {
    cls += ' ms-hidden';
    if (flagged) cls += ' ms-flagged';
  }

  const showNum  = revealed && !mine && adj > 0;
  const showMine = revealed && mine;

  return (
    <div
      className={cls}
      onClick={handleClick}
      onContextMenu={onFlag}
      onDoubleClick={handleDoubleClick}
      onMouseDown={(e) => e.button === 1 && e.preventDefault()}
      style={showNum ? { color: ADJ_COLOR[adj] } : undefined}
    >
      {flagged && !revealed && <span className="ms-flag">🚩</span>}
      {showMine && <span className="ms-mine-icon">{detonated ? '💥' : '💣'}</span>}
      {showNum && <span className="ms-num">{adj}</span>}
    </div>
  );
}