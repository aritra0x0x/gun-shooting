import * as THREE from "https://unpkg.com/three@0.132.2/build/three.module.js";

export class EnemyManager {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.enemies = [];
    this.enemyGeometry = new THREE.BoxGeometry(1, 2, 1);
    this.enemyMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    this.enemySpeed = 0.05;
    this.spawnInterval = 5000;
    this.lastSpawn = 0;
  }

  createEnemy(playerPosition) {
    const enemy = new THREE.Mesh(this.enemyGeometry, this.enemyMaterial);
    const angle = Math.random() * Math.PI * 2;
    const distance = 30;
    enemy.position.x = playerPosition.x + Math.cos(angle) * distance;
    enemy.position.z = playerPosition.z + Math.sin(angle) * distance;
    enemy.position.y = 1;
    enemy.health = 100;
    enemy.hasDamaged = false; // Initialize damage flag

    // Create health bar
    const healthBar = document.createElement("div");
    healthBar.className = "enemy-healthbar";
    const healthFill = document.createElement("div");
    healthFill.className = "enemy-health-fill";
    healthBar.appendChild(healthFill);
    document.body.appendChild(healthBar);

    enemy.healthBar = healthBar;
    enemy.maxHealth = 100;
    enemy.currentHealth = enemy.maxHealth;

    this.scene.add(enemy);
    this.enemies.push(enemy);
    return enemy;
  }

  updateHealthBars() {
    this.enemies.forEach((enemy) => {
      if (enemy.healthBar) {
        // Convert 3D position to screen coordinates
        const screenPosition = enemy.position.clone();
        screenPosition.y += 2.5; // Increased height above enemy
        screenPosition.project(this.camera);

        // Calculate screen coordinates
        const x = (screenPosition.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-screenPosition.y * 0.5 + 0.5) * window.innerHeight;

        // Position health bar
        enemy.healthBar.style.left = x + "px";
        enemy.healthBar.style.top = y + "px";

        // Update health bar fill
        const healthFill = enemy.healthBar.querySelector(".enemy-health-fill");
        if (healthFill) {
          healthFill.style.width =
            (enemy.currentHealth / enemy.maxHealth) * 100 + "%";
        }
      }
    });
  }

  update(playerPosition, bullets, onPlayerHit) {
    const now = performance.now();
    if (now - this.lastSpawn > this.spawnInterval) {
      this.createEnemy(playerPosition);
      this.lastSpawn = now;
    }

    this.enemies.forEach((enemy, index) => {
      // Move towards player
      const direction = new THREE.Vector3()
        .subVectors(playerPosition, enemy.position)
        .normalize();
      enemy.position.add(direction.multiplyScalar(this.enemySpeed));
      enemy.lookAt(playerPosition);

      // Check bullet hits
      for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        const bulletBox = new THREE.Box3().setFromObject(bullet);
        const enemyBox = new THREE.Box3().setFromObject(enemy);

        if (bulletBox.intersectsBox(enemyBox)) {
          enemy.currentHealth -= 25;
          this.scene.remove(bullet);
          bullets.splice(i, 1);

          if (enemy.currentHealth <= 0) {
            if (enemy.healthBar) {
              enemy.healthBar.remove();
            }
            this.scene.remove(enemy);
            this.enemies.splice(index, 1);
            break;
          }
        }
      }

      // Check player collision
      const enemyBox = new THREE.Box3().setFromObject(enemy);
      const playerBox = new THREE.Box3(
        new THREE.Vector3(
          playerPosition.x - 0.5,
          playerPosition.y - 2,
          playerPosition.z - 0.5
        ),
        new THREE.Vector3(
          playerPosition.x + 0.5,
          playerPosition.y,
          playerPosition.z + 0.5
        )
      );

      if (enemyBox.intersectsBox(playerBox) && !enemy.hasDamaged) {
        enemy.hasDamaged = true;
        onPlayerHit();
        setTimeout(() => {
          enemy.hasDamaged = false;
        }, 1000); // Damage cooldown
      }
    });

    this.updateHealthBars();
  }

  clearEnemies() {
    this.enemies.forEach((enemy) => {
      if (enemy.healthBar) {
        enemy.healthBar.remove();
      }
      this.scene.remove(enemy);
    });
    this.enemies = [];
  }
}
