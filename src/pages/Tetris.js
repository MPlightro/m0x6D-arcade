import React, { useEffect, useRef, useCallback } from 'react';
import './Tetris.css';

function loadTetrisBest() { try { return parseInt(localStorage.getItem('tetris_best') || '0', 10); } catch { return 0; } }
function saveTetrisBest(b) { try { localStorage.setItem('tetris_best', String(b)); } catch {} }

// ── Constants ────────────────────────────────────────────────
const COLS   = 10;
const ROWS   = 20;
const CELL   = 28;
const W      = COLS * CELL;
const H      = ROWS * CELL;
const PREVIEW_SIZE = 4;

// ms per gravity drop at each level (index = level, capped at 10)
const SPEEDS = [800, 680, 560, 450, 360, 280, 210, 150, 100, 70, 50];

// Points for 1-4 line clears (× level)
const LINE_POINTS = [0, 100, 300, 500, 800];

// ── Piece definitions ────────────────────────────────────────
// Each piece: { shape, color, accent }
const PIECES = [
  { id: 'I', color: '#47c8ff', accent: '#a8e8ff', shape: [[1,1,1,1]] },
  { id: 'O', color: '#e8ff47', accent: '#f8ffb0', shape: [[1,1],[1,1]] },
  { id: 'T', color: '#c847ff', accent: '#e8a8ff', shape: [[0,1,0],[1,1,1]] },
  { id: 'S', color: '#47ffa0', accent: '#a8ffd0', shape: [[0,1,1],[1,1,0]] },
  { id: 'Z', color: '#ff6b47', accent: '#ffb8a8', shape: [[1,1,0],[0,1,1]] },
  { id: 'J', color: '#4790ff', accent: '#a8c8ff', shape: [[1,0,0],[1,1,1]] },
  { id: 'L', color: '#ff9f47', accent: '#ffd4a8', shape: [[0,0,1],[1,1,1]] },
];

// ── Helpers ──────────────────────────────────────────────────
function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  return Array.from({ length: cols }, (_, c) =>
    Array.from({ length: rows }, (_, r) => shape[rows - 1 - r][c])
  );
}

function rotateCCW(shape) {
  return rotateCW(rotateCW(rotateCW(shape)));
}

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function randomPiece() {
  return { ...PIECES[Math.floor(Math.random() * PIECES.length)] };
}

function spawnPos(shape) {
  return { x: Math.floor((COLS - shape[0].length) / 2), y: 0 };
}

function fits(board, shape, { x, y }) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = x + c, ny = y + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
      if (ny >= 0 && board[ny][nx]) return false;
    }
  }
  return true;
}

function place(board, shape, { x, y }, color) {
  const next = board.map(row => [...row]);
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const ny = y + r, nx = x + c;
      if (ny >= 0) next[ny][nx] = color;
    }
  }
  return next;
}

function clearLines(board) {
  const kept = board.filter(row => row.some(c => !c));
  const cleared = ROWS - kept.length;
  const empty = Array.from({ length: cleared }, () => Array(COLS).fill(null));
  return { board: [...empty, ...kept], cleared };
}

// Wall-kick offsets for rotations (SRS-lite)
const KICKS = [[0,0],[-1,0],[1,0],[0,-1],[-1,-1],[1,-1]];

function initState(best = 0) {
  const next = randomPiece();
  const queue = [randomPiece(), randomPiece()];
  const shape = next.shape;
  const pos = spawnPos(shape);
  return {
    status: 'idle',  // idle | playing | paused | dead
    board: emptyBoard(),
    piece: next,
    shape,
    pos,
    queue,
    held: null,
    holdUsed: false,
    score: 0,
    lines: 0,
    level: 1,
    best,
    lastDrop: 0,
    lockDelay: 0,
    flashRows: [],
  };
}

