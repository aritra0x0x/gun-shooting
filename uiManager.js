export class UIManager {
  constructor() {
    this.notificationElement = document.getElementById("notification");
    this.gameContainer = document.getElementById("game-container");
  }

  showNotification(message) {
    this.notificationElement.textContent = message;
    this.notificationElement.classList.remove("show");
    // Force reflow
    void this.notificationElement.offsetWidth;
    this.notificationElement.classList.add("show");

    // Remove show class after animation completes
    setTimeout(() => {
      this.notificationElement.classList.remove("show");
    }, 3000);
  }

  createPickupEffect(position, camera) {
    // Convert 3D position to screen coordinates
    const screenPosition = position.clone();
    screenPosition.project(camera);

    const x = (screenPosition.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-screenPosition.y * 0.5 + 0.5) * window.innerHeight;

    const effect = document.createElement("div");
    effect.className = "pickup-effect";
    effect.style.left = x + "px";
    effect.style.top = y + "px";

    this.gameContainer.appendChild(effect);

    // Remove effect after animation
    setTimeout(() => {
      effect.remove();
    }, 500);
  }
}
