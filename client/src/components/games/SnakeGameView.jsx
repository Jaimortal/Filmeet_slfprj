import React, { useRef, useEffect } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCcw, Trophy, Skull } from 'lucide-react';

export default function SnakeGameView({ gameState, onInput, onRestart, myId }) {
  const canvasRef = useRef(null);
  const gridSize = 28;

  // Render game frame on canvas (Hook must always run)
  useEffect(() => {
    if (!gameState || !gameState.snakes || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const cellSize = width / gridSize;

    // Clear board background
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, width, height);

    // Subtle grid lines
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(width, i * cellSize);
      ctx.stroke();
    }

    // Draw Foods
    if (gameState.foods) {
      gameState.foods.forEach(food => {
        const cx = food.x * cellSize + cellSize / 2;
        const cy = food.y * cellSize + cellSize / 2;
        const radius = cellSize / 2.3;

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#EF4444';
        ctx.shadowColor = '#EF4444';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      });
    }

    // Draw Snakes
    if (gameState.snakes) {
      Object.values(gameState.snakes).forEach(snake => {
        if (!snake.body || snake.body.length === 0) return;

        const isMe = snake.id === myId;
        const snakeColor = snake.alive ? snake.color : '#475569';

        snake.body.forEach((seg, index) => {
          const isHead = index === 0;
          const x = seg.x * cellSize;
          const y = seg.y * cellSize;

          ctx.fillStyle = snakeColor;
          if (isHead) {
            ctx.shadowColor = snakeColor;
            ctx.shadowBlur = isMe ? 10 : 4;
            ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
            ctx.shadowBlur = 0;

            // Draw eyes on head
            ctx.fillStyle = '#FFFFFF';
            const eyeSize = 2.5;
            ctx.fillRect(x + cellSize / 4, y + cellSize / 4, eyeSize, eyeSize);
            ctx.fillRect(x + (cellSize * 3) / 4 - eyeSize, y + cellSize / 4, eyeSize, eyeSize);
          } else {
            // Body segment
            ctx.fillRect(x + 1.5, y + 1.5, cellSize - 3, cellSize - 3);
          }
        });
      });
    }
  }, [gameState, myId]);

  // Keyboard controls listener for PC (Hook must always run)
  useEffect(() => {
    const handleKeyDown = (e) => {
      let dir = null;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') dir = 'UP';
      else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') dir = 'DOWN';
      else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') dir = 'LEFT';
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') dir = 'RIGHT';

      if (dir) {
        e.preventDefault();
        onInput(dir);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onInput]);

  // Guard after hooks
  if (!gameState || !gameState.snakes) {
    return (
      <div className="p-8 text-center text-gray-400 text-sm flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
        Loading Snake arena...
      </div>
    );
  }

  const snakesList = gameState.snakes ? Object.values(gameState.snakes) : [];
  const mySnake = gameState.snakes ? gameState.snakes[myId] : null;

  return (
    <div className="flex flex-col items-center justify-center p-3 bg-dark-900/90 rounded-2xl border border-dark-700 shadow-2xl max-w-full">
      
      {/* Scoreboard Header */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 mb-3 px-2">
        <div className="flex items-center gap-3">
          {snakesList.map(s => (
            <div
              key={s.id}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                s.alive
                  ? 'border-dark-600 bg-dark-800 text-white'
                  : 'border-red-900/50 bg-red-950/30 text-gray-400 line-through'
              }`}
            >
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }}></div>
              <span>{s.username}</span>
              <span className="text-gray-400 text-[10px]">({s.score})</span>
              {!s.alive && <Skull className="w-3 h-3 text-red-400 inline" />}
            </div>
          ))}
        </div>

        {mySnake && (
          <div className="text-xs font-semibold text-gray-300">
            Status: <span className={mySnake.alive ? 'text-emerald-400' : 'text-red-400 font-bold'}>{mySnake.alive ? 'ALIVE' : 'ELIMINATED'}</span>
          </div>
        )}
      </div>

      {/* Canvas Arena */}
      <div className="relative rounded-xl overflow-hidden border-2 border-dark-600 shadow-lg">
        <canvas
          ref={canvasRef}
          width={420}
          height={420}
          className="w-[280px] h-[280px] sm:w-[380px] sm:h-[380px] max-w-full aspect-square block bg-dark-900"
        />

        {/* Game Over / Winner Banner */}
        {gameState?.status === 'ended' && (
          <div className="absolute inset-0 bg-dark-900/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center animate-fade-in">
            <Trophy className="w-12 h-12 text-amber-400 mb-2 animate-bounce" />
            <h3 className="text-xl font-extrabold text-white">Round Finished!</h3>
            <p className="text-sm text-gray-300 mt-1">
              Winner: <strong className="text-emerald-400">{gameState.winner}</strong>
            </p>
            <button
              onClick={onRestart}
              className="mt-4 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-xs flex items-center gap-2 shadow-lg transition"
            >
              <RotateCcw className="w-4 h-4" /> Play Again
            </button>
          </div>
        )}
      </div>

      {/* Mobile Touch D-Pad */}
      <div className="mt-3 flex flex-col items-center gap-1 select-none">
        <button
          onClick={() => onInput('UP')}
          className="w-12 h-11 bg-dark-800 hover:bg-dark-700 active:bg-indigo-600 border border-dark-600 rounded-xl flex items-center justify-center text-white transition active:scale-95 shadow-md"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => onInput('LEFT')}
            className="w-12 h-11 bg-dark-800 hover:bg-dark-700 active:bg-indigo-600 border border-dark-600 rounded-xl flex items-center justify-center text-white transition active:scale-95 shadow-md"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => onInput('DOWN')}
            className="w-12 h-11 bg-dark-800 hover:bg-dark-700 active:bg-indigo-600 border border-dark-600 rounded-xl flex items-center justify-center text-white transition active:scale-95 shadow-md"
          >
            <ArrowDown className="w-5 h-5" />
          </button>
          <button
            onClick={() => onInput('RIGHT')}
            className="w-12 h-11 bg-dark-800 hover:bg-dark-700 active:bg-indigo-600 border border-dark-600 rounded-xl flex items-center justify-center text-white transition active:scale-95 shadow-md"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
        <span className="text-[10px] text-gray-500 mt-1">Use D-Pad or Arrow Keys (W,A,S,D)</span>
      </div>

    </div>
  );
}
