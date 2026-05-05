import React, { useEffect, useRef, useCallback } from 'react';
import './Snake.css';

const COLS = 20;
const ROWS = 20;
const CELL = 24;
const W = COLS * CELL;
const H = ROWS * CELL;
const TICK_START = 130; // ms per move at start
const TICK_MIN   = 55;
const TICK_STEP  = 4;   // ms faster per apple

const DIR = { UP: [0,-1], DOWN: [0,1], LEFT: [-1,0], RIGHT: [1,0] };

function randomCell(snake) {
  let pos;
  do {
    pos = [Math.floor(Math.random() * COLS), Math.floor(Math.random() * ROWS)];
  } while (snake.some(([x, y]) => x === pos[0] && y === pos[1]));
  return pos;
}

function initState(best = 0, wallMode = false) {
  const snake = [[10, 10], [9, 10], [8, 10]];
  return {
    status: 'idle',   // idle | playing | dead
    snake,
    dir: [1, 0],
    nextDir: [1, 0],
    apple: randomCell(snake),
    score: 0,
    best,
    tick: TICK_START,
    lastTick: 0,
    wallMode,         // true = hitting wall is lethal
  };
}

export default function Snake({ navigate }) {
  const canvasRef = useRef(null);
  const stateRef  = useRef(initState());
  const rafRef    = useRef(null);
  const wallModeRef = useRef(false);  // survives resets

  const [wallMode, setWallModeUI] = React.useState(false);

  const toggleWall = useCallback(() => {
    const next = !wallModeRef.current;
    wallModeRef.current = next;
    setWallModeUI(next);
    // apply immediately to current state (only safe when idle/dead)
    const s = stateRef.current;
    if (s.status !== 'playing') {
      stateRef.current = initState(s.best, next);
    } else {
      s.wallMode = next; // apply mid-game too
    }
  }, []);

  // ── Input ────────────────────────────────────────────────────
  const handleDir = useCallback((nd) => {
    const s = stateRef.current;
    if (s.status === 'dead') {
      stateRef.current = initState(s.best, wallModeRef.current);
      return;
    }
    if (s.status === 'idle') {
      s.status = 'playing';
      s.lastTick = performance.now();
    }
    // prevent 180-flip
    const [cx, cy] = s.dir;
    if (nd[0] === -cx && nd[1] === -cy) return;
    s.nextDir = nd;
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      const map = {
        ArrowUp: DIR.UP, KeyW: DIR.UP,
        ArrowDown: DIR.DOWN, KeyS: DIR.DOWN,
        ArrowLeft: DIR.LEFT, KeyA: DIR.LEFT,
        ArrowRight: DIR.RIGHT, KeyD: DIR.RIGHT,
      };
      if (map[e.code]) { e.preventDefault(); handleDir(map[e.code]); }
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        const s = stateRef.current;
        if (s.status === 'dead') { stateRef.current = initState(s.best, wallModeRef.current); }
        else if (s.status === 'idle') { s.status = 'playing'; s.lastTick = performance.now(); }
      }
      if (e.code === 'KeyF') { e.preventDefault(); toggleWall(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleDir, toggleWall]);

  // ── Render loop ──────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');

    // ─ draw helpers ─
    function drawGrid(wallMode) {
      ctx.fillStyle = '#0d0d14';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#1a1a2a';
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= COLS; x++) {
        ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, H); ctx.stroke();
      }
      for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(W, y * CELL); ctx.stroke();
      }
      // wall border highlight when lethal
      if (wallMode) {
        ctx.strokeStyle = '#ff6b47';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, W - 2, H - 2);
      }
    }

    function drawSnake(snake) {
      snake.forEach(([x, y], i) => {
        const isHead = i === 0;
        const t = 1 - i / snake.length;
        if (isHead) {
          ctx.fillStyle = '#e8ff47';
        } else {
          // fade body to dimmer yellow-green
          const r = Math.round(80 + t * 150);
          const g = Math.round(180 + t * 70);
          const b = Math.round(10 + t * 30);
          ctx.fillStyle = `rgb(${r},${g},${b})`;
        }
        ctx.fillRect(x * CELL + 2, y * CELL + 2, CELL - 4, CELL - 4);

        // head details
        if (isHead) {
          const [dx, dy] = stateRef.current.dir;
          // eye positions based on direction
          const ex = x * CELL + CELL / 2 + dy * 5 + dx * 3;
          const ey = y * CELL + CELL / 2 - dx * 5 + dy * 3;
          ctx.fillStyle = '#0a0a0f';
          ctx.fillRect(ex - 2, ey - 2, 4, 4);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(ex - 1, ey - 1, 2, 2);
        }
      });
    }

    function drawApple([ax, ay], frame) {
      const pulse = 0.85 + 0.15 * Math.sin(frame * 0.12);
      const cx = ax * CELL + CELL / 2;
      const cy = ay * CELL + CELL / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = '#ff6b47';
      ctx.fillRect(-7, -5, 14, 12);
      // shine pixel
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(-4, -3, 3, 3);
      // stem
      ctx.fillStyle = '#47ffa0';
      ctx.fillRect(0, -8, 2, 4);
      ctx.restore();
    }

    function drawHUD(score, best, wallMode) {
      ctx.font = '700 11px "Press Start 2P", monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#e8ff47';
      ctx.fillText(score, 8, 20);
      ctx.font = '400 8px "Press Start 2P", monospace';
      ctx.fillStyle = '#2a2a3a';
      ctx.fillText(`BEST ${best}`, W - 8 - ctx.measureText(`BEST ${best}`).width, 20);
      ctx.fillStyle = '#444460';
      ctx.fillText(`BEST ${best}`, W - 9 - ctx.measureText(`BEST ${best}`).width, 19);
      // wall mode indicator
      if (wallMode) {
        ctx.font = '400 6px "Press Start 2P", monospace';
        ctx.fillStyle = '#ff6b47';
        ctx.textAlign = 'center';
        ctx.fillText('WALLS ON', W / 2, 14);
      }
    }

    function drawIdleOverlay(wallMode) {
      ctx.fillStyle = 'rgba(10,10,15,0.8)';
      ctx.fillRect(W / 2 - 140, H / 2 - 70, 280, 140);
      ctx.strokeStyle = '#47ffa0';
      ctx.lineWidth = 1;
      ctx.strokeRect(W / 2 - 140, H / 2 - 70, 280, 140);

      ctx.font = '700 13px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#47ffa0';
      ctx.fillText('SNAKE', W / 2, H / 2 - 25);

      ctx.font = '400 7px "Press Start 2P", monospace';
      ctx.fillStyle = '#666680';
      ctx.fillText('ARROWS / WASD TO MOVE', W / 2, H / 2 + 8);
      ctx.fillText('SPACE / ENTER TO START', W / 2, H / 2 + 28);
      ctx.fillText('EAT APPLES. DONT HIT YOURSELF.', W / 2, H / 2 + 48);

      // wall mode status
      ctx.fillStyle = wallMode ? '#ff6b47' : '#47ffa0';
      ctx.fillText(`WALLS: ${wallMode ? 'ON  (LETHAL)' : 'OFF (WRAP)'}`, W / 2, H / 2 + 68);
    }

    function drawDeadOverlay(score, best) {
      ctx.fillStyle = 'rgba(10,10,15,0.88)';
      ctx.fillRect(0, 0, W, H);

      ctx.font = '700 14px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff6b47';
      ctx.fillText('GAME OVER', W / 2, H / 2 - 60);

      ctx.strokeStyle = '#2a2a3a';
      ctx.lineWidth = 1;
      ctx.strokeRect(W / 2 - 110, H / 2 - 40, 220, 90);

      ctx.font = '400 9px "Press Start 2P", monospace';
      ctx.fillStyle = '#666680';
      ctx.fillText('SCORE', W / 2 - 40, H / 2 - 10);
      ctx.fillText('BEST', W / 2 - 40, H / 2 + 20);

      ctx.font = '700 11px "Press Start 2P", monospace';
      ctx.fillStyle = '#e8ff47';
      ctx.textAlign = 'right';
      ctx.fillText(score, W / 2 + 80, H / 2 - 10);
      ctx.fillText(best, W / 2 + 80, H / 2 + 20);

      ctx.textAlign = 'center';
      ctx.font = '400 7px "Press Start 2P", monospace';
      ctx.fillStyle = '#666680';
      ctx.fillText('SPACE / ARROW TO RETRY', W / 2, H / 2 + 65);
    }

    // ─ game loop ─
    let frame = 0;
    function loop(now) {
      rafRef.current = requestAnimationFrame(loop);
      frame++;
      const s = stateRef.current;

      // tick logic
      if (s.status === 'playing' && now - s.lastTick >= s.tick) {
        s.lastTick = now;
        s.dir = s.nextDir;

        const head = s.snake[0];
        const nx = head[0] + s.dir[0];
        const ny = head[1] + s.dir[1];

        // wall collision or wrap
        let dead = false;
        let newHead;
        if (s.wallMode) {
          if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
            dead = true;
          } else {
            newHead = [nx, ny];
          }
        } else {
          newHead = [(nx + COLS) % COLS, (ny + ROWS) % ROWS];
        }

        // self-collision
        if (!dead && s.snake.some(([x, y]) => x === newHead[0] && y === newHead[1])) {
          dead = true;
        }

        if (dead) {
          s.status = 'dead';
          s.best = Math.max(s.best, s.score);
        } else {
          s.snake = [newHead, ...s.snake];
          if (newHead[0] === s.apple[0] && newHead[1] === s.apple[1]) {
            s.score++;
            s.apple = randomCell(s.snake);
            s.tick = Math.max(TICK_MIN, s.tick - TICK_STEP);
          } else {
            s.snake.pop();
          }
        }
      }

      // ─ render ─
      drawGrid(s.wallMode);
      if (s.status !== 'dead') drawApple(s.apple, frame);
      drawSnake(s.snake);
      drawHUD(s.score, s.best, s.wallMode);
      if (s.status === 'idle') drawIdleOverlay(s.wallMode);
      if (s.status === 'dead') drawDeadOverlay(s.score, s.best);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── Touch swipe ──────────────────────────────────────────────
  const touchRef = useRef(null);
  const onTouchStart = (e) => { touchRef.current = [e.touches[0].clientX, e.touches[0].clientY]; };
  const onTouchEnd   = (e) => {
    if (!touchRef.current) return;
    const dx = e.changedTouches[0].clientX - touchRef.current[0];
    const dy = e.changedTouches[0].clientY - touchRef.current[1];
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    if (Math.abs(dx) > Math.abs(dy)) handleDir(dx > 0 ? DIR.RIGHT : DIR.LEFT);
    else handleDir(dy > 0 ? DIR.DOWN : DIR.UP);
    touchRef.current = null;
  };

  // ── D-pad buttons (mobile) ───────────────────────────────────
  const DPad = () => (
    <div className="sn-dpad">
      <button className="sn-dpad-btn sn-dpad-up"    onClick={() => handleDir(DIR.UP)}>▲</button>
      <div className="sn-dpad-row">
        <button className="sn-dpad-btn"              onClick={() => handleDir(DIR.LEFT)}>◀</button>
        <button className="sn-dpad-btn sn-dpad-down" onClick={() => handleDir(DIR.DOWN)}>▼</button>
        <button className="sn-dpad-btn"              onClick={() => handleDir(DIR.RIGHT)}>▶</button>
      </div>
    </div>
  );

  return (
    <div className="sn-page">
      <div className="sn-topbar">
        <button className="sn-back" onClick={() => navigate('home')}>← BACK</button>
        <span className="sn-game-label">SNAKE</span>
        <button
          className={`sn-wall-toggle ${wallMode ? 'sn-wall-on' : ''}`}
          onClick={toggleWall}
          title="Toggle wall collision (F)"
        >
          WALLS: {wallMode ? 'ON' : 'OFF'}
        </button>
        <span className="sn-controls-hint">ARROWS / WASD</span>
      </div>

      <div className="sn-container">
        <canvas
          ref={canvasRef}
          className="sn-canvas"
          width={W}
          height={H}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        />
        <DPad />
      </div>
    </div>
  );
}