class Controls {
  constructor(game) {
    this.game = game;
    this.startButton = document.getElementById('start');
    this.stopButton = document.getElementById('stop');
    this.clearButton = document.getElementById('clear');
    this.drawButton = document.getElementById('draw');

    this.startButton.addEventListener('click', () => this.game.start());
    this.stopButton.addEventListener('click', () => this.game.stop());
    this.clearButton.addEventListener('click', () => this.game.clear());
    this.drawButton.addEventListener('click', () => this.game.toggleDrawingMode());
  }
}

class Cell {
  constructor(state) {
    this.state = state;
    this.cellHistory = [];
  }

  addHistory({ state, generation }) {
    this.cellHistory.unshift({
      state,
      generation,
    });
  }
}

class GameOfLife {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    this.context = this.canvas.getContext('2d');

    this.canvasSize = options.canvasSize || 800;
    this.gridSize = options.gridSize || 60;
    this.FPS = options.FPS || 3;

    this.generationCount = 0;
    this.liveCount = 0;

    this.isDrawing = false;

    this.generationElement = document.getElementById('generation-count');
    this.liveCountElement = document.getElementById('live-count');

    this.setupCanvas();

    this.cols = this.gridSize * 1.5;
    this.rows = this.gridSize;
    this.resolution = this.canvasSize / this.gridSize;

