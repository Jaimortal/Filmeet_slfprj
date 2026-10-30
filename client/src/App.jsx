import React, { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import { useWebRTC } from './hooks/useWebRTC';
import LobbySelection from './components/LobbySelection';
import VideoGrid from './components/VideoGrid';
import VideoTile from './components/VideoTile';
import ChatBox from './components/ChatBox';
import Controls from './components/Controls';
import GameSelectorModal from './components/GameSelectorModal';
import SnakeGameView from './components/games/SnakeGameView';
import ChessGameView from './components/games/ChessGameView';
import TetrisGameView from './components/games/TetrisGameView';
import { Flame, Users, X, Gamepad2, Check, Clock } from 'lucide-react';

export default function App() {
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
  const [activeGameType, setActiveGameType] = useState(null); // 'snake' | 'chess' | 'tetris'
  const [gameState, setGameState] = useState(null);
  const [systemAlert, setSystemAlert] = useState(null);

  // Game Challenge / Invite States (Top-Right Confirmation)
  const [incomingInvite, setIncomingInvite] = useState(null); // { fromId, fromName, gameType }
  const [outgoingInvite, setOutgoingInvite] = useState(null); // { gameType }

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

  // Player clicks a game in the hub
  const handleSelectGame = (gameId) => {
    if (roomMode === 'pair') {
      // 2-Player mode: Send challenge to opponent (Anti-spam)
      setOutgoingInvite({ gameType: gameId });
      if (socket) {
        socket.emit('request_game', { gameType: gameId, senderName: username });
      }
    } else {
      // Squad mode: Start immediately
      setActiveGameType(gameId);
      setGameState(null);
      if (socket) {
        socket.emit('start_game', { gameType: gameId });
      }
      setIsGameOpen(true);
    }
  };

  // Accept incoming challenge
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

  // Decline incoming challenge
  const handleDeclineInvite = () => {
    if (!incomingInvite) return;
    if (socket) {
      socket.emit('decline_game_invite', { fromId: incomingInvite.fromId, byName: username });
    }
    setIncomingInvite(null);
  };

  // Cancel outgoing challenge
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
      />
    );
  }

  // Identify opponent for 1v1
  const opponentPeer = peers.find((p) => p.id !== socket?.id);
  const opponentStream = opponentPeer ? remoteStreams[opponentPeer.id] : null;

  return (
    <div className="h-screen w-screen bg-dark-950 text-white flex flex-col overflow-hidden select-none">
      
      {/* Top Bar */}
      <header className="h-12 sm:h-14 px-3 sm:px-4 bg-dark-900 border-b border-dark-700/80 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <h2 className="text-base sm:text-lg font-black tracking-wider text-white">
            OMEGA<span className="text-indigo-400">SPHERE</span>
          </h2>
          <span className="px-2 sm:px-2.5 py-0.5 rounded-full bg-dark-800 border border-dark-600 text-[11px] sm:text-xs text-gray-300 font-semibold flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            {roomMode === 'squad' ? 'Squad (4-Way)' : '1v1 Pair'}
          </span>
        </div>

        {/* Top Right: Game Challenge & Shredder Notification */}
        <div className="flex items-center gap-2">
          {/* Incoming Game Challenge Confirm Widget (Top Right, Small) */}
          {incomingInvite && (
            <div className="flex items-center gap-1.5 bg-indigo-950/90 border border-indigo-500/80 rounded-xl px-2.5 py-1 shadow-lg shadow-indigo-500/20 animate-fade-in text-xs">
              <Gamepad2 className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="text-gray-200 text-[11px] hidden xs:inline">
                <strong className="text-white">{incomingInvite.fromName}</strong>: <span className="capitalize text-indigo-300 font-bold">{incomingInvite.gameType}</span>
              </span>
              <button
                onClick={handleAcceptInvite}
                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px] sm:text-[11px] shadow transition cursor-pointer flex items-center gap-0.5"
              >
                <Check className="w-3 h-3" /> Confirm
              </button>
              <button
                onClick={handleDeclineInvite}
                className="p-1 hover:bg-dark-800 text-gray-400 hover:text-white rounded-lg transition cursor-pointer"
                title="Decline"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Outgoing Challenge Waiting Pill */}
          {outgoingInvite && (
            <div className="flex items-center gap-1.5 bg-dark-800/90 border border-dark-600 rounded-xl px-2.5 py-1 shadow-lg animate-fade-in text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span className="text-gray-300 text-[11px]">
                Waiting... <span className="capitalize text-amber-300 font-bold">{outgoingInvite.gameType}</span>
              </span>
              <button
                onClick={handleCancelInvite}
                className="px-1.5 py-0.5 bg-dark-700 hover:bg-dark-600 text-gray-400 hover:text-white rounded text-[10px] transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Ephemeral Indicator */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-red-950/40 border border-red-500/30 rounded-full text-red-300 text-xs font-semibold">
            <Flame className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
            Zero-Trace Mode
          </div>
        </div>
      </header>

      {/* Floating System Ephemeral Toast */}
      {systemAlert && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 border border-red-500/50 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-2xl backdrop-blur-md animate-fade-in flex items-center gap-2">
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
          {/* CASE 1: 2-PLAYER IN-GAME (Camera Left + Game + Camera Right on Desktop; Cameras Top on Mobile) */}
          {/* ======================================================== */}
          {inRoom && roomMode === 'pair' && isGameOpen ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              
              {/* MOBILE ONLY: Top Bar with both cameras side-by-side */}
              <div className="md:hidden grid grid-cols-2 gap-2 p-2 h-24 shrink-0 bg-dark-900/90 border-b border-dark-800">
                <div className="h-full rounded-xl overflow-hidden shadow">
                  <VideoTile
                    stream={localStream}
                    isLocal={true}
                    username={username}
                    isMicMuted={!isMicOn}
                    isCamMuted={!isCamOn}
                    color="#6366F1"
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
              <div className="px-4 py-1.5 bg-dark-900 border-b border-dark-800 flex items-center justify-between shrink-0">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Gamepad2 className="w-4 h-4" />
                  {activeGameType === 'chess' && 'Live Chess Showdown'}
                  {activeGameType === 'snake' && 'Multiplayer Snake'}
                  {activeGameType === 'tetris' && 'Tetris Battle'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsGameSelectorOpen(true)}
                    className="px-2 py-0.5 bg-dark-800 hover:bg-dark-700 border border-dark-600 rounded-lg text-xs font-semibold text-gray-300 transition cursor-pointer"
                  >
                    Switch Game
                  </button>
                  <button
                    onClick={() => setIsGameOpen(false)}
                    className="p-1 bg-dark-800 hover:bg-dark-700 border border-dark-600 rounded-lg text-gray-400 hover:text-white transition cursor-pointer"
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
                  <div className="w-full h-32 lg:h-36 rounded-xl overflow-hidden shadow-2xl border-2 border-indigo-500">
                    <VideoTile
                      stream={localStream}
                      isLocal={true}
                      username={username}
                      isMicMuted={!isMicOn}
                      isCamMuted={!isCamOn}
                      color="#6366F1"
                      compact={true}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-indigo-400 mt-1.5">Player 1 (You)</span>
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
                  <div className="w-full h-32 lg:h-36 rounded-xl overflow-hidden shadow-2xl border-2 border-emerald-500">
                    <VideoTile
                      stream={opponentStream}
                      isLocal={false}
                      username={opponentPeer?.username || 'Opponent'}
                      color="#10B981"
                      compact={true}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-emerald-400 mt-1.5">
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
              {/* Video Grid */}
              <div
                className={`transition-all duration-300 w-full shrink-0 ${
                  isGameOpen
                    ? 'h-28 sm:h-36 border-b border-dark-800 bg-dark-950/90'
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

              {/* Squad Mode In-Game Arena */}
              {isGameOpen && (
                <div className="flex-1 flex flex-col min-h-0 bg-dark-950/95 overflow-y-auto">
                  <div className="px-4 py-1.5 bg-dark-900 border-b border-dark-800 flex items-center justify-between shrink-0">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <Gamepad2 className="w-4 h-4" /> Squad Game
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsGameSelectorOpen(true)}
                        className="px-2.5 py-1 bg-dark-800 hover:bg-dark-700 border border-dark-600 rounded-lg text-xs font-semibold text-gray-300 transition cursor-pointer"
                      >
                        Switch Game
                      </button>
                      <button
                        onClick={() => setIsGameOpen(false)}
                        className="p-1.5 bg-dark-800 hover:bg-dark-700 border border-dark-600 rounded-lg text-gray-400 hover:text-white transition cursor-pointer"
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

        {/* Desktop Chat Side Panel (Always visible on md+, toggled on mobile) */}
        <div
          className={`w-80 lg:w-96 h-full absolute md:relative right-0 top-0 z-40 transition-transform duration-300 ${
            isChatOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
          }`}
        >
          <ChatBox
            messages={messages}
            onSendMessage={handleSendMessage}
            myId={socket?.id}
          />
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
