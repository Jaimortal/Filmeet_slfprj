import React, { useState } from 'react';
import { Users, User, ShieldAlert, Sparkles, Loader2, Gamepad2 } from 'lucide-react';

const RANDOM_NAMES = ['CosmicVoyager', 'CyberNinja', 'NeonDrifter', 'PixelGhost', 'AstroWolf', 'QuantumCat'];

export default function LobbySelection({ onJoinQueue, queueStatus, onLeaveQueue }) {
  const [username, setUsername] = useState(() => {
    return RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
  });
  const [selectedMode, setSelectedMode] = useState('pair'); // 'pair' or 'squad'

  const handleStart = (mode) => {
    setSelectedMode(mode);
    onJoinQueue(mode, username.trim() || 'Stranger');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-dark-900 via-dark-800 to-black">
      <div className="max-w-xl w-full bg-dark-800/90 border border-dark-700/80 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold tracking-wider uppercase mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Next-Gen Omegle & Party Chat
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            OMEGA<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">SPHERE</span>
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            Meet strangers, form 4-player squads, play instant mini-games.
          </p>
        </div>

        {/* Username Input */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
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
              className="w-full px-4 py-3 bg-dark-900/90 border border-dark-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all font-medium"
            />
            <button
              type="button"
              onClick={() => setUsername(RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)])}
              disabled={!!queueStatus}
              className="absolute right-3 top-2.5 px-2.5 py-1 text-xs font-medium bg-dark-700 hover:bg-dark-600 text-gray-300 rounded-lg transition"
            >
              Randomize
            </button>
          </div>
        </div>

        {/* Queue Status Overlay */}
        {queueStatus ? (
          <div className="p-6 bg-dark-900/95 border border-indigo-500/40 rounded-2xl text-center space-y-4 animate-fade-in">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-ping"></div>
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                Searching for {queueStatus.mode === 'squad' ? 'Squad of 4' : 'Stranger'}...
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                {queueStatus.mode === 'squad'
                  ? `Gathering 4 random peers (${queueStatus.position}/4 in line)`
                  : 'Pairing you with a live partner...'}
              </p>
            </div>
            <button
              onClick={onLeaveQueue}
              className="px-6 py-2.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 rounded-xl text-sm font-semibold transition"
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
              className="group p-5 bg-dark-900/60 hover:bg-dark-900/90 border border-dark-700 hover:border-indigo-500/60 rounded-2xl text-left transition-all duration-200 hover:scale-[1.02] flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3 group-hover:bg-indigo-500/20 transition">
                  <User className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition">
                  1-on-1 Pair
                </h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Classic Omegle style. Connect directly with 1 stranger for video & text.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-dark-700/60 flex items-center justify-between text-xs font-semibold text-indigo-400">
                <span>Start 1v1</span>
                <span>&rarr;</span>
              </div>
            </button>

            {/* Squad of 4 Card */}
            <button
              onClick={() => handleStart('squad')}
              className="group p-5 bg-dark-900/60 hover:bg-dark-900/90 border border-emerald-500/30 hover:border-emerald-500/70 rounded-2xl text-left transition-all duration-200 hover:scale-[1.02] flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute -right-6 -top-6 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl pointer-events-none"></div>
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 group-hover:bg-emerald-500/20 transition">
                  <Users className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition">
                    Squad of 4
                  </h3>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold tracking-wide">
                    POPULAR
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  4 strangers connected in one room! Play 4-player Snake battle & hang out.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-dark-700/60 flex items-center justify-between text-xs font-semibold text-emerald-400">
                <span className="flex items-center gap-1"><Gamepad2 className="w-3.5 h-3.5" /> Start Squad</span>
                <span>&rarr;</span>
              </div>
            </button>

          </div>
        )}

        {/* Ephemeral Notice */}
        <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-900/40 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-gray-400 leading-normal">
            <strong className="text-red-300 font-semibold">Strict Ephemeral Storage:</strong> Room logs and chat history are created in a temporary session JSON and <span className="underline decoration-red-500">completely shredded & deleted</span> the moment anyone skips or leaves. Zero permanent logs.
          </p>
        </div>

      </div>
    </div>
  );
}
