import React from 'react';
import './FlappyBird.css';

export default function FlappyBird({ navigate }) {
  return (
    <div className="fb-page">
      <div className="fb-topbar">
        <button className="fb-back" onClick={() => navigate('home')}>← BACK</button>
        <span className="fb-game-label">FLAPPY BIRD</span>
      </div>

      <div className="fb-container">

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: transparent; }
#game-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem 0;
  font-family: var(--font-mono, monospace);
}
#canvas {
  border-radius: 12px;
  display: block;
  cursor: pointer;
  image-rendering: pixelated;
}
#hud {
  display: flex;
  justify-content: space-between;
  width: 360px;
  margin-top: 10px;
  font-size: 13px;
  color: var(--color-text-secondary);
}
#best-score { color: var(--color-text-tertiary); }
</style>

<div id="game-wrap">
  <h2 class="sr-only">Flappy Bird game — press Space or tap to flap</h2>
  <canvas id="canvas" width="360" height="520" tabindex="0"></canvas>
  <div id="hud">
    <span>score: <strong id="score-disp">0</strong></span>
    <span id="best-score">best: <strong id="best-disp">0</strong></span>
  </div>
</div>

<script>
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

const scoreEl = document.getElementById('score-disp');
const bestEl = document.getElementById('best-disp');

const CLR = {
  sky:    '#87CEEB',
  skyBot: '#B0E0FF',
  ground: '#DEB887',
  dirt:   '#C4A265',
  grass:  '#5DBB5B',
  pipe:   '#4CAF50',
  pipeDk: '#388E3C',
  pipeHl: '#81C784',
  bird:   '#FFD700',
  birdDk: '#FFA500',
  eye:    '#FFFFFF',
  pupil:  '#222222',
  beak:   '#FF8C00',
  wing:   '#FFC107',
  text:   '#FFFFFF',
  overlay:'rgba(0,0,0,0.45)',
};

let state, bird, pipes, score, best, frame, lastPipe, flapAnim, groundX;

function init() {
  state = 'idle'; // idle | playing | dead
  bird = { x: 80, y: H/2 - 20, vy: 0, angle: 0, flap: 0 };
  pipes = [];
  score = 0;
  frame = 0;
  lastPipe = 0;
  flapAnim = 0;
  groundX = 0;
  scoreEl.textContent = 0;
  best = parseInt(bestEl.textContent) || 0;
}

const GRAVITY = 0.38;
const FLAP = -7.2;
const PIPE_W = 52;
const PIPE_GAP = 145;
const PIPE_SPEED = 2.4;
const PIPE_MIN = 80;
const BIRD_R = 16;

function flap() {
  if (state === 'dead') { init(); return; }
  if (state === 'idle') state = 'playing';
  bird.vy = FLAP;
  bird.flap = 8;
  flapAnim = 1;
}

function spawnPipe() {
  const topH = PIPE_MIN + Math.random() * (H - 160 - PIPE_GAP - PIPE_MIN);
  pipes.push({ x: W + 10, topH, scored: false });
}

function update() {
  if (state !== 'playing') return;
  frame++;

  bird.vy += GRAVITY;
  bird.y += bird.vy;
  bird.angle = Math.max(-25, Math.min(90, bird.vy * 4));
  bird.flap = Math.max(0, bird.flap - 1);

  groundX = (groundX - PIPE_SPEED) % 48;

  if (frame - lastPipe > 90) {
    spawnPipe();
    lastPipe = frame;
  }

  for (let p of pipes) {
    p.x -= PIPE_SPEED;
    if (!p.scored && p.x + PIPE_W < bird.x) {
      score++;
      p.scored = true;
      scoreEl.textContent = score;
    }
  }
  pipes = pipes.filter(p => p.x > -PIPE_W - 10);

  // collision: ground/ceiling
  if (bird.y + BIRD_R >= H - 48 || bird.y - BIRD_R <= 0) {
    die();
    return;
  }

  // collision: pipes
  for (let p of pipes) {
    const bx = bird.x, by = bird.y;
    const pr = BIRD_R - 3;
    if (bx + pr > p.x && bx - pr < p.x + PIPE_W) {
      if (by - pr < p.topH || by + pr > p.topH + PIPE_GAP) {
        die();
        return;
      }
    }
  }
}

function die() {
  state = 'dead';
  if (score > best) {
    best = score;
    bestEl.textContent = best;
  }
}

function drawSky() {
  const grad = ctx.createLinearGradient(0, 0, 0, H - 48);
  grad.addColorStop(0, '#5AABDC');
  grad.addColorStop(1, '#C4E8FA');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H - 48);

  // clouds
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  const cx = (-(frame * 0.3)) % (W + 80);
  [[cx + 30, 60, 28], [cx + 90, 55, 20], [cx + 60, 65, 22],
   [cx + W/2 + 20, 110, 24], [cx + W/2 + 70, 105, 18], [cx + W/2 + 45, 115, 20]
  ].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill(); });
}

