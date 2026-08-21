/**
 * Main Client Application Logic & UI Controller
 */
document.addEventListener('DOMContentLoaded', () => {
  // UI Screens
  const loginScreen = document.getElementById('login-screen');
  const lobbyScreen = document.getElementById('lobby-screen');
  const gameScreen = document.getElementById('game-screen');

  // Input Elements
  const playerNameInput = document.getElementById('player-name-input');
  const roomCodeInput = document.getElementById('room-code-input');
  const loginError = document.getElementById('login-error');

  // Buttons
  const btnCreateRoom = document.getElementById('btn-create-room');
  const btnJoinRoom = document.getElementById('btn-join-room');
  const btnToggleReady = document.getElementById('btn-toggle-ready');
  const btnStartGame = document.getElementById('btn-start-game');
  const btnLeaveLobby = document.getElementById('btn-leave-lobby');
  const btnCopyCode = document.getElementById('btn-copy-code');
  const btnLeaveGame = document.getElementById('btn-leave-game');
  const btnToggleSound = document.getElementById('btn-toggle-sound');
  const btnToggleLeaderboard = document.getElementById('btn-toggle-leaderboard');
  const btnCloseLeaderboard = document.getElementById('btn-close-leaderboard');
  const btnToggleFullscreen = document.getElementById('btn-toggle-fullscreen');
  const btnCallUno = document.getElementById('btn-call-uno');
  const btnDrawCard = document.getElementById('btn-draw-card');
  const btnPassTurn = document.getElementById('btn-pass-turn');
  const btnCatchUno = document.getElementById('btn-catch-uno');
  const btnNextRound = document.getElementById('btn-next-round');

  // Modals & Containers
  const colorPickerModal = document.getElementById('color-picker-modal');
  const leaderboardModal = document.getElementById('leaderboard-modal');
  const roundWinModal = document.getElementById('round-win-modal');
  const rulesModal = document.getElementById('rules-modal');
  const btnToggleRules = document.getElementById('btn-toggle-rules');
  const btnLobbyRules = document.getElementById('btn-lobby-rules');
  const btnCloseRules = document.getElementById('btn-close-rules');
  const catchUnoBanner = document.getElementById('catch-uno-banner');
  const catchUnoText = document.getElementById('catch-uno-text');
  const handCardsList = document.getElementById('hand-cards-list');
  const playersList = document.getElementById('players-list');
  const leaderboardBody = document.getElementById('leaderboard-body');
  const actionLogToast = document.getElementById('game-action-log');

  // HUD Displays
  const displayRoomCode = document.getElementById('display-room-code');
  const gameRoomCode = document.getElementById('game-room-code');
  const playerCountDisplay = document.getElementById('player-count');
  const activeTurnIndicator = document.getElementById('active-turn-indicator');
  const turnTimerBar = document.getElementById('turn-timer-bar');
  const turnTimerText = document.getElementById('turn-timer-text');

  // Initialize Game Engine & Network
  const gameEngine = new GameEngine('game-canvas');
  let currentGameState = null;
  let currentHand = [];
  let selectedCardId = null;
  let pendingWildCardId = null;
  let unhandledTargetPlayerId = null;

  // Restore saved player name from localStorage
  const savedName = localStorage.getItem('uno_player_name');
  if (savedName) {
    playerNameInput.value = savedName;
  }

  // Check URL parameters for room code (e.g., ?room=K9X2) and auto-fill input
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room') || urlParams.get('code');
  if (roomParam) {
    roomCodeInput.value = roomParam.trim().toUpperCase();
    if (!savedName && playerNameInput) {
      setTimeout(() => playerNameInput.focus(), 300);
    }
  }

  // Restrict room code input to letters only (no numbers)
  roomCodeInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase();
  });

  // Navigation Function
  function showScreen(screenName) {
    loginScreen.classList.remove('active');
    lobbyScreen.classList.remove('active');
    gameScreen.classList.remove('active');

    if (screenName === 'login') loginScreen.classList.add('active');
    if (screenName === 'lobby') lobbyScreen.classList.add('active');
    if (screenName === 'game') {
      gameScreen.classList.add('active');
      gameEngine.resizeCanvas();
    }
  }

  // Error Display Helper
  function showError(msg) {
    loginError.textContent = msg;
    setTimeout(() => {
      if (loginError.textContent === msg) loginError.textContent = '';
    }, 4000);
  }

  // Action Log Toast Helper
  function showToast(msg) {
    actionLogToast.textContent = msg;
    actionLogToast.style.opacity = '1';
  }

  // ================= EVENT LISTENERS =================

  // Create Room
  btnCreateRoom.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    if (!name) return showError('Bitte gib einen Spielernamen ein!');

    localStorage.setItem('uno_player_name', name);
    window.soundManager.init();

    window.socketClient.createRoom(name, (res) => {
      if (res.success) {
        showScreen('lobby');
      } else {
        showError(res.message);
      }
    });
  });

  // Join Room
  btnJoinRoom.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    const code = roomCodeInput.value.trim().toUpperCase();
    if (!name) return showError('Bitte gib einen Spielernamen ein!');
    if (!code || code.length !== 4) return showError('Gültigen 4-stelligen Raumcode eingeben!');

    localStorage.setItem('uno_player_name', name);
    window.soundManager.init();

    window.socketClient.joinRoom(code, name, (res) => {
      if (res.success) {
        showScreen('lobby');
      } else {
        showError(res.message);
      }
    });
  });

  // Toggle Ready
  btnToggleReady.addEventListener('click', () => {
    window.socketClient.toggleReady();
  });

  // Start Game (Host)
  btnStartGame.addEventListener('click', () => {
    window.socketClient.startGame((res) => {
      if (!res.success) {
        alert(res.message);
      }
    });
  });

  // Leave Lobby / Game
  btnLeaveLobby.addEventListener('click', () => location.reload());
  btnLeaveGame.addEventListener('click', () => location.reload());

  // Copy Room Code
  btnCopyCode.addEventListener('click', () => {
    const code = displayRoomCode.textContent;
    navigator.clipboard.writeText(code).then(() => {
      alert(`Raumcode ${code} in die Zwischenablage kopiert!`);
    });
  });

  // Share Room Code via WhatsApp
  const btnShareWhatsapp = document.getElementById('btn-share-whatsapp');
  if (btnShareWhatsapp) {
    btnShareWhatsapp.addEventListener('click', () => {
      const code = displayRoomCode ? displayRoomCode.textContent : '';
      if (!code || code === '----') return;
      const joinUrl = `${window.location.origin}${window.location.pathname}?room=${code}`;
      const shareText = `Spiele mit mir UNO! 🎴\nKlicke auf den Link zum Beitreten:\n${joinUrl}`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(whatsappUrl, '_blank');
    });
  }

  // Toggle Sound Mute
  btnToggleSound.addEventListener('click', () => {
    const enabled = window.soundManager.toggleSound();
    btnToggleSound.textContent = enabled ? '🔊' : '🔇';
  });

  // Toggle Leaderboard Modal
  btnToggleLeaderboard.addEventListener('click', () => {
    leaderboardModal.classList.add('active');
  });
  btnCloseLeaderboard.addEventListener('click', () => {
    leaderboardModal.classList.remove('active');
  });

  // Toggle Rules Modal
  if (btnToggleRules) {
    btnToggleRules.addEventListener('click', () => rulesModal.classList.add('active'));
  }
  if (btnLobbyRules) {
    btnLobbyRules.addEventListener('click', () => rulesModal.classList.add('active'));
  }
  if (btnCloseRules) {
    btnCloseRules.addEventListener('click', () => rulesModal.classList.remove('active'));
  }
  if (rulesModal) {
    rulesModal.addEventListener('click', (e) => {
      if (e.target === rulesModal) rulesModal.classList.remove('active');
    });
  }

  // Toggle Fullscreen (Blue Button)
  if (btnToggleFullscreen) {
    btnToggleFullscreen.addEventListener('click', () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        const docEl = document.documentElement;
        if (docEl.requestFullscreen) {
          docEl.requestFullscreen().catch(err => console.warn('[Fullscreen] Error:', err.message));
        } else if (docEl.webkitRequestFullscreen) {
          docEl.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(err => console.warn('[Fullscreen] Error:', err.message));
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    });

    const updateFullscreenIcon = () => {
      const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
      btnToggleFullscreen.textContent = isFullscreen ? '🗗' : '⛶';
      btnToggleFullscreen.title = isFullscreen ? 'Vollbild beenden' : 'Vollbild aktivieren';
    };

    document.addEventListener('fullscreenchange', updateFullscreenIcon);
    document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);
  }

  // Screen Wake Lock API
  let wakeLock = null;

  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        if (!wakeLock || wakeLock.released) {
          wakeLock = await navigator.wakeLock.request('screen');
          console.log('[WakeLock] Screen standby disabled');
        }
      }
    } catch (err) {
      console.warn('[WakeLock] Request failed:', err.message);
    }
  }

  function releaseWakeLock() {
    if (wakeLock && !wakeLock.released) {
      wakeLock.release().then(() => {
        wakeLock = null;
        console.log('[WakeLock] Released');
      }).catch(err => console.warn('[WakeLock] Release error:', err.message));
    }
  }

  // Handle visibilitychange event to re-acquire wake lock when returning to tab
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && currentGameState && currentGameState.status === 'playing') {
      await requestWakeLock();
    }
  });

  // Prevent Pinch-to-zoom gestures on touch devices
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('gesturechange', (e) => e.preventDefault());
  document.addEventListener('gestureend', (e) => e.preventDefault());

  // Prevent double-tap zoom on iOS Safari / Android Chrome
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
        e.preventDefault();
      }
    }
    lastTouchEnd = now;
  }, { passive: false });

  // Prevent accidental touchmove scroll on non-scrollable containers
  document.addEventListener('touchmove', (e) => {
    if (!e.target.closest('.hand-container') && !e.target.closest('.modal-content') && !e.target.closest('.players-section')) {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }
  }, { passive: false });

  // Call UNO!
  btnCallUno.addEventListener('click', () => {
    window.socketClient.callUno((res) => {
      if (res.success) {
        window.soundManager.unoCall();
      } else {
        window.soundManager.errorSound();
      }
    });
  });

  // Draw Card
  btnDrawCard.addEventListener('click', () => {
    window.socketClient.drawCard((res) => {
      if (res.success) {
        window.soundManager.drawCard();
      } else {
        window.soundManager.errorSound();
      }
    });
  });

  // Pass Turn
  btnPassTurn.addEventListener('click', () => {
    window.socketClient.passTurn((res) => {
      if (!res.success) {
        window.soundManager.errorSound();
      }
    });
  });

  // Catch UNO Penalty
  btnCatchUno.addEventListener('click', () => {
    if (unhandledTargetPlayerId) {
      window.socketClient.catchUno(unhandledTargetPlayerId, (res) => {
        if (res.success) {
          window.soundManager.unoCall();
        } else {
          window.soundManager.errorSound();
        }
      });
    }
  });

  // Color Picker Modal Buttons
  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const chosenColor = btn.getAttribute('data-color');
      colorPickerModal.classList.remove('active');
      if (pendingWildCardId) {
        executePlayCard(pendingWildCardId, chosenColor);
        pendingWildCardId = null;
      }
    });
  });

  // Next Round Button
  btnNextRound.addEventListener('click', () => {
    roundWinModal.classList.remove('active');
    if (window.fireworksManager) window.fireworksManager.stop();
    window.socketClient.startGame((res) => {
      if (!res.success) {
        showScreen('lobby');
      }
    });
  });

  // ================= SOCKET EVENT LISTENERS =================

  window.socketClient.onGameState((state) => {
    currentGameState = state;
    gameEngine.setGameState(state, window.socketClient.socketId);

    const myId = window.socketClient.socketId;

    // Update screen views based on game status
    if (state.status === 'lobby') {
      releaseWakeLock();
      roundWinModal.classList.remove('active');
      if (window.fireworksManager) window.fireworksManager.stop();
      colorPickerModal.classList.remove('active');
      pendingWildCardId = null;
      showScreen('lobby');
      updateLobbyUI(state);
    } else if (state.status === 'playing') {
      requestWakeLock();
      roundWinModal.classList.remove('active');
      if (window.fireworksManager) window.fireworksManager.stop();
      // Only close color picker if turn timed out or passed to another player
      if (pendingWildCardId && state.activePlayerId !== myId) {
        colorPickerModal.classList.remove('active');
        pendingWildCardId = null;
      }
      showScreen('game');
      gameEngine.resizeCanvas();
      updateGameHUD(state);
      updateCatchUnoBanner(state);
    } else if (state.status === 'ended') {
      releaseWakeLock();
      colorPickerModal.classList.remove('active');
      pendingWildCardId = null;
      showScreen('game');
      updateGameHUD(state);
      showRoundWinModal(state);
    }

    updateLeaderboardUI(state.leaderboard);
  });

  window.socketClient.onPlayerHand((hand) => {
    currentHand = hand;
    renderPlayerHand();
  });

  // ================= UI RENDER HELPERS =================

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function updateLobbyUI(state) {
    displayRoomCode.textContent = state.code;
    playerCountDisplay.textContent = state.players.length;

    playersList.innerHTML = '';
    const myId = window.socketClient.socketId;
    let isHost = false;

    state.players.forEach(p => {
      if (p.id === myId && p.isHost) isHost = true;

      const li = document.createElement('li');
      li.className = 'player-card';

      let statusBadge;
      if (p.isHost) {
        statusBadge = `<span class="badge badge-host">HOST</span>`;
      } else {
        statusBadge = p.isReady
          ? `<span class="badge badge-ready">BEREIT</span>`
          : `<span class="badge badge-waiting">WARTET</span>`;
      }

      li.innerHTML = `
        <div class="player-info">
          <div class="avatar-circle">${p.name.charAt(0).toUpperCase()}</div>
          <strong>${p.name}</strong>
        </div>
        <div>${statusBadge}</div>
      `;
      playersList.appendChild(li);
    });

    const me = state.players.find(p => p.id === myId);

    if (isHost) {
      btnStartGame.style.display = 'inline-flex';
      btnToggleReady.style.display = 'none';
    } else {
      btnStartGame.style.display = 'none';
      btnToggleReady.style.display = 'inline-flex';
      if (me) {
        btnToggleReady.textContent = me.isReady ? 'Bereit ✓ (Ändern)' : 'Ready schalten';
        btnToggleReady.className = me.isReady ? 'btn btn-success' : 'btn btn-secondary';
      }
    }
  }

  function updateGameHUD(state) {
    gameRoomCode.textContent = state.code;
    showToast(state.lastAction);

    // Turn Timer Bar Update
    const pct = Math.max(0, (state.turnTimeRemaining / 20) * 100);
    turnTimerBar.style.width = `${pct}%`;
    turnTimerText.textContent = `${state.turnTimeRemaining}s`;

    if (state.turnTimeRemaining <= 5) {
      window.soundManager.timerTick();
    }

    // Active Turn Indicator
    const activePlayer = state.players.find(p => p.id === state.activePlayerId);
    const myId = window.socketClient.socketId;

    const gameScreenEl = document.getElementById('game-screen');
    const canvasWrapperEl = document.querySelector('.canvas-wrapper');

    if (state.activePlayerId === myId) {
      activeTurnIndicator.innerHTML = '⚡ DU BIST AM ZUG!';
      activeTurnIndicator.removeAttribute('style');
      activeTurnIndicator.classList.add('my-turn');
      if (gameScreenEl) gameScreenEl.classList.add('my-turn-bg');
      if (canvasWrapperEl) canvasWrapperEl.classList.add('my-turn-bg');
    } else {
      const pName = activePlayer ? escapeHTML(activePlayer.name) : '';
      activeTurnIndicator.innerHTML = activePlayer ? `Warten auf<br><strong>${pName}</strong>` : 'Warten...';
      activeTurnIndicator.removeAttribute('style');
      activeTurnIndicator.classList.remove('my-turn');
      if (gameScreenEl) gameScreenEl.classList.remove('my-turn-bg');
      if (canvasWrapperEl) canvasWrapperEl.classList.remove('my-turn-bg');
    }

    // Pass turn button visibility
    if (state.activePlayerId === myId && state.drawnThisTurn) {
      btnPassTurn.style.display = 'inline-flex';
    } else {
      btnPassTurn.style.display = 'none';
    }
  }

  function updateCatchUnoBanner(state) {
    const myId = window.socketClient.socketId;
    // Check if any opponent has 1 card and forgot to call UNO
    const missedUnoPlayer = state.players.find(p => p.id !== myId && p.handCount === 1 && !p.hasCalledUno);

    if (missedUnoPlayer) {
      unhandledTargetPlayerId = missedUnoPlayer.id;
      catchUnoText.textContent = `🚨 ${missedUnoPlayer.name} hat 1 Karte & kein UNO gerufen!`;
      catchUnoBanner.classList.remove('hidden');
    } else {
      unhandledTargetPlayerId = null;
      catchUnoBanner.classList.add('hidden');
    }
  }

  function getCardFilename(card) {
    if (!card) return null;
    if (card.type === 'wild') return 'wild.svg';
    if (card.type === 'wild4') return 'wild_draw4.svg';
    const color = (card.color === 'black') ? 'red' : card.color;
    if (card.type === 'number') return `${color}_${card.value}.svg`;
    return `${color}_${card.type}.svg`;
  }

  function renderPlayerHand() {
    handCardsList.innerHTML = '';
    const myId = window.socketClient.socketId;
    const isMyTurn = currentGameState && currentGameState.activePlayerId === myId;

    currentHand.forEach((card, idx) => {
      const cardEl = document.createElement('div');
      cardEl.className = 'card-item';
      cardEl.setAttribute('data-color', card.color);
      cardEl.style.zIndex = idx + 1;

      const fileName = getCardFilename(card);
      cardEl.innerHTML = `
        <img src="/cards/${fileName}" alt="${card.type} ${card.value}" class="card-img" draggable="false" />
      `;

      cardEl.addEventListener('click', () => {
        if (!isMyTurn) {
          window.soundManager.errorSound();
          return;
        }

        if (card.type === 'wild' || card.type === 'wild4') {
          pendingWildCardId = card.id;
          colorPickerModal.classList.add('active');
        } else {
          executePlayCard(card.id, null);
        }
      });

      handCardsList.appendChild(cardEl);
    });
  }

  function executePlayCard(cardId, chosenColor) {
    window.socketClient.playCard(cardId, chosenColor, (res) => {
      if (res.success) {
        window.soundManager.playCard();
      } else {
        window.soundManager.errorSound();
        showToast(res.message);
      }
    });
  }

  function updateLeaderboardUI(leaderboard) {
    if (!leaderboard) return;
    leaderboardBody.innerHTML = '';

    leaderboard.forEach((entry, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>#${idx + 1}</td>
        <td><strong>${entry.name}</strong></td>
        <td>${entry.score} pts</td>
        <td>${entry.wins} Siege</td>
      `;
      leaderboardBody.appendChild(tr);
    });
  }

  function showRoundWinModal(state) {
    const winner = state.players.find(p => p.handCount === 0);
    const winTitle = document.getElementById('win-title');
    const winSubtitle = document.getElementById('win-subtitle');
    const winPoints = document.getElementById('win-points');

    if (winner) {
      let points = state.lastRoundPoints;
      if (points === undefined && state.lastAction) {
        const match = state.lastAction.match(/\(\+(\d+)\s*Punkte\)/);
        if (match) points = parseInt(match[1], 10);
      }
      if (points === undefined) points = 0;

      winTitle.textContent = '🏆 Spiel beendet';
      winSubtitle.textContent = `${winner.name} hat gewonnen! 🎉`;
      winPoints.textContent = `+${points} Punkte`;
      window.soundManager.winSound();
    } else {
      winTitle.textContent = '🏆 Spiel beendet';
      winSubtitle.textContent = state.lastAction || 'Kein Gewinner';
      winPoints.textContent = '0 Punkte';
    }

    // Only host sees "Next Round" button
    const myId = window.socketClient.socketId;
    const isHost = state.players.some(p => p.id === myId && p.isHost);
    btnNextRound.style.display = isHost ? 'inline-flex' : 'none';

    roundWinModal.classList.add('active');
    if (window.fireworksManager) {
      window.fireworksManager.start();
    }
  }

  // Screen Orientation Lock Helper
  function lockPortraitOrientation() {
    if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
      window.screen.orientation.lock('portrait').catch(() => {});
    }
  }

  // Initial setup
  lockPortraitOrientation();
  window.addEventListener('orientationchange', lockPortraitOrientation);
  showScreen('login');
});
