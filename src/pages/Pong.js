import React, { useEffect, useRef, useCallback } from 'react';
import './Pong.css';

const W = 640;
const H = 400;
const PAD_W = 10;
const PAD_H = 70;
const PAD_SPEED = 5.5;
const BALL_SIZE = 8;
const WIN_SCORE = 7;

const DIFFICULTIES = {
  easy:   { label: 'EASY', react: 0.55 },
  medium: { label: 'MEDIUM', react: 0.75 },
  hard:   { label: 'HARD', react: 0.92 },
  custom: { label: 'CUSTOM', react: 0.75 },
};

function initState(mode = 'cpu', difficulty = 'medium', customDifficulty = 75) {
  return {
    status: 'idle',
    mode,
    difficulty,
    customDifficulty,
    cpuReact: difficulty === 'custom'
      ? customDifficulty / 100
      : DIFFICULTIES[difficulty].react,
    ball: { x: W / 2, y: H / 2, vx: 4 * (Math.random() > 0.5 ? 1 : -1), vy: 3 * (Math.random() > 0.5 ? 1 : -1) },
    p1: { y: H / 2 - PAD_H / 2, score: 0 },
    p2: { y: H / 2 - PAD_H / 2, score: 0 },
    keys: {},
    particles: [],
    serving: true,
    serveTimer: 60,
  };
}

function resetBall(toRight = true) {
  const angle = (Math.random() * 0.6 - 0.3);
  const speed = 4.5;
  return {
    x: W / 2, y: H / 2,
    vx: speed * (toRight ? 1 : -1) * Math.cos(angle),
    vy: speed * Math.sin(angle),
  };
}