// ── Component ─────────────────────────────────────────────────
export default function Tetris({ navigate }) {
  const canvasRef  = useRef(null);
  const previewRef = useRef(null);
  const holdRef    = useRef(null);
  const stateRef   = useRef(initState(loadTetrisBest()));
  const rafRef     = useRef(null);

  // ── Actions ────────────────────────────────────────────────
  const start = useCallback(() => {
    const s = stateRef.current;
    if (!s) return;
    if (s.status === 'dead') {
      stateRef.current = initState(s.best);
      stateRef.current.status = 'playing';
      stateRef.current.lastDrop = performance.now();
    } else if (s.status === 'idle') {
      s.status = 'playing';
      s.lastDrop = performance.now();
    } else if (s.status === 'paused') {
      s.status = 'playing';
      s.lastDrop = performance.now();
    }
  }, []);

  const pause = useCallback(() => {
    const s = stateRef.current;
    if (!s || s.status !== 'playing') return;
    s.status = 'paused';
  }, []);

  const moveLeft = useCallback(() => {
    const s = stateRef.current;
    if (s?.status !== 'playing') return;
    const np = { x: s.pos.x - 1, y: s.pos.y };
    if (fits(s.board, s.shape, np)) s.pos = np;
  }, []);

  const moveRight = useCallback(() => {
    const s = stateRef.current;
    if (s?.status !== 'playing') return;
    const np = { x: s.pos.x + 1, y: s.pos.y };
    if (fits(s.board, s.shape, np)) s.pos = np;
  }, []);

  const softDrop = useCallback(() => {
    const s = stateRef.current;
    if (s?.status !== 'playing') return;
    const np = { x: s.pos.x, y: s.pos.y + 1 };
    if (fits(s.board, s.shape, np)) {
      s.pos = np;
      s.score += 1;
    }
  }, []);

  const hardDrop = useCallback(() => {
    const s = stateRef.current;
    if (s?.status !== 'playing') return;
    let ny = s.pos.y;
    while (fits(s.board, s.shape, { x: s.pos.x, y: ny + 1 })) ny++;
    s.score += (ny - s.pos.y) * 2;
    s.pos = { x: s.pos.x, y: ny };
    lockPiece(s);
  }, []);

  const rotate = useCallback((dir = 1) => {
    const s = stateRef.current;
    if (s?.status !== 'playing') return;
    const newShape = dir > 0 ? rotateCW(s.shape) : rotateCCW(s.shape);
    for (const [kx, ky] of KICKS) {
      const np = { x: s.pos.x + kx, y: s.pos.y + ky };
      if (fits(s.board, newShape, np)) {
        s.shape = newShape;
        s.pos = np;
        return;
      }
    }
  }, []);

  const hold = useCallback(() => {
    const s = stateRef.current;
    if (s?.status !== 'playing' || s.holdUsed) return;
    s.holdUsed = true;
    if (s.held) {
      const tmp = s.held;
      s.held = { ...s.piece, shape: s.piece.shape };
      s.piece = tmp;
      s.shape = tmp.shape;
      s.pos = spawnPos(tmp.shape);
    } else {
      s.held = { ...s.piece, shape: s.piece.shape };
      nextPiece(s);
    }
  }, []);

  // ── Internal game logic ────────────────────────────────────
  function nextPiece(s) {
    s.piece = s.queue.shift();
    s.queue.push(randomPiece());
    s.shape = s.piece.shape;
    s.pos = spawnPos(s.shape);
    s.holdUsed = false;
    if (!fits(s.board, s.shape, s.pos)) {
      s.status = 'dead';
      s.best = Math.max(s.best, s.score);
      saveTetrisBest(s.best);
    }
  }

  function lockPiece(s) {
    s.board = place(s.board, s.shape, s.pos, s.piece.color);
    const { board: nb, cleared } = clearLines(s.board);
    s.board = nb;
    if (cleared > 0) {
      s.score += LINE_POINTS[cleared] * s.level;
      s.lines += cleared;
      s.level = Math.min(10, 1 + Math.floor(s.lines / 10));
    }
    nextPiece(s);
    s.lastDrop = performance.now();
  }

  function ghostPos(s) {
    let gy = s.pos.y;
    while (fits(s.board, s.shape, { x: s.pos.x, y: gy + 1 })) gy++;
    return { x: s.pos.x, y: gy };
  }

  // ── Keyboard ───────────────────────────────────────────────
  useEffect(() => {
    const held = {};
    const DAS = 150, ARR = 50;
    const timers = {};

    const actions = {
      ArrowLeft:  () => moveLeft(),
      ArrowRight: () => moveRight(),
      ArrowDown:  () => softDrop(),
      KeyA:       () => moveLeft(),
      KeyD:       () => moveRight(),
      KeyS:       () => softDrop(),
    };

    const onDown = (e) => {
      if (held[e.code]) return;
      held[e.code] = true;

      if (e.code === 'Space')      { e.preventDefault(); hardDrop(); return; }
      if (e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); rotate(1); return; }
      if (e.code === 'KeyZ')       { e.preventDefault(); rotate(-1); return; }
      if (e.code === 'KeyC' || e.code === 'ShiftLeft') { e.preventDefault(); hold(); return; }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        const s = stateRef.current;
        if (s?.status === 'playing') pause();
        else start();
        return;
      }
      if (e.code === 'Enter') { e.preventDefault(); start(); return; }

      if (actions[e.code]) {
        e.preventDefault();
        actions[e.code]();
        timers[e.code] = setTimeout(() => {
          timers[`${e.code}_rep`] = setInterval(actions[e.code], ARR);
        }, DAS);
      }
    };

    const onUp = (e) => {
      held[e.code] = false;
      clearTimeout(timers[e.code]);
      clearInterval(timers[`${e.code}_rep`]);
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      Object.values(timers).forEach(t => { clearTimeout(t); clearInterval(t); });
    };
  }, [moveLeft, moveRight, softDrop, hardDrop, rotate, hold, start, pause]);

  // ── Draw ───────────────────────────────────────────────────
  useEffect(() => {
    stateRef.current = initState();
    const canvas  = canvasRef.current;
    const prevCvs = previewRef.current;
    const holdCvs = holdRef.current;
    const ctx  = canvas.getContext('2d');
    const pctx = prevCvs.getContext('2d');
    const hctx = holdCvs.getContext('2d');

    function drawCell(c, x, y, color, accent, alpha = 1) {
      if (!color) return;
      c.save();
      c.globalAlpha = alpha;
      c.fillStyle = color;
      c.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
      // top/left highlight
      c.fillStyle = accent || 'rgba(255,255,255,0.35)';
      c.fillRect(x + 1, y + 1, CELL - 2, 3);
      c.fillRect(x + 1, y + 1, 3, CELL - 2);
      // dark bottom/right
      c.fillStyle = 'rgba(0,0,0,0.35)';
      c.fillRect(x + 1, y + CELL - 4, CELL - 2, 3);
      c.fillRect(x + CELL - 4, y + 1, 3, CELL - 2);
      c.restore();
    }

    function drawBoard(s) {
      // bg
      ctx.fillStyle = '#0d0d14';
      ctx.fillRect(0, 0, W, H);
      // grid lines
      ctx.strokeStyle = '#1a1a2a';
      ctx.lineWidth = 0.5;
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, H); ctx.stroke();
      }
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(W, r * CELL); ctx.stroke();
      }

      // placed cells
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const color = s.board[r][c];
          if (color) {
            const piece = PIECES.find(p => p.color === color);
            drawCell(ctx, c * CELL, r * CELL, color, piece?.accent);
          }
        }
      }

      // ghost
      const gp = ghostPos(s);
      if (gp.y !== s.pos.y) {
        for (let r = 0; r < s.shape.length; r++) {
          for (let c = 0; c < s.shape[r].length; c++) {
            if (!s.shape[r][c]) continue;
            const px = (gp.x + c) * CELL, py = (gp.y + r) * CELL;
            ctx.strokeStyle = s.piece.color;
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.3;
            ctx.strokeRect(px + 1, py + 1, CELL - 2, CELL - 2);
            ctx.globalAlpha = 1;
          }
        }
      }

      // active piece
      for (let r = 0; r < s.shape.length; r++) {
        for (let c = 0; c < s.shape[r].length; c++) {
          if (!s.shape[r][c]) continue;
          const px = (s.pos.x + c) * CELL, py = (s.pos.y + r) * CELL;
          drawCell(ctx, px, py, s.piece.color, s.piece.accent);
        }
      }
    }

    function drawMiniPiece(c, ctx, shape, color, accent, size) {
      const bw = shape[0].length, bh = shape.length;
      const ox = Math.floor((size - bw) / 2) * CELL;
      const oy = Math.floor((size - bh) / 2) * CELL;
      ctx.fillStyle = '#0d0d14';
      ctx.fillRect(0, 0, size * CELL, size * CELL);
      for (let r = 0; r < bh; r++) {
        for (let cc = 0; cc < bw; cc++) {
          if (!shape[r][cc]) continue;
          drawCell(ctx, ox + cc * CELL, oy + r * CELL, color, accent);
        }
      }
    }

    function drawPreviews(s) {
      const pw = PREVIEW_SIZE * CELL;
      pctx.fillStyle = '#0d0d14';
      pctx.fillRect(0, 0, pw, s.queue.length * pw);
      s.queue.forEach((p, i) => {
        const bw = p.shape[0].length, bh = p.shape.length;
        const ox = Math.floor((PREVIEW_SIZE - bw) / 2) * CELL;
        const oy = i * pw + Math.floor((PREVIEW_SIZE - bh) / 2) * CELL;
        for (let r = 0; r < bh; r++) {
          for (let c = 0; c < bw; c++) {
            if (!p.shape[r][c]) continue;
            drawCell(pctx, ox + c * CELL, oy + r * CELL, p.color, p.accent);
          }
        }
      });
    }

    function drawHold(s) {
      const hw = PREVIEW_SIZE * CELL;
      hctx.fillStyle = '#0d0d14';
      hctx.fillRect(0, 0, hw, hw);
      if (s.held) {
        drawMiniPiece(null, hctx, s.held.shape, s.held.color, s.held.accent, PREVIEW_SIZE);
      }
    }

    function drawOverlay(s) {
      if (s.status === 'idle') {
        ctx.fillStyle = 'rgba(10,10,15,0.82)';
        ctx.fillRect(0, 0, W, H);
        ctx.font = '700 14px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff47e8';
        ctx.fillText('TETRIS', W / 2, H / 2 - 55);
        ctx.font = '400 7px "Press Start 2P", monospace';
        ctx.fillStyle = '#666680';
        const lines = ['←→ MOVE', '↑ / Z  ROTATE', '↓ SOFT DROP', 'SPACE  HARD DROP', 'C / SHIFT  HOLD', 'ESC  PAUSE', '', 'ENTER TO START'];
        lines.forEach((l, i) => ctx.fillText(l, W / 2, H / 2 - 20 + i * 18));
      }
      if (s.status === 'paused') {
        ctx.fillStyle = 'rgba(10,10,15,0.82)';
        ctx.fillRect(0, 0, W, H);
        ctx.font = '700 14px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff47e8';
        ctx.fillText('PAUSED', W / 2, H / 2 - 10);
        ctx.font = '400 7px "Press Start 2P", monospace';
        ctx.fillStyle = '#666680';
        ctx.fillText('ESC / P TO RESUME', W / 2, H / 2 + 20);
      }
      if (s.status === 'dead') {
        ctx.fillStyle = 'rgba(10,10,15,0.88)';
        ctx.fillRect(0, 0, W, H);
        ctx.font = '700 14px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff6b47';
        ctx.fillText('GAME OVER', W / 2, H / 2 - 70);
        ctx.strokeStyle = '#2a2a3a';
        ctx.lineWidth = 1;
        ctx.strokeRect(W / 2 - 115, H / 2 - 52, 230, 105);
        const rows = [
          ['SCORE', s.score],
          ['LINES', s.lines],
          ['LEVEL', s.level],
          ['BEST',  s.best],
        ];
        ctx.font = '400 8px "Press Start 2P", monospace';
        rows.forEach(([label, val], i) => {
          const y = H / 2 - 25 + i * 22;
          ctx.fillStyle = '#444460';
          ctx.textAlign = 'left';
          ctx.fillText(label, W / 2 - 100, y);
          ctx.fillStyle = '#e8ff47';
          ctx.textAlign = 'right';
          ctx.fillText(val, W / 2 + 100, y);
        });
        ctx.textAlign = 'center';
        ctx.font = '400 7px "Press Start 2P", monospace';
        ctx.fillStyle = '#666680';
        ctx.fillText('ENTER TO RETRY', W / 2, H / 2 + 72);
      }
    }

    // ── Game loop ──────────────────────────────────────────
    function loop(now) {
      rafRef.current = requestAnimationFrame(loop);
      const s = stateRef.current;

      if (s.status === 'playing') {
        const speed = SPEEDS[Math.min(s.level - 1, SPEEDS.length - 1)];
        if (now - s.lastDrop >= speed) {
          s.lastDrop = now;
          const np = { x: s.pos.x, y: s.pos.y + 1 };
          if (fits(s.board, s.shape, np)) {
            s.pos = np;
          } else {
            lockPiece(s);
          }
        }
      }

      drawBoard(s);
      drawPreviews(s);
      drawHold(s);
      drawOverlay(s);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── Touch swipe ────────────────────────────────────────────
  const touchRef = useRef(null);
  const onTouchStart = (e) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
  };
  const onTouchEnd = (e) => {
    if (!touchRef.current) return;
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    const dt = Date.now() - touchRef.current.t;
    const abs = (n) => Math.abs(n);
    if (abs(dx) < 8 && abs(dy) < 8 && dt < 200) { rotate(1); }
    else if (abs(dx) > abs(dy)) { dx > 0 ? moveRight() : moveLeft(); }
    else { dy > 0 ? (dt < 200 ? hardDrop() : softDrop()) : rotate(1); }
    touchRef.current = null;
  };

  // ── Mobile buttons ─────────────────────────────────────────
  const Btn = ({ label, onPress }) => (
    <button
      className="tet-btn"
      onPointerDown={(e) => { e.preventDefault(); onPress(); }}
    >{label}</button>
  );

  const pw = PREVIEW_SIZE * CELL;

  return (
    <div className="tet-page">
      <div className="tet-topbar">
        <button className="tet-back" onClick={() => navigate('home')}>← BACK</button>
        <span className="tet-game-label">TETRIS</span>
        <span className="tet-controls-hint">SPACE / ↑ ROTATE</span>
      </div>

      <div className="tet-layout">
        {/* Left panel */}
        <div className="tet-panel tet-panel-left">
          <div className="tet-panel-section">
            <span className="tet-label">HOLD</span>
            <canvas ref={holdRef} width={pw} height={pw} className="tet-mini-canvas" />
          </div>
          <div className="tet-panel-section tet-stats" id="tet-stats-left" />
        </div>

        {/* Main board */}
        <div className="tet-board-wrap">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="tet-canvas"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          />
          <StatsOverlay stateRef={stateRef} />
        </div>

        {/* Right panel */}
        <div className="tet-panel tet-panel-right">
          <div className="tet-panel-section">
            <span className="tet-label">NEXT</span>
            <canvas
              ref={previewRef}
              width={pw}
              height={pw * 3}
              className="tet-mini-canvas"
            />
          </div>
        </div>
      </div>

      {/* Mobile controls */}
      <div className="tet-mobile-controls">
        <div className="tet-mobile-row">
          <Btn label="↺" onPress={() => rotate(-1)} />
          <Btn label="▲" onPress={() => rotate(1)} />
          <Btn label="⇓" onPress={hardDrop} />
          <Btn label="C" onPress={hold} />
        </div>
        <div className="tet-mobile-row">
          <Btn label="◀" onPress={moveLeft} />
          <Btn label="▼" onPress={softDrop} />
          <Btn label="▶" onPress={moveRight} />
          <Btn label="⏸" onPress={() => {
            const s = stateRef.current;
            if (s?.status === 'playing') pause();
            else start();
          }} />
        </div>
      </div>
    </div>
  );
}

// Live stats overlay (re-reads stateRef every frame via requestAnimationFrame)
function StatsOverlay({ stateRef }) {
  const elRef = useRef(null);
  useEffect(() => {
    let raf;
    let last = {};
    function tick() {
      raf = requestAnimationFrame(tick);
      const s = stateRef.current;
      if (!s || !elRef.current) return;
      if (s.score === last.score && s.lines === last.lines && s.level === last.level) return;
      last = { score: s.score, lines: s.lines, level: s.level };
      elRef.current.innerHTML = `
        <div class="tet-stat"><span class="tet-stat-label">SCORE</span><span class="tet-stat-val">${s.score}</span></div>
        <div class="tet-stat"><span class="tet-stat-label">LINES</span><span class="tet-stat-val">${s.lines}</span></div>
        <div class="tet-stat"><span class="tet-stat-label">LEVEL</span><span class="tet-stat-val">${s.level}</span></div>
      `;
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stateRef]);
  return <div ref={elRef} className="tet-stats-overlay" />;
}