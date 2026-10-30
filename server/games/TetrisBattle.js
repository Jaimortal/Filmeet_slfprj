const SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  Z: [[1, 0, 0], [0, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]]
};

const PIECE_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
const PIECE_COLORS = {
  I: '#06B6D4', // cyan
  O: '#FBBF24', // yellow
  T: '#A855F7', // purple
  S: '#10B981', // green
  Z: '#EF4444', // red
  J: '#3B82F6', // blue
  L: '#F97316'  // orange
};

class TetrisBattle {
  constructor(roomId, players, io, options = {}) {
    this.roomId = roomId;
    this.players = players; // Array of { id, username }
    this.io = io;
    this.width = 10;
    this.height = 20;
    this.tickInterval = null;
    this.tickRate = 600;

    // Target score: 500, 1000, 2500, or 0 (Survival)
    this.targetScore = options.targetScore || 1000;
    this.votingActive = options.skipVote ? false : true;
    this.votes = {}; // socketId -> score

    this.state = {
      status: this.votingActive ? 'voting' : 'playing', // 'voting' | 'playing' | 'ended'
      targetScore: this.targetScore,
      votes: this.votes,
      players: {},
      winner: null
    };

    this.initPlayers();
    if (!this.votingActive) {
      this.start();
    } else {
      this.broadcastState();
    }
  }

  initPlayers() {
    this.state.players = {};
    this.players.forEach((p) => {
      this.state.players[p.id] = {
        id: p.id,
        username: p.username || 'Player',
        board: Array.from({ length: this.height }, () => Array(this.width).fill(0)),
        currentPiece: this.randomPiece(),
        score: 0,
        lines: 0,
        alive: true
      };
    });
  }

  handleVote(socketId, scoreOption) {
    if (this.state.status !== 'voting') return;
    this.votes[socketId] = scoreOption;
    this.state.votes = { ...this.votes };

    // Check if all players have voted
    const votedCount = Object.keys(this.votes).length;
    if (votedCount >= this.players.length || (this.players.length > 2 && votedCount >= 2)) {
      // Find most popular vote or use average
      const scoreValues = Object.values(this.votes);
      // Pick highest or consensus
      this.targetScore = scoreValues[0];
      this.state.targetScore = this.targetScore;
      this.state.status = 'playing';
      this.start();
    } else {
      this.broadcastState();
    }
  }

  randomPiece() {
    const type = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
    const shape = SHAPES[type];
    return {
      type,
      shape: shape.map(row => [...row]),
      color: PIECE_COLORS[type],
      x: Math.floor((this.width - shape[0].length) / 2),
      y: 0
    };
  }

  start() {
    if (this.tickInterval) clearInterval(this.tickInterval);
    this.state.status = 'playing';
    this.broadcastState();

    this.tickInterval = setInterval(() => {
      this.update();
    }, this.tickRate);
  }

