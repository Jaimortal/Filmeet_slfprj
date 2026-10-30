import React, { useState, useEffect } from 'react';
import { Trophy, RotateCcw, Eye, Shield, ArrowLeftRight } from 'lucide-react';

// Unicode chess piece lookup
const PIECE_SYMBOLS = {
  p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚',
  P: '♙', R: '♖', N: '♘', B: '♗', Q: '♕', K: '♔'
};

export default function ChessGameView({ gameState, onMove, onRestart, myId }) {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [isFlipped, setIsFlipped] = useState(false);

  // Auto-flip board to Black perspective when user is Black
  useEffect(() => {
    if (gameState?.black?.id && myId === gameState.black.id) {
      setIsFlipped(true);
    } else {
      setIsFlipped(false);
    }
  }, [myId, gameState?.black?.id]);

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
        // Attempt move in standard algebraic notation
        onMove({ from: selectedSquare, to: square, promotion: 'q' });
        setSelectedSquare(null);
      }
    }
  };

  // Orientation rows & columns: inverted for Black perspective
  const displayRows = isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const displayCols = isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="flex flex-col items-center justify-center p-2 sm:p-4 bg-dark-900/95 rounded-2xl border border-dark-700 shadow-2xl max-w-full">
      
      {/* Matchup Header */}
      <div className="w-full flex items-center justify-between gap-1.5 sm:gap-2 mb-1.5 sm:mb-3 px-1 sm:px-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 ${turn === 'w' ? 'border-amber-400/80 bg-amber-500/10 text-amber-300' : 'border-dark-600 bg-dark-800 text-gray-400'}`}>
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-white border border-gray-400 inline-block"></span>
            <span>{white.username}</span>
          </div>
          <span className="text-gray-500 text-[10px] sm:text-xs font-bold">vs</span>
          <div className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 ${turn === 'b' ? 'border-amber-400/80 bg-amber-500/10 text-amber-300' : 'border-dark-600 bg-dark-800 text-gray-400'}`}>
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-gray-900 border border-gray-600 inline-block"></span>
            <span>{black.username}</span>
          </div>
        </div>

        {/* Role, Spectators & Flip Button */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
          <span className="text-gray-400 font-medium">You: <strong className="text-indigo-400">{myRole}</strong></span>
          
          {spectators && spectators.length > 0 && (
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-gray-500 bg-dark-800 px-1.5 py-0.5 rounded-md border border-dark-700">
              <Eye className="w-3 h-3" /> {spectators.length}
            </div>
          )}

          {/* Flip Perspective Toggle */}
          <button
            type="button"
            onClick={() => setIsFlipped(!isFlipped)}
            className="p-1 hover:bg-dark-800 text-gray-400 hover:text-white rounded-md transition text-[10px] flex items-center gap-1 cursor-pointer"
            title="Flip Board Perspective"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Flip</span>
          </button>
        </div>
      </div>

      {/* Check Notification */}
      {inCheck && !isCheckmate && (
        <div className="w-full mb-1.5 py-0.5 px-2 bg-red-950/60 border border-red-500/50 rounded-lg text-center text-xs font-bold text-red-300 flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5" /> CHECK!
        </div>
      )}

      {/* Chessboard Grid (Strictly square on both mobile & desktop) */}
      <div className="relative rounded-xl overflow-hidden border-2 border-dark-600 shadow-2xl bg-dark-800 shrink-0 flex items-center justify-center p-0">
        <div
          className="grid select-none"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(8, clamp(32px, 10.5vw, 45px))',
            gridTemplateRows: 'repeat(8, clamp(32px, 10.5vw, 45px))',
            width: 'fit-content',
            height: 'fit-content'
          }}
        >
          {displayRows.map((r) =>
            displayCols.map((c) => {
              const piece = board[r][c];
              const isDark = (r + c) % 2 === 1;
              const squareName = `${files[c]}${8 - r}`;
              const isSelected = selectedSquare === squareName;

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => handleSquareClick(r, c)}
                  style={{
                    width: 'clamp(32px, 10.5vw, 45px)',
                    height: 'clamp(32px, 10.5vw, 45px)',
                    minWidth: '0',
                    minHeight: '0',
                    padding: '0',
                    margin: '0',
                    boxSizing: 'border-box'
                  }}
                  className={`relative flex items-center justify-center transition-colors cursor-pointer overflow-hidden ${
                    isSelected
                      ? 'bg-amber-500/70 ring-2 ring-amber-400 z-10'
                      : isDark
                      ? 'bg-[#4A5568] hover:bg-[#5A6578]'
                      : 'bg-[#CBD5E1] hover:bg-[#E2E8F0]'
                  }`}
                >
                  <span
                    style={{ fontSize: 'clamp(18px, 6vw, 28px)' }}
                    className={`w-full h-full flex items-center justify-center font-serif leading-none select-none pointer-events-none transform transition-transform active:scale-90 ${
                      piece && piece === piece.toUpperCase()
                        ? 'text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)]'
                        : 'text-gray-950 drop-shadow-[0_1px_2px_rgba(255,255,255,0.4)]'
                    }`}
                  >
                    {piece ? PIECE_SYMBOLS[piece] : ''}
                  </span>
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
              className="mt-4 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-xs flex items-center gap-2 shadow-lg transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" /> Rematch (Swap Sides)
            </button>
          </div>
        )}
      </div>

      <div className="mt-2 sm:mt-3 text-[11px] text-gray-500 text-center">
        {myRole === 'Spectator' ? 'Spectating match live' : isMyTurn ? '👉 Your turn! Click piece, then destination square' : "Waiting for opponent's move..."}
      </div>

    </div>
  );
}