function drawGround() {
  ctx.fillStyle = CLR.grass;
  ctx.fillRect(0, H - 48, W, 12);
  ctx.fillStyle = CLR.ground;
  ctx.fillRect(0, H - 36, W, 36);
  ctx.fillStyle = CLR.dirt;
  ctx.fillRect(0, H - 8, W, 8);

  // tile marks
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  for (let i = 0; i < 9; i++) {
    const tx = ((groundX + i * 48) % (W + 48)) - 48;
    ctx.fillRect(tx, H - 36, 2, 28);
  }
}

function drawPipe(p) {
  const r = 6;
  // top pipe (hangs down)
  const capH = 16;
  drawPipeBody(p.x, 0, PIPE_W, p.topH - capH);
  // cap top
  ctx.fillStyle = CLR.pipe;
  ctx.beginPath();
  ctx.roundRect(p.x - 4, p.topH - capH, PIPE_W + 8, capH, [0, 0, r, r]);
  ctx.fill();
  ctx.fillStyle = CLR.pipeHl;
  ctx.fillRect(p.x + 4, 0, 6, p.topH - capH);

  // bottom pipe
  drawPipeBody(p.x, p.topH + PIPE_GAP + capH, PIPE_W, H - 48 - p.topH - PIPE_GAP - capH);
  ctx.fillStyle = CLR.pipe;
  ctx.beginPath();
  ctx.roundRect(p.x - 4, p.topH + PIPE_GAP, PIPE_W + 8, capH, [r, r, 0, 0]);
  ctx.fill();
  ctx.fillStyle = CLR.pipeHl;
  ctx.fillRect(p.x + 4, p.topH + PIPE_GAP + capH, 6, H - 48 - p.topH - PIPE_GAP - capH);
}

function drawPipeBody(x, y, w, h) {
  if (h <= 0) return;
  ctx.fillStyle = CLR.pipe;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = CLR.pipeDk;
  ctx.fillRect(x, y, 3, h);
  ctx.fillRect(x + w - 3, y, 3, h);
}

function drawBird() {
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.angle * Math.PI / 180);

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath();
  ctx.ellipse(2, BIRD_R + 4, 14, 6, 0, 0, Math.PI*2);
  ctx.fill();

  // wing
  const wingY = bird.flap > 0 ? -8 : 4;
  ctx.fillStyle = CLR.wing;
  ctx.beginPath();
  ctx.ellipse(-4, wingY, 10, 7, -0.3, 0, Math.PI*2);
  ctx.fill();

  // body
  ctx.fillStyle = CLR.bird;
  ctx.beginPath();
  ctx.ellipse(0, 0, BIRD_R, BIRD_R - 2, 0, 0, Math.PI*2);
  ctx.fill();

  // belly
  ctx.fillStyle = '#FFE878';
  ctx.beginPath();
  ctx.ellipse(4, 4, 10, 8, 0.3, 0, Math.PI*2);
  ctx.fill();

  // eye white
  ctx.fillStyle = CLR.eye;
  ctx.beginPath();
  ctx.arc(8, -5, 6, 0, Math.PI*2);
  ctx.fill();

  // pupil
  ctx.fillStyle = CLR.pupil;
  ctx.beginPath();
  ctx.arc(9, -5, 3, 0, Math.PI*2);
  ctx.fill();

  // eyeshine
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(10, -6, 1, 0, Math.PI*2);
  ctx.fill();

  // beak
  ctx.fillStyle = CLR.beak;
  ctx.beginPath();
  ctx.moveTo(14, -2);
  ctx.lineTo(22, 1);
  ctx.lineTo(14, 4);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawScore() {
  if (state === 'idle' || state === 'playing') {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(score, W/2 + 2, 62);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(score, W/2, 60);
  }
}

function drawIdleScreen() {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(W/2 - 130, H/2 - 60, 260, 110);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(W/2 - 130, H/2 - 60, 260, 110);

  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 32px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('FLAPPY BIRD', W/2, H/2 - 20);

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = '15px monospace';
  ctx.fillText('SPACE / TAP to flap', W/2, H/2 + 15);
  ctx.fillText('avoid the pipes!', W/2, H/2 + 35);
}

function drawDeadScreen() {
  ctx.fillStyle = CLR.overlay;
  ctx.fillRect(0, 0, W, H - 48);

  ctx.fillStyle = '#FF4444';
  ctx.font = 'bold 34px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', W/2, H/2 - 50);

  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(W/2 - 110, H/2 - 30, 220, 90);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '16px monospace';
  ctx.fillText(`score:  ${score}`, W/2, H/2 + 5);
  ctx.fillText(`best:   ${best}`, W/2, H/2 + 28);

  ctx.fillStyle = '#FFD700';
  ctx.font = '14px monospace';
  ctx.fillText('SPACE / TAP to restart', W/2, H/2 + 72);
}

function loop() {
  requestAnimationFrame(loop);
  update();

  drawSky();
  for (let p of pipes) drawPipe(p);
  drawGround();
  drawBird();
  drawScore();

  if (state === 'idle') drawIdleScreen();
  if (state === 'dead') drawDeadScreen();
}

// input
canvas.addEventListener('click', flap);
canvas.addEventListener('touchstart', e => { e.preventDefault(); flap(); }, { passive: false });
document.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); flap(); }
});

init();
loop();
</script>

      </div>
    </div>
  );
}