  collides(board, piece, offsetX = 0, offsetY = 0) {
    if (!piece || !piece.shape) return false;
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c]) {
          const newX = piece.x + c + offsetX;
          const newY = piece.y + r + offsetY;

          if (newX < 0 || newX >= this.width || newY >= this.height) {
            return true;
          }
          if (newY >= 0 && board[newY] && board[newY][newX]) {
            return true;
          }
        }
      }
    }
    return false;
  }

  mergePiece(player) {
    const { board, currentPiece } = player;
    if (!currentPiece) return;

    for (let r = 0; r < currentPiece.shape.length; r++) {
      for (let c = 0; c < currentPiece.shape[r].length; c++) {
        if (currentPiece.shape[r][c]) {
          const y = currentPiece.y + r;
          const x = currentPiece.x + c;
          if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
            board[y][x] = currentPiece.color;
          }
        }
      }
    }

    // Check completed lines
    let linesCleared = 0;
    for (let r = this.height - 1; r >= 0; r--) {
      if (board[r] && board[r].every(cell => cell !== 0)) {
        board.splice(r, 1);
        board.unshift(Array(this.width).fill(0));
        linesCleared++;
        r++; // check same index
      }
    }

    if (linesCleared > 0) {
      player.lines += linesCleared;
      player.score += [0, 100, 300, 500, 800][linesCleared] || linesCleared * 200;

      // Check win by target score
      if (this.targetScore > 0 && player.score >= this.targetScore) {
        this.endGame(`${player.username} reached ${this.targetScore} pts!`);
        return;
      }

      // Send garbage lines to living opponents
      if (linesCleared >= 2) {
        const garbageCount = linesCleared === 4 ? 4 : linesCleared - 1;
        this.sendGarbage(player.id, garbageCount);
      }
    }

    // Spawn new piece
    const nextPiece = this.randomPiece();
    if (this.collides(board, nextPiece)) {
      player.alive = false; // Topped out
      player.currentPiece = null;
    } else {
      player.currentPiece = nextPiece;
    }
  }

  sendGarbage(attackerId, count) {
    Object.values(this.state.players).forEach(p => {
      if (p.id !== attackerId && p.alive) {
        for (let i = 0; i < count; i++) {
          p.board.shift();
          const hole = Math.floor(Math.random() * this.width);
          const garbageRow = Array(this.width).fill('#64748B');
          garbageRow[hole] = 0;
          p.board.push(garbageRow);
        }
        if (p.currentPiece && this.collides(p.board, p.currentPiece)) {
          p.alive = false;
          p.currentPiece = null;
        }
      }
    });
  }

  rotatePiece(shape) {
    const rows = shape.length;
    const cols = shape[0].length;
    const rotated = Array.from({ length: cols }, () => Array(rows).fill(0));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        rotated[c][rows - 1 - r] = shape[r][c];
      }
    }
    return rotated;
  }

  handleInput(socketId, action) {
    if (this.state.status === 'voting') {
      if (action && action.vote !== undefined) {
        this.handleVote(socketId, action.vote);
      }
      return;
    }

    if (this.state.status !== 'playing') return;
    const player = this.state.players[socketId];
    if (!player || !player.alive || !player.currentPiece) return;

    const piece = player.currentPiece;

    if (action === 'LEFT') {
      if (!this.collides(player.board, piece, -1, 0)) piece.x -= 1;
    } else if (action === 'RIGHT') {
      if (!this.collides(player.board, piece, 1, 0)) piece.x += 1;
    } else if (action === 'DOWN') {
      if (!this.collides(player.board, piece, 0, 1)) {
        piece.y += 1;
      } else {
        this.mergePiece(player);
      }
    } else if (action === 'ROTATE') {
      const rotated = this.rotatePiece(piece.shape);
      const prevShape = piece.shape;
      piece.shape = rotated;
      if (this.collides(player.board, piece)) {
        if (!this.collides(player.board, piece, -1, 0)) piece.x -= 1;
        else if (!this.collides(player.board, piece, 1, 0)) piece.x += 1;
        else piece.shape = prevShape; // Revert
      }
    } else if (action === 'DROP') {
      while (!this.collides(player.board, piece, 0, 1)) {
        piece.y += 1;
      }
      this.mergePiece(player);
    }

    this.broadcastState();
  }

  endGame(winnerName) {
    this.state.status = 'ended';
    this.state.winner = winnerName;
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.broadcastState();
  }

  update() {
    if (this.state.status !== 'playing') return;

    let livingPlayers = [];

    Object.values(this.state.players).forEach(player => {
      if (!player.alive) return;

      // Check target score win
      if (this.targetScore > 0 && player.score >= this.targetScore) {
        this.endGame(`${player.username} reached ${this.targetScore} pts!`);
        return;
      }

      if (!player.currentPiece) return;

      if (!this.collides(player.board, player.currentPiece, 0, 1)) {
        player.currentPiece.y += 1;
      } else {
        this.mergePiece(player);
      }

      if (player.alive) livingPlayers.push(player);
    });

    if (this.state.status === 'ended') return;

    if (this.players.length > 1 && livingPlayers.length <= 1) {
      const winner = livingPlayers.length === 1 ? livingPlayers[0].username : 'Nobody (Tie)';
      this.endGame(winner);
    } else if (this.players.length === 1 && livingPlayers.length === 0) {
      this.endGame('Game Over');
    } else {
      this.broadcastState();
    }
  }

  restart() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.votes = {};
    this.state.votes = {};
    this.state.status = 'voting';
    this.state.winner = null;
    this.initPlayers();
    this.broadcastState();
  }

  broadcastState() {
    this.io.to(this.roomId).emit('game_update', {
      type: 'tetris',
      state: this.state
    });
  }

  stop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }
}

module.exports = TetrisBattle;
