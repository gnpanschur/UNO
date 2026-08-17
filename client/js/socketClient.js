/**
 * Socket.io Network Communication Wrapper
 * Handles dynamic host connection for local dev & Render deployment.
 */
class SocketClient {
  constructor() {
    // Dynamic URL resolution: works on localhost and on Render automatically
    const socketUrl = window.location.origin;
    this.socket = io(socketUrl, {
      reconnection: true,
      reconnectionAttempts: 5
    });

    this.onGameStateCallback = null;
    this.onPlayerHandCallback = null;

    this.initListeners();
  }

  initListeners() {
    this.socket.on('connect', () => {
      console.log('[Socket] Connected to server:', this.socket.id);
    });

    this.socket.on('game_state', (state) => {
      if (typeof this.onGameStateCallback === 'function') {
        this.onGameStateCallback(state);
      }
    });

    this.socket.on('player_hand', (payload) => {
      if (typeof this.onPlayerHandCallback === 'function') {
        this.onPlayerHandCallback(payload.hand);
      }
    });

    this.socket.on('disconnect', () => {
      console.warn('[Socket] Disconnected from server');
    });
  }

  onGameState(callback) {
    this.onGameStateCallback = callback;
  }

  onPlayerHand(callback) {
    this.onPlayerHandCallback = callback;
  }

  createRoom(playerName, callback) {
    this.socket.emit('create_room', { playerName }, callback);
  }

  joinRoom(roomCode, playerName, callback) {
    this.socket.emit('join_room', { roomCode, playerName }, callback);
  }

  toggleReady() {
    this.socket.emit('toggle_ready');
  }

  startGame(callback) {
    this.socket.emit('start_game', callback);
  }

  playCard(cardId, chosenColor, callback) {
    this.socket.emit('play_card', { cardId, chosenColor }, callback);
  }

  drawCard(callback) {
    this.socket.emit('draw_card', callback);
  }

  passTurn(callback) {
    this.socket.emit('pass_turn', callback);
  }

  callUno(callback) {
    this.socket.emit('call_uno', callback);
  }

  catchUno(targetPlayerId, callback) {
    this.socket.emit('catch_uno', { targetPlayerId }, callback);
  }

  get socketId() {
    return this.socket ? this.socket.id : null;
  }
}

window.socketClient = new SocketClient();
