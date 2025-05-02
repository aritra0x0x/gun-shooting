import * as THREE from "https://unpkg.com/three@0.132.2/build/three.module.js";
import { EnemyManager } from "./enemy.js";
import { GameStateManager } from "./gameState.js";
import { RadarManager } from "./radar.js";
import { NetworkManager } from "./networkManager.js";
import { AmmoBox } from "./ammoBox.js";

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector("#gameCanvas"),
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);

// Add after scene setup
let isPaused = false;
const radarManager = new RadarManager(
  document.getElementById("minimap"),
  50 // max range
);

// Update pause/resume functions
window.resumeGame = function () {
  if (!gameState.isGameOver) {
    // Hide pause menu
    document.getElementById("pauseMenu").classList.add("hidden");

    // Reset game states
    isPaused = false;
    gameState.isPaused = false;

    // Reset movement
    player.moveVelocity.set(0, 0, 0);
    player.velocity.set(0, 0, 0);
    Object.keys(keys).forEach((key) => (keys[key] = false));

    // Request pointer lock
    document.querySelector("#gameCanvas").requestPointerLock();
  }
};

function togglePause() {
  isPaused = !isPaused;
  if (isPaused) {
    document.exitPointerLock();
    document.getElementById("pauseMenu").classList.remove("hidden");
  } else {
    resumeGame();
  }
}

// Add ESC key handler
document.addEventListener("keydown", (e) => {
  if (e.code === "Escape") {
    togglePause();
  }
});

// Add GameStateManager
const gameState = new GameStateManager();

// Bullet setup
const bullets = [];
const bulletGeometry = new THREE.SphereGeometry(0.05);
const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const bulletSpeed = 2;
const bulletLifespan = 1000; // milliseconds

// Replace enemy setup with EnemyManager
const enemyManager = new EnemyManager(scene, camera);

// Weapon setup
const weaponGeometry = new THREE.BoxGeometry(0.2, 0.2, 1);
const weaponMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
const weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);

// Add weapon parts (more detail)
const handleGeometry = new THREE.BoxGeometry(0.25, 0.4, 0.2);
const handleMaterial = new THREE.MeshBasicMaterial({ color: 0x222222 });
const handle = new THREE.Mesh(handleGeometry, handleMaterial);
handle.position.set(0, -0.2, 0.2);
weapon.add(handle);

// Sight
const sightGeometry = new THREE.BoxGeometry(0.05, 0.1, 0.05);
const sightMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
const sight = new THREE.Mesh(sightGeometry, sightMaterial);
sight.position.set(0, 0.15, 0);
weapon.add(sight);

// Add weapon to camera
camera.add(weapon);
scene.add(camera);

// Position weapon in view
weapon.position.set(0.3, -0.3, -0.7);

// Player physics
const player = {
  height: 2,
  speed: 0.15,
  jumpForce: 0.5,
  gravity: 0.02,
  velocity: new THREE.Vector3(),
  canJump: true,
  health: 100,
  ammo: 90,
  maxAmmo: 90,
  canWallJump: false,
  wallJumpForce: 0.4,
  wallSlideSpeed: 0.05,
  wallStickTime: 15, // frames to stick to wall
  wallStickCounter: 0,
  maxSpeed: 0.15,
  acceleration: 0.015,
  deceleration: 0.85,
  airControl: 0.3,
  groundFriction: 0.9,
  moveDirection: new THREE.Vector3(),
  moveVelocity: new THREE.Vector3(),
  isGrounded: false,
};

// Gun mechanics
const gun = {
  isRecoiling: false,
  recoilAmount: 0.05,
  recoilRecovery: 0.1,
  fireRate: 100, // milliseconds between shots
  lastShot: 0,
};

// Create floor with collision
const floorGeometry = new THREE.PlaneGeometry(100, 100);
const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x404040 });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
scene.add(floor);

// Create walls with collision
const createWall = (x, z, rotY = 0) => {
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(20, 5, 2),
    new THREE.MeshBasicMaterial({ color: 0x808080 })
  );
  wall.position.set(x, 2.5, z);
  wall.rotation.y = rotY;
  scene.add(wall);
  return wall;
};

const walls = [
  createWall(-20, 0, 0),
  createWall(20, 0, 0),
  createWall(0, -20, Math.PI / 2),
  createWall(0, 20, Math.PI / 2),
];

// Add boundary walls
const boundaries = [
  createWall(-50, 0, 0), // Left wall
  createWall(50, 0, 0), // Right wall
  createWall(0, -50, Math.PI / 2), // Front wall
  createWall(0, 50, Math.PI / 2), // Back wall
];

