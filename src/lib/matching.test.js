import { describe, it, expect } from 'vitest'
import {
  interestMatchScore,
  commonInterests,
  sortByMatchScore,
  sortByCityThenMatch,
} from './matching'

describe('interestMatchScore', () => {
  it('returns 0 when either side has no interests', () => {
    expect(interestMatchScore([], ['Art'])).toBe(0)
    expect(interestMatchScore(['Art'], [])).toBe(0)
    expect(interestMatchScore(null, ['Art'])).toBe(0)
  })

  it('scores overlap as a percentage of my interests', () => {
    const mine = ['Tech', 'Art', 'Travel']
    const theirs = ['Tech', 'Art', 'Food']
    expect(interestMatchScore(mine, theirs)).toBe(67) // 2/3 rounded
  })
})

describe('commonInterests', () => {
  it('returns shared interests preserving my order', () => {
    expect(commonInterests(['B', 'A', 'C'], ['C', 'A'])).toEqual(['A', 'C'])
  })
})

describe('sortByMatchScore', () => {
  it('orders people by highest interest overlap first', () => {
    const people = [
      { id: 'low', interests: ['Chess'] },
      { id: 'high', interests: ['Tech', 'Art', 'Gaming'] },
      { id: 'mid', interests: ['Tech', 'Food'] },
    ]
    const sorted = sortByMatchScore(people, ['Tech', 'Art', 'Gaming'])
    expect(sorted.map(p => p.id)).toEqual(['high', 'mid', 'low'])
  })
})

describe('sortByCityThenMatch', () => {
  it('puts browse-city people before others, then by match', () => {
    const people = [
      { id: 'other-high', city: 'Surat', interests: ['Tech', 'Art'] },
      { id: 'local-low', city: 'Begusarai', interests: ['Chess'] },
      { id: 'local-high', city: 'Begusarai', interests: ['Tech', 'Art'] },
    ]
    const sorted = sortByCityThenMatch(people, ['Tech', 'Art'], 'Begusarai')
    expect(sorted.map(p => p.id)).toEqual(['local-high', 'local-low', 'other-high'])
  })
})
