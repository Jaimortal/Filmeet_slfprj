class SnakeBattle {
  constructor(roomId, players, io) {
    this.roomId = roomId;
    this.players = players; // Array of { id, username }
    this.io = io;
    this.gridSize = 28;
    this.tickInterval = null;
    this.tickRate = 130; // ms per tick

    this.colors = ['#10B981', '#3B82F6', '#F59E0B', '#EC4899'];
    this.spawnPositions = [
      { x: 3, y: 3, dir: 'RIGHT' },
      { x: 24, y: 24, dir: 'LEFT' },
      { x: 24, y: 3, dir: 'DOWN' },
      { x: 3, y: 24, dir: 'UP' }
    ];

    this.state = {
      status: 'playing', // 'playing' | 'ended'
      snakes: {},
      foods: [],
      winner: null
    };

    this.init();
  }

  init() {
    this.players.forEach((p, index) => {
      const spawn = this.spawnPositions[index % this.spawnPositions.length];
      const body = [];
      // Initial 3 segments
      for (let i = 0; i < 3; i++) {
        if (spawn.dir === 'RIGHT') body.push({ x: spawn.x - i, y: spawn.y });
        else if (spawn.dir === 'LEFT') body.push({ x: spawn.x + i, y: spawn.y });
        else if (spawn.dir === 'DOWN') body.push({ x: spawn.x, y: spawn.y - i });
        else if (spawn.dir === 'UP') body.push({ x: spawn.x, y: spawn.y + i });
      }

      this.state.snakes[p.id] = {
        id: p.id,
        username: p.username || `Player ${index + 1}`,
        color: this.colors[index % this.colors.length],
        body,
        direction: spawn.dir,
        nextDirection: spawn.dir,
        alive: true,
        score: 0
      };
    });

    // Spawn 3 initial foods
    for (let i = 0; i < 3; i++) {
      this.spawnFood();
    }

    this.start();
  }

  spawnFood() {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 100) {
      attempts++;
      const x = Math.floor(Math.random() * (this.gridSize - 2)) + 1;
      const y = Math.floor(Math.random() * (this.gridSize - 2)) + 1;

      // Check collision with snakes
      let occupied = false;
      for (const snakeId in this.state.snakes) {
        const snake = this.state.snakes[snakeId];
        if (snake.body.some(seg => seg.x === x && seg.y === y)) {
          occupied = true;
          break;
        }
      }
      if (!occupied && !this.state.foods.some(f => f.x === x && f.y === y)) {
        this.state.foods.push({ x, y });
        placed = true;
      }
    }
  }

  handleInput(socketId, newDir) {
    const snake = this.state.snakes[socketId];
    if (!snake || !snake.alive) return;

    const opposites = {
      UP: 'DOWN',
      DOWN: 'UP',
      LEFT: 'RIGHT',
      RIGHT: 'LEFT'
    };

    if (opposites[newDir] !== snake.direction) {
      snake.nextDirection = newDir;
    }
  }

  start() {
    this.tickInterval = setInterval(() => {
      this.update();
    }, this.tickRate);
  }

  update() {
    if (this.state.status !== 'playing') return;

    let aliveCount = 0;
    const livingSnakes = [];

    // 1. Move snakes
    for (const snakeId in this.state.snakes) {
      const snake = this.state.snakes[snakeId];
      if (!snake.alive) continue;

      snake.direction = snake.nextDirection;
      const head = { ...snake.body[0] };

      if (snake.direction === 'UP') head.y -= 1;
      else if (snake.direction === 'DOWN') head.y += 1;
      else if (snake.direction === 'LEFT') head.x -= 1;
      else if (snake.direction === 'RIGHT') head.x += 1;

      // Check wall collision
      if (head.x < 0 || head.x >= this.gridSize || head.y < 0 || head.y >= this.gridSize) {
        snake.alive = false;
        continue;
      }

      // Check food collision
      const foodIndex = this.state.foods.findIndex(f => f.x === head.x && f.y === head.y);
      if (foodIndex !== -1) {
        this.state.foods.splice(foodIndex, 1);
        snake.score += 10;
        this.spawnFood();
      } else {
        snake.body.pop(); // Remove tail if no food eaten
      }

      snake.body.unshift(head);
      aliveCount++;
      livingSnakes.push(snake);
    }

    // 2. Check collision with self & other snakes
    for (const snake of livingSnakes) {
      if (!snake.alive) continue;
      const head = snake.body[0];

      // Check self collision (starting from segment 1)
      for (let i = 1; i < snake.body.length; i++) {
        if (head.x === snake.body[i].x && head.y === snake.body[i].y) {
          snake.alive = false;
          break;
        }
      }

      if (!snake.alive) continue;

      // Check other snakes collision
      for (const otherId in this.state.snakes) {
        const other = this.state.snakes[otherId];
        // If colliding with other snake's body
        for (let j = 0; j < other.body.length; j++) {
          if (other.id === snake.id && j === 0) continue; // Skip own head
          if (head.x === other.body[j].x && head.y === other.body[j].y) {
            snake.alive = false;
            break;
          }
        }
        if (!snake.alive) break;
      }
    }

    // Recount alive
    const remaining = Object.values(this.state.snakes).filter(s => s.alive);
    if (this.players.length > 1 && remaining.length <= 1) {
      this.state.status = 'ended';
      this.state.winner = remaining.length === 1 ? remaining[0].username : 'Nobody (Tie)';
      clearInterval(this.tickInterval);
    } else if (this.players.length === 1 && remaining.length === 0) {
      this.state.status = 'ended';
      this.state.winner = 'Game Over';
      clearInterval(this.tickInterval);
    }

    this.io.to(this.roomId).emit('game_update', {
      type: 'snake',
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

module.exports = SnakeBattle;