// Movement and controls
const keys = {};
document.addEventListener("keydown", (e) => (keys[e.code] = true));
document.addEventListener("keyup", (e) => (keys[e.code] = false));

// Add mouse control settings
const mouse = {
  sensitivity: 0.002,
  maxVerticalAngle: Math.PI / 2.2, // Limit vertical rotation to ~80 degrees
  verticalRotation: 0,
  tiltAngle: 0,
  maxTiltAngle: Math.PI / 6, // 30 degrees max tilt
  tiltSpeed: 0.1,
  tiltRecoverySpeed: 0.05,
  lastMovementDirection: new THREE.Vector3(),
  euler: new THREE.Euler(0, 0, 0, "YXZ"), // Add Euler angles for proper rotation order
  weaponSway: {
    intensity: 0.003,
    maxSway: 0.1,
    recovery: 0.1,
    position: new THREE.Vector3(),
    target: new THREE.Vector3(),
  },
};

// Add after other const declarations
const ammoBoxes = [];
const ammoBoxSpawnInterval = 15000; // 15 seconds
let lastAmmoBoxSpawn = 0;

// Update mouse look controls
document.addEventListener("mousemove", (e) => {
  if (document.pointerLockElement === document.querySelector("#gameCanvas")) {
    // Update Euler angles
    mouse.euler.y -= e.movementX * mouse.sensitivity;
    mouse.euler.x = Math.max(
      -mouse.maxVerticalAngle,
      Math.min(
        mouse.maxVerticalAngle,
        mouse.euler.x - e.movementY * mouse.sensitivity
      )
    );

    // Calculate tilt based on horizontal movement
    if (Math.abs(e.movementX) > 2) {
      const tiltTarget = e.movementX * mouse.sensitivity;
      mouse.tiltAngle = THREE.MathUtils.lerp(
        mouse.tiltAngle,
        THREE.MathUtils.clamp(
          tiltTarget,
          -mouse.maxTiltAngle,
          mouse.maxTiltAngle
        ),
        mouse.tiltSpeed
      );
    }

    // Apply rotations in correct order
    camera.quaternion.setFromEuler(mouse.euler);
    camera.rotateZ(mouse.tiltAngle);

    // Add weapon sway
    mouse.weaponSway.target.x = -e.movementX * mouse.weaponSway.intensity;
    mouse.weaponSway.target.y = -e.movementY * mouse.weaponSway.intensity;
  }
});

// Lock pointer on click
document.querySelector("#gameCanvas").addEventListener("click", () => {
  if (!isPaused) {
    document.querySelector("#gameCanvas").requestPointerLock();
  }
});

// Initialize player position
camera.position.set(0, player.height, 0);

// Add collision check function
function checkCollision(position, type = "movement") {
  // Check map boundaries
  const boundaryLimit = 48;
  if (
    Math.abs(position.x) > boundaryLimit ||
    Math.abs(position.z) > boundaryLimit
  ) {
    return { collision: true, wall: null };
  }

  const playerBoundingBox = new THREE.Box3(
    new THREE.Vector3(
      position.x - 0.5,
      position.y - player.height,
      position.z - 0.5
    ),
    new THREE.Vector3(position.x + 0.5, position.y, position.z + 0.5)
  );

  // Check wall collisions with return of wall object
  for (const wall of [...walls, ...boundaries]) {
    const wallBox = new THREE.Box3().setFromObject(wall);
    if (wallBox.intersectsBox(playerBoundingBox)) {
      return { collision: true, wall: wall };
    }
  }

  return { collision: false, wall: null };
}

// Add shooting function
function shoot() {
  if (player.ammo <= 0) return;

  const now = performance.now();
  if (now - gun.lastShot < gun.fireRate) return;

  gun.lastShot = now;
  player.ammo--;

  // Create bullet
  const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
  const bulletDirection = new THREE.Vector3(0, 0, -1);
  bulletDirection.applyQuaternion(camera.quaternion);

  // Position bullet at gun tip
  bullet.position.copy(camera.position);
  bullet.position.y -= 0.1;
  bullet.position.x += weapon.position.x * 0.5;
  bullet.velocity = bulletDirection.multiplyScalar(bulletSpeed);
  bullet.timestamp = now;

  scene.add(bullet);
  bullets.push(bullet);

  // Apply recoil
  weapon.position.z += gun.recoilAmount;
  weapon.position.y -= gun.recoilAmount * 0.5;
  gun.isRecoiling = true;
}

// Update click handler
document.addEventListener("mousedown", (e) => {
  if (e.button === 0 && document.pointerLockElement) {
    shoot();
  }
});

