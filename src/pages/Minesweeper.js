import React, { useState, useEffect } from 'react';
import './Minesweeper.css';

const ROWS = 10;
const COLS = 10;
const MINES = 10;

const Minesweeper = () => {
  const [board, setBoard] = useState([]);
  const [revealed, setRevealed] = useState(new Set());
  const [flagged, setFlagged] = useState(new Set());
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  useEffect(() => {
    initializeBoard();
  }, []);

  const initializeBoard = () => {
    const newBoard = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    let minesPlaced = 0;
    while (minesPlaced < MINES) {
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);
      if (newBoard[r][c] !== -1) {
        newBoard[r][c] = -1;
        minesPlaced++;
        // Increment neighbors
        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            const nr = r + i, nc = c + j;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && newBoard[nr][nc] !== -1) {
              newBoard[nr][nc]++;
            }
          }
        }
      }
    }
    setBoard(newBoard);
    setRevealed(new Set());
    setFlagged(new Set());
    setGameOver(false);
    setWon(false);
  };

  const revealCell = (r, c) => {
    if (gameOver || revealed.has(`${r}-${c}`) || flagged.has(`${r}-${c}`)) return;
    const newRevealed = new Set(revealed);
    newRevealed.add(`${r}-${c}`);
    if (board[r][c] === -1) {
      setGameOver(true);
      // Reveal all mines
      for (let i = 0; i < ROWS; i++) {
        for (let j = 0; j < COLS; j++) {
          if (board[i][j] === -1) newRevealed.add(`${i}-${j}`);
        }
      }
    } else if (board[r][c] === 0) {
      // Flood fill
      const stack = [[r, c]];
      while (stack.length) {
        const [cr, cc] = stack.pop();
        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            const nr = cr + i, nc = cc + j;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !newRevealed.has(`${nr}-${nc}`) && !flagged.has(`${nr}-${nc}`)) {
              newRevealed.add(`${nr}-${nc}`);
              if (board[nr][nc] === 0) stack.push([nr, nc]);
            }
          }
        }
      }
    }
    setRevealed(newRevealed);
    checkWin(newRevealed);
  };

  const toggleFlag = (e, r, c) => {
    e.preventDefault();
    if (gameOver || revealed.has(`${r}-${c}`)) return;
    const newFlagged = new Set(flagged);
    if (newFlagged.has(`${r}-${c}`)) {
      newFlagged.delete(`${r}-${c}`);
    } else {
      newFlagged.add(`${r}-${c}`);
    }
    setFlagged(newFlagged);
  };

  const checkWin = (newRevealed) => {
    let revealedCount = 0;
    for (let i = 0; i < ROWS; i++) {
      for (let j = 0; j < COLS; j++) {
        if (newRevealed.has(`${i}-${j}`)) revealedCount++;
      }
    }
    if (revealedCount === ROWS * COLS - MINES) {
      setWon(true);
      setGameOver(true);
    }
  };

  const getCellDisplay = (r, c) => {
    if (flagged.has(`${r}-${c}`)) return '🚩';
    if (!revealed.has(`${r}-${c}`)) return '';
    if (board[r][c] === -1) return '💣';
    if (board[r][c] === 0) return '';
    return board[r][c];
  };

  return (
    <div className="minesweeper-container">
      <h1 className="minesweeper-title">Minesweeper</h1>
      <button onClick={initializeBoard} className="minesweeper-button">New Game</button>
      {gameOver && <p className="minesweeper-status">{won ? 'You Win!' : 'Game Over'}</p>}
      <div className="minesweeper-board">
        {board.map((row, r) => (
          <div key={r} className="minesweeper-row">
            {row.map((cell, c) => (
              <button
                key={c}
                onClick={() => revealCell(r, c)}
                onContextMenu={(e) => toggleFlag(e, r, c)}
                className={`minesweeper-cell ${revealed.has(`${r}-${c}`) ? 'revealed' : ''}`}
                disabled={gameOver}
              >
                {getCellDisplay(r, c)}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Minesweeper;