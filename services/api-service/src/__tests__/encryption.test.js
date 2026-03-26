const crypto = require('crypto');

// Set a valid test encryption key before requiring the module
const TEST_KEY = crypto.randomBytes(32).toString('hex');
process.env.ENCRYPTION_KEY = TEST_KEY;

const { encrypt, decrypt, isEncrypted, generateEncryptionKey } = require('../utils/encryption');

describe('encrypt / decrypt roundtrip', () => {
  it('roundtrips a simple string', () => {
    const plaintext = 'gho_abc123def456';
    const ciphertext = encrypt(plaintext);
    expect(decrypt(ciphertext)).toBe(plaintext);
  });

  it('roundtrips unicode content', () => {
    const plaintext = 'tökën-with-émojis-🔑';
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  it('produces different ciphertext on each call (random IV)', () => {
    const plaintext = 'same-input';
    const a = encrypt(plaintext);
    const b = encrypt(plaintext);
    expect(a).not.toBe(b);
    // but both decrypt to the same value
    expect(decrypt(a)).toBe(plaintext);
    expect(decrypt(b)).toBe(plaintext);
  });
});

describe('encrypt validation', () => {
  it('throws on empty string', () => {
    expect(() => encrypt('')).toThrow();
  });

  it('throws on non-string input', () => {
    expect(() => encrypt(123)).toThrow();
    expect(() => encrypt(null)).toThrow();
  });
});

describe('decrypt validation', () => {
  it('throws on malformed data (wrong number of parts)', () => {
    expect(() => decrypt('onlyone')).toThrow();
    expect(() => decrypt('two:parts')).toThrow();
  });

  it('throws on tampered ciphertext', () => {
    const ciphertext = encrypt('secret');
    const parts = ciphertext.split(':');
    parts[2] = 'ff'.repeat(parts[2].length / 2); // replace encrypted portion
    expect(() => decrypt(parts.join(':'))).toThrow();
  });

  it('throws on empty/null input', () => {
    expect(() => decrypt('')).toThrow();
    expect(() => decrypt(null)).toThrow();
  });
});

describe('isEncrypted', () => {
  it('returns true for output of encrypt()', () => {
    const ciphertext = encrypt('test-token');
    expect(isEncrypted(ciphertext)).toBe(true);
  });

  it('returns false for plain strings', () => {
    expect(isEncrypted('just-a-token')).toBe(false);
    expect(isEncrypted('gho_abc123')).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isEncrypted(null)).toBe(false);
    expect(isEncrypted(undefined)).toBe(false);
    expect(isEncrypted('')).toBe(false);
  });
});

describe('generateEncryptionKey', () => {
  it('returns a 64-char hex string', () => {
    const key = generateEncryptionKey();
    expect(key).toMatch(/^[a-f0-9]{64}$/);
  });

  it('generates unique keys', () => {
    const a = generateEncryptionKey();
    const b = generateEncryptionKey();
    expect(a).not.toBe(b);
  });
});

describe('getEncryptionKey validation', () => {
  it('throws when ENCRYPTION_KEY is missing', () => {
    const saved = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY environment variable is required');
    process.env.ENCRYPTION_KEY = saved;
  });

  it('throws when ENCRYPTION_KEY is wrong length', () => {
    const saved = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = 'tooshort';
    expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY must be 64 hex characters');
    process.env.ENCRYPTION_KEY = saved;
  });
});
