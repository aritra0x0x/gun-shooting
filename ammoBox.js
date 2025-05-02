import * as THREE from "https://unpkg.com/three@0.132.2/build/three.module.js";

export class AmmoBox {
  constructor(scene, position) {
    // Create ammo box mesh
    const boxGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const boxMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    this.mesh = new THREE.Mesh(boxGeometry, boxMaterial);

    // Set position
    this.mesh.position.copy(position);
    this.mesh.position.y = 0.25; // Half height of box

    // Add to scene
    scene.add(this.mesh);

    // Ammo amount to give
    this.ammoAmount = 30;

    // Floating animation
    this.startY = this.mesh.position.y;
    this.floatAmplitude = 0.2;
    this.floatSpeed = 2;
  }

  update(time) {
    // Make the ammo box float up and down
    this.mesh.position.y =
      this.startY + Math.sin(time * this.floatSpeed) * this.floatAmplitude;
    // Rotate the box
    this.mesh.rotation.y += 0.02;
  }

  checkPickup(playerPosition) {
    const distance = this.mesh.position.distanceTo(playerPosition);
    return distance < 2; // Pickup range of 2 units
  }

  collect() {
    return this.ammoAmount;
  }
}
