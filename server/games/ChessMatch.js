const { Chess } = require('chess.js');

class ChessMatch {
  constructor(roomId, players, io) {
    this.roomId = roomId;
    this.players = players; // Array of { id, username }
    this.io = io;
    this.chess = new Chess();

    // Assign white and black
    this.white = players[0] || { id: null, username: 'Player 1' };
    this.black = players[1] || { id: null, username: 'Player 2' };
    this.spectators = players.slice(2);

    this.state = {
      status: 'playing', // 'playing' | 'ended'
      white: this.white,
      black: this.black,
      spectators: this.spectators,
      fen: this.chess.fen(),
      turn: this.chess.turn(), // 'w' or 'b'
      inCheck: false,
      isCheckmate: false,
      isDraw: false,
      winner: null,
      history: []
    };

    this.broadcastState();
  }

  broadcastState() {
    this.state.fen = this.chess.fen();
    this.state.turn = this.chess.turn();
    this.state.inCheck = this.chess.inCheck();
    this.state.isCheckmate = this.chess.isCheckmate();
    this.state.isDraw = this.chess.isDraw();

    if (this.state.isCheckmate) {
      this.state.status = 'ended';
      this.state.winner = this.state.turn === 'w' ? this.black.username : this.white.username;
    } else if (this.state.isDraw) {
      this.state.status = 'ended';
      this.state.winner = 'Draw (Stalemate / Repetition)';
    }

    this.io.to(this.roomId).emit('game_update', {
      type: 'chess',
      state: this.state
    });
  }

  handleMove(socketId, moveData) {
    if (this.state.status !== 'playing') return;

    // Check turn permission
    const currentTurn = this.chess.turn();
    if (currentTurn === 'w' && socketId !== this.white.id) {
      return; // Not white's turn
    }
    if (currentTurn === 'b' && socketId !== this.black.id) {
      return; // Not black's turn
    }

    try {
      const result = this.chess.move({
        from: moveData.from,
        to: moveData.to,
        promotion: moveData.promotion || 'q'
      });

      if (result) {
        this.state.history.push({
          san: result.san,
          from: result.from,
          to: result.to,
          by: currentTurn === 'w' ? this.white.username : this.black.username
        });
        this.broadcastState();
      }
    } catch (err) {
      console.warn(`[ChessMatch] Invalid move attempted by ${socketId}:`, err.message);
    }
  }

  restart() {
    this.chess = new Chess();
    // Swap sides for rematch
    const temp = this.white;
    this.white = this.black;
    this.black = temp;

    this.state = {
      status: 'playing',
      white: this.white,
      black: this.black,
      spectators: this.spectators,
      fen: this.chess.fen(),
      turn: this.chess.turn(),
      inCheck: false,
      isCheckmate: false,
      isDraw: false,
      winner: null,
      history: []
    };
    this.broadcastState();
  }

  stop() {
    // No background timer to clean up for turn-based chess
  }
}

module.exports = ChessMatch;

