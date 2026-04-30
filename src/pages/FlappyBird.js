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
        {/* ── Drop your game canvas / component here ── */}
        <div className="fb-canvas-area">
          <p className="fb-placeholder-label">// game canvas</p>
          <p className="fb-placeholder-hint">Replace this div with your Flappy Bird component</p>
        </div>
      </div>
    </div>
  );
}
