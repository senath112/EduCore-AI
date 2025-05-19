// src/lib/supportUtils.ts

/**
 * Generates a random Support ID.
 * Format: 4 random numbers followed by 1 random capital letter (e.g., 1234A).
 */
export function generateSupportId(): string {
  const numbers = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join('');
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const letter = letters[Math.floor(Math.random() * letters.length)];
  return `${numbers}${letter}`;
}
