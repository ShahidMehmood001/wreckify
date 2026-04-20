import { encrypt, decrypt } from './encryption.util';

describe('Encryption Utility', () => {
  const KEY = 'test-secret-key-32-chars-padding!';
  const PLAINTEXT = 'sk-abc123-my-api-key';

  describe('encrypt', () => {
    it('should return a hex string with IV and ciphertext separated by colon', () => {
      const result = encrypt(PLAINTEXT, KEY);
      expect(result).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
    });

    it('should produce different ciphertexts on each call (random IV)', () => {
      const result1 = encrypt(PLAINTEXT, KEY);
      const result2 = encrypt(PLAINTEXT, KEY);
      expect(result1).not.toBe(result2);
    });

    it('should encode the IV as 32 hex chars (16 bytes)', () => {
      const [ivHex] = encrypt(PLAINTEXT, KEY).split(':');
      expect(ivHex).toHaveLength(32);
    });
  });

  describe('decrypt', () => {
    it('should recover the original plaintext', () => {
      const encrypted = encrypt(PLAINTEXT, KEY);
      expect(decrypt(encrypted, KEY)).toBe(PLAINTEXT);
    });

    it('should handle multi-round encrypt/decrypt correctly', () => {
      for (let i = 0; i < 5; i++) {
        const encrypted = encrypt(PLAINTEXT, KEY);
        expect(decrypt(encrypted, KEY)).toBe(PLAINTEXT);
      }
    });

    it('should handle short keys by padding to 32 bytes', () => {
      const shortKey = 'short';
      const encrypted = encrypt(PLAINTEXT, shortKey);
      expect(decrypt(encrypted, shortKey)).toBe(PLAINTEXT);
    });

    it('should throw when given a corrupted ciphertext', () => {
      expect(() => decrypt('badhex:badhex', KEY)).toThrow();
    });
  });

  describe('round-trip edge cases', () => {
    it.each([
      ['empty string', ''],
      ['special chars', 'sk-proj-!@#$%^&*()_+'],
      ['unicode', '密钥123'],
      ['long key', 'a'.repeat(200)],
    ])('%s', (_, value) => {
      expect(decrypt(encrypt(value, KEY), KEY)).toBe(value);
    });
  });
});
