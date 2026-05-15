import { describe, it, expect, vi, afterEach } from 'vitest'
import { getTotpEncryptionKey, getTotpFallbackKey, getTotpLegacyKeys } from '@/lib/auth/totp-key'
import { generateTotpSecret, encryptTotpSecret, decryptTotpSecretWithFallback } from '@/lib/auth/totp'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('getTotpEncryptionKey', () => {
  it('returns a 32-byte Buffer (AES-256-GCM requires exactly 32 bytes)', () => {
    vi.stubEnv('AUTH_SECRET', 'test-secret-for-key-derivation-test')
    const key = getTotpEncryptionKey()
    expect(Buffer.isBuffer(key)).toBe(true)
    expect(key.byteLength).toBe(32)
  })

  it('returns different keys for different AUTH_SECRETs', () => {
    vi.stubEnv('AUTH_SECRET', 'secret-a')
    const keyA = getTotpEncryptionKey()
    vi.stubEnv('AUTH_SECRET', 'secret-b')
    const keyB = getTotpEncryptionKey()
    expect(keyA.toString('hex')).not.toBe(keyB.toString('hex'))
  })

  it('new key differs from legacy key — key derivation was fixed', () => {
    vi.stubEnv('AUTH_SECRET', 'any-secret')
    const newKey = getTotpEncryptionKey()
    const [legacyKey] = getTotpLegacyKeys()
    expect(newKey.toString('hex')).not.toBe(legacyKey.toString('hex'))
  })
})

describe('getTotpFallbackKey', () => {
  it('returns undefined when AUTH_SECRET_PREVIOUS is not set', () => {
    vi.stubEnv('AUTH_SECRET_PREVIOUS', '')
    expect(getTotpFallbackKey()).toBeUndefined()
  })

  it('returns a 32-byte Buffer when AUTH_SECRET_PREVIOUS is set', () => {
    vi.stubEnv('AUTH_SECRET_PREVIOUS', 'previous-secret')
    const key = getTotpFallbackKey()
    expect(key).toBeDefined()
    expect(key!.byteLength).toBe(32)
  })
})

describe('decryptTotpSecretWithFallback — migration from legacy key derivation', () => {
  it('decrypts a secret encrypted with the legacy key and reports usedFallback=true', () => {
    vi.stubEnv('AUTH_SECRET', 'migration-test-secret')
    const rawSecret = generateTotpSecret()
    const [legacyKey] = getTotpLegacyKeys()
    const encrypted = encryptTotpSecret(rawSecret, legacyKey)

    const newKey = getTotpEncryptionKey()
    const result = decryptTotpSecretWithFallback(encrypted, newKey, getTotpLegacyKeys())

    expect(result.secret).toBe(rawSecret)
    expect(result.usedFallback).toBe(true)
  })

  it('decrypts a secret encrypted with the new key and reports usedFallback=false', () => {
    vi.stubEnv('AUTH_SECRET', 'migration-test-secret-2')
    const rawSecret = generateTotpSecret()
    const newKey = getTotpEncryptionKey()
    const encrypted = encryptTotpSecret(rawSecret, newKey)

    const result = decryptTotpSecretWithFallback(encrypted, newKey, getTotpLegacyKeys())
    expect(result.secret).toBe(rawSecret)
    expect(result.usedFallback).toBe(false)
  })

  it('throws when no available key can decrypt the secret', () => {
    vi.stubEnv('AUTH_SECRET', 'key-a')
    const rawSecret = generateTotpSecret()
    const keyA = getTotpEncryptionKey()
    const encrypted = encryptTotpSecret(rawSecret, keyA)

    vi.stubEnv('AUTH_SECRET', 'key-b')
    const keyB = getTotpEncryptionKey()
    const legacyKeysB = getTotpLegacyKeys()

    expect(() => decryptTotpSecretWithFallback(encrypted, keyB, legacyKeysB)).toThrow(
      'TOTP secret decryption failed with all available keys',
    )
  })
})
