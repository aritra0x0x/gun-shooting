import * as THREE from "https://unpkg.com/three@0.132.2/build/three.module.js";

export class AmmoBox {
  constructor(scene, position) {
    // Create ammo box mesh with glowing material
    const boxGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const boxMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.8,
    });
    this.mesh = new THREE.Mesh(boxGeometry, boxMaterial);

    // Add glow effect
    const glowGeometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide,
    });
    this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    this.mesh.add(this.glowMesh);

    // Set position
    this.mesh.position.copy(position);
    this.mesh.position.y = 0.25;

    // Add to scene
    scene.add(this.mesh);

    // Ammo amount to give
    this.ammoAmount = 30;

    // Floating animation
    this.startY = this.mesh.position.y;
    this.floatAmplitude = 0.2;
    this.floatSpeed = 2;

    // Create pickup sound
    this.pickupSound = new Audio("sounds/pickup.mp3");
    this.pickupSound.volume = 0.5;
  }

  update(time) {
    // Make the ammo box float up and down
    this.mesh.position.y =
      this.startY + Math.sin(time * this.floatSpeed) * this.floatAmplitude;

    // Rotate the box
    this.mesh.rotation.y += 0.02;

    // Pulse glow effect
    const glowScale = 1 + Math.sin(time * 3) * 0.1;
    this.glowMesh.scale.set(glowScale, glowScale, glowScale);
  }

  checkPickup(playerPosition) {
    const distance = this.mesh.position.distanceTo(playerPosition);
    return distance < 2;
  }

  collect() {
    // Play pickup sound
    this.pickupSound.currentTime = 0;
    this.pickupSound.play().catch((e) => console.log("Audio play failed:", e));
    return this.ammoAmount;
  }
}
