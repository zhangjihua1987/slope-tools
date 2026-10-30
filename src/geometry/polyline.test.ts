import { describe, expect, it } from 'vitest'
import { bounds, interpolateY } from './polyline'

describe('interpolateY', () => {
  it('interpolates between two points', () => {
    const pl = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ]
    expect(interpolateY(pl, 5)).toBeCloseTo(5)
  })

  it('returns null outside x-range', () => {
    const pl = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ]
    expect(interpolateY(pl, -1)).toBeNull()
    expect(interpolateY(pl, 11)).toBeNull()
  })

  it('returns the endpoint y on an exact hit', () => {
    const pl = [
      { x: 0, y: 2 },
      { x: 10, y: 8 },
    ]
    expect(interpolateY(pl, 0)).toBe(2)
    expect(interpolateY(pl, 10)).toBe(8)
  })

  it('interpolates a segment whose x decreases', () => {
    const pl = [
      { x: 10, y: 10 },
      { x: 0, y: 0 },
    ]
    expect(interpolateY(pl, 5)).toBeCloseTo(5)
  })

  it('returns null for an empty polyline or a single point', () => {
    expect(interpolateY([], 0)).toBeNull()
    expect(interpolateY([{ x: 0, y: 1 }], 0)).toBeNull()
  })
})

describe('bounds', () => {
  it('returns the min and max of all polyline vertices', () => {
    const box = bounds([
      [
        { x: 0, y: 5 },
        { x: 4, y: -1 },
      ],
      [
        { x: -2, y: 3 },
        { x: 8, y: 1 },
      ],
    ])
    expect(box).toEqual({ minX: -2, maxX: 8, minY: -1, maxY: 5 })
  })

  it('returns zeros when there are no vertices', () => {
    expect(bounds([[], []])).toEqual({ minX: 0, maxX: 0, minY: 0, maxY: 0 })
  })
})
