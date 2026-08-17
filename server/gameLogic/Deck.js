const COLORS = ['red', 'yellow', 'green', 'blue'];
const ACTION_TYPES = ['skip', 'reverse', 'draw2'];

class Deck {
  constructor() {
    this.cards = [];
    this.reset();
  }

  reset() {
    this.cards = [];
    let idCounter = 1;

    COLORS.forEach(color => {
      // One '0' card per color
      this.cards.push({
        id: `${color}_0_${idCounter++}`,
        color: color,
        type: 'number',
        value: 0
      });

      // Two '1'-'9' cards per color
      for (let i = 1; i <= 9; i++) {
        this.cards.push({
          id: `${color}_${i}_a_${idCounter++}`,
          color: color,
          type: 'number',
          value: i
        });
        this.cards.push({
          id: `${color}_${i}_b_${idCounter++}`,
          color: color,
          type: 'number',
          value: i
        });
      }

      // Two action cards per type per color
      ACTION_TYPES.forEach(action => {
        this.cards.push({
          id: `${color}_${action}_a_${idCounter++}`,
          color: color,
          type: action,
          value: action
        });
        this.cards.push({
          id: `${color}_${action}_b_${idCounter++}`,
          color: color,
          type: action,
          value: action
        });
      });
    });

    // 4 Wild cards
    for (let i = 1; i <= 4; i++) {
      this.cards.push({
        id: `black_wild_${i}_${idCounter++}`,
        color: 'black',
        type: 'wild',
        value: 'wild'
      });
    }

    // 4 Wild Draw 4 cards
    for (let i = 1; i <= 4; i++) {
      this.cards.push({
        id: `black_wild4_${i}_${idCounter++}`,
        color: 'black',
        type: 'wild4',
        value: 'wild4'
      });
    }

    this.shuffle();
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  draw(count = 1) {
    const drawn = [];
    for (let i = 0; i < count; i++) {
      if (this.cards.length > 0) {
        drawn.push(this.cards.pop());
      }
    }
    return count === 1 ? drawn[0] : drawn;
  }

  recycleDiscardPile(discardPile) {
    if (discardPile.length <= 1) return;
    const topCard = discardPile.pop();
    // Move remaining discard cards back into deck
    const recycled = discardPile.splice(0, discardPile.length);
    recycled.forEach(card => {
      // Reset color of wild cards back to black
      if (card.type === 'wild' || card.type === 'wild4') {
        card.color = 'black';
      }
    });
    this.cards = recycled;
    this.shuffle();
    discardPile.push(topCard);
  }

  get remaining() {
    return this.cards.length;
  }
}

module.exports = Deck;
