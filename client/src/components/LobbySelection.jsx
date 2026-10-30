import React, { useState } from 'react';
import { Users, User, ShieldAlert, Sparkles, Loader2, Gamepad2 } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const RANDOM_NAMES = ['AstroPinoy', 'ManilaRider', 'CebuDrifter', 'MayonVoyager', 'BoracayEcho', 'TagalogNomad'];

export default function LobbySelection({ onJoinQueue, queueStatus, onLeaveQueue, theme, onToggleTheme }) {
  const [username, setUsername] = useState(() => {
    return RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
  });
  const [selectedMode, setSelectedMode] = useState('pair');

  const handleStart = (mode) => {
    setSelectedMode(mode);
    onJoinQueue(mode, username.trim() || 'Stranger');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 via-blue-50 to-slate-200 dark:from-dark-950 dark:via-dark-900 dark:to-black transition-colors duration-200">
      
      {/* Top Floating Theme Toggle */}
      <div className="fixed top-4 right-4 z-20">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>

      <div className="max-w-xl w-full bg-white/95 dark:bg-dark-900/90 border border-slate-200 dark:border-dark-700/80 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl transition-all">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-royal-100 dark:bg-royal-950/60 border border-royal-300 dark:border-royal-700/60 text-royal-700 dark:text-royal-300 text-xs font-bold tracking-wider uppercase mb-3">
            <Sparkles className="w-3.5 h-3.5 text-royal-600 dark:text-royal-400" /> Filipino Random Video & Squad Chat
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
            FIL<span className="text-transparent bg-clip-text bg-gradient-to-r from-royal-600 to-blue-500 dark:from-royal-400 dark:to-blue-400">MEET</span>
          </h1>
          <p className="text-slate-600 dark:text-gray-400 text-sm mt-2 font-medium">
            Meet people, form 4-player squads, and play instant mini-games.
          </p>
        </div>

        {/* Username Input */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
            Your Alias
          </label>
          <div className="relative">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
              placeholder="Enter your nickname..."
              disabled={!!queueStatus}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-dark-600 rounded-xl text-slate-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-royal-600 focus:ring-2 focus:ring-royal-500/20 transition-all font-semibold"
            />
            <button
              type="button"
              onClick={() => setUsername(RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)])}
              disabled={!!queueStatus}
              className="absolute right-2.5 top-2.5 px-2.5 py-1 text-xs font-semibold bg-slate-200 dark:bg-dark-700 hover:bg-slate-300 dark:hover:bg-dark-600 text-slate-700 dark:text-gray-200 rounded-lg transition cursor-pointer"
            >
              Randomize
            </button>
          </div>
        </div>

        {/* Queue Status Overlay */}
        {queueStatus ? (
          <div className="p-6 bg-slate-50 dark:bg-dark-950 border border-royal-400/50 dark:border-royal-600/50 rounded-2xl text-center space-y-4 animate-fade-in shadow-inner">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-royal-500/30 animate-ping"></div>
              <Loader2 className="w-8 h-8 text-royal-600 dark:text-royal-400 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Searching for {queueStatus.mode === 'squad' ? 'Squad of 4' : 'Partner'}...
              </h3>
              <p className="text-xs text-slate-600 dark:text-gray-400 mt-1">
                {queueStatus.mode === 'squad'
                  ? `Gathering 4 random peers (${queueStatus.position}/4 in line)`
                  : 'Pairing you with a live partner...'}
              </p>
            </div>
            <button
              onClick={onLeaveQueue}
              className="px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-600 dark:text-red-400 rounded-xl text-sm font-bold transition cursor-pointer"
            >
              Cancel Matchmaking
            </button>
          </div>
        ) : (
          /* Matchmaking Mode Cards */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            
            {/* 1-on-1 Pair Card */}
            <button
              onClick={() => handleStart('pair')}
              className="group p-5 bg-slate-50 dark:bg-dark-950/70 hover:bg-royal-50/50 dark:hover:bg-dark-950 border border-slate-200 dark:border-dark-700 hover:border-royal-500 dark:hover:border-royal-500 rounded-2xl text-left transition-all duration-200 hover:scale-[1.02] flex flex-col justify-between shadow-sm hover:shadow-md cursor-pointer"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-royal-100 dark:bg-royal-950/60 border border-royal-300 dark:border-royal-800 flex items-center justify-center text-royal-700 dark:text-royal-300 mb-3 group-hover:bg-royal-600 group-hover:text-white transition">
                  <User className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-royal-600 dark:group-hover:text-royal-400 transition">
                  1-on-1 Pair
                </h3>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 leading-relaxed">
                  Connect directly with a random person for video & text chat.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-dark-700 flex items-center justify-between text-xs font-bold text-royal-600 dark:text-royal-400">
                <span>Start 1v1</span>
                <span>&rarr;</span>
              </div>
            </button>

            {/* Squad of 4 Card */}
            <button
              onClick={() => handleStart('squad')}
              className="group p-5 bg-slate-50 dark:bg-dark-950/70 hover:bg-royal-50/50 dark:hover:bg-dark-950 border border-slate-200 dark:border-dark-700 hover:border-royal-500 dark:hover:border-royal-500 rounded-2xl text-left transition-all duration-200 hover:scale-[1.02] flex flex-col justify-between relative overflow-hidden shadow-sm hover:shadow-md cursor-pointer"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-royal-100 dark:bg-royal-950/60 border border-royal-300 dark:border-royal-800 flex items-center justify-center text-royal-700 dark:text-royal-300 mb-3 group-hover:bg-royal-600 group-hover:text-white transition">
                  <Users className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-royal-600 dark:group-hover:text-royal-400 transition">
                    Squad of 4
                  </h3>
                  <span className="px-1.5 py-0.5 rounded bg-royal-500/20 text-royal-700 dark:text-royal-300 text-[10px] font-bold tracking-wide">
                    PARTY
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 leading-relaxed">
                  4 people in one room! Play multiplayer mini-games and hang out.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-dark-700 flex items-center justify-between text-xs font-bold text-royal-600 dark:text-royal-400">
                <span className="flex items-center gap-1"><Gamepad2 className="w-3.5 h-3.5" /> Start Squad</span>
                <span>&rarr;</span>
              </div>
            </button>

          </div>
        )}

        {/* Ephemeral Notice */}
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600 dark:text-gray-400 leading-normal">
            <strong className="text-red-700 dark:text-red-300 font-bold">Strict Ephemeral Storage:</strong> Room logs and chat history are created in a temporary session JSON and <span className="underline decoration-red-400">completely shredded & deleted</span> the moment anyone skips or leaves. Zero permanent logs.
          </p>
        </div>

      </div>
    </div>
  );
}
