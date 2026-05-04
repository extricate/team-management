import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '@/lib/auth/password'

describe('hashPassword', () => {
  it('returns a non-empty string', async () => {
    const hash = await hashPassword('hunter2')
    expect(typeof hash).toBe('string')
    expect(hash.length).toBeGreaterThan(0)
  })

  it('encodes salt and hash separated by colon', async () => {
    const hash = await hashPassword('hunter2')
    const parts = hash.split(':')
    expect(parts).toHaveLength(2)
    expect(parts[0].length).toBe(64)  // 32 bytes hex
    expect(parts[1].length).toBe(128) // 64 bytes hex
  })

  it('produces different hashes for the same password', async () => {
    const a = await hashPassword('same')
    const b = await hashPassword('same')
    expect(a).not.toBe(b)
  })
})

describe('verifyPassword', () => {
  it('returns true for the correct password', async () => {
    const hash = await hashPassword('correct-horse')
    expect(await verifyPassword('correct-horse', hash)).toBe(true)
  })

  it('returns false for a wrong password', async () => {
    const hash = await hashPassword('correct-horse')
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })

  it('returns false for an empty string against a real hash', async () => {
    const hash = await hashPassword('secret')
    expect(await verifyPassword('', hash)).toBe(false)
  })

  it('returns false for a malformed hash string', async () => {
    expect(await verifyPassword('anything', 'not-a-valid-hash')).toBe(false)
  })
})
