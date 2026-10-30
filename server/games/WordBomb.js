const fs = require('fs');
const path = require('path');

// Load dictionary into a Set for O(1) lookups
let dictionarySet = null;
try {
  const dictPath = path.join(__dirname, 'wordList.json');
  const raw = fs.readFileSync(dictPath, 'utf8');
  dictionarySet = new Set(JSON.parse(raw));
} catch (err) {
  console.error('[WordBomb] Error loading wordList.json:', err);
  dictionarySet = new Set(['cat', 'dog', 'apple', 'water', 'house', 'banana', 'game', 'bomb']);
}

// Common syllable combinations
const CANDIDATE_SYLLABLES = [
  'AN', 'IN', 'ER', 'RE', 'ON', 'AT', 'EN', 'ED', 'IS', 'AR', 'TE', 'OR', 'IT', 'AL',
  'TI', 'ST', 'LE', 'ES', 'SE', 'RA', 'MA', 'BA', 'KA', 'PA', 'TA', 'SA', 'LA', 'DA',
  'GA', 'NA', 'YA', 'LI', 'SI', 'MI', 'KI', 'PI', 'LO', 'BO', 'KO', 'PO', 'TO',
  'SO', 'RO', 'NO', 'NG', 'ANG', 'ING', 'TER', 'PRO', 'CON', 'MAN', 'FOR', 'RES', 'PER',
  'VER', 'DIS', 'COM', 'CAR', 'CAT', 'DOG', 'RUN', 'SUN', 'PAN', 'BAL', 'WAL', 'KAL',
  'PAR', 'BAR', 'TAR', 'SAR', 'GAR', 'MAR', 'LAR', 'PIN', 'TIN', 'SIN', 'RIN', 'LIN',
  'BOT', 'POT', 'HOT', 'LOT', 'NOT', 'GOT', 'WAR', 'BAT', 'RAT', 'HAT', 'MAT', 'PAT',
  'AIR', 'SEA', 'RED', 'BIG', 'OUT', 'ALL', 'ONE', 'DAY', 'NEW', 'OLD', 'BOY',
  'GIRL', 'PLAY', 'GAME', 'LIFE', 'TIME', 'LOVE', 'NAME', 'WORD', 'BOOK', 'HAND', 'LOOK',
  'STAR', 'FIRE', 'TREE', 'BIRD', 'FISH', 'ROAD', 'RAIN', 'WIND', 'GOLD', 'FAST', 'COOL'
];

// Pre-filter syllables that have at least 8 matching words in dictionary
const VALID_SYLLABLES = CANDIDATE_SYLLABLES.filter(syl => {
  const s = syl.toLowerCase();
  let count = 0;
  for (const w of dictionarySet) {
    if (w.includes(s)) {
      count++;
      if (count >= 8) return true;
    }
  }
  return false;
});

const PLAYER_COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EC4899'];

class WordBomb {
  constructor(roomId, players, io) {
    this.roomId = roomId;
    this.playersList = players || [];
    this.io = io;
    this.timer = null;
    this.round = 0;

    this.state = {
      status: 'playing', // 'playing' | 'ended'
      prompt: this.pickRandomPrompt(),
      turnIndex: 0,
      currentTurnId: players[0] ? players[0].id : null,
      turnTimeRemaining: 10,
      maxTurnTime: 10,
      usedWords: [],
      lastEvent: null, // { type: 'valid_word' | 'boom', username, word, points, reason }
      players: {},
      winner: null
    };

    // Initialize players
    this.playersList.forEach((p, idx) => {
      this.state.players[p.id] = {
        id: p.id,
        username: p.username || `Player ${idx + 1}`,
        lives: 3,
        score: 0,
        alive: true,
        color: PLAYER_COLORS[idx % PLAYER_COLORS.length]
      };
    });

    this.start();
  }

  pickRandomPrompt() {
    const list = VALID_SYLLABLES.length > 0 ? VALID_SYLLABLES : ['AN', 'IN', 'ER', 'OR', 'MA', 'BA', 'TE'];
    const idx = Math.floor(Math.random() * list.length);
    return list[idx];
  }

