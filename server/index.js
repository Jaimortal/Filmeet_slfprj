const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const Matchmaker = require('./matchmaker');
const sessionStore = require('./sessionStore');

const app = express();
const server = http.createServer(app);

// Allow any origin for smooth ngrok and mobile local testing
app.use(cors({ origin: '*' }));
app.use(express.json());

// Serve client build if available
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDistPath));

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const matchmaker = new Matchmaker(io);

// API route to check server health
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    pairQueue: matchmaker.pairQueue.length,
    squadQueue: matchmaker.squadQueue.length,
    activeRooms: matchmaker.activeRooms.size,
    timestamp: new Date().toISOString()
  });
});

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // 1. Queue Management
  socket.on('join_queue', ({ mode, username }) => {
    matchmaker.joinQueue(socket, mode, username);
  });

  socket.on('leave_queue', () => {
    matchmaker.leaveCurrent(socket, 'user_left_queue');
  });

  socket.on('skip', ({ mode, username }) => {
    matchmaker.skip(socket, mode, username);
  });

  // 2. Ephemeral Chat
  socket.on('send_message', ({ text, senderName }) => {
    const roomId = matchmaker.socketToRoom.get(socket.id);
    if (!roomId) return;

    const message = sessionStore.addMessage(roomId, {
      senderId: socket.id,
      senderName: senderName || 'Stranger',
      text
    });

    if (message) {
      io.to(roomId).emit('new_message', message);
    }
  });

  // 3. WebRTC Signaling (Full Mesh)
  socket.on('signal', ({ targetId, signalData }) => {
    // Relay SDP offer/answer/ICE candidate to the targeted peer
    io.to(targetId).emit('signal', {
      senderId: socket.id,
      signalData
    });
  });

  // 4. In-room Games & Challenges
  socket.on('request_game', ({ gameType, senderName }) => {
    const roomId = matchmaker.socketToRoom.get(socket.id);
    if (!roomId) return;
    socket.to(roomId).emit('game_invite_received', {
      fromId: socket.id,
      fromName: senderName || 'Stranger',
      gameType
    });
  });

  socket.on('accept_game_invite', ({ gameType }) => {
    matchmaker.startGame(socket, gameType);
  });

  socket.on('decline_game_invite', ({ fromId, byName }) => {
    if (fromId) {
      io.to(fromId).emit('game_invite_declined', { byName: byName || 'Opponent' });
    }
  });

  socket.on('cancel_game_invite', () => {
    const roomId = matchmaker.socketToRoom.get(socket.id);
    if (!roomId) return;
    socket.to(roomId).emit('game_invite_cancelled');
  });

  socket.on('start_game', ({ gameType }) => {
    matchmaker.startGame(socket, gameType);
  });

  socket.on('game_input', (input) => {
    matchmaker.handleGameInput(socket, input);
  });

  socket.on('stop_game', () => {
    matchmaker.stopGame(socket);
  });

  // 5. Disconnect
  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
    matchmaker.leaveCurrent(socket, 'disconnected');
  });
});

// Fallback to index.html for SPA client
app.use((req, res) => {
  const indexPath = path.join(clientDistPath, 'index.html');
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('Server is running. Client is compiling or running in Vite dev mode.');
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 OmegaSphere server running on http://0.0.0.0:${PORT}`);
});
