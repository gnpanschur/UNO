const Deck = require('./Deck');
const HighscoreManager = require('./Highscore');

const TURN_DURATION_SECONDS = 20;

class UnoGame {
  constructor(roomCode, hostSocketId, hostName) {
    this.code = roomCode;
    this.status = 'lobby'; // 'lobby', 'playing', 'ended'
    this.players = [];
    this.deck = new Deck();
    this.discardPile = [];
    this.currentColor = null;
    this.currentTurnIndex = 0;
    this.direction = 1; // 1 = clockwise, -1 = counter-clockwise
    this.drawnThisTurn = false;
    this.drawnCardId = null;
    
    this.highscoreManager = new HighscoreManager();
    this.turnTimerTimeout = null;
    this.turnInterval = null;
    this.turnTimeRemaining = TURN_DURATION_SECONDS;
    this.onStateChangeCallback = null;
    this.lastAction = 'Spiel in der Lobby erstellt.';

    this.addPlayer(hostSocketId, hostName, true);
  }

  setStateChangeCallback(callback) {
    this.onStateChangeCallback = callback;
  }

  notifyStateChange() {
    if (typeof this.onStateChangeCallback === 'function') {
      this.onStateChangeCallback(this.getClientState());
    }
  }

  addPlayer(socketId, name, isHost = false) {
    if (this.status !== 'lobby') return { success: false, message: 'Spiel läuft bereits' };
    if (this.players.length >= 8) return { success: false, message: 'Raum ist voll (max. 8 Spieler)' };

    const player = {
      socketId: socketId,
      id: socketId,
      name: name.trim() || 'Spieler',
      hand: [],
      isReady: true,
      isHost: isHost,
      hasCalledUno: false
    };

    this.players.push(player);
    this.highscoreManager.registerPlayer(player.id, player.name);
    this.lastAction = `${player.name} ist dem Raum beigetreten.`;
    this.notifyStateChange();
    return { success: true, player };
  }

  removePlayer(socketId) {
    const index = this.players.findIndex(p => p.socketId === socketId);
    if (index !== -1) {
      const removed = this.players.splice(index, 1)[0];
      this.highscoreManager.removePlayer(socketId);

      if (this.players.length === 0) {
        this.stopTurnTimer();
        this.status = 'ended';
      } else {
        if (removed.isHost) {
          this.players[0].isHost = true;
          this.players[0].isReady = true;
        }

        if (this.status === 'playing') {
          if (this.players.length < 2) {
            this.status = 'lobby';
            this.stopTurnTimer();
            this.lastAction = 'Nicht genügend Spieler übrig. Spiel zurück in die Lobby gesetzt.';
          } else {
            if (index <= this.currentTurnIndex) {
              this.currentTurnIndex = (this.currentTurnIndex - 1 + this.players.length) % this.players.length;
            }
            this.nextTurn();
          }
        }
      }
      this.notifyStateChange();
    }
  }

  toggleReady(socketId) {
    const player = this.players.find(p => p.socketId === socketId);
    if (player && !player.isHost) {
      player.isReady = !player.isReady;
      this.notifyStateChange();
    }
  }

  startGame(requestingSocketId) {
    const host = this.players.find(p => p.socketId === requestingSocketId);
    if (!host || !host.isHost) return { success: false, message: 'Nur der Host kann das Spiel starten' };
    if (this.players.length < 2) return { success: false, message: 'Mindestens 2 Spieler erforderlich zum Starten' };
    
    const unready = this.players.filter(p => !p.isHost && !p.isReady);
    if (unready.length > 0) return { success: false, message: 'Alle Spieler müssen bereit sein' };

    this.deck.reset();
    this.discardPile = [];
    this.players.forEach(p => {
      p.hand = this.deck.draw(7);
      p.hasCalledUno = false;
    });

    // Draw initial discard card (must not be Wild +4)
    let topCard = this.deck.draw();
    while (topCard.type === 'wild4') {
      this.deck.cards.unshift(topCard);
      this.deck.shuffle();
      topCard = this.deck.draw();
    }

    this.discardPile.push(topCard);
    this.currentColor = topCard.color === 'black' ? 'red' : topCard.color;
    this.status = 'playing';
    this.currentTurnIndex = Math.floor(Math.random() * this.players.length);
    this.direction = 1;
    this.drawnThisTurn = false;
    this.drawnCardId = null;
    this.lastAction = `Spiel gestartet! Erste Karte ist ${this.getCardName(topCard)}.`;

    // Handle initial action card if topCard is action card
    this.applyInitialCardEffect(topCard);

    this.startTurnTimer();
    this.notifyStateChange();
    return { success: true };
  }

