import React, { useRef, useEffect } from 'react';
import { ArrowLeft, ArrowRight, ArrowDown, RotateCw, ArrowDownToLine, Trophy, Skull, HelpCircle, CheckCircle2 } from 'lucide-react';
import VideoTile from '../VideoTile';

const SCORE_OPTIONS = [
  { value: 500, label: '500 Pts', desc: 'Blitz (Quick)' },
  { value: 1000, label: '1,000 Pts', desc: 'Standard Match' },
  { value: 2500, label: '2,500 Pts', desc: 'Endurance' },
  { value: 0, label: 'Survival', desc: 'Last Standing' },
];

export default function TetrisGameView({
  gameState,
  onAction,
  onVote,
  onRestart,
  myId,
  mode,
  peers,
  localStream,
  remoteStreams,
  isMicOn,
  isCamOn,
  myUsername
}) {
  // 1. ALL HOOKS UNCONDITIONALLY AT THE TOP
  const localCanvasRef = useRef(null);
  const opponentCanvasRef = useRef(null);

  const players = gameState?.players ? Object.values(gameState.players) : [];
  const myPlayer = gameState?.players ? gameState.players[myId] : null;
  const opponentPlayer = players.find(p => p.id !== myId);
  const opponentPeer = peers ? peers.find(p => p.id !== myId) : null;

  // Helper to draw board
  const drawBoard = (canvas, player) => {
    if (!canvas || !player || !player.board) return;
    const ctx = canvas.getContext('2d');
    const cols = 10;
    const rows = 20;
    const cellW = canvas.width / cols;
    const cellH = canvas.height / rows;

    ctx.fillStyle = '#090D16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#172033';
    ctx.lineWidth = 0.5;
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath();
      ctx.moveTo(c * cellW, 0);
      ctx.lineTo(c * cellW, canvas.height);
      ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * cellH);
      ctx.lineTo(canvas.width, r * cellH);
      ctx.stroke();
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const color = player.board[r] ? player.board[r][c] : 0;
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(c * cellW + 1, r * cellH + 1, cellW - 2, cellH - 2);
          ctx.fillStyle = 'rgba(255,255,255,0.25)';
          ctx.fillRect(c * cellW + 1, r * cellH + 1, cellW - 2, 2.5);
        }
      }
    }

    if (player.alive && player.currentPiece) {
      const { shape, color, x, y } = player.currentPiece;
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c]) {
            const drawX = (x + c) * cellW;
            const drawY = (y + r) * cellH;
            ctx.fillStyle = color;
            ctx.fillRect(drawX + 1, drawY + 1, cellW - 2, cellH - 2);
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.fillRect(drawX + 1, drawY + 1, cellW - 2, 3);
          }
        }
      }
    }

    if (!player.alive) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#EF4444';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('KNOCKED OUT', canvas.width / 2, canvas.height / 2);
    }
  };

  // Hook 1: Draw local board
  useEffect(() => {
    if (localCanvasRef.current && myPlayer) {
      drawBoard(localCanvasRef.current, myPlayer);
    }
  }, [myPlayer]);

  // Hook 2: Draw opponent board
  useEffect(() => {
    if (opponentCanvasRef.current && opponentPlayer) {
      drawBoard(opponentCanvasRef.current, opponentPlayer);
    }
  }, [opponentPlayer]);

  // Hook 3: Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameState?.status !== 'playing') return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        onAction('LEFT');
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        onAction('RIGHT');
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        onAction('DOWN');
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        onAction('ROTATE');
      } else if (e.key === ' ') {
        e.preventDefault();
        onAction('DROP');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onAction, gameState?.status]);

  // 2. NOW CONDITIONAL RETURNS ARE 100% SAFE
  if (!gameState || (!gameState.players && gameState.status !== 'voting')) {
    return (
      <div className="p-8 text-center text-gray-400 text-sm flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
        Loading Tetris battle...
      </div>
    );
  }

  // Voting Screen
  if (gameState.status === 'voting') {
    const myVote = gameState.votes ? gameState.votes[myId] : null;

    return (
      <div className="w-full max-w-xl mx-auto p-4 bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl animate-fade-in text-center">
        <h3 className="text-xl font-black text-white tracking-wide">
          🧱 TETRIS BATTLE: VOTE TARGET SCORE
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          Both players choose a goal. First to reach the score (or last surviving) wins!
        </p>

        {/* Voting Options */}
        <div className="grid grid-cols-2 gap-3 my-5">
          {SCORE_OPTIONS.map((opt) => {
            const isSelected = myVote === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onVote(opt.value)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-600/20 shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-500/50'
                    : 'border-dark-700 bg-dark-800/80 hover:border-dark-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-white">{opt.label}</span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                </div>
                <span className="text-xs text-gray-400 block mt-0.5">{opt.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Vote Status */}
        <div className="p-3 bg-dark-800 rounded-xl border border-dark-700 text-xs text-gray-300 flex items-center justify-center gap-2">
          {myVote !== null && myVote !== undefined ? (
            <span className="text-emerald-400 font-semibold">
              ✓ You voted for {myVote === 0 ? 'Survival' : `${myVote} pts`}. Waiting for opponent...
            </span>
          ) : (
            <span className="text-amber-400 font-semibold animate-pulse">
              Select your preferred score target above!
            </span>
          )}
        </div>

        {/* How to Play Guide */}
        <div className="mt-4 p-3 bg-dark-950/80 rounded-xl border border-dark-800 text-left text-xs space-y-1 text-gray-400">
          <div className="flex items-center gap-1.5 text-gray-300 font-bold mb-1">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" /> How Battle Mode Works:
          </div>
          <p>• Clear 1 line = +100 pts</p>
          <p>• Clear 2+ lines = sends <strong>penalty garbage rows</strong> directly to your opponent!</p>
          <p>• Rotate & drop fast using on-screen buttons or Keyboard Arrow Keys + Space!</p>
        </div>
      </div>
    );
  }

  // 4-PLAYER SQUAD VIEW
  if (mode === 'squad') {
    const opponentPlayers = players.filter(p => p.id !== myId);

    return (
      <div className="w-full flex flex-col items-center justify-center p-2">
        <div className="w-full max-w-lg mb-2">
          <div className="text-[10px] text-gray-400 uppercase tracking-widest text-center font-bold mb-1">
            Squad Opponents
          </div>
          <div className="grid grid-cols-3 gap-2">
            {opponentPlayers.map((opp) => (
              <div
                key={opp.id}
                className={`p-2 rounded-xl border text-center transition-all ${
                  opp.alive
                    ? 'border-dark-600 bg-dark-800/90 text-white'
                    : 'border-red-900/50 bg-red-950/20 text-gray-500 line-through'
                }`}
              >
                <div className="text-xs font-bold truncate">{opp.username}</div>
                <div className="text-sm font-black text-amber-400">{opp.score} pts</div>
                <div className="text-[10px] text-gray-400">Lines: {opp.lines}</div>
                {!opp.alive && <Skull className="w-3 h-3 text-red-400 mx-auto mt-0.5" />}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center bg-dark-900/90 p-3 rounded-2xl border-2 border-indigo-500 shadow-xl shadow-indigo-500/10 max-w-sm w-full">
          <div className="w-full flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-bold text-indigo-300">
              {myUsername} <span className="text-[10px] bg-indigo-500/20 px-1.5 py-0.5 rounded text-indigo-300 uppercase">You</span>
            </span>
            <div className="text-right">
              <span className="text-sm font-black text-emerald-400">{myPlayer?.score || 0} pts</span>
              <span className="text-[10px] text-gray-400 ml-2">Goal: {gameState.targetScore ? `${gameState.targetScore} pts` : 'Survival'}</span>
            </div>
          </div>

          <div className="relative rounded-xl overflow-hidden border border-dark-700 bg-dark-950">
            <canvas
              ref={localCanvasRef}
              width={200}
              height={360}
              className="w-[170px] h-[300px] sm:w-[200px] sm:h-[360px] block"
            />

            {gameState.status === 'ended' && (
              <div className="absolute inset-0 bg-dark-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-3 text-center animate-fade-in z-20">
                <Trophy className="w-10 h-10 text-amber-400 mb-1 animate-bounce" />
                <h4 className="text-base font-extrabold text-white">Match Ended!</h4>
                <p className="text-xs text-gray-300 mt-0.5">
                  Winner: <strong className="text-emerald-400">{gameState.winner}</strong>
                </p>
                <button
                  onClick={onRestart}
                  className="mt-3 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-xs transition"
                >
                  Play Again
                </button>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-col items-center gap-1.5 w-full">
            <div className="flex gap-2">
              <button
                onClick={() => onAction('ROTATE')}
                className="px-3 py-1.5 bg-dark-800 hover:bg-dark-700 active:bg-indigo-600 border border-dark-600 rounded-lg text-white text-xs font-bold flex items-center gap-1 shadow"
              >
                <RotateCw className="w-3.5 h-3.5" /> Rotate
              </button>
              <button
                onClick={() => onAction('DROP')}
                className="px-3 py-1.5 bg-amber-600/90 hover:bg-amber-500 active:bg-amber-600 border border-amber-500/60 rounded-lg text-white text-xs font-bold flex items-center gap-1 shadow"
              >
                <ArrowDownToLine className="w-3.5 h-3.5" /> Drop
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onAction('LEFT')}
                className="w-10 h-9 bg-dark-800 active:bg-indigo-600 border border-dark-600 rounded-lg flex items-center justify-center text-white"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => onAction('DOWN')}
                className="w-10 h-9 bg-dark-800 active:bg-indigo-600 border border-dark-600 rounded-lg flex items-center justify-center text-white"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
              <button
                onClick={() => onAction('RIGHT')}
                className="w-10 h-9 bg-dark-800 active:bg-indigo-600 border border-dark-600 rounded-lg flex items-center justify-center text-white"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2-PLAYER 1v1 VIEW
  return (
    <div className="w-full flex flex-col items-center justify-center p-1 sm:p-2">
      <div className="mb-2 text-xs font-bold text-gray-300 flex items-center gap-2 bg-dark-900/80 px-3 py-1 rounded-full border border-dark-700">
        <span>Goal: <strong className="text-emerald-400">{gameState.targetScore ? `${gameState.targetScore} pts` : 'Survival'}</strong></span>
        {gameState.targetScore > 0 && <span className="text-gray-500">| First to reach wins!</span>}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-4 w-full max-w-xl">
        {/* Column 1: LOCAL PLAYER (Highlighted!) */}
        <div className="flex flex-col items-center bg-dark-900/90 rounded-2xl p-2 sm:p-3 border-2 border-indigo-500 shadow-xl shadow-indigo-500/10">
          <div className="w-full flex items-center justify-between mb-1.5 px-1">
            <span className="text-[11px] font-bold text-indigo-400">YOUR BOARD</span>
            <span className="text-xs font-black text-white">{myPlayer?.score || 0} pts</span>
          </div>

          <div className="relative rounded-xl overflow-hidden border border-dark-700 bg-dark-950">
            <canvas
              ref={localCanvasRef}
              width={180}
              height={320}
              className="w-[125px] h-[220px] sm:w-[160px] sm:h-[280px] block"
            />

            {gameState.status === 'ended' && (
              <div className="absolute inset-0 bg-dark-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-2 text-center animate-fade-in z-20">
                <Trophy className="w-8 h-8 text-amber-400 mb-1" />
                <h4 className="text-sm font-extrabold text-white">Finished!</h4>
                <p className="text-[11px] text-gray-300 mt-0.5">
                  Winner: <strong className="text-emerald-400">{gameState.winner}</strong>
                </p>
                <button
                  onClick={onRestart}
                  className="mt-2 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-[11px] transition cursor-pointer"
                >
                  Play Again
                </button>
              </div>
            )}
          </div>

          <div className="mt-2 flex flex-col items-center gap-1">
            <div className="flex gap-1.5">
              <button
                onClick={() => onAction('ROTATE')}
                className="px-2.5 py-1 bg-dark-800 hover:bg-dark-700 active:bg-indigo-600 border border-dark-600 rounded-lg text-white text-[11px] font-bold flex items-center gap-1"
              >
                <RotateCw className="w-3 h-3" /> Rot
              </button>
              <button
                onClick={() => onAction('DROP')}
                className="px-2.5 py-1 bg-amber-600/90 hover:bg-amber-500 active:bg-amber-600 border border-amber-500/60 rounded-lg text-white text-[11px] font-bold flex items-center gap-1"
              >
                <ArrowDownToLine className="w-3 h-3" /> Drop
              </button>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => onAction('LEFT')}
                className="w-8 h-7 bg-dark-800 active:bg-indigo-600 border border-dark-600 rounded-lg flex items-center justify-center text-white"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onAction('DOWN')}
                className="w-8 h-7 bg-dark-800 active:bg-indigo-600 border border-dark-600 rounded-lg flex items-center justify-center text-white"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onAction('RIGHT')}
                className="w-8 h-7 bg-dark-800 active:bg-indigo-600 border border-dark-600 rounded-lg flex items-center justify-center text-white"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Column 2: OPPONENT PLAYER */}
        <div className="flex flex-col items-center bg-dark-900/90 rounded-2xl p-2 sm:p-3 border border-dark-700 shadow-xl">
          <div className="w-full flex items-center justify-between mb-1.5 px-1">
            <span className="text-[11px] font-bold text-gray-400">
              {opponentPlayer?.username || 'Opponent'}
            </span>
            <span className="text-xs font-black text-amber-400">
              {opponentPlayer?.score || 0} pts
            </span>
          </div>

          <div className="relative rounded-xl overflow-hidden border border-dark-700 bg-dark-950">
            <canvas
              ref={opponentCanvasRef}
              width={180}
              height={320}
              className="w-[125px] h-[220px] sm:w-[160px] sm:h-[280px] block"
            />
          </div>

          <div className="mt-4 text-[10px] text-gray-500 text-center">
            Watching opponent live
          </div>
        </div>
      </div>
    </div>
  );
}
