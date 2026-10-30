import React from 'react';
import { Gamepad2, X } from 'lucide-react';

export default function GameSelectorModal({ isOpen, onClose, onSelectGame, mode }) {
  if (!isOpen) return null;

  const games = [
    {
      id: 'chess',
      name: 'Chess Showdown',
      badge: mode === 'squad' ? '1v1 + Spectators' : '1v1 Match',
      desc: 'Tactical board game. In 4-player squad, 2 play and 2 spectate live.',
      color: 'from-royal-600 to-blue-700 text-white',
      border: 'border-royal-500/50'
    },
    {
      id: 'snake',
      name: 'Snake Battle',
      badge: '2–4 Players',
      desc: 'Real-time arena survival. Eat food, grow, trap opponents!',
      color: 'from-emerald-600 to-teal-700 text-white',
      border: 'border-emerald-500/50'
    },
    {
      id: 'tetris',
      name: 'Tetris Battle',
      badge: '2–4 Players',
      desc: 'Clear lines to attack opponents with garbage rows. Fast and frantic!',
      color: 'from-blue-600 to-indigo-700 text-white',
      border: 'border-blue-500/50'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="max-w-md w-full bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 rounded-2xl p-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-100 dark:bg-dark-800 hover:bg-slate-200 dark:hover:bg-dark-700 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-royal-100 dark:bg-royal-950/60 flex items-center justify-center text-royal-600 dark:text-royal-400">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Choose a Mini-Game</h3>
        </div>

        <div className="space-y-3">
          {games.map((game) => (
            <button
              key={game.id}
              onClick={() => {
                onSelectGame(game.id);
                onClose();
              }}
              className={`w-full p-4 rounded-xl border ${game.border} bg-gradient-to-r ${game.color} hover:scale-[1.02] active:scale-98 text-left transition-all flex flex-col justify-between shadow-md cursor-pointer`}
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-extrabold text-white">
                  {game.name}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                  {game.badge}
                </span>
              </div>
              <p className="text-xs text-blue-50 mt-1 opacity-90">
                {game.desc}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
