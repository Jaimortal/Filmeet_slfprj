import React, { useState, useEffect, useRef } from 'react';
import { Bomb, Heart, Trophy, Send, AlertCircle, Sparkles, Flame, CheckCircle2, XCircle } from 'lucide-react';

export default function WordBombGameView({
  gameState,
  onInput,
  onRestart,
  myId,
  socket
}) {
  const [wordText, setWordText] = useState('');
  const [feedback, setFeedback] = useState(null);
  const inputRef = useRef(null);

  // Listen for private server feedback (e.g., "Not in dictionary", "Already used")
  useEffect(() => {
    if (!socket) return;
    const handleFeedback = (data) => {
      setFeedback(data.reason);
      setTimeout(() => setFeedback(null), 2500);
    };
    socket.on('wordbomb_feedback', handleFeedback);
    return () => {
      socket.off('wordbomb_feedback', handleFeedback);
    };
  }, [socket]);

  // Focus input automatically whenever it becomes the local player's turn
  const isMyTurn = gameState?.currentTurnId === myId;
  useEffect(() => {
    if (isMyTurn && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isMyTurn]);

  if (!gameState) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-slate-500 dark:text-gray-400 text-sm animate-pulse">
        <Bomb className="w-8 h-8 mb-2 animate-bounce text-amber-500" />
        Loading Word Bomb...
      </div>
    );
  }

  const {
    status,
    prompt,
    turnTimeRemaining,
    maxTurnTime = 10,
    usedWords = [],
    lastEvent,
    players = {},
    winner
  } = gameState;

  const playerList = Object.values(players);
  const activePlayer = players[gameState.currentTurnId];
  const timerPercentage = Math.max(0, Math.min(100, (turnTimeRemaining / maxTurnTime) * 100));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isMyTurn || !wordText.trim()) return;
    onInput(wordText.trim());
    setWordText('');
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center justify-center p-2 sm:p-4 animate-fade-in select-none">
      
      {/* Top Players Life Bar */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        {playerList.map((p) => {
          const isTurn = p.id === gameState.currentTurnId;
          const isMe = p.id === myId;

          return (
            <div
              key={p.id}
              className={`p-2 rounded-xl border flex flex-col items-center transition-all shadow-md ${
                isTurn
                  ? 'bg-amber-500/10 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/40 scale-102'
                  : 'bg-white/80 dark:bg-dark-900/80 border-slate-200 dark:border-dark-700'
              } ${!p.alive ? 'opacity-40 grayscale' : ''}`}
            >
              <div className="w-full flex items-center justify-between gap-1 mb-1">
                <span className="text-[11px] font-bold text-slate-800 dark:text-gray-200 truncate">
                  {p.username} {isMe && '(You)'}
                </span>
                <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                  {p.score} pts
                </span>
              </div>

              {/* Heart Lives */}
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((heartIndex) => (
                  <Heart
                    key={heartIndex}
                    className={`w-3.5 h-3.5 ${
                      heartIndex <= p.lives
                        ? 'fill-red-500 text-red-500 animate-pulse'
                        : 'text-slate-300 dark:text-dark-600'
                    }`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Bomb Arena Card */}
      <div className="relative w-full bg-white dark:bg-dark-900 border-2 border-slate-200 dark:border-dark-700 rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col items-center overflow-hidden">
        
        {/* Animated Timer Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-dark-800 h-2.5 rounded-full overflow-hidden mb-4 border border-slate-200 dark:border-dark-700">
          <div
            className={`h-full transition-all duration-300 ${
              turnTimeRemaining <= 3
                ? 'bg-red-500 animate-pulse'
                : turnTimeRemaining <= 5
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${timerPercentage}%` }}
          />
        </div>

        {/* Central Bomb & Prompt Display */}
        <div className="flex flex-col items-center my-2 relative">
          <div className="relative flex items-center justify-center">
            {/* Pulsing Fuse Fire */}
            <Flame
              className={`w-8 h-8 -top-5 right-2 absolute text-orange-500 animate-bounce ${
                turnTimeRemaining <= 3 ? 'scale-125 text-red-500' : ''
              }`}
            />
            {/* The Bomb */}
            <div
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-slate-900 via-dark-950 to-black border-4 border-slate-700 dark:border-dark-600 flex flex-col items-center justify-center shadow-2xl transition-transform ${
                turnTimeRemaining <= 3 ? 'scale-110 animate-wiggle' : ''
              }`}
            >
              <span className="text-3xl sm:text-4xl font-black text-amber-400 tracking-wider">
                {prompt}
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">
                {turnTimeRemaining}s
              </span>
            </div>
          </div>

          {/* Turn Announcement */}
          <div className="mt-3 text-center">
            {isMyTurn ? (
              <span className="px-3 py-1 bg-royal-100 dark:bg-royal-950/80 text-royal-700 dark:text-royal-300 border border-royal-300 dark:border-royal-700 rounded-full text-xs font-black animate-pulse flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-royal-500" /> YOUR TURN TO DEFUSE!
              </span>
            ) : (
              <span className="text-xs text-slate-500 dark:text-gray-400 font-medium">
                Waiting for <strong className="text-slate-800 dark:text-white">{activePlayer?.username || 'Opponent'}</strong>...
              </span>
            )}
          </div>
        </div>

        {/* Error / Feedback Banner */}
        {feedback && (
          <div className="w-full max-w-xs mt-2 py-1 px-2.5 bg-red-100 dark:bg-red-950/80 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 animate-shake">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{feedback}</span>
          </div>
        )}

        {/* Last Event Banner (Word accepted or Boom) */}
        {lastEvent && !feedback && (
          <div className="mt-2 text-xs font-bold animate-fade-in flex items-center gap-1.5">
            {lastEvent.type === 'valid_word' ? (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <strong>{lastEvent.username}</strong>: "{lastEvent.word}" (+{lastEvent.points} pts)
              </span>
            ) : (
              <span className="text-red-500 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                💥 <strong>{lastEvent.username}</strong> ran out of time!
              </span>
            )}
          </div>
        )}

        {/* Word Input Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-sm mt-4 flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={wordText}
            onChange={(e) => setWordText(e.target.value)}
            disabled={!isMyTurn || status === 'ended'}
            placeholder={isMyTurn ? `Word containing "${prompt}"...` : 'Wait for your turn...'}
            className="flex-1 px-3 py-2.5 bg-slate-50 dark:bg-dark-950 border-2 border-slate-300 dark:border-dark-700 rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-royal-500 transition disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!isMyTurn || !wordText.trim() || status === 'ended'}
            className="p-2.5 sm:px-4 sm:py-2.5 bg-royal-600 hover:bg-royal-500 disabled:opacity-40 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-md transition cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Defuse</span>
          </button>
        </form>

        {/* Recent Words Used Chips */}
        {usedWords.length > 0 && (
          <div className="w-full mt-4 pt-3 border-t border-slate-200 dark:border-dark-800">
            <span className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider block mb-1">
              Words Used ({usedWords.length}):
            </span>
            <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
              {usedWords.slice(-8).map((w, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-gray-400 rounded-md text-[10px] font-medium uppercase"
                >
                  {w}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Game Ended Overlay */}
        {status === 'ended' && (
          <div className="absolute inset-0 bg-white/95 dark:bg-dark-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center animate-fade-in z-30">
            <Trophy className="w-12 h-12 text-amber-400 mb-2 animate-bounce" />
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Match Over!</h3>
            <p className="text-sm text-slate-600 dark:text-gray-300 mt-1">
              Winner: <strong className="text-royal-600 dark:text-royal-400 font-extrabold">{winner}</strong>
            </p>
            <button
              onClick={onRestart}
              className="mt-4 px-5 py-2.5 bg-gradient-to-r from-royal-600 to-blue-600 hover:from-royal-500 hover:to-blue-500 text-white rounded-xl font-extrabold text-xs shadow-lg hover:scale-105 active:scale-95 transition cursor-pointer"
            >
              Play Again
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

