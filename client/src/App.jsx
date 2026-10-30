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
import WordBombGameView from './components/games/WordBombGameView';
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

  // Responsive breakpoint watcher to ensure only 1 VideoTile per stream is active in DOM
  const [isMobileView, setIsMobileView] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  );

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

    socket.on('game_invite_rejected', ({ reason }) => {
      setOutgoingInvite(null);
      showEphemeralNotice(reason || 'Game challenge was rejected.');
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

    socket.on('game_closed', ({ closedById, closedByName }) => {
      setIsGameOpen(false);
      setActiveGameType(null);
      setGameState(null);
      if (closedById !== socket?.id) {
        showEphemeralNotice(`Player ${closedByName} closed the game.`);
      }
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
      socket.off('game_invite_rejected');
      socket.off('game_invite_declined');
      socket.off('game_invite_cancelled');
      socket.off('game_started');
      socket.off('game_update');
      socket.off('game_closed');
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

  const handleCloseGame = () => {
    setIsGameOpen(false);
    setActiveGameType(null);
    setGameState(null);
    if (socket) {
      socket.emit('stop_game', { closedByName: username });
    }
  };

  const handleOpenGameSelector = () => {
    if (incomingInvite) {
      showEphemeralNotice(`${incomingInvite.fromName} already invited you to a game! Confirm or decline on their video.`);
      return;
    }
    if (outgoingInvite) {
      showEphemeralNotice('Your game challenge is currently waiting for a response...');
      return;
    }
    if (isGameOpen) {
      handleCloseGame();
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

  const PLAYER_COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EC4899'];

  const allPeers = peers || [];
  const myIndex = allPeers.findIndex((p) => p.id === socket?.id);
  const myColor = PLAYER_COLORS[myIndex >= 0 ? myIndex % 4 : 0];

  const localParticipant = {
    id: socket?.id,
    username,
    isLocal: true,
    stream: localStream,
    isMicMuted: !isMicOn,
    isCamMuted: !isCamOn,
    color: myColor
  };

  const remoteParticipants = allPeers
    .filter((p) => p.id !== socket?.id)
    .map((peer, idx) => {
      const pIdx = allPeers.findIndex((p) => p.id === peer.id);
      const color = PLAYER_COLORS[pIdx >= 0 ? pIdx % 4 : (idx + 1) % 4];
      return {
        id: peer.id,
        username: peer.username,
        isLocal: false,
        stream: remoteStreams[peer.id] || null,
        isMicMuted: false,
        isCamMuted: false,
        color
      };
    });

  const fullParticipants = [localParticipant, ...remoteParticipants];

  // Distribute cameras flanking left and right (1 each for 1v1, 2 each for 4-player squad)
  let leftParticipants = [];
  let rightParticipants = [];
  if (fullParticipants.length <= 2) {
    leftParticipants = [fullParticipants[0]];
    rightParticipants = fullParticipants.slice(1);
  } else {
    leftParticipants = fullParticipants.slice(0, 2);
    rightParticipants = fullParticipants.slice(2);
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

        {/* Top Right: Theme Toggle & Ephemeral Badge */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle Button */}
          <ThemeToggle theme={theme} onToggle={toggleTheme} />

          {/* Ephemeral Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/30 rounded-full text-red-600 dark:text-red-300 text-xs font-semibold">
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
          {/* IN-GAME VIEW vs REGULAR LOBBY VIEW */}
          {/* ======================================================== */}
          {inRoom && isGameOpen ? (
            <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden">
              
              {/* MOBILE ONLY: Top Bar with compact camera strip (Rendered ONLY on mobile) */}
              {isMobileView && (
                <div className={`grid gap-1.5 p-1.5 ${fullParticipants.length <= 2 ? 'grid-cols-2 h-24' : 'grid-cols-4 h-20'} shrink-0 bg-white/90 dark:bg-dark-900/90 border-b border-slate-200 dark:border-dark-800`}>
                  {fullParticipants.map((p) => (
                    <div key={p.id} className="h-full rounded-xl overflow-hidden shadow">
                      <VideoTile
                        stream={p.stream}
                        isLocal={p.isLocal}
                        username={p.username}
                        isMicMuted={p.isMicMuted}
                        isCamMuted={p.isCamMuted}
                        color={p.color}
                        compact={true}
                        outgoingChallenge={p.isLocal ? outgoingInvite : null}
                        onCancelChallenge={p.isLocal ? handleCancelInvite : null}
                        incomingChallenge={!p.isLocal && incomingInvite?.fromId === p.id ? incomingInvite : null}
                        onAcceptChallenge={handleAcceptInvite}
                        onDeclineChallenge={handleDeclineInvite}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Sub-header ribbon for Game Controls */}
              <div className="px-4 py-1.5 bg-white dark:bg-dark-900 border-b border-slate-200 dark:border-dark-800 flex items-center justify-between shrink-0">
                <span className="text-xs font-bold text-royal-600 dark:text-royal-400 flex items-center gap-1.5">
                  <Gamepad2 className="w-4 h-4" />
                  {activeGameType === 'chess' && 'Live Chess Showdown'}
                  {activeGameType === 'snake' && 'Multiplayer Snake'}
                  {activeGameType === 'tetris' && 'Tetris Battle'}
                  {activeGameType === 'wordbomb' && '💣 Word Bomb Arena'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenGameSelector}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-700 border border-slate-300 dark:border-dark-600 rounded-lg text-xs font-bold text-slate-700 dark:text-gray-300 transition cursor-pointer"
                  >
                    Switch Game
                  </button>
                  <button
                    onClick={handleCloseGame}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-700 border border-slate-300 dark:border-dark-600 rounded-lg text-slate-500 dark:text-gray-400 hover:text-red-500 transition cursor-pointer"
                    title="Close Game"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* DESKTOP + MOBILE GAME ARENA */}
              <div className="flex-1 min-h-0 flex items-center justify-center md:justify-between p-1 sm:p-4 overflow-y-auto">
                
                {/* DESKTOP ONLY: Left Flanking Cameras (1 or 2 players stacked vertically) */}
                {!isMobileView && (
                  <div className="flex flex-col items-center justify-center gap-2.5 shrink-0 w-44 lg:w-52">
                    {leftParticipants.map((p) => (
                      <div key={p.id} className="w-full flex flex-col items-center">
                        <div
                          className={`w-full ${leftParticipants.length > 1 ? 'h-24 lg:h-28' : 'h-32 lg:h-36'} rounded-xl overflow-hidden shadow-xl border-2`}
                          style={{ borderColor: p.color }}
                        >
                          <VideoTile
                            stream={p.stream}
                            isLocal={p.isLocal}
                            username={p.username}
                            isMicMuted={p.isMicMuted}
                            isCamMuted={p.isCamMuted}
                            color={p.color}
                            compact={true}
                            outgoingChallenge={p.isLocal ? outgoingInvite : null}
                            onCancelChallenge={p.isLocal ? handleCancelInvite : null}
                            incomingChallenge={!p.isLocal && incomingInvite?.fromId === p.id ? incomingInvite : null}
                            onAcceptChallenge={handleAcceptInvite}
                            onDeclineChallenge={handleDeclineInvite}
                          />
                        </div>
                        <span className="text-[11px] font-bold mt-1 truncate max-w-full" style={{ color: p.color }}>
                          {p.username} {p.isLocal && '(You)'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

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

                  {activeGameType === 'wordbomb' && (
                    <WordBombGameView
                      gameState={gameState}
                      onInput={(inputData) => handleGameInput(inputData)}
                      onRestart={handleRestartGame}
                      myId={socket?.id}
                      socket={socket}
                    />
                  )}
                </div>

                {/* DESKTOP ONLY: Right Flanking Cameras (1 or 2 players stacked vertically) */}
                {!isMobileView && (
                  <div className="flex flex-col items-center justify-center gap-2.5 shrink-0 w-44 lg:w-52">
                    {rightParticipants.map((p) => (
                      <div key={p.id} className="w-full flex flex-col items-center">
                        <div
                          className={`w-full ${rightParticipants.length > 1 ? 'h-24 lg:h-28' : 'h-32 lg:h-36'} rounded-xl overflow-hidden shadow-xl border-2`}
                          style={{ borderColor: p.color }}
                        >
                          <VideoTile
                            stream={p.stream}
                            isLocal={p.isLocal}
                            username={p.username}
                            isMicMuted={p.isMicMuted}
                            isCamMuted={p.isCamMuted}
                            color={p.color}
                            compact={true}
                            outgoingChallenge={p.isLocal ? outgoingInvite : null}
                            onCancelChallenge={p.isLocal ? handleCancelInvite : null}
                            incomingChallenge={!p.isLocal && incomingInvite?.fromId === p.id ? incomingInvite : null}
                            onAcceptChallenge={handleAcceptInvite}
                            onDeclineChallenge={handleDeclineInvite}
                          />
                        </div>
                        <span className="text-[11px] font-bold mt-1 truncate max-w-full" style={{ color: p.color }}>
                          {p.username} {p.isLocal && '(You)'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

              </div>

            </div>
          ) : (
            /* ======================================================== */
            /* REGULAR LOBBY VIEW (Full-Screen Video Grid) */
            /* ======================================================== */
            <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden">
              <div className="w-full min-h-0 flex-1 flex flex-col h-full">
                <VideoGrid
                  peers={peers}
                  myId={socket?.id}
                  localStream={localStream}
                  remoteStreams={remoteStreams}
                  isMicOn={isMicOn}
                  isCamOn={isCamOn}
                  myUsername={username}
                  incomingInvite={incomingInvite}
                  onAcceptInvite={handleAcceptInvite}
                  onDeclineInvite={handleDeclineInvite}
                  outgoingInvite={outgoingInvite}
                  onCancelInvite={handleCancelInvite}
                />
              </div>
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
        isChallengePending={!!incomingInvite || !!outgoingInvite}
      />

    </div>
  );
}
