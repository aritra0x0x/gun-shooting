export class RadarManager {
  constructor(minimapElement, player, maxRange = 50) {
    this.minimap = minimapElement;
    this.player = player;
    this.maxRange = maxRange;
    this.dots = new Map();

    // Setup radar canvas
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.minimap.clientWidth;
    this.canvas.height = this.minimap.clientHeight;
    this.ctx = this.canvas.getContext("2d");
    this.minimap.appendChild(this.canvas);

    // Setup sweep animation
    this.sweepAngle = 0;
    this.lastUpdate = performance.now();
  }

  update(enemies, playerRotation) {
    const now = performance.now();
    const center = { x: this.canvas.width / 2, y: this.canvas.height / 2 };

    // Clear canvas
    this.ctx.fillStyle = "rgba(0, 20, 0, 0.6)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw sweep
    this.sweepAngle = (this.sweepAngle + 0.03) % (Math.PI * 2);
    this.ctx.beginPath();
    this.ctx.moveTo(center.x, center.y);
    this.ctx.arc(
      center.x,
      center.y,
      this.canvas.width / 2,
      this.sweepAngle - 0.2,
      this.sweepAngle,
      false
    );
    this.ctx.fillStyle = "rgba(0, 255, 0, 0.1)";
    this.ctx.fill();

    // Draw grid
    this.ctx.strokeStyle = "rgba(0, 255, 0, 0.2)";
    this.ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const radius = (this.canvas.width / 2) * ((i + 1) / 3);
      this.ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    }
    this.ctx.stroke();

    // Draw enemies
    enemies.forEach((enemy) => {
      const dx = enemy.position.x - this.player.position.x;
      const dz = enemy.position.z - this.player.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance <= this.maxRange) {
        const angle = Math.atan2(dz, dx) - playerRotation;
        const x =
          center.x +
          Math.cos(angle) *
            (distance / this.maxRange) *
            (this.canvas.width / 2);
        const y =
          center.y +
          Math.sin(angle) *
            (distance / this.maxRange) *
            (this.canvas.height / 2);

        // Draw blip
        const alpha = Math.max(
          0,
          1 - (Math.abs(this.sweepAngle - angle) % (Math.PI * 2)) / 0.5
        );
        this.ctx.beginPath();
        this.ctx.arc(x, y, 3, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
        this.ctx.fill();
      }
    });
  }
}
