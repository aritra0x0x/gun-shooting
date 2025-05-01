export class GameStateManager {
  constructor() {
    this.isGameOver = false;
    this.setupListeners();
  }

  setupListeners() {
    document.addEventListener("keydown", (e) => {
      if (e.code === "Enter" && this.isGameOver) {
        window.restartGame();
      }
    });
  }

  gameOver() {
    this.isGameOver = true;
    document.getElementById("gameOver").classList.remove("hidden");
  }

  restartGame() {
    this.isGameOver = false;
    document.getElementById("gameOver").classList.add("hidden");
    return {
      health: 100,
      ammo: 90,
    };
  }
}