  applyInitialCardEffect(topCard) {
    const activePlayer = this.players[this.currentTurnIndex];
    if (topCard.type === 'skip') {
      this.lastAction += ` ${activePlayer.name} wurde übersprungen!`;
      this.advanceTurnIndex();
    } else if (topCard.type === 'reverse') {
      this.direction = -1;
      this.lastAction += ` Spielrichtung umgekehrt!`;
      if (this.players.length === 2) {
        this.advanceTurnIndex();
      }
    } else if (topCard.type === 'draw2') {
      const drawn = this.deck.draw(2);
      activePlayer.hand.push(...drawn);
      this.lastAction += ` ${activePlayer.name} hat 2 Karten gezogen und wird übersprungen!`;
      this.advanceTurnIndex();
    }
  }

  startTurnTimer() {
    this.stopTurnTimer();
    this.turnTimeRemaining = TURN_DURATION_SECONDS;

    this.turnInterval = setInterval(() => {
      this.turnTimeRemaining -= 1;
      if (this.turnTimeRemaining <= 0) {
        this.handleTimeout();
      } else {
        this.notifyStateChange();
      }
    }, 1000);
  }

  stopTurnTimer() {
    if (this.turnInterval) {
      clearInterval(this.turnInterval);
      this.turnInterval = null;
    }
  }

  handleTimeout() {
    this.stopTurnTimer();
    const activePlayer = this.players[this.currentTurnIndex];
    this.lastAction = `Zeit von ${activePlayer.name} abgelaufen! Automatisch 1 Karte gezogen...`;
    
    // Draw 1 card for timed out player
    this.ensureDeckHasCards(1);
    const card = this.deck.draw();
    if (card) {
      activePlayer.hand.push(card);
    }
    
    this.nextTurn();
  }

  ensureDeckHasCards(neededCount = 1) {
    if (this.deck.remaining < neededCount) {
      this.deck.recycleDiscardPile(this.discardPile);
    }
  }

  getTopCard() {
    return this.discardPile[this.discardPile.length - 1];
  }

  isCardPlayable(card) {
    const topCard = this.getTopCard();
    if (!topCard) return true;

    // Wild cards can always be played
    if (card.type === 'wild' || card.type === 'wild4') {
      return true;
    }

    // Match current active color
    if (card.color === this.currentColor) {
      return true;
    }

    // Match number value or action card type
    if (card.type === topCard.type && card.type !== 'number') {
      return true;
    }
    if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) {
      return true;
    }

