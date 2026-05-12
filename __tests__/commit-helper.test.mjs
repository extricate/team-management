import { describe, it, expect } from 'vitest'
import { bumpVersion, parseClaudeResponse } from '../scripts/commit-helper.mjs'

describe('bumpVersion', () => {
  it('bumps patch version', () => {
    expect(bumpVersion('1.2.3', 'patch')).toBe('1.2.4')
  })

  it('bumps minor version and resets patch', () => {
    expect(bumpVersion('1.2.3', 'minor')).toBe('1.3.0')
  })

  it('bumps major version and resets minor and patch', () => {
    expect(bumpVersion('1.2.3', 'major')).toBe('2.0.0')
  })

  it('handles 0.x.x versions', () => {
    expect(bumpVersion('0.1.0', 'patch')).toBe('0.1.1')
  })

  it('handles minor bump on 0.x.x', () => {
    expect(bumpVersion('0.1.3', 'minor')).toBe('0.2.0')
  })

  it('throws for non-semver version string', () => {
    expect(() => bumpVersion('invalid', 'patch')).toThrow()
  })

  it('throws for missing patch segment', () => {
    expect(() => bumpVersion('1.2', 'patch')).toThrow()
  })
})

describe('parseClaudeResponse', () => {
  it('parses a clean JSON response', () => {
    const response = '{"bump":"patch","message":"fix: correct typo in header"}'
    expect(parseClaudeResponse(response)).toEqual({
      bump: 'patch',
      message: 'fix: correct typo in header',
    })
  })

  it('extracts JSON embedded in surrounding prose', () => {
    const response =
      'Here is my analysis:\n{"bump":"minor","message":"feat: add user search page"}\nDone.'
    expect(parseClaudeResponse(response)).toEqual({
      bump: 'minor',
      message: 'feat: add user search page',
    })
  })

  it('trims whitespace from the message', () => {
    const response = '{"bump":"patch","message":"  fix: thing  "}'
    expect(parseClaudeResponse(response)).toEqual({
      bump: 'patch',
      message: 'fix: thing',
    })
  })

  it('accepts all three valid bump types', () => {
    for (const bump of ['major', 'minor', 'patch']) {
      expect(() =>
        parseClaudeResponse(`{"bump":"${bump}","message":"chore: something"}`)
      ).not.toThrow()
    }
  })

  it('throws for an invalid bump type', () => {
    expect(() =>
      parseClaudeResponse('{"bump":"hotfix","message":"something"}')
    ).toThrow(/invalid bump/i)
  })

  it('throws when the message key is missing', () => {
    expect(() => parseClaudeResponse('{"bump":"patch"}')).toThrow(
      /invalid.*message/i
    )
  })

  it('throws when the message is an empty string', () => {
    expect(() =>
      parseClaudeResponse('{"bump":"patch","message":""}')
    ).toThrow(/invalid.*message/i)
  })

  it('throws when the response contains no JSON', () => {
    expect(() => parseClaudeResponse('no json here at all')).toThrow(
      /no json/i
    )
  })
})
