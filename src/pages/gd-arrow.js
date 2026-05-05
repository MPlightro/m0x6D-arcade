import React, { useState } from 'react';
import './gd-arrow.css';

const GAME_URL =
  'https://html5.gamedistribution.com/rvvASMiM/9ee26ba4405c456094c70af7dc31a524/index.html' +
  '?gd_sdk_referrer_url=https%3A%2F%2Fgeometryarrow.io%2Fgeometry-arrow' +
  '&gd_zone_config=eyJwYXJlbnRVUkwiOiJodHRwczovL2dlb21ldHJ5YXJyb3cuaW8vZ2VvbWV0cnktYXJyb3ciLCJwYXJlbnREb21haW4iOiJnZW9tZXRyeWFycm93LmlvIiwidG9wRG9tYWluIjoiZ2VvbWV0cnlhcnJvdy5pbyIsImhhc0ltcHJlc3Npb24iOmZhbHNlLCJsb2FkZXJFbmFibGVkIjp0cnVlLCJob3N0IjoiaHRtbDUuZ2FtZWRpc3RyaWJ1dGlvbi5jb20iLCJ2ZXJzaW9uIjoiMS41LjE4In0%253D';

export default function GeometryArrow({ navigate }) {
  const [blocked, setBlocked] = useState(false);

  return (
    <div className="ga-page">
      <div className="ga-topbar">
        <button className="ga-back" onClick={() => navigate('home')}>← BACK</button>
        <span className="ga-label">GEOMETRY ARROW</span>
        <a
          className="ga-open-btn"
          href={GAME_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          OPEN IN NEW TAB ↗
        </a>
      </div>

      <div className="ga-frame-wrap">
        {blocked ? (
          <div className="ga-blocked">
            <span className="ga-blocked-icon">🚫</span>
            <p className="ga-blocked-title">EMBEDDING BLOCKED</p>
            <p className="ga-blocked-sub">
              The game host doesn't allow embedding.<br />
              Open it directly in a new tab instead.
            </p>
            <a
              className="ga-blocked-btn"
              href={GAME_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              PLAY IN NEW TAB →
            </a>
          </div>
        ) : (
          <iframe
            title="Geometry Arrow"
            src={GAME_URL}
            allowFullScreen
            allow="autoplay; fullscreen *; encrypted-media"
            referrerPolicy="no-referrer"
            onError={() => setBlocked(true)}
          />
        )}
      </div>
    </div>
  );
}