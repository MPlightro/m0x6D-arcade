import React, { useEffect, useRef, useCallback } from 'react';
import './FlappyBird.css';

const W = 360;
const H = 520;
const GRAVITY = 0.38;
const FLAP_V = -7.2;
const PIPE_W = 52;
const PIPE_GAP = 145;
const PIPE_SPEED = 2.4;
const PIPE_MIN = 80;
const BIRD_R = 16;
const GROUND_H = 48;

export default function FlappyBird({ navigate }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);

  const initState = () => ({
    status: 'idle', // idle | playing | dead
    bird: { x: 80, y: H / 2 - 20, vy: 0, angle: 0, flap: 0 },
    pipes: [],
    score: 0,
    best: stateRef.current?.best ?? 0,
    frame: 0,
    lastPipe: 0,
    groundX: 0,
  });

  const flap = useCallback(() => {
    const s = stateRef.current;
    if (!s) return;
    if (s.status === 'dead') {
      stateRef.current = initState();
      return;
    }
    if (s.status === 'idle') s.status = 'playing';
    s.bird.vy = FLAP_V;
    s.bird.flap = 8;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    stateRef.current = initState();

    // ── Draw helpers ──────────────────────────────────────────
    function drawSky(s) {
      ctx.fillStyle = '#0d1b2a';
      ctx.fillRect(0, 0, W, H - GROUND_H);

      // stars (seeded by frame so they twinkle slowly)
      const seed = Math.floor(s.frame / 120);
      for (let i = 0; i < 30; i++) {
        const sx = ((i * 137 + seed * 17) % W);
        const sy = ((i * 89 + seed * 7) % (H - GROUND_H - 60));
        const alpha = 0.3 + 0.5 * Math.abs(Math.sin(s.frame * 0.03 + i));
        ctx.fillStyle = `rgba(232,255,71,${alpha.toFixed(2)})`;
        ctx.fillRect(sx, sy, 1, 1);
      }
    }

    function drawGround(groundX) {
      // base
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, H - GROUND_H, W, GROUND_H);
      // top strip
      ctx.fillStyle = '#e8ff47';
      ctx.fillRect(0, H - GROUND_H, W, 2);
      // tile marks
      ctx.fillStyle = '#2a2a3a';
      for (let i = 0; i < 10; i++) {
        const tx = ((groundX + i * 40) % (W + 40)) - 40;
        ctx.fillRect(tx, H - GROUND_H + 6, 1, GROUND_H - 6);
      }
    }

    function drawPipeSegment(x, y, w, h) {
      if (h <= 0) return;
      ctx.fillStyle = '#1e3a1e';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#e8ff47';
      ctx.fillRect(x, y, 2, h);
      ctx.fillRect(x + w - 2, y, 2, h);
    }

    function drawPipe(p) {
      const capH = 14;
      // top pipe
      drawPipeSegment(p.x, 0, PIPE_W, p.topH - capH);
      ctx.fillStyle = '#2d5a2d';
      ctx.fillRect(p.x - 5, p.topH - capH, PIPE_W + 10, capH);
      ctx.fillStyle = '#e8ff47';
      ctx.fillRect(p.x - 5, p.topH - capH, 2, capH);
      ctx.fillRect(p.x + PIPE_W + 3, p.topH - capH, 2, capH);

      // bottom pipe
      const botY = p.topH + PIPE_GAP + capH;
      const botH = H - GROUND_H - botY;
      ctx.fillStyle = '#2d5a2d';
      ctx.fillRect(p.x - 5, p.topH + PIPE_GAP, PIPE_W + 10, capH);
      ctx.fillStyle = '#e8ff47';
      ctx.fillRect(p.x - 5, p.topH + PIPE_GAP, 2, capH);
      ctx.fillRect(p.x + PIPE_W + 3, p.topH + PIPE_GAP, 2, capH);
      drawPipeSegment(p.x, botY, PIPE_W, botH);
    }

    function drawBird(bird) {
      ctx.save();
      ctx.translate(bird.x, bird.y);
      ctx.rotate((bird.angle * Math.PI) / 180);

      // wing
      const wingOff = bird.flap > 0 ? -7 : 5;
      ctx.fillStyle = '#b8c400';
      ctx.beginPath();
      ctx.ellipse(-4, wingOff, 9, 6, -0.3, 0, Math.PI * 2);
      ctx.fill();

      // body
      ctx.fillStyle = '#e8ff47';
      ctx.beginPath();
      ctx.ellipse(0, 0, BIRD_R, BIRD_R - 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // pixel eye
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(7, -7, 6, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(9, -7, 2, 2);

      // beak
      ctx.fillStyle = '#ff6b47';
      ctx.beginPath();
      ctx.moveTo(13, -2);
      ctx.lineTo(21, 1);
      ctx.lineTo(13, 4);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    function drawScore(score) {
      ctx.font = '900 36px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0a0a0f';
      ctx.fillText(score, W / 2 + 2, 62);
      ctx.fillStyle = '#e8ff47';
      ctx.fillText(score, W / 2, 60);
    }

    function drawIdleOverlay() {
      ctx.fillStyle = 'rgba(10,10,15,0.7)';
      ctx.fillRect(W / 2 - 140, H / 2 - 70, 280, 120);
      ctx.strokeStyle = '#e8ff47';
      ctx.lineWidth = 1;
      ctx.strokeRect(W / 2 - 140, H / 2 - 70, 280, 120);

      ctx.font = '700 13px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#e8ff47';
      ctx.fillText('FLAPPY BIRD', W / 2, H / 2 - 25);

      ctx.font = '400 8px "Press Start 2P", monospace';
      ctx.fillStyle = '#666680';
      ctx.fillText('SPACE / TAP TO FLAP', W / 2, H / 2 + 10);
      ctx.fillText('AVOID THE PIPES', W / 2, H / 2 + 30);
    }

    function drawDeadOverlay(score, best) {
      ctx.fillStyle = 'rgba(10,10,15,0.85)';
      ctx.fillRect(0, 0, W, H - GROUND_H);

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
      ctx.font = '400 8px "Press Start 2P", monospace';
      ctx.fillStyle = '#666680';
      ctx.fillText('SPACE / TAP TO RETRY', W / 2, H / 2 + 65);
    }

    // ── Game loop ─────────────────────────────────────────────
    let raf;
    function loop() {
      raf = requestAnimationFrame(loop);
      const s = stateRef.current;

      if (s.status === 'playing') {
        s.frame++;
        s.bird.vy += GRAVITY;
        s.bird.y += s.bird.vy;
        s.bird.angle = Math.max(-25, Math.min(90, s.bird.vy * 4));
        s.bird.flap = Math.max(0, s.bird.flap - 1);
        s.groundX = (s.groundX - PIPE_SPEED) % 40;

        if (s.frame - s.lastPipe > 90) {
          const topH = PIPE_MIN + Math.random() * (H - GROUND_H - 60 - PIPE_GAP - PIPE_MIN);
          s.pipes.push({ x: W + 10, topH, scored: false });
          s.lastPipe = s.frame;
        }

        for (const p of s.pipes) {
          p.x -= PIPE_SPEED;
          if (!p.scored && p.x + PIPE_W < s.bird.x) {
            s.score++;
            p.scored = true;
          }
        }
        s.pipes = s.pipes.filter((p) => p.x > -PIPE_W - 10);

        // collisions
        const { x, y } = s.bird;
        if (y + BIRD_R >= H - GROUND_H || y - BIRD_R <= 0) {
          s.status = 'dead';
          s.best = Math.max(s.best, s.score);
        }
        for (const p of s.pipes) {
          const r = BIRD_R - 3;
          if (x + r > p.x && x - r < p.x + PIPE_W) {
            if (y - r < p.topH || y + r > p.topH + PIPE_GAP) {
              s.status = 'dead';
              s.best = Math.max(s.best, s.score);
            }
          }
        }
      }

      // ── Render ──
      drawSky(s);
      for (const p of s.pipes) drawPipe(p);
      drawGround(s.groundX);
      drawBird(s.bird);
      if (s.status !== 'idle') drawScore(s.score);
      if (s.status === 'idle') drawIdleOverlay();
      if (s.status === 'dead') drawDeadOverlay(s.score, s.best);
    }

    loop();
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── Input bindings ───────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        flap();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flap]);

  return (
    <div className="fb-page">
      <div className="fb-topbar">
        <button className="fb-back" onClick={() => navigate('home')}>← BACK</button>
        <span className="fb-game-label">FLAPPY BIRD</span>
        <span className="fb-controls-hint">SPACE / TAP</span>
      </div>

      <div className="fb-container">
        <canvas
          ref={canvasRef}
          className="fb-canvas"
          width={W}
          height={H}
          onClick={flap}
          onTouchStart={(e) => { e.preventDefault(); flap(); }}
        />
      </div>
    </div>
  );
}
