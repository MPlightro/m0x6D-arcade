import React, { useState, useEffect } from 'react';
import Home from './pages/Home';
import FlappyBird from './pages/FlappyBird';
import './App.css';

function getPage() {
  const hash = window.location.hash.replace('#', '') || 'home';
  return hash;
}

export default function App() {
  const [page, setPage] = useState(getPage);

  useEffect(() => {
    const onHash = () => setPage(getPage());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = (path) => {
    window.location.hash = path;
  };

  return (
    <div className="app">
      {page === 'home' && <Home navigate={navigate} />}
      {page === 'flappy-bird' && <FlappyBird navigate={navigate} />}
    </div>
  );
}
