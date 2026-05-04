import { describe, it, expect } from 'vitest'
import {
  OPF_TYPES,
  getOPFType,
  getCrossCategoryConflict,
  CATEGORY_LABELS,
} from '@/lib/opf-types'

describe('OPF_TYPES', () => {
  it('contains exactly 11 types', () => {
    expect(OPF_TYPES).toHaveLength(11)
  })

  it('every type has a unique key', () => {
    const keys = OPF_TYPES.map(t => t.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('every type has a non-empty label and hint', () => {
    for (const t of OPF_TYPES) {
      expect(t.label.length).toBeGreaterThan(0)
      expect(t.hint.length).toBeGreaterThan(0)
    }
  })

  it('naturalCategory is always one of the four allowed values', () => {
    const allowed = new Set(['PERSEX', 'MATEX', 'Investeringen', 'extern', 'geen'])
    for (const t of OPF_TYPES) {
      expect(allowed.has(t.naturalCategory)).toBe(true)
    }
  })
})

describe('getOPFType', () => {
  it('returns the correct definition for OPF1', () => {
    const def = getOPFType('OPF1')
    expect(def).toBeDefined()
    expect(def!.key).toBe('OPF1')
    expect(def!.naturalCategory).toBe('PERSEX')
    expect(def!.isExternal).toBe(false)
  })

  it('returns the correct definition for OPF9-inhuur', () => {
    const def = getOPFType('OPF9-inhuur')
    expect(def).toBeDefined()
    expect(def!.naturalCategory).toBe('Investeringen')
    expect(def!.isExternal).toBe(true)
  })

  it('returns the correct definition for OPF2b-nw', () => {
    const def = getOPFType('OPF2b-nw')
    expect(def).toBeDefined()
    expect(def!.naturalCategory).toBe('MATEX')
    expect(def!.isExternal).toBe(true)
  })

  it('returns undefined for an unknown key', () => {
    expect(getOPFType('OPF99')).toBeUndefined()
  })

  it('returns undefined for null', () => {
    expect(getOPFType(null)).toBeUndefined()
  })

  it('returns undefined for undefined', () => {
    expect(getOPFType(undefined)).toBeUndefined()
  })

  it('returns undefined for empty string', () => {
    expect(getOPFType('')).toBeUndefined()
  })
})

describe('getCrossCategoryConflict', () => {
  it('returns "none" when categories match', () => {
    expect(getCrossCategoryConflict('PERSEX', 'OPF1').kind).toBe('none')
    expect(getCrossCategoryConflict('Investeringen', 'OPF9-inhuur').kind).toBe('none')
    expect(getCrossCategoryConflict('MATEX', 'OPF2b-nw').kind).toBe('none')
  })

  it('returns "none" when selectedCategory is null or undefined', () => {
    expect(getCrossCategoryConflict(null, 'OPF1').kind).toBe('none')
    expect(getCrossCategoryConflict(undefined, 'OPF1').kind).toBe('none')
  })

  it('returns "none" when opfKey is unknown', () => {
    expect(getCrossCategoryConflict('PERSEX', 'UNKNOWN').kind).toBe('none')
    expect(getCrossCategoryConflict('PERSEX', null).kind).toBe('none')
  })

  it('returns "none" for OPF3 (extern) regardless of selected category', () => {
    expect(getCrossCategoryConflict('PERSEX', 'OPF3').kind).toBe('none')
    expect(getCrossCategoryConflict('Investeringen', 'OPF3').kind).toBe('none')
  })

  it('returns "blocks-internal-budget" when external OPF9-inhuur is funded from PERSEX', () => {
    const result = getCrossCategoryConflict('PERSEX', 'OPF9-inhuur')
    expect(result.kind).toBe('blocks-internal-budget')
    expect(result.selectedCategory).toBe('PERSEX')
    expect(result.expectedCategory).toBe('Investeringen')
  })

  it('returns "blocks-internal-budget" when external OPF2b-nw is funded from PERSEX', () => {
    const result = getCrossCategoryConflict('PERSEX', 'OPF2b-nw')
    expect(result.kind).toBe('blocks-internal-budget')
  })

  it('returns "mismatch" for non-external OPF with wrong category', () => {
    // OPF8 expects Investeringen; funding from PERSEX is a mismatch (not external)
    const result = getCrossCategoryConflict('PERSEX', 'OPF8')
    expect(result.kind).toBe('mismatch')
    expect(result.expectedCategory).toBe('Investeringen')
  })

  it('returns "mismatch" for OPF1 (PERSEX) funded from Investeringen', () => {
    const result = getCrossCategoryConflict('Investeringen', 'OPF1')
    expect(result.kind).toBe('mismatch')
    expect(result.expectedCategory).toBe('PERSEX')
  })
})

describe('CATEGORY_LABELS', () => {
  it('provides a label for every natural category', () => {
    expect(CATEGORY_LABELS['PERSEX']).toBeDefined()
    expect(CATEGORY_LABELS['MATEX']).toBeDefined()
    expect(CATEGORY_LABELS['Investeringen']).toBeDefined()
    expect(CATEGORY_LABELS['extern']).toBeDefined()
  })
})