  getTurnTime() {
    // Dynamic timer: starts at 10s, drops by 0.5s every 3 words down to 5s minimum
    return Math.max(5, Math.round(10 - Math.floor(this.round / 3) * 0.5));
  }

  start() {
    this.broadcastState();

    this.timer = setInterval(() => {
      if (this.state.status !== 'playing') {
        this.stop();
        return;
      }

      this.state.turnTimeRemaining -= 1;

      if (this.state.turnTimeRemaining <= 0) {
        this.handleExplosion();
      } else {
        this.broadcastState();
      }
    }, 1000);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  handleExplosion() {
    const activePlayer = this.state.players[this.state.currentTurnId];
    if (activePlayer && activePlayer.alive) {
      activePlayer.lives -= 1;

      this.state.lastEvent = {
        type: 'boom',
        username: activePlayer.username,
        word: null,
        reason: 'Time expired!'
      };

      if (activePlayer.lives <= 0) {
        activePlayer.alive = false;
      }
    }

    // Check surviving players
    const alivePlayers = Object.values(this.state.players).filter(p => p.alive);

    if (alivePlayers.length <= 1) {
      this.state.status = 'ended';
      this.state.winner = alivePlayers.length === 1 ? alivePlayers[0].username : 'Tie';
      this.broadcastState();
      this.stop();
      return;
    }

    // Next turn
    this.advanceTurn();
    this.state.prompt = this.pickRandomPrompt();
    const newTime = this.getTurnTime();
    this.state.turnTimeRemaining = newTime;
    this.state.maxTurnTime = newTime;
    this.broadcastState();
  }

  advanceTurn() {
    const playerIds = this.playersList.map(p => p.id);
    let attempts = 0;
    while (attempts < playerIds.length) {
      this.state.turnIndex = (this.state.turnIndex + 1) % playerIds.length;
      const nextId = playerIds[this.state.turnIndex];
      if (this.state.players[nextId] && this.state.players[nextId].alive) {
        this.state.currentTurnId = nextId;
        return;
      }
      attempts++;
    }
  }

  handleInput(socketId, wordInput) {
    if (this.state.status !== 'playing') return;
    if (socketId !== this.state.currentTurnId) return;

    const player = this.state.players[socketId];
    if (!player || !player.alive) return;

    const word = String(wordInput || '').trim().toLowerCase();
    const promptLower = this.state.prompt.toLowerCase();

    // 1. Length check
    if (word.length < 3) {
      this.sendFeedback(socketId, 'Word must be at least 3 letters long!');
      return;
    }

    // 2. Syllable prompt check
    if (!word.includes(promptLower)) {
      this.sendFeedback(socketId, `Word must contain "${this.state.prompt}"!`);
      return;
    }

    // 3. Duplicate check
    if (this.state.usedWords.includes(word)) {
      this.sendFeedback(socketId, `"${word.toUpperCase()}" was already used!`);
      return;
    }

    // 4. Dictionary check
    if (!dictionarySet.has(word)) {
      this.sendFeedback(socketId, `"${word.toUpperCase()}" is not in the dictionary!`);
      return;
    }

    // Valid Word Accepted!
    this.state.usedWords.push(word);
    const pts = 50 + (word.length * 5);
    player.score += pts;

    this.state.lastEvent = {
      type: 'valid_word',
      username: player.username,
      word: word.toUpperCase(),
      points: pts
    };

    this.round++;
    this.advanceTurn();
    this.state.prompt = this.pickRandomPrompt();
    const nextTime = this.getTurnTime();
    this.state.turnTimeRemaining = nextTime;
    this.state.maxTurnTime = nextTime;

    this.broadcastState();
  }

  sendFeedback(socketId, reason) {
    this.io.to(socketId).emit('wordbomb_feedback', { success: false, reason });
  }

  broadcastState() {
    this.io.to(this.roomId).emit('game_update', {
      type: 'wordbomb',
      state: this.state
    });
  }
}

module.exports = WordBomb;

