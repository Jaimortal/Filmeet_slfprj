import React, { useRef, useEffect } from 'react';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';

export default function VideoTile({
  stream,
  isLocal = false,
  username = 'Stranger',
  isMicMuted = false,
  isCamMuted = false,
  color = '#6366F1',
  compact = false
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div
      className={`relative w-full h-full bg-slate-100 dark:bg-dark-900 rounded-xl overflow-hidden border-2 transition-all flex items-center justify-center shadow-lg group ${
        compact ? 'min-h-[80px]' : 'min-h-[140px] sm:min-h-[180px]'
      }`}
      style={{ borderColor: color }}
    >
      {/* Video Element */}
      {stream && !isCamMuted ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className={`flex flex-col items-center justify-center text-center ${compact ? 'p-1' : 'p-3'}`}>
          <div
            className={`rounded-full flex items-center justify-center text-white font-bold shadow-inner ${
              compact ? 'w-8 h-8 sm:w-10 sm:h-10 text-xs sm:text-sm mb-1' : 'w-14 h-14 text-lg mb-1.5'
            }`}
            style={{ backgroundColor: `${color}33`, border: `2px solid ${color}` }}
          >
            {username.slice(0, 2).toUpperCase()}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-gray-400 font-medium">Camera Off</span>
        </div>
      )}

      {/* Top Details & Badges */}
      <div className={`absolute ${compact ? 'top-1.5 left-1.5' : 'top-2.5 left-2.5'} flex items-center gap-1.5 max-w-[85%]`}>
        <span
          className={`rounded-md font-bold text-white shadow-md backdrop-blur-md truncate ${
            compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
          }`}
          style={{ backgroundColor: `${color}cc` }}
        >
          {username} {isLocal && '(You)'}
        </span>
      </div>

      {/* Bottom Status Controls */}
      <div className={`absolute ${compact ? 'bottom-1.5 right-1.5' : 'bottom-2.5 right-2.5'} flex items-center gap-1 bg-white/80 dark:bg-dark-900/80 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-slate-300 dark:border-dark-700`}>
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
