import React from 'react';
import { Gamepad2, X, Sparkles } from 'lucide-react';

export default function GameSelectorModal({ isOpen, onClose, onSelectGame, mode }) {
  if (!isOpen) return null;

  const games = [
    {
      id: 'snake',
      name: 'Snake Battle',
      badge: '2–4 Players',
      desc: 'Real-time Tron-style survival. Eat food, grow, trap opponents!',
      color: 'from-emerald-600 to-teal-700',
      border: 'border-emerald-500/40'
    },
    {
      id: 'chess',
      name: 'Chess Showdown',
      badge: mode === 'squad' ? '1v1 + Spectators' : '1v1 Match',
      desc: 'Tactical board game. In 4-player squad, 2 play and 2 spectate live.',
      color: 'from-amber-600 to-yellow-700',
      border: 'border-amber-500/40'
    },
    {
      id: 'tetris',
      name: 'Tetris Battle',
      badge: '2–4 Players',
      desc: 'Clear lines to attack opponents with garbage rows. Fast and frantic!',
      color: 'from-indigo-600 to-purple-700',
      border: 'border-indigo-500/40'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="max-w-md w-full bg-dark-900 border border-dark-700 rounded-2xl p-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-gray-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Gamepad2 className="w-6 h-6 text-indigo-400" />
          <h3 className="text-lg font-bold text-white">Choose a Mini-Game</h3>
        </div>

        <div className="space-y-3">
          {games.map((game) => (
            <button
              key={game.id}
              onClick={() => {
                onSelectGame(game.id);
                onClose();
              }}
              className={`w-full p-4 rounded-xl border ${game.border} bg-gradient-to-r ${game.color} bg-opacity-20 hover:scale-[1.02] active:scale-98 text-left transition-all flex flex-col justify-between shadow-lg group cursor-pointer`}
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-white group-hover:text-white">
                  {game.name}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                  {game.badge}
                </span>
              </div>
              <p className="text-xs text-gray-200 mt-1.5 opacity-90">
                {game.desc}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

