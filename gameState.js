export class GameStateManager {
  constructor() {
    this.isGameOver = false;
    this.isPaused = false;
    this.setupListeners();
  }

  setupListeners() {
    document.addEventListener("keydown", (e) => {
      if (e.code === "Enter" && this.isGameOver) {
        window.restartGame();
      }
      if (e.code === "Escape" && !this.isGameOver) {
        this.togglePause();
      }
    });
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      document.exitPointerLock();
      document.getElementById("pauseMenu").classList.remove("hidden");
    } else {
      window.resumeGame();
    }
  }

  gameOver() {
    this.isGameOver = true;
    this.isPaused = false;
    document.getElementById("gameOver").classList.remove("hidden");
    document.exitPointerLock();
  }

  restartGame() {
    this.isGameOver = false;
    this.isPaused = false;
    document.getElementById("gameOver").classList.add("hidden");
    document.getElementById("pauseMenu").classList.add("hidden");
    return {
      health: 100,
      ammo: 90,
    };
  }
}
