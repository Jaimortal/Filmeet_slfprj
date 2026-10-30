import React from 'react';
import { Mic, MicOff, Video, VideoOff, FastForward, Gamepad2, MessageSquare, LogOut } from 'lucide-react';

export default function Controls({
  isMicOn,
  isCamOn,
  onToggleMic,
  onToggleCam,
  onSkip,
  onLeave,
  isGameOpen,
  onToggleGame,
  isChatOpen,
  onToggleChat,
  unreadCount = 0
}) {
  return (
    <div className="bg-dark-900/95 border-t border-dark-700/80 px-4 py-3 flex items-center justify-between gap-2 backdrop-blur-md">
      
      {/* Left: Leave Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={onLeave}
          title="Leave Lobby"
          className="p-2.5 sm:px-3 sm:py-2 bg-dark-800 hover:bg-dark-700 border border-dark-600 rounded-xl text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <LogOut className="w-4 h-4 text-red-400" />
          <span className="hidden sm:inline">Exit</span>
        </button>
      </div>

      {/* Center: Media Toggles & Game Launch */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mic */}
        <button
          onClick={onToggleMic}
          className={`p-3 rounded-xl border transition-all ${
            isMicOn
              ? 'bg-dark-800 border-dark-600 text-white hover:bg-dark-700'
              : 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30'
          }`}
          title={isMicOn ? 'Mute Mic' : 'Unmute Mic'}
        >
          {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        {/* Cam */}
        <button
          onClick={onToggleCam}
          className={`p-3 rounded-xl border transition-all ${
            isCamOn
              ? 'bg-dark-800 border-dark-600 text-white hover:bg-dark-700'
              : 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30'
          }`}
          title={isCamOn ? 'Turn Off Cam' : 'Turn On Cam'}
        >
          {isCamOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        {/* Game Panel Toggle */}
        <button
          onClick={onToggleGame}
          className={`px-3.5 py-3 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all shadow-md ${
            isGameOpen
              ? 'bg-emerald-600 border-emerald-500 text-white'
              : 'bg-dark-800 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10'
          }`}
        >
          <Gamepad2 className="w-5 h-5" />
          <span className="hidden md:inline">{isGameOpen ? 'Close Game' : 'Mini-Games'}</span>
        </button>

        {/* Chat Toggle (Mobile drawer toggle) */}
        <button
          onClick={onToggleChat}
          className={`relative p-3 rounded-xl border md:hidden transition-all ${
            isChatOpen
              ? 'bg-indigo-600 border-indigo-500 text-white'
              : 'bg-dark-800 border-dark-600 text-gray-300'
          }`}
          title="Toggle Chat"
        >
          <MessageSquare className="w-5 h-5" />
          {unreadCount > 0 && !isChatOpen && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Right: The Famous SKIP / NEXT Button */}
      <div className="flex items-center">
        <button
          onClick={onSkip}
          className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-lg shadow-red-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <FastForward className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
          <span>SKIP / NEXT</span>
        </button>
      </div>

    </div>
  );
}
