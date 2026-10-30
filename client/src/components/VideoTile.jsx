import React, { useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Video, VideoOff, Gamepad2, Check, X, Clock } from 'lucide-react';

export default function VideoTile({
  stream,
  isLocal = false,
  username = 'Stranger',
  isMicMuted = false,
  isCamMuted = false,
  color = '#2563EB',
  compact = false,
  incomingChallenge = null,
  onAcceptChallenge = null,
  onDeclineChallenge = null,
  outgoingChallenge = null,
  onCancelChallenge = null
}) {
  const videoRef = useRef(null);

  // Safely attach stream and ensure play() is executed
  const applyStream = useCallback((videoEl) => {
    if (!videoEl || !stream) return;
    if (videoEl.srcObject !== stream) {
      videoEl.srcObject = stream;
    }
    const playPromise = videoEl.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Suppress browser autoplay abort/pause warnings
      });
    }
  }, [stream]);

  // Combined ref callback to handle DOM insertion immediately
  const setVideoRef = useCallback((el) => {
    videoRef.current = el;
    applyStream(el);
  }, [applyStream]);

  // Re-apply whenever stream or camera state updates
  useEffect(() => {
    applyStream(videoRef.current);
  }, [stream, isCamMuted, applyStream]);

  // Keep video alive if user switches tabs, mobile goes into background, or modals close
  useEffect(() => {
    const handleResume = () => {
      if (document.visibilityState === 'visible' && videoRef.current) {
        applyStream(videoRef.current);
      }
    };
    document.addEventListener('visibilitychange', handleResume);
    window.addEventListener('focus', handleResume);
    return () => {
      document.removeEventListener('visibilitychange', handleResume);
      window.removeEventListener('focus', handleResume);
    };
  }, [applyStream]);

  return (
    <div
      className={`relative w-full h-full min-h-0 bg-slate-100 dark:bg-dark-900 rounded-xl overflow-hidden border-2 transition-all flex items-center justify-center shadow-lg group ${
        compact ? 'min-h-[70px]' : ''
      }`}
      style={{ borderColor: color }}
    >
      {/* Video Element - Permanently mounted to prevent MediaStream sink destruction */}
      <video
        ref={setVideoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          isLocal ? 'scale-x-[-1]' : ''
        } ${!stream || isCamMuted ? 'opacity-0 pointer-events-none absolute inset-0' : 'opacity-100'}`}
      />

      {/* Camera Off / Waiting Avatar Fallback */}
      {(!stream || isCamMuted) && (
        <div className={`flex flex-col items-center justify-center text-center ${compact ? 'p-1' : 'p-3'}`}>
          <div
            className={`rounded-full flex items-center justify-center text-white font-bold shadow-inner ${
              compact ? 'w-8 h-8 sm:w-10 sm:h-10 text-xs sm:text-sm mb-1' : 'w-14 h-14 text-lg mb-1.5'
            }`}
            style={{ backgroundColor: `${color}33`, border: `2px solid ${color}` }}
          >
            {username ? username.slice(0, 2).toUpperCase() : '??'}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-gray-400 font-medium">
            {!stream ? 'Connecting...' : 'Camera Off'}
          </span>
        </div>
      )}

      {/* Top Left Details & Challenge Confirm Notification */}
      <div className={`absolute ${compact ? 'top-1.5 left-1.5' : 'top-2.5 left-2.5'} z-20 flex flex-col items-start gap-1 max-w-[92%]`}>
        <span
          className={`rounded-md font-bold text-white shadow-md backdrop-blur-md truncate ${
            compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
          }`}
          style={{ backgroundColor: `${color}cc` }}
        >
          {username} {isLocal && '(You)'}
        </span>

        {/* Incoming Challenge displayed directly on the challenger's video tile */}
        {incomingChallenge && (
          <div className="flex items-center gap-1.5 bg-royal-950/95 text-white border border-royal-400 rounded-lg p-1.5 shadow-2xl backdrop-blur-md animate-fade-in text-xs">
            <Gamepad2 className="w-3.5 h-3.5 text-royal-300 shrink-0 animate-pulse" />
            <span className="text-[10px] sm:text-[11px] font-bold whitespace-nowrap">
              Wants <span className="capitalize text-royal-300 font-extrabold">{incomingChallenge.gameType}</span>
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onAcceptChallenge) onAcceptChallenge();
              }}
              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-[10px] shadow flex items-center gap-0.5 cursor-pointer ml-0.5 transition"
            >
              <Check className="w-3 h-3" /> Confirm
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onDeclineChallenge) onDeclineChallenge();
              }}
              className="p-0.5 hover:bg-white/20 text-gray-300 hover:text-red-400 rounded transition cursor-pointer"
              title="Decline"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Outgoing Challenge waiting indicator on local player tile */}
        {outgoingChallenge && (
          <div className="flex items-center gap-1 bg-dark-900/95 text-white border border-amber-500/60 rounded-lg px-2 py-1 shadow-lg backdrop-blur-md animate-fade-in text-[10px]">
            <Clock className="w-3 h-3 text-amber-400 animate-spin shrink-0" />
            <span className="whitespace-nowrap">Waiting... <strong className="capitalize text-amber-300">{outgoingChallenge.gameType}</strong></span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onCancelChallenge) onCancelChallenge();
              }}
              className="ml-1 px-1.5 py-0.5 bg-dark-800 hover:bg-dark-700 text-gray-300 rounded text-[9px] cursor-pointer transition"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Bottom Status Controls */}
      <div className={`absolute ${compact ? 'bottom-1.5 right-1.5' : 'bottom-2.5 right-2.5'} z-10 flex items-center gap-1 bg-white/80 dark:bg-dark-900/80 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-slate-300 dark:border-dark-700`}>
        {isMicMuted ? (
          <MicOff className="w-3 h-3 text-red-400" />
        ) : (
          <Mic className="w-3 h-3 text-emerald-400" />
        )}
        {isCamMuted ? (
          <VideoOff className="w-3 h-3 text-red-400" />
        ) : (
          <Video className="w-3 h-3 text-gray-400" />
        )}
      </div>
    </div>
  );
}
