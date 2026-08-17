const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const UnoGame = require('./gameLogic/UnoGame');
const { generateRoomCode } = require('./utils/roomCodeGenerator');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Serve static frontend files from client/ directory
const clientPath = path.join(__dirname, '../client');
app.use(express.static(clientPath));

// Serve SVG card deck assets from server/UNO_deck_svg
const deckSvgPath = path.join(__dirname, 'UNO_deck_svg');
app.use('/cards', express.static(deckSvgPath));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

// Active game rooms map (roomCode -> UnoGame)
const rooms = new Map();

function broadcastGameState(game) {
  const gameState = game.getClientState();
  
  // Send state to room
  io.to(game.code).emit('game_state', gameState);

  // Send individual player hand secret payload to each socket in room
  game.players.forEach(player => {
    io.to(player.socketId).emit('player_hand', {
      hand: game.getPlayerHand(player.socketId)
    });
  });
}

function generateUniqueRoomCode() {
  let code = generateRoomCode(4);
  while (rooms.has(code)) {
    code = generateRoomCode(4);
  }
  return code;
}

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);
  let currentRoomCode = null;

  // Create Room
  socket.on('create_room', ({ playerName }, callback) => {
    try {
      const roomCode = generateUniqueRoomCode();
      const game = new UnoGame(roomCode, socket.id, playerName);

      game.setStateChangeCallback(() => {
        broadcastGameState(game);
      });

      rooms.set(roomCode, game);
      socket.join(roomCode);
      currentRoomCode = roomCode;

      console.log(`[Room ${roomCode}] Created by ${playerName} (${socket.id})`);

      if (typeof callback === 'function') {
        callback({ success: true, roomCode, gameState: game.getClientState() });
      }
      broadcastGameState(game);
    } catch (err) {
      console.error('Error creating room:', err);
      if (typeof callback === 'function') {
        callback({ success: false, message: 'Raum konnte nicht erstellt werden' });
      }
    }
  });

  // Join Room
  socket.on('join_room', ({ roomCode, playerName }, callback) => {
    try {
      const code = (roomCode || '').toUpperCase().trim();
      const game = rooms.get(code);

      if (!game) {
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Raum nicht gefunden' });
        }
        return;
      }

      const result = game.addPlayer(socket.id, playerName);
      if (result.success) {
        socket.join(code);
        currentRoomCode = code;
        console.log(`[Room ${code}] Player ${playerName} (${socket.id}) joined`);

        if (typeof callback === 'function') {
          callback({ success: true, roomCode: code, gameState: game.getClientState() });
        }
        broadcastGameState(game);
      } else {
        if (typeof callback === 'function') {
          callback({ success: false, message: result.message });
        }
      }
    } catch (err) {
      console.error('Error joining room:', err);
      if (typeof callback === 'function') {
        callback({ success: false, message: 'Beitritt zum Raum fehlgeschlagen' });
      }
    }
  });

  // Toggle Ready
  socket.on('toggle_ready', () => {
    if (!currentRoomCode) return;
    const game = rooms.get(currentRoomCode);
    if (game) {
      game.toggleReady(socket.id);
    }
  });

  // Start Game
  socket.on('start_game', (callback) => {
    if (!currentRoomCode) return;
    const game = rooms.get(currentRoomCode);
    if (game) {
      const result = game.startGame(socket.id);
      if (typeof callback === 'function') {
        callback(result);
      }
    }
  });

  // Play Card
  socket.on('play_card', ({ cardId, chosenColor }, callback) => {
    if (!currentRoomCode) return;
    const game = rooms.get(currentRoomCode);
    if (game) {
      const result = game.playCard(socket.id, cardId, chosenColor);
      if (typeof callback === 'function') {
        callback(result);
      }
    }
  });

  // Draw Card
  socket.on('draw_card', (callback) => {
    if (!currentRoomCode) return;
    const game = rooms.get(currentRoomCode);
    if (game) {
      const result = game.drawCard(socket.id);
      if (typeof callback === 'function') {
        callback(result);
      }
    }
  });

  // Pass Turn
  socket.on('pass_turn', (callback) => {
    if (!currentRoomCode) return;
    const game = rooms.get(currentRoomCode);
    if (game) {
      const result = game.passTurn(socket.id);
      if (typeof callback === 'function') {
        callback(result);
      }
    }
  });

  // Call UNO!
  socket.on('call_uno', (callback) => {
    if (!currentRoomCode) return;
    const game = rooms.get(currentRoomCode);
    if (game) {
      const result = game.callUno(socket.id);
      if (typeof callback === 'function') {
        callback(result);
      }
    }
  });

  // Catch UNO! (Report opponent who didn't call UNO)
  socket.on('catch_uno', ({ targetPlayerId }, callback) => {
    if (!currentRoomCode) return;
    const game = rooms.get(currentRoomCode);
    if (game) {
      const result = game.catchUno(socket.id, targetPlayerId);
      if (typeof callback === 'function') {
        callback(result);
      }
    }
  });

  // Disconnect / Leave
  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
    if (currentRoomCode) {
      const game = rooms.get(currentRoomCode);
      if (game) {
        game.removePlayer(socket.id);
        if (game.players.length === 0) {
          console.log(`[Room ${currentRoomCode}] Empty room deleted`);
          rooms.delete(currentRoomCode);
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`UNO Server running on port ${PORT}`);
  console.log(`Local Access: http://localhost:${PORT}`);
  console.log(`=================================`);
});