// Update movement function
function updateMovement() {
  const moveDirection = new THREE.Vector3();

  if (keys["KeyW"]) moveDirection.z -= 1;
  if (keys["KeyS"]) moveDirection.z += 1;
  if (keys["KeyA"]) moveDirection.x -= 1;
  if (keys["KeyD"]) moveDirection.x += 1;

  // Normalize movement direction
  if (moveDirection.lengthSq() > 0) {
    moveDirection.normalize();
    moveDirection.applyQuaternion(camera.quaternion);
  }

  // Apply acceleration
  if (moveDirection.lengthSq() > 0) {
    player.moveVelocity.add(
      moveDirection.multiplyScalar(
        player.acceleration * (player.isGrounded ? 1 : player.airControl)
      )
    );
  }

  // Apply deceleration
  player.moveVelocity.multiplyScalar(
    player.isGrounded ? player.groundFriction : player.deceleration
  );

  // Limit speed
  if (player.moveVelocity.lengthSq() > player.maxSpeed * player.maxSpeed) {
    player.moveVelocity.normalize().multiplyScalar(player.maxSpeed);
  }

  // Apply movement with collision checks
  const newPosition = camera.position.clone();
  newPosition.add(player.moveVelocity);

  // Try moving on each axis separately
  const tryX = camera.position.clone();
  tryX.x += player.moveVelocity.x;

  const tryZ = camera.position.clone();
  tryZ.z += player.moveVelocity.z;

  if (!checkCollision(tryX).collision) camera.position.x = tryX.x;
  if (!checkCollision(tryZ).collision) camera.position.z = tryZ.z;

  // Apply camera tilt recovery
  if (!keys["KeyA"] && !keys["KeyD"]) {
    mouse.tiltAngle = THREE.MathUtils.lerp(
      mouse.tiltAngle,
      0,
      mouse.tiltRecoverySpeed
    );
  }

  // Update camera rotation
  camera.quaternion.setFromEuler(mouse.euler);
  camera.rotateZ(mouse.tiltAngle);

  // Store last movement direction
  if (moveDirection.lengthSq() > 0) {
    mouse.lastMovementDirection.copy(moveDirection);
  }

  // Update weapon sway
  weapon.position.x = THREE.MathUtils.lerp(
    weapon.position.x,
    0.3 + mouse.weaponSway.target.x,
    mouse.weaponSway.recovery
  );
  weapon.position.y = THREE.MathUtils.lerp(
    weapon.position.y,
    -0.3 + mouse.weaponSway.target.y,
    mouse.weaponSway.recovery
  );

  // Reset weapon sway target
  mouse.weaponSway.target.lerp(new THREE.Vector3(), 0.1);

  // Add weapon bob while walking
  if (moveDirection.lengthSq() > 0 && player.isGrounded) {
    const bobSpeed = 8;
    const bobAmount = 0.02;
    const time = performance.now() / 1000;
    weapon.position.y += Math.sin(time * bobSpeed) * bobAmount;
    weapon.position.x += Math.cos(time * bobSpeed * 0.5) * bobAmount * 0.5;
  }

  // Handle weapon recoil recovery
  if (gun.isRecoiling) {
    weapon.position.z = THREE.MathUtils.lerp(
      weapon.position.z,
      -0.7,
      gun.recoilRecovery
    );
    weapon.position.y = THREE.MathUtils.lerp(
      weapon.position.y,
      -0.3,
      gun.recoilRecovery
    );

    if (Math.abs(weapon.position.z - -0.7) < 0.01) {
      gun.isRecoiling = false;
    }
  }
}

// Add before animate function
window.restartGame = function () {
  // Reset game state
  const newState = gameState.restartGame();
  player.health = newState.health;
  player.ammo = newState.ammo;
  player.maxAmmo = 90;

  // Reset position and movement
  camera.position.set(0, player.height, 0);
  player.velocity.set(0, 0, 0);
  player.moveVelocity.set(0, 0, 0);
  mouse.euler.set(0, 0, 0);
  mouse.tiltAngle = 0;

  // Reset weapon position
  weapon.position.set(0.3, -0.3, -0.7);

  // Clear enemies and bullets
  enemyManager.clearEnemies();
  bullets.forEach((bullet) => scene.remove(bullet));
  bullets.length = 0;

  // Reset UI elements
  document.getElementById("health-bar").style.width = "200px";
  document.getElementById("health-bar").style.background =
    "linear-gradient(90deg, #00ff00, #00cc00)";
  document.getElementById("gameOver").classList.add("hidden");
  document.getElementById("pauseMenu").classList.add("hidden");

  // Reset game flags
  isPaused = false;
  gun.isRecoiling = false;

  // Request pointer lock to resume gameplay
  document.querySelector("#gameCanvas").requestPointerLock();
};

