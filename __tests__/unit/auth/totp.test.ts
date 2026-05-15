import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  generateTotpSecret,
  verifyTotpCode,
  getTotpUri,
  generateTotpCode,
  encryptTotpSecret,
  decryptTotpSecret,
} from '@/lib/auth/totp'

afterEach(() => {
  vi.useRealTimers()
})

describe('generateTotpSecret', () => {
  it('returns a non-empty base32 string', () => {
    const s = generateTotpSecret()
    expect(s).toMatch(/^[A-Z2-7]+=*$/)
  })

  it('returns at least 16 characters (80 bits entropy)', () => {
    const s = generateTotpSecret()
    expect(s.replace(/=+$/, '').length).toBeGreaterThanOrEqual(16)
  })

  it('returns unique secrets each call', () => {
    const a = generateTotpSecret()
    const b = generateTotpSecret()
    expect(a).not.toBe(b)
  })
})

describe('generateTotpCode', () => {
  it('returns a 6-digit string', () => {
    const secret = generateTotpSecret()
    const counter = Math.floor(Date.now() / 1000 / 30)
    const code = generateTotpCode(secret, counter)
    expect(code).toMatch(/^\d{6}$/)
  })

  it('generates the same code for the same secret and counter', () => {
    const secret = generateTotpSecret()
    const counter = 12345
    expect(generateTotpCode(secret, counter)).toBe(generateTotpCode(secret, counter))
  })

  it('generates different codes for consecutive counters', () => {
    const secret = generateTotpSecret()
    const counter = 12345
    expect(generateTotpCode(secret, counter)).not.toBe(generateTotpCode(secret, counter + 1))
  })
})

describe('verifyTotpCode', () => {
  it('accepts the current code', () => {
    const secret = generateTotpSecret()
    const counter = Math.floor(Date.now() / 1000 / 30)
    const code = generateTotpCode(secret, counter)
    expect(verifyTotpCode(secret, code)).toBe(true)
  })

  it('accepts a code one window behind (clock skew tolerance)', () => {
    const secret = generateTotpSecret()
    const counter = Math.floor(Date.now() / 1000 / 30) - 1
    const code = generateTotpCode(secret, counter)
    expect(verifyTotpCode(secret, code)).toBe(true)
  })

  it('rejects a code two windows behind', () => {
    const secret = generateTotpSecret()
    const counter = Math.floor(Date.now() / 1000 / 30) - 2
    const code = generateTotpCode(secret, counter)
    expect(verifyTotpCode(secret, code)).toBe(false)
  })

  it('rejects a completely wrong code', () => {
    const secret = generateTotpSecret()
    expect(verifyTotpCode(secret, '000000')).toBe(false)
  })

  it('rejects a code with wrong length', () => {
    const secret = generateTotpSecret()
    expect(verifyTotpCode(secret, '12345')).toBe(false)
    expect(verifyTotpCode(secret, '1234567')).toBe(false)
  })

  it('rejects replay: counter already used', () => {
    const secret = generateTotpSecret()
    const counter = Math.floor(Date.now() / 1000 / 30)
    const code = generateTotpCode(secret, counter)
    expect(verifyTotpCode(secret, code, counter)).toBe(false)
  })
})

describe('getTotpUri', () => {
  it('returns an otpauth URI', () => {
    const uri = getTotpUri('JBSWY3DPEHPK3PXP', 'alice', 'Teambeheer')
    expect(uri).toMatch(/^otpauth:\/\/totp\//)
    expect(uri).toContain('JBSWY3DPEHPK3PXP')
    expect(uri).toContain('alice')
    expect(uri).toContain('Teambeheer')
  })
})

describe('encryptTotpSecret / decryptTotpSecret', () => {
  const KEY = Buffer.alloc(32, 0x61) // 32 bytes of 'a'

  it('round-trips a secret correctly', () => {
    const original = generateTotpSecret()
    const cipher = encryptTotpSecret(original, KEY)
    expect(decryptTotpSecret(cipher, KEY)).toBe(original)
  })

  it('produces different ciphertexts for the same input (random IV)', () => {
    const secret = generateTotpSecret()
    const a = encryptTotpSecret(secret, KEY)
    const b = encryptTotpSecret(secret, KEY)
    expect(a).not.toBe(b)
  })

  it('stores iv, authTag and ciphertext separated by colons', () => {
    const cipher = encryptTotpSecret(generateTotpSecret(), KEY)
    expect(cipher.split(':').length).toBe(3)
  })

  it('throws when decrypting with the wrong key', () => {
    const cipher = encryptTotpSecret(generateTotpSecret(), KEY)
    expect(() => decryptTotpSecret(cipher, Buffer.alloc(32, 0x62))).toThrow()
  })
})
