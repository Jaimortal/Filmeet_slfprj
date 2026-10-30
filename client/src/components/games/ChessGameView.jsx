import React, { useState } from 'react';
import { Trophy, RotateCcw, Eye, Shield } from 'lucide-react';

// Unicode chess piece lookup
const PIECE_SYMBOLS = {
  p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚',
  P: '♙', R: '♖', N: '♘', B: '♗', Q: '♕', K: '♔'
};

export default function ChessGameView({ gameState, onMove, onRestart, myId }) {
  const [selectedSquare, setSelectedSquare] = useState(null);

  // Guard against undefined state or mismatch when switching games
  if (!gameState || !gameState.fen || !gameState.white || !gameState.black) {
    return (
      <div className="p-8 text-center text-gray-400 text-sm flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
        Loading Chess board...
      </div>
    );
  }

  const { fen, turn, inCheck, isCheckmate, isDraw, winner, white, black, spectators } = gameState;

  // Parse FEN into 8x8 grid
  const fenBoard = fen.split(' ')[0];
  const rows = fenBoard.split('/');
  const board = [];

  for (let r = 0; r < 8; r++) {
    const row = [];
    for (const char of rows[r]) {
      if (isNaN(char)) {
        row.push(char);
      } else {
        const empties = parseInt(char, 10);
        for (let i = 0; i < empties; i++) {
          row.push(null);
        }
      }
    }
    board.push(row);
  }

  const isMyTurn = (turn === 'w' && myId === white.id) || (turn === 'b' && myId === black.id);
  const myRole = myId === white.id ? 'White' : myId === black.id ? 'Black' : 'Spectator';

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  const handleSquareClick = (r, c) => {
    if (gameState.status === 'ended') return;
    if (myRole === 'Spectator') return; // Spectators cannot move
    if (!isMyTurn) return;

    const square = `${files[c]}${8 - r}`;

    if (!selectedSquare) {
      const piece = board[r][c];
      if (!piece) return;
      // Only select if it's the player's piece
      const isWhitePiece = piece === piece.toUpperCase();
      if ((turn === 'w' && isWhitePiece) || (turn === 'b' && !isWhitePiece)) {
        setSelectedSquare(square);
      }
    } else {
      if (selectedSquare === square) {
        setSelectedSquare(null);
      } else {
        // Attempt move
        onMove({ from: selectedSquare, to: square, promotion: 'q' });
        setSelectedSquare(null);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-3 sm:p-4 bg-dark-900/95 rounded-2xl border border-dark-700 shadow-2xl max-w-full">
      
      {/* Matchup Header */}
      <div className="w-full flex items-center justify-between gap-2 mb-3 px-2">
        <div className="flex items-center gap-2">
          <div className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 ${turn === 'w' ? 'border-amber-400/80 bg-amber-500/10 text-amber-300' : 'border-dark-600 bg-dark-800 text-gray-400'}`}>
            <span className="w-2.5 h-2.5 rounded-full bg-white border border-gray-400 inline-block"></span>
            <span>{white.username}</span>
          </div>
          <span className="text-gray-500 text-xs font-bold">vs</span>
          <div className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 ${turn === 'b' ? 'border-amber-400/80 bg-amber-500/10 text-amber-300' : 'border-dark-600 bg-dark-800 text-gray-400'}`}>
            <span className="w-2.5 h-2.5 rounded-full bg-gray-900 border border-gray-600 inline-block"></span>
            <span>{black.username}</span>
          </div>
        </div>

        {/* Role & Spectators */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-400 font-medium">You: <strong className="text-indigo-400">{myRole}</strong></span>
          {spectators && spectators.length > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-gray-500 bg-dark-800 px-2 py-0.5 rounded-md border border-dark-700">
              <Eye className="w-3 h-3" /> {spectators.length}
            </div>
          )}
        </div>
      </div>

      {/* Check Notification */}
      {inCheck && !isCheckmate && (
        <div className="w-full mb-2 py-1 px-3 bg-red-950/60 border border-red-500/50 rounded-lg text-center text-xs font-bold text-red-300 flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5" /> CHECK!
        </div>
      )}

      {/* Chessboard Grid */}
      <div className="relative rounded-xl overflow-hidden border-2 border-dark-600 shadow-xl bg-dark-800">
        <div className="grid grid-cols-8 w-[280px] h-[280px] sm:w-[360px] sm:h-[360px]">
          {board.map((row, r) =>
            row.map((piece, c) => {
              const isDark = (r + c) % 2 === 1;
              const squareName = `${files[c]}${8 - r}`;
              const isSelected = selectedSquare === squareName;

              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => handleSquareClick(r, c)}
                  className={`w-full h-full flex items-center justify-center text-2xl sm:text-3xl font-serif select-none transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/60'
                      : isDark
                      ? 'bg-[#4A5568] hover:bg-[#5A6578]'
                      : 'bg-[#CBD5E1] hover:bg-[#E2E8F0]'
                  }`}
                >
                  {piece && (
                    <span
                      className={`transform transition-transform active:scale-90 ${
                        piece === piece.toUpperCase() ? 'text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]' : 'text-gray-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)]'
                      }`}
                    >
                      {PIECE_SYMBOLS[piece]}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Game Ended Overlay */}
        {gameState.status === 'ended' && (
          <div className="absolute inset-0 bg-dark-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center animate-fade-in z-20">
            <Trophy className="w-12 h-12 text-amber-400 mb-2 animate-bounce" />
            <h3 className="text-xl font-extrabold text-white">Checkmate!</h3>
            <p className="text-sm text-gray-300 mt-1">
              Winner: <strong className="text-emerald-400">{winner}</strong>
            </p>
            <button
              onClick={onRestart}
              className="mt-4 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-xs flex items-center gap-2 shadow-lg transition"
            >
              <RotateCcw className="w-4 h-4" /> Rematch (Swap Sides)
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 text-[11px] text-gray-500 text-center">
        {myRole === 'Spectator' ? 'Spectating match live' : isMyTurn ? '👉 Your turn! Click piece, then destination square' : "Waiting for opponent's move..."}
      </div>

    </div>
  );
}

