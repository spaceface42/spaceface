export const VERSION = '2.0.0';
export function generateId(prefix = 'id', length = 9, useCrypto = false) {
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
//# sourceMappingURL=generateId.js.map