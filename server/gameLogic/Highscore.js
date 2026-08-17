class HighscoreManager {
  constructor() {
    // Map of playerId -> { name, score, wins, roundsPlayed }
    this.scores = new Map();
  }

  registerPlayer(playerId, name) {
    if (!this.scores.has(playerId)) {
      this.scores.set(playerId, {
        id: playerId,
        name: name,
        score: 0,
        wins: 0,
        roundsPlayed: 0
      });
    } else {
      // Update name if changed
      const entry = this.scores.get(playerId);
      entry.name = name;
    }
  }

  removePlayer(playerId) {
    this.scores.delete(playerId);
  }

  calculateRoundPoints(winnerId, players) {
    let totalRoundPoints = 0;

    players.forEach(p => {
      if (p.id !== winnerId) {
        p.hand.forEach(card => {
          if (card.type === 'number') {
            totalRoundPoints += card.value;
          } else if (['skip', 'reverse', 'draw2'].includes(card.type)) {
            totalRoundPoints += 20;
          } else if (['wild', 'wild4'].includes(card.type)) {
            totalRoundPoints += 50;
          }
        });
      }
    });

    players.forEach(p => {
      const entry = this.scores.get(p.id);
      if (entry) {
        entry.roundsPlayed += 1;
        if (p.id === winnerId) {
          entry.score += totalRoundPoints;
          entry.wins += 1;
        }
      }
    });

    return totalRoundPoints;
  }

  getLeaderboard() {
    const list = Array.from(this.scores.values());
    list.sort((a, b) => b.score - a.score || b.wins - a.wins);
    return list;
  }
}

module.exports = HighscoreManager;