    return false;
  }

  playCard(socketId, cardId, chosenColor = null) {
    if (this.status !== 'playing') return { success: false, message: 'Spiel ist nicht aktiv' };

    const playerIndex = this.players.findIndex(p => p.socketId === socketId);
    if (playerIndex !== this.currentTurnIndex) {
      return { success: false, message: 'Du bist nicht am Zug' };
    }

    const player = this.players[playerIndex];
    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
      return { success: false, message: 'Karte nicht auf deiner Hand' };
    }

    const card = player.hand[cardIndex];

    if (!this.isCardPlayable(card)) {
      return { success: false, message: 'Ungültiger Zug: Karte passt nicht zu Farbe oder Wert' };
    }

    if ((card.type === 'wild' || card.type === 'wild4') && (!chosenColor || !['red', 'yellow', 'green', 'blue'].includes(chosenColor))) {
      return { success: false, message: 'Bitte wähle eine gültige Farbe für die Farbenwahl-Karte' };
    }

    // Play card
    player.hand.splice(cardIndex, 1);
    this.discardPile.push(card);

    if (card.type === 'wild' || card.type === 'wild4') {
      this.currentColor = chosenColor;
      card.color = chosenColor;
    } else {
      this.currentColor = card.color;
    }

    this.lastAction = `${player.name} hat ${this.getCardName(card)} gespielt.`;

    // Reset UNO call status if player hand size grows above 1
    if (player.hand.length !== 1) {
      player.hasCalledUno = false;
    }

    // Check Win Condition
    if (player.hand.length === 0) {
      this.handleRoundWin(player);
      return { success: true };
    }

    // Apply special card action
    let skipNext = false;
    if (card.type === 'skip') {
      skipNext = true;
      this.lastAction += ` Nächster Spieler wird übersprungen!`;
    } else if (card.type === 'reverse') {
      this.direction *= -1;
      this.lastAction += ` Spielrichtung umgekehrt!`;
      if (this.players.length === 2) {
        skipNext = true;
      }
    } else if (card.type === 'draw2') {
      const nextIndex = this.getNextTurnIndex();
      const nextPlayer = this.players[nextIndex];
      this.ensureDeckHasCards(2);
      const drawn = this.deck.draw(2);
      nextPlayer.hand.push(...drawn);
      skipNext = true;
      this.lastAction += ` ${nextPlayer.name} zieht 2 Karten und wird übersprungen!`;
    } else if (card.type === 'wild4') {
      const nextIndex = this.getNextTurnIndex();
      const nextPlayer = this.players[nextIndex];
      this.ensureDeckHasCards(4);
      const drawn = this.deck.draw(4);
      nextPlayer.hand.push(...drawn);
      skipNext = true;
      this.lastAction += ` ${nextPlayer.name} zieht 4 Karten und wird übersprungen!`;
    }

    this.advanceTurnIndex();
    if (skipNext) {
      this.advanceTurnIndex();
    }

    this.drawnThisTurn = false;
    this.drawnCardId = null;
    this.startTurnTimer();
    this.notifyStateChange();
    return { success: true };
  }

  drawCard(socketId) {
    if (this.status !== 'playing') return { success: false, message: 'Spiel ist nicht aktiv' };

    const playerIndex = this.players.findIndex(p => p.socketId === socketId);
    if (playerIndex !== this.currentTurnIndex) {
      return { success: false, message: 'Du bist nicht am Zug' };
    }

    if (this.drawnThisTurn) {
      return { success: false, message: 'In diesem Zug bereits eine Karte gezogen' };
    }

    this.ensureDeckHasCards(1);
    const card = this.deck.draw();
    if (!card) return { success: false, message: 'Stapel ist leer' };

    const player = this.players[playerIndex];
    player.hand.push(card);
    player.hasCalledUno = false;
    this.drawnThisTurn = true;
    this.drawnCardId = card.id;

    this.lastAction = `${player.name} hat eine Karte gezogen.`;
    this.notifyStateChange();
    return { success: true, card };
  }

  passTurn(socketId) {
    if (this.status !== 'playing') return { success: false, message: 'Spiel ist nicht aktiv' };

    const playerIndex = this.players.findIndex(p => p.socketId === socketId);
    if (playerIndex !== this.currentTurnIndex) {
      return { success: false, message: 'Du bist nicht am Zug' };
    }

    if (!this.drawnThisTurn) {
      return { success: false, message: 'Du musst erst eine Karte ziehen, bevor du passt' };
    }

    const player = this.players[playerIndex];
    this.lastAction = `${player.name} hat den Zug gepasst.`;
    this.nextTurn();
    return { success: true };
  }

  callUno(socketId) {
    const player = this.players.find(p => p.socketId === socketId);
    if (!player) return { success: false, message: 'Spieler nicht gefunden' };

    if (player.hand.length <= 2) {
      player.hasCalledUno = true;
      this.lastAction = `📣 ${player.name} hat UNO gerufen!`;
      this.notifyStateChange();
      return { success: true, message: 'UNO gerufen!' };
    } else {
      return { success: false, message: 'UNO kann nur bei 1 oder 2 verbleibenden Karten gerufen werden' };
    }
  }

  catchUno(catcherSocketId, targetSocketId) {
    const target = this.players.find(p => p.socketId === targetSocketId);
    const catcher = this.players.find(p => p.socketId === catcherSocketId);
    if (!target || !catcher) return { success: false, message: 'Spieler nicht gefunden' };

    if (target.hand.length === 1 && !target.hasCalledUno) {
      this.ensureDeckHasCards(2);
      const penaltyCards = this.deck.draw(2);
      target.hand.push(...penaltyCards);
      this.lastAction = `🚨 ${catcher.name} hat erwischt, dass ${target.name} vergaß UNO zu rufen! ${target.name} zieht 2 Strafkarten.`;
      this.notifyStateChange();
      return { success: true, caught: true };
    } else {
      return { success: false, message: 'Spieler erfüllt nicht die Bedingungen für eine UNO-Strafe' };
    }
  }

  advanceTurnIndex() {
    this.currentTurnIndex = this.getNextTurnIndex();
  }

  getNextTurnIndex() {
    return (this.currentTurnIndex + this.direction + this.players.length) % this.players.length;
  }

  nextTurn() {
    this.advanceTurnIndex();
    this.drawnThisTurn = false;
    this.drawnCardId = null;
    this.startTurnTimer();
    this.notifyStateChange();
  }

  handleRoundWin(winner) {
    this.stopTurnTimer();
    this.status = 'ended';
    const roundPoints = this.highscoreManager.calculateRoundPoints(winner.id, this.players);
    this.lastRoundPoints = roundPoints;
    this.lastAction = `🏆 ${winner.name} hat gewonnen! (+${roundPoints} Punkte)`;
    this.notifyStateChange();
  }

  getCardName(card) {
    if (!card) return 'Leer';
    if (card.type === 'wild') return 'Farbenwahl (★)';
    if (card.type === 'wild4') return '+4 Farbenwahl (★)';

    let colorName = '';
    if (card.color === 'red') colorName = 'ROT';
    if (card.color === 'yellow') colorName = 'GELB';
    if (card.color === 'green') colorName = 'GRÜN';
    if (card.color === 'blue') colorName = 'BLAU';

    let typeVal = card.value.toString().toUpperCase();
    if (card.type === 'skip') typeVal = 'Aussetzen';
    if (card.type === 'reverse') typeVal = 'Retour';
    if (card.type === 'draw2') typeVal = '+2';

    return `${colorName} ${typeVal}`;
  }

  getClientState() {
    const topCard = this.getTopCard();
    return {
      code: this.code,
      status: this.status,
      currentColor: this.currentColor,
      currentTurnIndex: this.currentTurnIndex,
      activePlayerId: this.players[this.currentTurnIndex] ? this.players[this.currentTurnIndex].id : null,
      direction: this.direction,
      topCard: topCard ? { id: topCard.id, color: topCard.color, type: topCard.type, value: topCard.value } : null,
      deckRemaining: this.deck.remaining,
      discardCount: this.discardPile.length,
      turnTimeRemaining: this.turnTimeRemaining,
      lastAction: this.lastAction,
      lastRoundPoints: this.lastRoundPoints || 0,
      drawnThisTurn: this.drawnThisTurn,
      drawnCardId: this.drawnCardId,
      leaderboard: this.highscoreManager.getLeaderboard(),
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        handCount: p.hand.length,
        isHost: p.isHost,
        isReady: p.isReady,
        hasCalledUno: p.hasCalledUno
      }))
    };
  }

  getPlayerHand(socketId) {
    const player = this.players.find(p => p.socketId === socketId);
    return player ? player.hand : [];
  }
}

module.exports = UnoGame;
