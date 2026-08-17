/**
 * Generates a random 4-character uppercase letter room code (no numbers).
 * Excludes easily confused letters like O and I.
 */
const CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

function generateRoomCode(length = 4) {
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * CHARACTERS.length);
    result += CHARACTERS.charAt(randomIndex);
  }
  return result;
}

module.exports = { generateRoomCode };
