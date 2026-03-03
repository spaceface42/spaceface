// src/spaceface/system/bin/generateId.ts


/**
 * Generates a unique ID string with an optional prefix and length.
 *
 * @param prefix - The prefix for the ID (default: 'id').
 * @param length - The length of the random portion of the ID (default: 9).
 * @param useCrypto - Whether to use cryptographically secure random values (default: false).
 * @returns A unique ID string.
 */
export function generateId(prefix: string = 'id', length: number = 9, useCrypto: boolean = false): string {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error('Length must be a positive integer.');
  }

  const randomString = useCrypto
    ? Array.from(crypto.getRandomValues(new Uint8Array(length)))
        .map((byte) => (byte % 36).toString(36))
        .join('')
    : Math.random().toString(36).slice(2, 2 + length);

  return `${prefix}-${randomString}`;
}