export default function Pong({ navigate }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(initState('cpu'));
  const rafRef = useRef(null);
  const modeRef = useRef('cpu');
  const diffMenuRef = useRef(null);

  const [modeUI, setModeUI] = React.useState('cpu');
  const [difficultyUI, setDifficultyUI] = React.useState('medium');
  const [customDifficultyUI, setCustomDifficultyUI] = React.useState(75);
  const [difficultyMenuOpen, setDifficultyMenuOpen] = React.useState(false);

  const setDifficulty = useCallback((difficulty, percent = 75) => {
    const cpuReact = difficulty === 'custom'
      ? Math.min(0.99, Math.max(0.1, percent / 100))
      : DIFFICULTIES[difficulty].react;

    const s = stateRef.current;
    s.difficulty = difficulty;
    s.customDifficulty = percent;
    s.cpuReact = cpuReact;

    setDifficultyUI(difficulty);
    setCustomDifficultyUI(percent);
    setDifficultyMenuOpen(false);
  }, []);

  const selectDifficulty = useCallback((option) => {
    if (option === 'custom') {
      const input = window.prompt('Enter CPU difficulty percent (10-99)', String(customDifficultyUI));
      const value = Number(input);
      if (!Number.isFinite(value) || value < 10 || value > 99) return;
      setDifficulty('custom', value);
    } else {
      setDifficulty(option);
    }
  }, [customDifficultyUI, setDifficulty]);

  useEffect(() => {
    if (!difficultyMenuOpen) return;
    const onWindowClick = (e) => {
      if (!diffMenuRef.current?.contains(e.target)) setDifficultyMenuOpen(false);
    };
    window.addEventListener('mousedown', onWindowClick);
    return () => window.removeEventListener('mousedown', onWindowClick);
  }, [difficultyMenuOpen]);

  const toggleMode = useCallback(() => {
    const next = modeRef.current === 'cpu' ? '2p' : 'cpu';
    modeRef.current = next;
    setModeUI(next);
    stateRef.current = initState(next, difficultyUI, customDifficultyUI);
  }, [difficultyUI, customDifficultyUI]);

  const startOrResume = useCallback(() => {
    const s = stateRef.current;
    if (s.status === 'dead') {
      stateRef.current = initState(modeRef.current, difficultyUI, customDifficultyUI);
      return;
    }
    if (s.status === 'idle' || s.status === 'paused') s.status = 'playing';
  }, [difficultyUI, customDifficultyUI]);

  // ── Keys ─────────────────────────────────────────────────────
  useEffect(() => {
    const onDown = (e) => {
      stateRef.current.keys[e.code] = true;
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); startOrResume(); }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        const s = stateRef.current;
        if (s.status === 'playing') s.status = 'paused';
        else if (s.status === 'paused') s.status = 'playing';
      }
    };
    const onUp = (e) => { stateRef.current.keys[e.code] = false; };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, [startOrResume]);

  // ── Main loop ────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // ─ physics ─
    function update(s) {
      if (s.status !== 'playing') return;
      const { ball, p1, p2, keys } = s;

      // serve delay
      if (s.serving) {
        s.serveTimer--;
        if (s.serveTimer <= 0) s.serving = false;
        return;
      }

      // P1 input
      if (s.mode === '2p') {
        if (keys['KeyW']) p1.y -= PAD_SPEED;
        if (keys['KeyS']) p1.y += PAD_SPEED;

        if (keys['ArrowUp'])   p2.y -= PAD_SPEED;
        if (keys['ArrowDown']) p2.y += PAD_SPEED;
      } else {
        if (keys['KeyW'] || keys['ArrowUp'])   p1.y -= PAD_SPEED;
        if (keys['KeyS'] || keys['ArrowDown']) p1.y += PAD_SPEED;
      }

      // clean up: 2p shares arrow keys so reset p1 arrow handling
      if (s.mode !== '2p') {
        if (keys['ArrowUp'])   p1.y -= PAD_SPEED;
        if (keys['ArrowDown']) p1.y += PAD_SPEED;
      }

      p1.y = Math.max(0, Math.min(H - PAD_H, p1.y));
      p2.y = Math.max(0, Math.min(H - PAD_H, p2.y));

      // CPU
      if (s.mode === 'cpu') {
        const target = ball.y - PAD_H / 2;
        const diff = target - p2.y;
        p2.y += Math.sign(diff) * Math.min(Math.abs(diff), PAD_SPEED * s.cpuReact);
        p2.y = Math.max(0, Math.min(H - PAD_H, p2.y));
      }

      // ball movement
      ball.x += ball.vx;
      ball.y += ball.vy;

      // top / bottom bounce
      if (ball.y - BALL_SIZE / 2 <= 0)        { ball.y = BALL_SIZE / 2;      ball.vy = Math.abs(ball.vy); }
      if (ball.y + BALL_SIZE / 2 >= H)         { ball.y = H - BALL_SIZE / 2; ball.vy = -Math.abs(ball.vy); }

      // P1 paddle (left)
      if (ball.vx < 0 &&
          ball.x - BALL_SIZE / 2 <= 20 + PAD_W &&
          ball.x - BALL_SIZE / 2 >= 20 &&
          ball.y >= p1.y - BALL_SIZE / 2 &&
          ball.y <= p1.y + PAD_H + BALL_SIZE / 2) {
        ball.x = 20 + PAD_W + BALL_SIZE / 2;
        const hit = (ball.y - (p1.y + PAD_H / 2)) / (PAD_H / 2);
        const speed = Math.min(10, Math.sqrt(ball.vx ** 2 + ball.vy ** 2) + 0.25);
        const angle = hit * 1.1;
        ball.vx =  speed * Math.cos(angle);
        ball.vy =  speed * Math.sin(angle);
        spawnParticles(s, ball.x, ball.y, '#47c8ff');
      }

      // P2 paddle (right)
      if (ball.vx > 0 &&
          ball.x + BALL_SIZE / 2 >= W - 20 - PAD_W &&
          ball.x + BALL_SIZE / 2 <= W - 20 &&
          ball.y >= p2.y - BALL_SIZE / 2 &&
          ball.y <= p2.y + PAD_H + BALL_SIZE / 2) {
        ball.x = W - 20 - PAD_W - BALL_SIZE / 2;
        const hit = (ball.y - (p2.y + PAD_H / 2)) / (PAD_H / 2);
        const speed = Math.min(10, Math.sqrt(ball.vx ** 2 + ball.vy ** 2) + 0.25);
        const angle = hit * 1.1;
        ball.vx = -speed * Math.cos(angle);
        ball.vy =  speed * Math.sin(angle);
        spawnParticles(s, ball.x, ball.y, '#47c8ff');
      }

      // scoring
      if (ball.x < 0) {
        p2.score++;
        spawnParticles(s, 0, ball.y, '#ff6b47', 20);
        checkWin(s, 'p2');
      }
      if (ball.x > W) {
        p1.score++;
        spawnParticles(s, W, ball.y, '#ff6b47', 20);
        checkWin(s, 'p1');
      }

      // particles
      s.particles = s.particles
        .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 1, vy: p.vy + 0.1 }))
        .filter(p => p.life > 0);
    }

    function checkWin(s, scorer) {
      const winner = scorer === 'p1' ? s.p1 : s.p2;
      if (winner.score >= WIN_SCORE) {
        s.status = 'dead';
        s.winner = scorer;
      } else {
        s.ball = resetBall(scorer === 'p2');
        s.serving = true;
        s.serveTimer = 90;
      }
    }

    function spawnParticles(s, x, y, color, n = 8) {
      for (let i = 0; i < n; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        s.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 25 + Math.random() * 20, color });
      }
    }

    // ─ draw ─
    function draw(s, frame) {
      // background
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, W, H);

      // centre dashes
      ctx.setLineDash([8, 10]);
      ctx.strokeStyle = '#1e1e2e';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
      ctx.setLineDash([]);

      // scores
      ctx.font = '700 40px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#1e1e2e';
      ctx.fillText(s.p1.score, W / 2 - 80, 60);
      ctx.fillText(s.p2.score, W / 2 + 80, 60);
      ctx.fillStyle = '#e8e8ff';
      ctx.fillText(s.p1.score, W / 2 - 82, 58);
      ctx.fillText(s.p2.score, W / 2 + 78, 58);

      // mode label
      ctx.font = '400 7px "Press Start 2P", monospace';
      ctx.fillStyle = '#2a2a3a';
      ctx.textAlign = 'center';
      ctx.fillText(s.mode === 'cpu' ? 'VS CPU' : '2 PLAYER', W / 2, H - 8);

      // particles
      s.particles.forEach(p => {
        ctx.globalAlpha = p.life / 45;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      });
      ctx.globalAlpha = 1;

      // paddles
      drawPaddle(ctx, 20, s.p1.y, '#47c8ff');
      drawPaddle(ctx, W - 20 - PAD_W, s.p2.y, s.mode === 'cpu' ? '#ff47e8' : '#47ffa0');

      // ball
      if (!s.serving || Math.floor(frame / 8) % 2 === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(s.ball.x - BALL_SIZE / 2, s.ball.y - BALL_SIZE / 2, BALL_SIZE, BALL_SIZE);
        // glow
        ctx.shadowColor = '#47c8ff';
        ctx.shadowBlur = 12;
        ctx.fillRect(s.ball.x - BALL_SIZE / 2, s.ball.y - BALL_SIZE / 2, BALL_SIZE, BALL_SIZE);
        ctx.shadowBlur = 0;
      }

      // overlays
      if (s.status === 'idle')   drawIdleOverlay(ctx, s.mode);
      if (s.status === 'paused') drawPausedOverlay(ctx);
      if (s.status === 'dead')   drawDeadOverlay(ctx, s);
    }

    function drawPaddle(ctx, x, y, color) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, PAD_W, PAD_H);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(x, y, PAD_W, 3);
      ctx.fillRect(x, y, 2, PAD_H);
    }

    function drawIdleOverlay(ctx, mode) {
      ctx.fillStyle = 'rgba(10,10,15,0.82)';
      ctx.fillRect(W / 2 - 180, H / 2 - 90, 360, 175);
      ctx.strokeStyle = '#47c8ff';
      ctx.lineWidth = 1;
      ctx.strokeRect(W / 2 - 180, H / 2 - 90, 360, 175);

      ctx.font = '700 16px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#47c8ff';
      ctx.fillText('PONG', W / 2, H / 2 - 45);

      ctx.font = '400 7px "Press Start 2P", monospace';
      ctx.fillStyle = '#666680';
      if (mode === 'cpu') {
        ctx.fillText('W / S  or  ↑ / ↓  —  MOVE', W / 2, H / 2 - 8);
        ctx.fillText('FIRST TO 7 WINS', W / 2, H / 2 + 14);
      } else {
        ctx.fillText('P1: W / S     P2: ↑ / ↓', W / 2, H / 2 - 8);
        ctx.fillText('FIRST TO 7 WINS', W / 2, H / 2 + 14);
      }
      ctx.fillStyle = '#47c8ff';
      ctx.fillText('SPACE / ENTER TO START', W / 2, H / 2 + 50);
    }

    function drawPausedOverlay(ctx) {
      ctx.fillStyle = 'rgba(10,10,15,0.82)';
      ctx.fillRect(W / 2 - 140, H / 2 - 50, 280, 100);
      ctx.strokeStyle = '#47c8ff';
      ctx.lineWidth = 1;
      ctx.strokeRect(W / 2 - 140, H / 2 - 50, 280, 100);
      ctx.font = '700 14px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#47c8ff';
      ctx.fillText('PAUSED', W / 2, H / 2 + 5);
      ctx.font = '400 7px "Press Start 2P", monospace';
      ctx.fillStyle = '#666680';
      ctx.fillText('ESC / P TO RESUME', W / 2, H / 2 + 28);
    }

    function drawDeadOverlay(ctx, s) {
      ctx.fillStyle = 'rgba(10,10,15,0.9)';
      ctx.fillRect(0, 0, W, H);

      const isP1Win = s.winner === 'p1';
      const label = s.mode === 'cpu'
        ? (isP1Win ? 'YOU WIN!' : 'CPU WINS')
        : (isP1Win ? 'P1 WINS!' : 'P2 WINS!');

      ctx.font = '700 18px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = isP1Win ? '#47ffa0' : '#ff6b47';
      ctx.fillText(label, W / 2, H / 2 - 50);

      ctx.strokeStyle = '#2a2a3a';
      ctx.lineWidth = 1;
      ctx.strokeRect(W / 2 - 120, H / 2 - 30, 240, 65);

      ctx.font = '400 9px "Press Start 2P", monospace';
      ctx.fillStyle = '#666680';
      ctx.textAlign = 'left';
      ctx.fillText('P1', W / 2 - 100, H / 2 + 0);
      ctx.fillText(s.mode === 'cpu' ? 'CPU' : 'P2', W / 2 - 100, H / 2 + 24);
      ctx.font = '700 11px "Press Start 2P", monospace';
      ctx.fillStyle = '#e8ff47';
      ctx.textAlign = 'right';
      ctx.fillText(s.p1.score, W / 2 + 100, H / 2 + 0);
      ctx.fillText(s.p2.score, W / 2 + 100, H / 2 + 24);

      ctx.font = '400 7px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#666680';
      ctx.fillText('SPACE / ENTER TO PLAY AGAIN', W / 2, H / 2 + 62);
    }

    let frame = 0;
    function loop() {
      rafRef.current = requestAnimationFrame(loop);
      frame++;
      const s = stateRef.current;
      update(s);
      draw(s, frame);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── Touch (mobile paddle drag) ────────────────────────────────
  const touchesRef = useRef({});
  const onTouchStart = (e) => {
    e.preventDefault();
    const s = stateRef.current;
    if (s.status === 'idle' || s.status === 'dead') { startOrResume(); return; }
    Array.from(e.changedTouches).forEach(t => {
      touchesRef.current[t.identifier] = { x: t.clientX, side: t.clientX < window.innerWidth / 2 ? 'p1' : 'p2' };
    });
  };
  const onTouchMove = (e) => {
    e.preventDefault();
    const s = stateRef.current;
    if (s.status !== 'playing') return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleY = H / rect.height;
    Array.from(e.changedTouches).forEach(t => {
      const info = touchesRef.current[t.identifier];
      if (!info) return;
      const gameY = (t.clientY - rect.top) * scaleY - PAD_H / 2;
      if (info.side === 'p1') s.p1.y = Math.max(0, Math.min(H - PAD_H, gameY));
      else if (s.mode === '2p') s.p2.y = Math.max(0, Math.min(H - PAD_H, gameY));
    });
  };
  const onTouchEnd = (e) => {
    Array.from(e.changedTouches).forEach(t => delete touchesRef.current[t.identifier]);
  };

  return (
    <div className="pong-page">
      <div className="pong-topbar">
        <button className="pong-back" onClick={() => navigate('home')}>← BACK</button>
        <span className="pong-game-label">PONG</span>

        <div className="pong-difficulty" ref={diffMenuRef}>
          <button
            className="pong-difficulty-btn"
            onClick={() => setDifficultyMenuOpen((open) => !open)}
            title="CPU difficulty"
          >
            {difficultyUI === 'custom'
              ? `CUSTOM ${customDifficultyUI}%`
              : DIFFICULTIES[difficultyUI].label}
          </button>

          {difficultyMenuOpen && (
            <div className="pong-difficulty-menu">
              <button
                className={`pong-difficulty-option ${difficultyUI === 'easy' ? 'active' : ''}`}
                onClick={() => selectDifficulty('easy')}
              >
                EASY
              </button>
              <button
                className={`pong-difficulty-option ${difficultyUI === 'medium' ? 'active' : ''}`}
                onClick={() => selectDifficulty('medium')}
              >
                MEDIUM
              </button>
              <button
                className={`pong-difficulty-option ${difficultyUI === 'hard' ? 'active' : ''}`}
                onClick={() => selectDifficulty('hard')}
              >
                HARD
              </button>
              <button
                className={`pong-difficulty-option ${difficultyUI === 'custom' ? 'active custom' : ''}`}
                onClick={() => selectDifficulty('custom')}
              >
                CUSTOM {customDifficultyUI}%
              </button>
            </div>
          )}
        </div>

        <button
          className={`pong-mode-toggle ${modeUI === '2p' ? 'pong-mode-2p' : ''}`}
          onClick={toggleMode}
          title="Switch game mode"
        >
          {modeUI === 'cpu' ? 'VS CPU' : '2 PLAYER'}
        </button>
        <span className="pong-controls-hint">SPACE TO START</span>
      </div>

      <div className="pong-container">
        <canvas
          ref={canvasRef}
          className="pong-canvas"
          width={W}
          height={H}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />
      </div>
    </div>
  );
}