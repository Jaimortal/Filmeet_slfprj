import React, { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import { useWebRTC } from './hooks/useWebRTC';
import { useTheme } from './hooks/useTheme';
import LobbySelection from './components/LobbySelection';
import VideoGrid from './components/VideoGrid';
import VideoTile from './components/VideoTile';
import ChatBox from './components/ChatBox';
import Controls from './components/Controls';
import GameSelectorModal from './components/GameSelectorModal';
import ThemeToggle from './components/ThemeToggle';
import SnakeGameView from './components/games/SnakeGameView';
import ChessGameView from './components/games/ChessGameView';
import TetrisGameView from './components/games/TetrisGameView';
import { Flame, Users, X, Gamepad2, Check, Clock } from 'lucide-react';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const { socket } = useSocket();
  const {
    localStream,
    remoteStreams,
    isMicOn,
    isCamOn,
    startLocalMedia,
    setupMeshConnections,
    closePeerConnection,
    closeAllPeerConnections,
    toggleMic,
    toggleCam
  } = useWebRTC(socket);

  // Application States
  const [inRoom, setInRoom] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const [roomMode, setRoomMode] = useState('pair'); // 'pair' or 'squad'
  const [peers, setPeers] = useState([]);
  const [username, setUsername] = useState('Stranger');
  const [queueStatus, setQueueStatus] = useState(null);

  // Chat & Game States
  const [messages, setMessages] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isGameSelectorOpen, setIsGameSelectorOpen] = useState(false);
  const [isGameOpen, setIsGameOpen] = useState(false);
  const [activeGameType, setActiveGameType] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [systemAlert, setSystemAlert] = useState(null);

  // Game Challenge / Invite States
  const [incomingInvite, setIncomingInvite] = useState(null);
  const [outgoingInvite, setOutgoingInvite] = useState(null);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('queue_status', (status) => {
      setQueueStatus(status);
    });

    socket.on('room_matched', async ({ roomId: rId, mode, peers: roomPeers }) => {
      console.log(`[App] Matched in room ${rId} (${mode}) with`, roomPeers);
      setRoomId(rId);
      setRoomMode(mode);
      setPeers(roomPeers);
      setQueueStatus(null);
      setInRoom(true);
      setMessages([]);
      setGameState(null);
      setActiveGameType(null);
      setIsGameOpen(false);
      setIsChatOpen(false);
      setIncomingInvite(null);
      setOutgoingInvite(null);

      showEphemeralNotice('New ephemeral session started. Chat shredded upon skip.');
      await setupMeshConnections(roomPeers);
    });

    socket.on('new_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('peer_left', ({ socketId, roomClosed, remainingPeers, reason }) => {
      closePeerConnection(socketId);

      if (roomClosed) {
        showEphemeralNotice('Stranger skipped or disconnected. Auto-shredding session...');
        closeAllPeerConnections();
        setInRoom(false);
        setPeers([]);
        setRoomId(null);
        setMessages([]);
        setGameState(null);
        setActiveGameType(null);
        setIsChatOpen(false);
        setIncomingInvite(null);
        setOutgoingInvite(null);
        if (socket) {
          socket.emit('join_queue', { mode: roomMode, username });
        }
      } else if (remainingPeers) {
        setPeers(remainingPeers);
        showEphemeralNotice('A squad member skipped. Remaining session intact.');
      }
    });

    // Game Challenge Invites
    socket.on('game_invite_received', (invite) => {
      setIncomingInvite(invite);
    });

    socket.on('game_invite_declined', ({ byName }) => {
      setOutgoingInvite(null);
      showEphemeralNotice(`${byName} declined the game.`);
    });

    socket.on('game_invite_cancelled', () => {
      setIncomingInvite(null);
    });

    socket.on('game_started', ({ gameType, initialState }) => {
      setIncomingInvite(null);
      setOutgoingInvite(null);
      setActiveGameType(gameType);
      setGameState(initialState);
      setIsGameOpen(true);
    });

    socket.on('game_update', ({ type, state }) => {
      if (type) setActiveGameType(type);
      setGameState(state);
    });

    socket.on('game_ended', () => {
      setGameState((prev) => (prev ? { ...prev, status: 'ended' } : null));
    });

    return () => {
      socket.off('queue_status');
      socket.off('room_matched');
      socket.off('new_message');
      socket.off('peer_left');
      socket.off('game_invite_received');
      socket.off('game_invite_declined');
      socket.off('game_invite_cancelled');
      socket.off('game_started');
      socket.off('game_update');
      socket.off('game_ended');
    };
  }, [socket, setupMeshConnections, closePeerConnection, closeAllPeerConnections, roomMode, username]);

  const showEphemeralNotice = (text) => {
    setSystemAlert(text);
    setTimeout(() => {
      setSystemAlert(null);
    }, 4500);
  };

  // Actions
  const handleJoinQueue = async (mode, chosenName) => {
    setUsername(chosenName);
    setRoomMode(mode);
    await startLocalMedia();
    socket.emit('join_queue', { mode, username: chosenName });
  };

  const handleLeaveQueue = () => {
    socket.emit('leave_queue');
    setQueueStatus(null);
  };

  const handleSkip = () => {
    closeAllPeerConnections();
    setInRoom(false);
    setPeers([]);
    setMessages([]);
    setGameState(null);
    setActiveGameType(null);
    setIsGameOpen(false);
    setIsChatOpen(false);
    setIncomingInvite(null);
    setOutgoingInvite(null);
    showEphemeralNotice('Session shredded! Finding next match...');
    socket.emit('skip', { mode: roomMode, username });
  };

  const handleLeaveRoom = () => {
    closeAllPeerConnections();
    setInRoom(false);
    setPeers([]);
    setRoomId(null);
    setMessages([]);
    setGameState(null);
    setActiveGameType(null);
    setIsGameOpen(false);
    setIsChatOpen(false);
    setIncomingInvite(null);
    setOutgoingInvite(null);
    socket.emit('leave_queue');
  };

  const handleSendMessage = (text) => {
    if (socket && text.trim()) {
      socket.emit('send_message', { text, senderName: username });
    }
  };

  const handleOpenGameSelector = () => {
    if (isGameOpen) {
      setIsGameOpen(false);
    } else {
      setIsGameSelectorOpen(true);
    }
  };

  const handleSelectGame = (gameId) => {
    if (roomMode === 'pair') {
      setOutgoingInvite({ gameType: gameId });
      if (socket) {
        socket.emit('request_game', { gameType: gameId, senderName: username });
      }
    } else {
      setActiveGameType(gameId);
      setGameState(null);
      if (socket) {
        socket.emit('start_game', { gameType: gameId });
      }
      setIsGameOpen(true);
    }
  };

  const handleAcceptInvite = () => {
    if (!incomingInvite) return;
    const gType = incomingInvite.gameType;
    setIncomingInvite(null);
    setActiveGameType(gType);
    setGameState(null);
    if (socket) {
      socket.emit('accept_game_invite', { gameType: gType });
    }
    setIsGameOpen(true);
  };

  const handleDeclineInvite = () => {
    if (!incomingInvite) return;
    if (socket) {
      socket.emit('decline_game_invite', { fromId: incomingInvite.fromId, byName: username });
    }
    setIncomingInvite(null);
  };

  const handleCancelInvite = () => {
    if (socket) {
      socket.emit('cancel_game_invite');
    }
    setOutgoingInvite(null);
  };

  const handleGameInput = (input) => {
    if (socket) {
      socket.emit('game_input', input);
    }
  };

  const handleRestartGame = () => {
    if (socket && activeGameType) {
      socket.emit('start_game', { gameType: activeGameType });
    }
  };

  if (!inRoom) {
    return (
      <LobbySelection
        onJoinQueue={handleJoinQueue}
        queueStatus={queueStatus}
        onLeaveQueue={handleLeaveQueue}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  const opponentPeer = peers.find((p) => p.id !== socket?.id);
  const opponentStream = opponentPeer ? remoteStreams[opponentPeer.id] : null;

  return (
    <div className="h-screen w-screen bg-slate-100 dark:bg-dark-950 text-slate-900 dark:text-white flex flex-col overflow-hidden select-none transition-colors duration-200">
      
      {/* Top Bar */}
      <header className="h-12 sm:h-14 px-3 sm:px-4 bg-white dark:bg-dark-900 border-b border-slate-200 dark:border-dark-700/80 flex items-center justify-between z-10 shrink-0 transition-colors">
        <div className="flex items-center gap-2 sm:gap-3">
          <h2 className="text-base sm:text-lg font-black tracking-wider text-slate-900 dark:text-white">
            FIL<span className="text-royal-600 dark:text-royal-400">MEET</span>
          </h2>
          <span className="px-2 sm:px-2.5 py-0.5 rounded-full bg-royal-50 dark:bg-dark-800 border border-royal-200 dark:border-dark-600 text-[11px] sm:text-xs text-royal-700 dark:text-gray-300 font-bold flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-royal-600 dark:text-royal-400" />
            {roomMode === 'squad' ? 'Squad (4-Way)' : '1v1 Pair'}
          </span>
        </div>

        {/* Top Right: Invites, Theme Toggle & Status */}
        <div className="flex items-center gap-2">
          {/* Incoming Game Challenge Confirm Widget */}
          {incomingInvite && (
            <div className="flex items-center gap-1.5 bg-royal-100 dark:bg-royal-950/90 border border-royal-300 dark:border-royal-500/80 rounded-xl px-2.5 py-1 shadow-md animate-fade-in text-xs">
              <Gamepad2 className="w-4 h-4 text-royal-600 dark:text-royal-400 shrink-0" />
              <span className="text-slate-800 dark:text-gray-200 text-[11px] hidden xs:inline">
                <strong className="text-slate-950 dark:text-white">{incomingInvite.fromName}</strong>: <span className="capitalize text-royal-600 dark:text-royal-300 font-bold">{incomingInvite.gameType}</span>
              </span>
              <button
                onClick={handleAcceptInvite}
                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px] sm:text-[11px] shadow transition cursor-pointer flex items-center gap-0.5"
              >
                <Check className="w-3 h-3" /> Confirm
              </button>
              <button
                onClick={handleDeclineInvite}
                className="p-1 hover:bg-slate-200 dark:hover:bg-dark-800 text-slate-500 dark:text-gray-400 hover:text-red-500 rounded-lg transition cursor-pointer"
                title="Decline"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Outgoing Challenge Waiting Pill */}
          {outgoingInvite && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-dark-800 border border-slate-300 dark:border-dark-600 rounded-xl px-2.5 py-1 shadow-sm animate-fade-in text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 animate-spin" />
              <span className="text-slate-700 dark:text-gray-300 text-[11px]">
                Waiting... <span className="capitalize text-amber-600 dark:text-amber-300 font-bold">{outgoingInvite.gameType}</span>
              </span>
              <button
                onClick={handleCancelInvite}
                className="px-1.5 py-0.5 bg-slate-200 dark:bg-dark-700 hover:bg-slate-300 dark:hover:bg-dark-600 text-slate-600 dark:text-gray-400 rounded text-[10px] transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Theme Toggle Button */}
          <ThemeToggle theme={theme} onToggle={toggleTheme} />

          {/* Ephemeral Indicator */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/30 rounded-full text-red-600 dark:text-red-300 text-xs font-semibold">
            <Flame className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400 animate-pulse" />
            Zero-Trace Mode
          </div>
        </div>
      </header>

      {/* Floating System Ephemeral Toast */}
      {systemAlert && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-red-900/95 border border-red-500/60 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-2xl backdrop-blur-md animate-fade-in flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-400" />
          {systemAlert}
        </div>
      )}

      {/* Game Selector Modal */}
      <GameSelectorModal
        isOpen={isGameSelectorOpen}
        onClose={() => setIsGameSelectorOpen(false)}
        onSelectGame={handleSelectGame}
        mode={roomMode}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Main Stage */}
        <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
          
          {/* ======================================================== */}
          {/* CASE 1: 2-PLAYER IN-GAME (Flanking Cameras on Desktop; Top Bar on Mobile) */}
          {/* ======================================================== */}
          {inRoom && roomMode === 'pair' && isGameOpen ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              
              {/* MOBILE ONLY: Top Bar with both cameras side-by-side */}
              <div className="md:hidden grid grid-cols-2 gap-2 p-2 h-24 shrink-0 bg-white/90 dark:bg-dark-900/90 border-b border-slate-200 dark:border-dark-800">
                <div className="h-full rounded-xl overflow-hidden shadow">
                  <VideoTile
                    stream={localStream}
                    isLocal={true}
                    username={username}
                    isMicMuted={!isMicOn}
                    isCamMuted={!isCamOn}
                    color="#2563EB"
                    compact={true}
                  />
                </div>
                <div className="h-full rounded-xl overflow-hidden shadow">
                  <VideoTile
                    stream={opponentStream}
                    isLocal={false}
                    username={opponentPeer?.username || 'Opponent'}
                    color="#10B981"
                    compact={true}
                  />
                </div>
              </div>

              {/* Sub-header ribbon for Game Controls */}
              <div className="px-4 py-1.5 bg-white dark:bg-dark-900 border-b border-slate-200 dark:border-dark-800 flex items-center justify-between shrink-0">
                <span className="text-xs font-bold text-royal-600 dark:text-royal-400 flex items-center gap-1.5">
                  <Gamepad2 className="w-4 h-4" />
                  {activeGameType === 'chess' && 'Live Chess Showdown'}
                  {activeGameType === 'snake' && 'Multiplayer Snake'}
                  {activeGameType === 'tetris' && 'Tetris Battle'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsGameSelectorOpen(true)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-700 border border-slate-300 dark:border-dark-600 rounded-lg text-xs font-bold text-slate-700 dark:text-gray-300 transition cursor-pointer"
                  >
                    Switch Game
                  </button>
                  <button
                    onClick={() => setIsGameOpen(false)}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-700 border border-slate-300 dark:border-dark-600 rounded-lg text-slate-500 dark:text-gray-400 hover:text-red-500 transition cursor-pointer"
                    title="Close Game"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* DESKTOP + MOBILE GAME ARENA */}
              <div className="flex-1 flex items-center justify-center md:justify-between p-1 sm:p-4 overflow-y-auto">
                
                {/* DESKTOP ONLY: Left Camera (Player 1 / You) */}
                <div className="hidden md:flex flex-col items-center justify-center shrink-0 w-44 lg:w-52">
                  <div className="w-full h-32 lg:h-36 rounded-xl overflow-hidden shadow-xl border-2 border-royal-600">
                    <VideoTile
                      stream={localStream}
                      isLocal={true}
                      username={username}
                      isMicMuted={!isMicOn}
                      isCamMuted={!isCamOn}
                      color="#2563EB"
                      compact={true}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-royal-600 dark:text-royal-400 mt-1.5">Player 1 (You)</span>
                </div>

                {/* CENTER: Fixed, Centered Game Arena */}
                <div className="flex-1 flex items-center justify-center px-1 sm:px-2 min-w-0">
                  {activeGameType === 'chess' && (
                    <ChessGameView
                      gameState={gameState}
                      onMove={(moveData) => handleGameInput(moveData)}
                      onRestart={handleRestartGame}
                      myId={socket?.id}
                    />
                  )}

                  {activeGameType === 'snake' && (
                    <SnakeGameView
                      gameState={gameState}
                      onInput={(direction) => handleGameInput({ direction })}
                      onRestart={handleRestartGame}
                      myId={socket?.id}
                    />
                  )}

                  {activeGameType === 'tetris' && (
                    <TetrisGameView
                      gameState={gameState}
                      onAction={(action) => handleGameInput({ action })}
                      onVote={(vote) => handleGameInput({ vote })}
                      onRestart={handleRestartGame}
                      myId={socket?.id}
                      mode={roomMode}
                      peers={peers}
                      localStream={localStream}
                      remoteStreams={remoteStreams}
                      isMicOn={isMicOn}
                      isCamOn={isCamOn}
                      myUsername={username}
                    />
                  )}
                </div>

                {/* DESKTOP ONLY: Right Camera (Player 2 / Opponent) */}
                <div className="hidden md:flex flex-col items-center justify-center shrink-0 w-44 lg:w-52">
                  <div className="w-full h-32 lg:h-36 rounded-xl overflow-hidden shadow-xl border-2 border-emerald-500">
                    <VideoTile
                      stream={opponentStream}
                      isLocal={false}
                      username={opponentPeer?.username || 'Opponent'}
                      color="#10B981"
                      compact={true}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1.5">
                    {opponentPeer?.username || 'Player 2'}
                  </span>
                </div>

              </div>

            </div>
          ) : (
            /* ======================================================== */
            /* CASE 2: REGULAR VIEW (Full Video Grid or Squad Mode) */
            /* ======================================================== */
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <div
                className={`transition-all duration-300 w-full shrink-0 ${
                  isGameOpen
                    ? 'h-28 sm:h-36 border-b border-slate-200 dark:border-dark-800 bg-white/90 dark:bg-dark-950/90'
                    : 'flex-1'
                }`}
              >
                <VideoGrid
                  peers={peers}
                  myId={socket?.id}
                  localStream={localStream}
                  remoteStreams={remoteStreams}
                  isMicOn={isMicOn}
                  isCamOn={isCamOn}
                  myUsername={username}
                />
              </div>

              {isGameOpen && (
                <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-dark-950/95 overflow-y-auto">
                  <div className="px-4 py-1.5 bg-white dark:bg-dark-900 border-b border-slate-200 dark:border-dark-800 flex items-center justify-between shrink-0">
                    <span className="text-xs font-bold text-royal-600 dark:text-royal-400 flex items-center gap-1.5">
                      <Gamepad2 className="w-4 h-4" /> Squad Game
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsGameSelectorOpen(true)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-700 border border-slate-300 dark:border-dark-600 rounded-lg text-xs font-bold text-slate-700 dark:text-gray-300 transition cursor-pointer"
                      >
                        Switch Game
                      </button>
                      <button
                        onClick={() => setIsGameOpen(false)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-700 border border-slate-300 dark:border-dark-600 rounded-lg text-slate-500 dark:text-gray-400 hover:text-red-500 transition cursor-pointer"
                        title="Close Game"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 flex items-center justify-center p-2 sm:p-4">
                    {activeGameType === 'snake' && (
                      <SnakeGameView
                        gameState={gameState}
                        onInput={(direction) => handleGameInput({ direction })}
                        onRestart={handleRestartGame}
                        myId={socket?.id}
                      />
                    )}
                    {activeGameType === 'chess' && (
                      <ChessGameView
                        gameState={gameState}
                        onMove={(moveData) => handleGameInput(moveData)}
                        onRestart={handleRestartGame}
                        myId={socket?.id}
                      />
                    )}
                    {activeGameType === 'tetris' && (
                      <TetrisGameView
                        gameState={gameState}
                        onAction={(action) => handleGameInput({ action })}
                        onVote={(vote) => handleGameInput({ vote })}
                        onRestart={handleRestartGame}
                        myId={socket?.id}
                        mode={roomMode}
                        peers={peers}
                        localStream={localStream}
                        remoteStreams={remoteStreams}
                        isMicOn={isMicOn}
                        isCamOn={isCamOn}
                        myUsername={username}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Desktop Chat Side Panel & Mobile Slide-Out Drawer */}
        <div
          className={`transition-all duration-300 ${
            isChatOpen
              ? 'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end md:relative md:inset-auto md:bg-transparent md:w-80 lg:w-96 md:h-full md:z-30'
              : 'hidden md:block md:w-80 lg:w-96 md:h-full'
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsChatOpen(false);
          }}
        >
          <div className="w-[85vw] max-w-[320px] sm:max-w-sm md:max-w-none md:w-full h-full bg-white dark:bg-dark-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-dark-700">
            <ChatBox
              messages={messages}
              onSendMessage={handleSendMessage}
              myId={socket?.id}
              onClose={() => setIsChatOpen(false)}
            />
          </div>
        </div>

      </div>

      {/* Bottom Controls Bar */}
      <Controls
        isMicOn={isMicOn}
        isCamOn={isCamOn}
        onToggleMic={toggleMic}
        onToggleCam={toggleCam}
        onSkip={handleSkip}
        onLeave={handleLeaveRoom}
        isGameOpen={isGameOpen}
        onToggleGame={handleOpenGameSelector}
        isChatOpen={isChatOpen}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        unreadCount={messages.length}
      />

    </div>
  );
}
