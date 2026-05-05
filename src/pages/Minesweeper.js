import React, { useState, useEffect } from 'react';
import './Minesweeper.css';

const ROWS = 10;
const COLS = 10;
const MINES = 15;

const Minesweeper = () => {
  const [board, setBoard] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);

  useEffect(() => {
    initializeBoard();
  }, []);

  const initializeBoard = () => {
    const newBoard = Array(ROWS).fill().map(() => Array(COLS).fill({ isMine: false, isRevealed: false, isFlagged: false, neighborMines: 0 }));
    // Place mines randomly
    let minesPlaced = 0;
    while (minesPlaced < MINES) {
      const row = Math.floor(Math.random() * ROWS);
      const col = Math.floor(Math.random() * COLS);
      if (!newBoard[row][col].isMine) {
        newBoard[row][col].isMine = true;
        minesPlaced++;
      }
    }
    // Calculate neighbor mines
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!newBoard[r][c].isMine) {
          let count = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr, nc = c + dc;
              if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && newBoard[nr][nc].isMine) count++;
            }
          }
          newBoard[r][c].neighborMines = count;
        }
      }
    }
    setBoard(newBoard);
    setGameOver(false);
    setWin(false);
  };

  const revealCell = (r, c) => {
    if (gameOver || board[r][c].isRevealed || board[r][c].isFlagged) return;
    const newBoard = [...board];
    newBoard[r][c].isRevealed = true;
    if (newBoard[r][c].isMine) {
      setGameOver(true);
      // Reveal all mines
      for (let i = 0; i < ROWS; i++) {
        for (let j = 0; j < COLS; j++) {
          if (newBoard[i][j].isMine) newBoard[i][j].isRevealed = true;
        }
      }
    } else if (newBoard[r][c].neighborMines === 0) {
      // Reveal neighbors recursively
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !newBoard[nr][nc].isRevealed) {
            revealCell(nr, nc);
          }
        }
      }
    }
    setBoard(newBoard);
    checkWin(newBoard);
  };

  const toggleFlag = (r, c, e) => {
    e.preventDefault();
    if (gameOver || board[r][c].isRevealed) return;
    const newBoard = [...board];
    newBoard[r][c].isFlagged = !newBoard[r][c].isFlagged;
    setBoard(newBoard);
  };

  const checkWin = (board) => {
    let revealedCells = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c].isRevealed) revealedCells++;
      }
    }
    if (revealedCells === ROWS * COLS - MINES) setWin(true);
  };

  return (
    <div className="minesweeper">
      <h1>Minesweeper</h1>
      <button className="new-game-btn" onClick={initializeBoard}>New Game</button>
      {gameOver && <p className="game-message">Game Over!</p>}
      {win && <p className="game-message">You Win!</p>}
      <div className="board">
        {board.map((row, r) => (
          <div key={r} className="row">
            {row.map((cell, c) => (
              <button
                key={c}
                className={`cell ${cell.isRevealed ? (cell.isMine ? 'mine' : 'revealed') : 'hidden'}`}
                onClick={() => revealCell(r, c)}
                onContextMenu={(e) => toggleFlag(r, c, e)}
                disabled={cell.isRevealed}
              >
                {cell.isRevealed ? (cell.isMine ? '💣' : cell.neighborMines || '') : (cell.isFlagged ? '🚩' : '')}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Minesweeper;