class Game {
  constructor() {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.networkManager = new NetworkManager(this.scene);
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  animate() {
    requestAnimationFrame(this.animate);

    if (!isPaused && !gameState.isPaused) {
      // Update grounded state
      player.isGrounded = camera.position.y <= player.height;

      // Update movement
      updateMovement();

      // Check for wall collision
      const collisionCheck = checkCollision(camera.position);
      player.canWallJump = collisionCheck.collision && collisionCheck.wall;

      // Wall slide and jump mechanics
      if (player.canWallJump) {
        player.wallStickCounter = player.wallStickTime;
        if (player.velocity.y < 0) {
          player.velocity.y = -player.wallSlideSpeed;
        }

        if (keys["Space"]) {
          player.velocity.y = player.jumpForce;
          const wallNormal = new THREE.Vector3();
          wallNormal
            .subVectors(camera.position, collisionCheck.wall.position)
            .normalize();
          camera.position.add(wallNormal.multiplyScalar(0.5));
          player.canJump = false;
        }
      } else if (player.wallStickCounter > 0) {
        player.wallStickCounter--;
      }

      // Apply gravity
      player.velocity.y -= player.canWallJump
        ? player.gravity * 0.4
        : player.gravity;

      // Floor collision
      if (camera.position.y + player.velocity.y <= player.height) {
        camera.position.y = player.height;
        player.velocity.y = 0;
        player.canJump = true;
      } else {
        camera.position.y += player.velocity.y;
      }

      // Update enemies
      enemyManager.update(camera.position, bullets, () => {
        if (player.health > 0) {
          player.health = Math.max(0, player.health - 1);
          if (player.health === 0) {
            gameState.gameOver();
          }
        }
      });

      // Update bullets
      for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.position.add(bullet.velocity);

        if (performance.now() - bullet.timestamp > bulletLifespan) {
          scene.remove(bullet);
          bullets.splice(i, 1);
          continue;
        }

        const bulletBox = new THREE.Box3().setFromObject(bullet);
        for (const wall of [...walls, ...boundaries]) {
          const wallBox = new THREE.Box3().setFromObject(wall);
          if (wallBox.intersectsBox(bulletBox)) {
            scene.remove(bullet);
            bullets.splice(i, 1);
            break;
          }
        }
      }

      // Update ammo boxes
      const currentTime = performance.now();
      if (currentTime - lastAmmoBoxSpawn > ammoBoxSpawnInterval) {
        // Spawn new ammo box at random position
        const angle = Math.random() * Math.PI * 2;
        const distance = 15 + Math.random() * 20; // Between 15 and 35 units from center
        const position = new THREE.Vector3(
          Math.cos(angle) * distance,
          0,
          Math.sin(angle) * distance
        );
        ammoBoxes.push(new AmmoBox(this.scene, position));
        lastAmmoBoxSpawn = currentTime;
      }

      // Update and check pickup for each ammo box
      for (let i = ammoBoxes.length - 1; i >= 0; i--) {
        const box = ammoBoxes[i];
        box.update(currentTime / 1000);

        if (box.checkPickup(camera.position)) {
          // Add ammo to player
          const ammoAmount = box.collect();
          player.ammo = Math.min(player.ammo + ammoAmount, player.maxAmmo);

          // Remove box
          this.scene.remove(box.mesh);
          ammoBoxes.splice(i, 1);

          // Play pickup sound if you have one
          // playPickupSound();
        }
      }

      // Update HUD
      const healthPercent = Math.max(0, Math.min(100, player.health)) / 100;
      const healthBarWidth = Math.max(0, Math.min(200, healthPercent * 200));
      const healthBar = document.getElementById("health-bar");
      healthBar.style.width = `${healthBarWidth}px`;
      healthBar.style.background = `linear-gradient(90deg, 
          ${healthPercent > 0.5 ? "#00ff00" : "#ff0000"}, 
          ${healthPercent > 0.5 ? "#00cc00" : "#cc0000"})`;

      document.getElementById("health-text").textContent = player.health;
      document.getElementById(
        "ammo"
      ).textContent = `${player.ammo}/${player.maxAmmo}`;

      // Update radar
      radarManager.update(enemyManager.enemies, mouse.euler.y);

      // Update network
      if (this.networkManager) {
        this.networkManager.broadcastPosition(camera.position, camera.rotation);
      }

      this.renderer.render(this.scene, this.camera);
    }
  }

  dispose() {
    if (this.networkManager) {
      this.networkManager.dispose();
    }
  }
}

// Handle window resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initialize game and start animation loop
const game = new Game();
// Add global reference
window.gameInstance = game;
