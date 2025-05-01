import * as THREE from "https://unpkg.com/three@0.132.2/build/three.module.js";

export class NetworkManager {
  constructor(scene) {
    this.scene = scene;
    this.peer = null;
    this.connections = new Map();
    this.players = new Map();
    this.myId = null;
    this.playerName = prompt("Enter your name:") || "Player";
    this.team = null;
    this.initialize();
  }

  initialize() {
    // Show team selection first
    document.getElementById("team-selection").classList.remove("hidden");

    this.peer = new Peer({
      host: "peerjs-server.herokuapp.com",
      secure: true,
      port: 443,
    });

    this.peer.on("open", (id) => {
      this.myId = id;
      this.createRoomOrJoin();
    });

    this.peer.on("connection", (conn) => {
      this.handleConnection(conn);
    });

    // Initialize chat
    this.setupChat();
  }

  setupChat() {
    const chatInput = document.getElementById("chat-input");
    const chatContainer = document.getElementById("chat-container");

    document.addEventListener("keydown", (e) => {
      if (e.key === "T" && !chatInput.matches(":focus")) {
        e.preventDefault();
        chatContainer.classList.remove("hidden");
        chatInput.focus();
      }
      if (e.key === "Escape" && chatContainer.classList.contains("hidden")) {
        chatContainer.classList.add("hidden");
      }
    });

    chatInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && chatInput.value.trim()) {
        this.broadcastChat(chatInput.value.trim());
        chatInput.value = "";
        chatContainer.classList.add("hidden");
      }
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

      // Send initial player data
      conn.send({
        type: "player_info",
        name: this.playerName,
        team: this.team,
      });

      // Create visual representation for new player
      const playerMesh = this.createPlayerMesh(this.team);
      this.players.set(conn.peer, {
        mesh: playerMesh,
        name: "",
        team: "",
      });

      conn.on("data", (data) => {
        this.handlePeerData(conn.peer, data);
      });
    });

    conn.on("close", () => {
      const player = this.players.get(conn.peer);
      if (player?.mesh) {
        this.scene.remove(player.mesh);
        this.scene.remove(player.nameLabel);
      }
      this.players.delete(conn.peer);
      this.connections.delete(conn.peer);
    });
  }

  createPlayerMesh(team) {
    const geometry = new THREE.BoxGeometry(1, 2, 1);
    const material = new THREE.MeshBasicMaterial({
      color: team === "red" ? 0xff4444 : 0x4444ff,
    });
    const mesh = new THREE.Mesh(geometry, material);
    this.scene.add(mesh);
    return mesh;
  }

  handlePeerData(peerId, data) {
    const player = this.players.get(peerId);

    if (data.type === "player_info") {
      player.name = data.name;
      player.team = data.team;
      player.mesh.material.color.setHex(data.team === "red" ? 0xff4444 : 0x4444ff);
    } else if (data.type === "chat") {
      this.displayChatMessage(data.name, data.message, data.team);
    } else if (data.position && player) {
      player.mesh.position.copy(data.position);
      player.mesh.rotation.copy(data.rotation);

      // Update player name position
      if (player.nameLabel) {
        const vector = player.mesh.position.clone();
        vector.y += 2.5; // Position above player
        vector.project(this.scene.camera);

        const x = (vector.x + 1) * window.innerWidth / 2;
        const y = (-vector.y + 1) * window.innerHeight / 2;

        player.nameLabel.style.transform = `translate(${x}px, ${y}px)`;
      }
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

  broadcastChat(message) {
    const data = {
      type: "chat",
      name: this.playerName,
      team: this.team,
      message: message,
    };

    this.displayChatMessage(this.playerName, message, this.team);

    this.connections.forEach((connection) => {
      connection.send(data);
    });
  }

  displayChatMessage(name, message, team) {
    const chatMessages = document.getElementById("chat-messages");
    const messageElement = document.createElement("div");
    messageElement.style.color = team === "red" ? "#ff4444" : "#4444ff";
    messageElement.textContent = `${name}: ${message}`;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  setTeam(team) {
    this.team = team;
    document.getElementById("team-selection").classList.add("hidden");

    // Broadcast team selection to all peers
    this.connections.forEach((connection) => {
      connection.send({
        type: "player_info",
        name: this.playerName,
        team: this.team,
      });
    });
  }

  dispose() {
    if (this.peer) {
      this.peer.destroy();
    }
    this.connections.clear();
    this.players.forEach((player) => {
      if (player.mesh) this.scene.remove(player.mesh);
      if (player.nameLabel) player.nameLabel.remove();
    });
    this.players.clear();
  }
}
