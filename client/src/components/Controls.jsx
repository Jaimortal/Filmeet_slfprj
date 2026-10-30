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
  unreadCount = 0,
  isChallengePending = false
}) {
  return (
    <div className="bg-white/95 dark:bg-dark-900/95 border-t border-slate-200 dark:border-dark-700/80 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 backdrop-blur-md transition-colors">
      
      {/* Left: Leave Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={onLeave}
          title="Leave Lobby"
          className="p-2 sm:px-3 sm:py-2 bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-700 border border-slate-300 dark:border-dark-600 rounded-xl text-slate-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-red-500" />
          <span className="hidden sm:inline">Exit</span>
        </button>
      </div>

      {/* Center: Media Toggles & Game Launch */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Mic */}
        <button
          onClick={onToggleMic}
          className={`p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer ${
            isMicOn
              ? 'bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-700 border-slate-300 dark:border-dark-600 text-slate-800 dark:text-white'
              : 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20'
          }`}
          title={isMicOn ? 'Mute Mic' : 'Unmute Mic'}
        >
          {isMicOn ? <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-royal-600 dark:text-royal-400" /> : <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>

        {/* Cam */}
        <button
          onClick={onToggleCam}
          className={`p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer ${
            isCamOn
              ? 'bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-700 border-slate-300 dark:border-dark-600 text-slate-800 dark:text-white'
              : 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20'
          }`}
          title={isCamOn ? 'Turn Off Cam' : 'Turn On Cam'}
        >
          {isCamOn ? <Video className="w-4 h-4 sm:w-5 sm:h-5 text-royal-600 dark:text-royal-400" /> : <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>

        {/* Game Panel Toggle (Royal Blue Brand) */}
        <button
          onClick={onToggleGame}
          className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border flex items-center gap-1.5 sm:gap-2 text-xs font-extrabold transition-all shadow-md cursor-pointer ${
            isGameOpen
              ? 'bg-royal-600 border-royal-500 text-white ring-2 ring-royal-400/30'
              : isChallengePending
              ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
              : 'bg-royal-50 dark:bg-royal-950/60 border-royal-300 dark:border-royal-700 text-royal-700 dark:text-royal-300 hover:bg-royal-100 dark:hover:bg-royal-900/60'
          }`}
          title={isChallengePending ? 'A game challenge is pending' : (isGameOpen ? 'Close Game' : 'Mini-Games')}
        >
          <Gamepad2 className={`w-4 h-4 sm:w-5 sm:h-5 ${isChallengePending ? 'animate-pulse' : ''}`} />
          <span className="hidden md:inline">
            {isGameOpen ? 'Close Game' : (isChallengePending ? 'Invite Pending' : 'Mini-Games')}
          </span>
        </button>

        {/* Chat Toggle (Mobile drawer toggle) */}
        <button
          onClick={onToggleChat}
          className={`relative p-2.5 sm:p-3 rounded-xl border md:hidden transition-all cursor-pointer ${
            isChatOpen
              ? 'bg-royal-600 border-royal-500 text-white'
              : 'bg-slate-100 dark:bg-dark-800 border-slate-300 dark:border-dark-600 text-slate-700 dark:text-gray-300'
          }`}
          title="Toggle Chat"
        >
          <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
          {unreadCount > 0 && !isChatOpen && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Right: The SKIP / NEXT Button */}
      <div className="flex items-center">
        <button
          onClick={onSkip}
          className="px-3.5 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 shadow-lg shadow-red-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <FastForward className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
          <span>SKIP / NEXT</span>
        </button>
      </div>

    </div>
  );
}
