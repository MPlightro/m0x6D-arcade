import React, { useState, useEffect } from 'react';
import './Minesweeper.css';

const ROWS = 10;
const COLS = 10;
const MINES = 15;

const createEmptyBoard = () =>
  Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({
      isMine: false,
      isRevealed: false,
      isFlagged: false,
      neighborMines: 0,
    })),
  );

const cloneBoard = (board) => board.map((row) => row.map((cell) => ({ ...cell })));

const countNeighbors = (board, r, c) => {
  let count = 0;
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      const nr = r + dr;
      const nc = c + dc;
      if (
        nr >= 0 &&
        nr < ROWS &&
        nc >= 0 &&
        nc < COLS &&
        board[nr][nc].isMine
      ) {
        count += 1;
      }
    }
  }
  return count;
};

const Minesweeper = () => {
  const [board, setBoard] = useState(createEmptyBoard());
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);

  useEffect(() => {
    initializeBoard();
  }, []);

  const initializeBoard = () => {
    const newBoard = createEmptyBoard();
    const mines = new Set();

    while (mines.size < MINES) {
      const row = Math.floor(Math.random() * ROWS);
      const col = Math.floor(Math.random() * COLS);
      mines.add(`${row}-${col}`);
    }

    mines.forEach((pos) => {
      const [row, col] = pos.split('-').map(Number);
      newBoard[row][col].isMine = true;
    });

    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        newBoard[r][c].neighborMines = countNeighbors(newBoard, r, c);
      }
    }

    setBoard(newBoard);
    setGameOver(false);
    setWin(false);
  };

  const revealCell = (r, c) => {
    if (gameOver || board[r][c].isRevealed || board[r][c].isFlagged) return;

    const newBoard = cloneBoard(board);
    const stack = [[r, c]];
    let exploded = false;

    while (stack.length > 0) {
      const [cr, cc] = stack.pop();
      const cell = newBoard[cr][cc];

      if (cell.isRevealed || cell.isFlagged) continue;
      cell.isRevealed = true;

      if (cell.isMine) {
        exploded = true;
        break;
      }

      if (cell.neighborMines === 0) {
        for (let dr = -1; dr <= 1; dr += 1) {
          for (let dc = -1; dc <= 1; dc += 1) {
            const nr = cr + dr;
            const nc = cc + dc;
            if (
              nr >= 0 &&
              nr < ROWS &&
              nc >= 0 &&
              nc < COLS &&
              !newBoard[nr][nc].isRevealed
            ) {
              stack.push([nr, nc]);
            }
          }
        }
      }
    }

    if (exploded) {
      setGameOver(true);
      for (let rr = 0; rr < ROWS; rr += 1) {
        for (let cc = 0; cc < COLS; cc += 1) {
          if (newBoard[rr][cc].isMine) newBoard[rr][cc].isRevealed = true;
        }
      }
    }

    setBoard(newBoard);
    checkWin(newBoard);
  };

  const toggleFlag = (r, c, e) => {
    e.preventDefault();
    if (gameOver || board[r][c].isRevealed) return;
    const newBoard = cloneBoard(board);
    newBoard[r][c].isFlagged = !newBoard[r][c].isFlagged;
    setBoard(newBoard);
  };

  const checkWin = (currentBoard) => {
    const revealed = currentBoard.flat().filter((cell) => cell.isRevealed).length;
    if (revealed === ROWS * COLS - MINES) {
      setWin(true);
      setGameOver(false);
    }
  };

  return (
    <div className="minesweeper-page">
      <header className="top-bar">
        <div className="top-bar-brand">
          <span className="top-tag">// ARCADE</span>
          <h1 className="top-bar-title">MINESWEEPER</h1>
        </div>
        <button className="top-bar-btn" type="button" onClick={initializeBoard}>
          NEW GAME
        </button>
      </header>

      <main className="minesweeper">
        {gameOver && <p className="game-message">Game Over!</p>}
        {win && <p className="game-message">You Win!</p>}
        <div className="board">
          {board.map((row, r) => (
            <div className="row" key={r}>
              {row.map((cell, c) => (
                <button
                  key={c}
                  type="button"
                  className={`cell ${
                    cell.isRevealed
                      ? cell.isMine
                        ? 'mine'
                        : 'revealed'
                      : 'hidden'
                  }`}
                  onClick={() => revealCell(r, c)}
                  onContextMenu={(e) => toggleFlag(r, c, e)}
                >
                  {cell.isRevealed
                    ? cell.isMine
                      ? '💣'
                      : cell.neighborMines || ''
                    : cell.isFlagged
                    ? '🚩'
                    : ''}
                </button>
              ))}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Minesweeper;
