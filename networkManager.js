import * as THREE from "https://unpkg.com/three@0.132.2/build/three.module.js";

export class NetworkManager {
  constructor(scene) {
    this.scene = scene;
    this.peer = null;
    this.connections = new Map();
    this.players = new Map();
    this.myId = null;
    this.initialize();
  }

  initialize() {
    // Initialize PeerJS
    this.peer = new Peer({
      host: "peerjs-server.herokuapp.com",
      secure: true,
      port: 443,
    });

    this.peer.on("open", (id) => {
      this.myId = id;
      console.log("My peer ID is: " + id);
      this.createRoomOrJoin();
    });

    this.peer.on("connection", (conn) => {
      this.handleConnection(conn);
    });
  }

  createRoomOrJoin() {
    // Try to join existing room or create new one
    fetch("https://peerjs-server.herokuapp.com/peerjs/peers")
      .then((response) => response.json())
      .then((peers) => {
        if (peers.length > 1) {
          // Join existing room
          const otherPeerId = peers.find((id) => id !== this.myId);
          if (otherPeerId) {
            this.connectToPeer(otherPeerId);
          }
        }
      });
  }

  connectToPeer(peerId) {
    const conn = this.peer.connect(peerId);
    this.handleConnection(conn);
  }

  handleConnection(conn) {
    conn.on("open", () => {
      this.connections.set(conn.peer, conn);

      // Create visual representation for new player
      const playerMesh = this.createPlayerMesh();
      this.players.set(conn.peer, playerMesh);

      conn.on("data", (data) => {
        this.handlePeerData(conn.peer, data);
      });
    });

    conn.on("close", () => {
      // Remove disconnected player
      const playerMesh = this.players.get(conn.peer);
      if (playerMesh) {
        this.scene.remove(playerMesh);
        this.players.delete(conn.peer);
      }
      this.connections.delete(conn.peer);
    });
  }

  createPlayerMesh() {
    const geometry = new THREE.BoxGeometry(1, 2, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const mesh = new THREE.Mesh(geometry, material);
    this.scene.add(mesh);
    return mesh;
  }

  handlePeerData(peerId, data) {
    const playerMesh = this.players.get(peerId);
    if (playerMesh && data.position) {
      playerMesh.position.copy(data.position);
      playerMesh.rotation.copy(data.rotation);
    }
  }

  broadcastPosition(position, rotation) {
    const data = {
      position: position.clone(),
      rotation: rotation.clone(),
    };

    this.connections.forEach((connection) => {
      connection.send(data);
    });
  }

  dispose() {
    if (this.peer) {
      this.peer.destroy();
    }
    this.connections.clear();
    this.players.forEach((player) => {
      this.scene.remove(player);
    });
    this.players.clear();
  }
}
