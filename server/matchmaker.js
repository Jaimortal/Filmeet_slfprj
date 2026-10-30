const crypto = require('crypto');
const sessionStore = require('./sessionStore');
const SnakeBattle = require('./games/SnakeBattle');
const ChessMatch = require('./games/ChessMatch');
const TetrisBattle = require('./games/TetrisBattle');

class Matchmaker {
  constructor(io) {
    this.io = io;
    this.pairQueue = [];
    this.squadQueue = [];
    this.activeRooms = new Map(); // roomId -> room details
    this.socketToRoom = new Map(); // socketId -> roomId
  }

  joinQueue(socket, mode = 'pair', username = 'Stranger') {
    // Leave any existing room or queue first
    this.leaveCurrent(socket);

    const userObj = {
      id: socket.id,
      username: username || `Stranger_${socket.id.slice(0, 4)}`,
      socket
    };

    if (mode === 'squad') {
      this.squadQueue.push(userObj);
      socket.emit('queue_status', { mode: 'squad', position: this.squadQueue.length, needed: 4 });
      this.checkSquadMatch();
    } else {
      this.pairQueue.push(userObj);
      socket.emit('queue_status', { mode: 'pair', position: this.pairQueue.length, needed: 2 });
      this.checkPairMatch();
    }
  }

  checkPairMatch() {
    while (this.pairQueue.length >= 2) {
      const p1 = this.pairQueue.shift();
      const p2 = this.pairQueue.shift();

      if (!p1.socket.connected || !p2.socket.connected) {
        if (p1.socket.connected) this.pairQueue.unshift(p1);
        if (p2.socket.connected) this.pairQueue.unshift(p2);
        continue;
      }

      this.createRoom('pair', [p1, p2]);
    }
  }

  checkSquadMatch() {
    while (this.squadQueue.length >= 4) {
      const squad = [];
      while (squad.length < 4 && this.squadQueue.length > 0) {
        const candidate = this.squadQueue.shift();
        if (candidate.socket.connected) {
          squad.push(candidate);
        }
      }

      if (squad.length === 4) {
        this.createRoom('squad', squad);
      } else {
        // Return valid members back to queue if not enough
        this.squadQueue.unshift(...squad);
        break;
      }
    }
  }

  createRoom(mode, members) {
    const roomId = `room_${crypto.randomUUID()}`;
    const players = members.map(m => ({ id: m.id, username: m.username }));

    const roomData = {
      roomId,
      mode,
      players,
      game: null,
      gameType: null,
      createdAt: Date.now()
    };

    this.activeRooms.set(roomId, roomData);

    // Ephemeral session JSON creation
    sessionStore.createSession(roomId, mode, players);

    members.forEach(member => {
      this.socketToRoom.set(member.id, roomId);
      member.socket.join(roomId);
    });

    // Notify all members with the complete peer list
    this.io.to(roomId).emit('room_matched', {
      roomId,
      mode,
      peers: players
    });

    console.log(`[Matchmaker] Room formed: ${roomId} (${mode}) with ${players.length} members`);
  }

  leaveCurrent(socket, reason = 'leave') {
    const socketId = socket.id;

    // 1. Remove from queues
    this.pairQueue = this.pairQueue.filter(p => p.id !== socketId);
    this.squadQueue = this.squadQueue.filter(p => p.id !== socketId);

    // 2. Remove from active room
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return;

    this.socketToRoom.delete(socketId);
    socket.leave(roomId);

    const room = this.activeRooms.get(roomId);
    if (!room) return;

    console.log(`[Matchmaker] User ${socketId} left room ${roomId} (reason: ${reason})`);

    // In 1v1 pair mode: If one person leaves/skips, room dissolves immediately & shreds session
    if (room.mode === 'pair') {
      if (room.game) {
        room.game.stop();
      }
      this.activeRooms.delete(roomId);
      sessionStore.destroySession(roomId, 'pair_disconnected_or_skipped');
      this.io.to(roomId).emit('peer_left', { socketId, roomClosed: true, reason });
      this.io.socketsLeave(roomId);
    } else {
      // Squad mode: Notify remaining players
      room.players = room.players.filter(p => p.id !== socketId);
      sessionStore.removeParticipant(roomId, socketId);

      if (room.players.length === 0) {
        if (room.game) room.game.stop();
        this.activeRooms.delete(roomId);
        sessionStore.destroySession(roomId, 'squad_empty');
      } else {
        this.io.to(roomId).emit('peer_left', {
          socketId,
          roomClosed: false,
          remainingPeers: room.players,
          reason
        });
      }
    }
  }

  skip(socket, mode = 'pair', username = 'Stranger') {
    this.leaveCurrent(socket, 'skipped');
    // Immediately re-enter queue for seamless skip
    this.joinQueue(socket, mode, username);
  }

  startGame(socket, gameType) {
    const roomId = this.socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = this.activeRooms.get(roomId);
    if (!room) return;

    if (room.game) {
      room.game.stop();
    }

    room.gameType = gameType;

    if (gameType === 'snake') {
      room.game = new SnakeBattle(roomId, room.players, this.io);
    } else if (gameType === 'chess') {
      room.game = new ChessMatch(roomId, room.players, this.io);
    } else if (gameType === 'tetris') {
      room.game = new TetrisBattle(roomId, room.players, this.io);
    }

    this.io.to(roomId).emit('game_started', {
      gameType,
      initialState: room.game.state
    });
  }

  handleGameInput(socket, input) {
    const roomId = this.socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = this.activeRooms.get(roomId);
    if (!room || !room.game) return;

    if (room.gameType === 'snake') {
      room.game.handleInput(socket.id, input.direction);
    } else if (room.gameType === 'chess') {
      room.game.handleMove(socket.id, input);
    } else if (room.gameType === 'tetris') {
      room.game.handleInput(socket.id, input.action !== undefined ? input.action : input);
    }
  }

  stopGame(socket) {
    const roomId = this.socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = this.activeRooms.get(roomId);
    if (room && room.game) {
      room.game.stop();
      room.game = null;
      room.gameType = null;
      this.io.to(roomId).emit('game_ended');
    }
  }
}

module.exports = Matchmaker;
