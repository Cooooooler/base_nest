import { encrypt, decrypt } from './crypto.util';

describe('CryptoUtil', () => {
  const originalKey = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef';
  });

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalKey;
  });

  it('should encrypt and decrypt a string', () => {
    const plaintext = 'sk-proj-xxxxxxxxxxxx';
    const encrypted = encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted).toContain(':');
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('should produce different ciphertexts for same plaintext (IV randomness)', () => {
    const plaintext = 'same-key';
    const a = encrypt(plaintext);
    const b = encrypt(plaintext);
    expect(a).not.toBe(b);
  });

  it('should throw if ENCRYPTION_KEY is not set', () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY is not set');
  });

  it('should throw if encrypted format is invalid', () => {
    expect(() => decrypt('invalid-format')).toThrow('Invalid encrypted text format');
  });
});
