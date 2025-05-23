
// src/lib/quizUtils.ts

/**
 * Generates a random friendly Quiz ID.
 * Format: 4 random uppercase alphanumeric characters.
 */
export function generateFriendlyQuizId(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}
