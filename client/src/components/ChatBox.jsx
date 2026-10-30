import React, { useState, useEffect, useRef } from 'react';
import { Send, Flame, ShieldAlert, X } from 'lucide-react';

export default function ChatBox({ messages, onSendMessage, myId, onClose }) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-900 border-l border-slate-200 dark:border-dark-700/80 transition-colors">
      
      {/* Header: Ephemeral Self-Destruct Banner */}
      <div className="p-3 bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-500 dark:text-orange-400 animate-pulse" />
          <span className="text-xs font-bold text-red-700 dark:text-red-300 tracking-wide uppercase">
            Ephemeral Chat
          </span>
          <span className="text-[10px] bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-300 border border-red-400/30 px-1.5 py-0.5 rounded-full font-semibold hidden sm:inline">
            Auto-Wipes
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 bg-slate-200 dark:bg-dark-700/80 hover:bg-slate-300 dark:hover:bg-dark-600 text-slate-600 dark:text-gray-300 rounded-lg transition md:hidden cursor-pointer"
              title="Close Chat"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 dark:text-gray-500 space-y-2">
            <ShieldAlert className="w-8 h-8 text-slate-400 dark:text-gray-600" />
            <p className="text-xs font-medium">No messages yet.</p>
            <p className="text-[11px] text-slate-400 dark:text-gray-600">
              Say hi! Anything you type will vanish completely when the lobby ends.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === myId;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-gray-400">
                    {isMe ? 'You' : msg.senderName}
                  </span>
                  <span className="text-[9px] text-slate-400 dark:text-gray-500">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div
                  className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-medium break-words shadow-sm ${
                    isMe
                      ? 'bg-royal-600 text-white rounded-br-xs shadow-royal-500/10'
                      : 'bg-slate-100 dark:bg-dark-800 text-slate-800 dark:text-gray-200 border border-slate-200 dark:border-dark-700 rounded-bl-xs'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSend} className="p-2 sm:p-3 bg-slate-50 dark:bg-dark-950 border-t border-slate-200 dark:border-dark-700/80 flex gap-2 shrink-0">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type an ephemeral message..."
          className="flex-1 px-3.5 py-2 bg-white dark:bg-dark-800 border border-slate-300 dark:border-dark-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-royal-600 focus:ring-1 focus:ring-royal-500 transition"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="px-3.5 py-2 bg-royal-600 hover:bg-royal-500 disabled:opacity-40 disabled:hover:bg-royal-600 text-white rounded-xl transition flex items-center justify-center shadow-md cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
}
