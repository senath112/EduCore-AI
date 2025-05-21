
// src/lib/classUtils.ts

/**
 * Generates a random friendly Class ID.
 * Format: 6 random uppercase alphanumeric characters.
 */
export function generateFriendlyClassId(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}
