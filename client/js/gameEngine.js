function getCardFilename(card) {
  if (!card) return null;
  if (card.type === 'wild') return 'wild.svg';
  if (card.type === 'wild4') return 'wild_draw4.svg';
  const color = (card.color === 'black') ? 'red' : card.color;
  if (card.type === 'number') return `${color}_${card.value}.svg`;
  return `${color}_${card.type}.svg`;
}

/**
 * 2D Canvas Game Renderer & Animation Engine
 */
class GameEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    
    this.gameState = null;
    this.localPlayerId = null;
    this.animatingCards = []; // Floating card animations
    this.rotationAngle = 0;
    this.cardImages = new Map(); // Cache SVG Card Image elements

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    if (!parent || parent.clientWidth === 0 || parent.clientHeight === 0) return;

    this.width = parent.clientWidth;
    this.height = parent.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
  }

  setGameState(state, localSocketId) {
    this.gameState = state;
    this.localPlayerId = localSocketId;
  }

  loop() {
    if (this.canvas && this.canvas.parentElement) {
      const pW = this.canvas.parentElement.clientWidth;
      const pH = this.canvas.parentElement.clientHeight;
      if (pW > 0 && pH > 0 && (this.width !== pW || this.height !== pH)) {
        this.resizeCanvas();
      }
    }

    const dpr = window.devicePixelRatio || 1;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    this.ctx.clearRect(0, 0, this.width, this.height);

    if (this.gameState && this.gameState.status === 'playing') {
      this.drawTable();
      this.drawCenterPiles();
      this.drawOpponents();
      this.drawAnimations();
    } else {
      this.drawLobbyPlaceholder();
    }

    requestAnimationFrame(this.loop);
  }

  drawLobbyPlaceholder() {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    this.ctx.font = '700 24px Outfit, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Warte auf Spielstart...', this.width / 2, this.height / 2);
    this.ctx.restore();
  }

  drawTable() {
    const centerX = this.width / 2;
    const centerY = this.height / 2 - 20;
    const tableRadius = Math.min(this.width * 0.38, this.height * 0.30, 240);

    this.ctx.save();

    // Table Shadow
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY + 10, tableRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    this.ctx.fill();

    // Outer Felt Table Border (Circular)
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, tableRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = '#102a43';
    this.ctx.fill();
    this.ctx.lineWidth = 12;
    this.ctx.strokeStyle = '#243b53';
    this.ctx.stroke();

    // Inner Active Color Glow Ring
    const activeColor = this.gameState ? this.gameState.currentColor : null;
    let strokeColor = 'rgba(255, 255, 255, 0.2)';
    if (activeColor === 'red') strokeColor = '#ff3838';
    if (activeColor === 'yellow') strokeColor = '#ffb142';
    if (activeColor === 'green') strokeColor = '#32ff7e';
    if (activeColor === 'blue') strokeColor = '#18dcff';

    this.ctx.lineWidth = 4;
    this.ctx.strokeStyle = strokeColor;
    this.ctx.shadowColor = strokeColor;
    this.ctx.shadowBlur = 15;
    this.ctx.stroke();

    // Direction Rotating Arrows (Circular Ring)
    this.rotationAngle += 0.01 * (this.gameState ? this.gameState.direction : 1);
    this.drawDirectionRing(centerX, centerY, tableRadius - 35, strokeColor);

    this.ctx.restore();
  }

  drawDirectionRing(cx, cy, radius, color) {
    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.rotate(this.rotationAngle);

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([12, 12]);
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawCenterPiles() {
    const cx = this.width / 2;
    const cy = this.height / 2 - 20;
    const tableRadius = Math.min(this.width * 0.38, this.height * 0.30, 240);

    const cardW = Math.min(60, Math.max(40, tableRadius * 0.40));
    const cardH = cardW * 1.5;
    const gap = 12;

    // Draw Pile (Left)
    const deckX = cx - cardW - gap / 2;
    const deckY = cy - cardH / 2;

    // 3D Deck stack effect
    const remaining = this.gameState ? Math.min(this.gameState.deckRemaining, 5) : 3;
    for (let i = 0; i < remaining; i++) {
      this.drawCardBack(deckX - i * 2, deckY - i * 2, cardW, cardH);
    }

    // Deck Count Label
    this.ctx.save();
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '800 12px Outfit, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${this.gameState ? this.gameState.deckRemaining : 0} Karten`, deckX + cardW / 2, deckY + cardH + 16);
    this.ctx.restore();

    // Discard Pile (Right)
    const discardX = cx + gap / 2;
    const discardY = cy - cardH / 2;

    if (this.gameState && this.gameState.topCard) {
      this.drawCardFront(discardX, discardY, cardW, cardH, this.gameState.topCard);
    }
  }

  drawCardBack(x, y, w, h) {
    this.ctx.save();
    this.ctx.fillStyle = '#1e272e';
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;

    this.roundRect(x, y, w, h, 6);
    this.ctx.fill();
    this.ctx.stroke();

    // Inner Red Oval
    this.ctx.fillStyle = '#ff3838';
    this.ctx.beginPath();
    this.ctx.ellipse(x + w / 2, y + h / 2, w * 0.35, h * 0.25, -Math.PI / 4, 0, Math.PI * 2);
    this.ctx.fill();

    // UNO Text
    this.ctx.fillStyle = '#ffb142';
    this.ctx.font = '900 11px Outfit, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('UNO', x + w / 2, y + h / 2);

    this.ctx.restore();
  }

  drawCardFront(x, y, w, h, card) {
    if (!card) return;

    const fileName = getCardFilename(card);
    if (!fileName) return;

    let img = this.cardImages.get(fileName);
    if (!img) {
      img = new Image();
      img.src = `/cards/${fileName}`;
      this.cardImages.set(fileName, img);
    }

    this.ctx.save();

    if (img.complete && img.naturalWidth !== 0) {
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      this.ctx.shadowBlur = 10;
      this.ctx.shadowOffsetY = 4;
      this.roundRect(x, y, w, h, 6);
      this.ctx.clip();
      this.ctx.drawImage(img, x, y, w, h);
    } else {
      // Fallback while image loads
      this.ctx.fillStyle = '#ffffff';
      this.roundRect(x, y, w, h, 6);
      this.ctx.fill();
    }

    this.ctx.restore();

    // Glow indicator if wild card active color chosen
    if ((card.type === 'wild' || card.type === 'wild4') && this.gameState && this.gameState.currentColor) {
      let strokeColor = '#ffffff';
      if (this.gameState.currentColor === 'red') strokeColor = '#ff3838';
      if (this.gameState.currentColor === 'yellow') strokeColor = '#ffb142';
      if (this.gameState.currentColor === 'green') strokeColor = '#32ff7e';
      if (this.gameState.currentColor === 'blue') strokeColor = '#18dcff';

      this.ctx.save();
      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = 3;
      this.ctx.shadowColor = strokeColor;
      this.ctx.shadowBlur = 12;
      this.roundRect(x - 2, y - 2, w + 4, h + 4, 8);
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  drawOpponents() {
    if (!this.gameState || !this.gameState.players) return;

    const players = this.gameState.players;
    const total = players.length;

    // Find index of local player to align seats (local player always bottom)
    const localIndex = players.findIndex(p => p.id === this.localPlayerId);
    const baseIndex = localIndex >= 0 ? localIndex : 0;

    const cx = this.width / 2;
    const cy = this.height / 2 - 20;
    const tableRadius = Math.min(this.width * 0.38, this.height * 0.30, 240);
    const seatRadius = tableRadius + 32;

    players.forEach((player, i) => {
      // Calculate relative seat position starting from bottom (local player)
      const relativeIndex = (i - baseIndex + total) % total;
      
      // Skip drawing local player on table edge (they have bottom hand bar)
      if (relativeIndex === 0 && localIndex >= 0) return;

      // Position around table circle
      const angle = (relativeIndex / total) * Math.PI * 2 + Math.PI / 2;
      const px = cx + Math.cos(angle) * seatRadius;
      const py = cy + Math.sin(angle) * seatRadius;

      const isActive = i === this.gameState.currentTurnIndex;
      this.drawPlayerAvatar(px, py, player, isActive);
    });
  }

  drawPlayerAvatar(x, y, player, isActive) {
    this.ctx.save();

    // Turn Glow Halo
    if (isActive) {
      this.ctx.beginPath();
      this.ctx.arc(x, y, 28, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(24, 220, 255, 0.3)';
      this.ctx.shadowColor = '#18dcff';
      this.ctx.shadowBlur = 20;
      this.ctx.fill();
    }

    // Avatar Circle
    this.ctx.beginPath();
    this.ctx.arc(x, y, 22, 0, Math.PI * 2);
    this.ctx.fillStyle = isActive ? '#18dcff' : '#243b53';
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.fill();
    this.ctx.stroke();

    // Avatar Initial
    this.ctx.fillStyle = isActive ? '#0b0f19' : '#ffffff';
    this.ctx.font = '800 14px Outfit, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    const initial = (player.name || 'P').charAt(0).toUpperCase();
    this.ctx.fillText(initial, x, y);

    // Name Tag
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '600 12px Outfit, sans-serif';
    this.ctx.fillText(player.name, x, y + 34);

    // Card Count Badge
    const badgeY = y - 24;
    this.ctx.fillStyle = '#ff3838';
    this.ctx.beginPath();
    this.ctx.arc(x + 16, badgeY, 11, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '800 11px Outfit, sans-serif';
    this.ctx.fillText(player.handCount, x + 16, badgeY);

    // UNO Warning Flag
    if (player.handCount === 1) {
      this.ctx.fillStyle = '#ffb142';
      this.ctx.font = '900 10px Outfit, sans-serif';
      this.ctx.fillText('⚡ UNO!', x, y - 36);
    }

    this.ctx.restore();
  }

  drawAnimations() {
    // Render flying card particle animations if any
    for (let i = this.animatingCards.length - 1; i >= 0; i--) {
      const anim = this.animatingCards[i];
      anim.progress += 0.05;

      const currentX = anim.startX + (anim.targetX - anim.startX) * anim.progress;
      const currentY = anim.startY + (anim.targetY - anim.startY) * anim.progress;

      this.drawCardBack(currentX, currentY, 40, 60);

      if (anim.progress >= 1) {
        this.animatingCards.splice(i, 1);
      }
    }
  }

  triggerCardAnimation(startX, startY, targetX, targetY) {
    this.animatingCards.push({
      startX, startY, targetX, targetY, progress: 0
    });
  }

  roundRect(x, y, w, h, r) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.arcTo(x + w, y, x + w, y + h, r);
    this.ctx.arcTo(x + w, y + h, x, y + h, r);
    this.ctx.arcTo(x, y + h, x, y, r);
    this.ctx.arcTo(x, y, x + w, y, r);
    this.ctx.closePath();
  }
}

window.GameEngine = GameEngine;
