import React, { useState, useEffect } from "react";
import "./minesweeper.css";

const SIZE = 10;
const MINES = 15;

function createBoard() {
  let board = Array(SIZE)
    .fill()
    .map(() =>
      Array(SIZE).fill().map(() => ({
        mine: false,
        revealed: false,
        flagged: false,
        count: 0,
      }))
    );

  // place mines
  let placed = 0;
  while (placed < MINES) {
    let x = Math.floor(Math.random() * SIZE);
    let y = Math.floor(Math.random() * SIZE);
    if (!board[y][x].mine) {
      board[y][x].mine = true;
      placed++;
    }
  }

  // calculate numbers
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (board[y][x].mine) continue;
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          let ny = y + dy;
          let nx = x + dx;
          if (ny >= 0 && ny < SIZE && nx >= 0 && nx < SIZE) {
            if (board[ny][nx].mine) count++;
          }
        }
      }
      board[y][x].count = count;
    }
  }

  return board;
}

export default function Minesweeper() {
  const [board, setBoard] = useState(createBoard());
  const [gameOver, setGameOver] = useState(false);

  const reveal = (x, y) => {
    if (gameOver) return;

    let newBoard = [...board];
    let cell = newBoard[y][x];

    if (cell.revealed || cell.flagged) return;

    cell.revealed = true;

    if (cell.mine) {
      setGameOver(true);
      alert("Game Over");
      return;
    }

    if (cell.count === 0) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          let ny = y + dy;
          let nx = x + dx;
          if (ny >= 0 && ny < SIZE && nx >= 0 && nx < SIZE) {
            reveal(nx, ny);
          }
        }
      }
    }

    setBoard([...newBoard]);
  };

  const flag = (e, x, y) => {
    e.preventDefault();
    let newBoard = [...board];
    newBoard[y][x].flagged = !newBoard[y][x].flagged;
    setBoard(newBoard);
  };

  return (
    <div className="ms-container">
      <h1>MINESWEEPER</h1>

      <div className="ms-grid">
        {board.map((row, y) =>
          row.map((cell, x) => (
            <div
              key={`${x}-${y}`}
              className={`cell ${
                cell.revealed ? "revealed" : ""
              }`}
              onClick={() => reveal(x, y)}
              onContextMenu={(e) => flag(e, x, y)}
            >
              {cell.revealed
                ? cell.mine
                  ? "💣"
                  : cell.count || ""
                : cell.flagged
                ? "🚩"
                : ""}
            </div>
          ))
        )}
      </div>

      <button onClick={() => window.location.reload()}>
        Restart
      </button>
    </div>
  );
}