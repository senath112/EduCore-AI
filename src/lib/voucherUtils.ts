
// src/lib/voucherUtils.ts

/**
 * Generates a random alphanumeric voucher code.
 * Format: 8 random uppercase alphanumeric characters.
 */
export function generateVoucherCode(length: number = 8): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}