    this.board = this.initBoard();
    this.drawBoard();
  }

  setupCanvas() {
    this.canvas.width = this.canvasSize * 1.5;
    this.canvas.height = this.canvasSize;
  }

  toggleDrawingMode() {
    this.isDrawing = !this.isDrawing;

    if (this.isDrawing) {
      document.getElementById('draw').classList.add('enabled');
      this.canvas.style.cursor = 'crosshair';

      let isMouseDown = false;

      this.canvas.addEventListener('mousedown', (e) => {
        isMouseDown = true;
        if (this.intervalId) {
          clearInterval(this.intervalId);
          this.intervalId = null;
        }

        // Handle initial click
        const x = Math.floor(e.offsetX / this.resolution);
        const y = Math.floor(e.offsetY / this.resolution);

        // Only allow drawing on non-border cells
        if (x > 0 && x < this.cols - 1 && y > 0 && y < this.rows - 1) {
          this.board[x][y].state = 1;
          this.drawBoard();
        }
      });

      this.canvas.addEventListener('mouseup', () => {
        isMouseDown = false;
      });

      this.canvas.addEventListener('mouseleave', () => {
        isMouseDown = false;
      });

      this.canvas.addEventListener('mousemove', (e) => {
        if (!isMouseDown) return;

        const x = Math.floor(e.offsetX / this.resolution);
        const y = Math.floor(e.offsetY / this.resolution);

        // Only allow drawing on non-border cells
        if (x > 0 && x < this.cols - 1 && y > 0 && y < this.rows - 1) {
          if (!(this.board[x][y] instanceof Cell)) {
            this.board[x][y] = new Cell(1);
          } else {
            this.board[x][y].state = 1;
          }
          this.drawBoard();
        }
      });
    } else {
      document.getElementById('draw').classList.remove('enabled');
      this.canvas.style.cursor = 'default';
    }
  }

  initBoard() {
    const board = new Array(this.cols).fill(null).map(() => new Array(this.rows).fill(null).map(() => new Cell(0)));

    for (let i = 1; i < this.cols - 1; i++) {
      for (let j = 1; j < this.rows - 1; j++) {
        const cell = new Cell(0);
        cell.state = Math.floor(Math.random() * 2);
        cell.addHistory({
          state: cell.state,
          generation: this.generationCount,
        });
        board[i][j] = cell;
      }
    }

    for (let i = 0; i < this.cols; i++) {
      board[i][0] = new Cell(0);
      board[i][0].addHistory({ state: 0, generation: this.generationCount });

      board[i][this.rows - 1] = new Cell(0);
      board[i][this.rows - 1].addHistory({ state: 0, generation: this.generationCount });
    }
    for (let j = 0; j < this.rows; j++) {
      board[0][j] = new Cell(0);
      board[0][j].addHistory({ state: 0, generation: this.generationCount });

      board[this.cols - 1][j] = new Cell(0);
      board[this.cols - 1][j].addHistory({ state: 0, generation: this.generationCount });
    }

    return board;
  }

  clear() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.generationCount = 0;
    this.liveCount = 0;

    const board = new Array(this.cols).fill(null).map(() => new Array(this.rows).fill(null));

    for (let i = 0; i < this.cols; i++) {
      for (let j = 0; j < this.rows; j++) {
        const cell = new Cell(0);
        cell.addHistory({ state: 0, generation: this.generationCount });
        board[i][j] = cell;
      }
    }

    this.board = board;
    this.updateStats();
    this.drawBoard();
    this.stop();
  }

  drawBoard() {
    for (let i = 0; i < this.cols; i++) {
      for (let j = 0; j < this.rows; j++) {
        this.context.strokeRect(i * this.resolution, j * this.resolution, this.resolution, this.resolution);
        if (this.board?.[i]?.[j]?.state === 1) {
          this.context.fillRect(i * this.resolution, j * this.resolution, this.resolution, this.resolution);
        }
      }
    }
  }

  calculateNextGeneration() {
    const nextBoard = new Array(this.cols).fill(null).map(() => new Array(this.rows).fill(null));

    for (let i = 0; i < this.cols; i++) {
      nextBoard[i][0] = this.board[i][0];
      nextBoard[i][this.rows - 1] = this.board[i][this.rows - 1];
    }
    for (let j = 0; j < this.rows; j++) {
      nextBoard[0][j] = this.board[0][j];
      nextBoard[this.cols - 1][j] = this.board[this.cols - 1][j];
    }

    for (let i = 1; i < this.cols - 1; i++) {
      for (let j = 1; j < this.rows - 1; j++) {
        const cell = this.board[i][j];
        const neighbors = this.countNeighbors(i, j);

        let newState = cell.state;
        if (cell.state === 0 && neighbors === 3) {
          newState = 1;
        } else if (cell.state === 1 && (neighbors < 2 || neighbors > 3)) {
          newState = 0;
        }

        cell.addHistory({
          state: cell.state,
          generation: this.generationCount,
        });

        cell.state = newState;
        nextBoard[i][j] = cell;
      }
    }

    this.board = nextBoard;
    console.table(this.board);
  }

  countNeighbors(x, y) {
    let sum = 0;
    for (let i = -1; i < 2; i++) {
      for (let j = -1; j < 2; j++) {
        const col = (x + i + this.cols) % this.cols;
        const row = (y + j + this.rows) % this.rows;
        sum += this.board?.[col]?.[row]?.state || 0;
      }
    }
    return sum - this.board[x][y].state;
  }

  update() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.calculateNextGeneration();
    this.drawBoard();

    this.generationCount += 1;
    this.liveCount = 0;

    for (let i = 0; i < this.cols; i++) {
      for (let j = 0; j < this.rows; j++) {
        if (this.board[i][j].state === 1) {
          this.liveCount += 1;
        }
      }
    }

    this.updateStats();
  }

  updateStats() {
    this.generationElement.textContent = this.generationCount;
    this.liveCountElement.textContent = this.liveCount;
  }

  start() {
    if (this.intervalId) {
      return;
    }
    this.updateStats();

    this.update();
    this.intervalId = setInterval(() => this.update(), 1000 / this.FPS);
  }

  stop() {
    if (!this.intervalId) {
      return;
    }
    clearInterval(this.intervalId);
    this.intervalId = null;
  }
}

const game = new GameOfLife('canvas', {
  canvasSize: 700,
  gridSize: 10,
  FPS: 2,
});

const controls = new Controls(game);
