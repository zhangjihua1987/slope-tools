import { describe, expect, it } from 'vitest'
import { buildSlices } from './slices'

describe('buildSlices', () => {
  it('builds one slice for a simple trapezoid', () => {
    const ground = [
      { x: 0, y: 20 },
      { x: 10, y: 20 },
    ]
    const slip = [
      { x: 0, y: 10 },
      { x: 10, y: 5 },
    ]
    const r = buildSlices(ground, slip)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.slices.length).toBeGreaterThanOrEqual(1)
    expect(r.slices).toHaveLength(1)
    expect(r.slices[0].b).toBeCloseTo(10)
    expect(r.slices[0].area).toBeCloseTo(125)
    expect(r.slices[0].alphaDeg).toBeCloseTo((Math.atan(0.5) * 180) / Math.PI)
    expect(r.slices[0].midX).toBeCloseTo(5)
    expect(r.slices[0].index).toBe(1)
  })

  it('rejects slip above ground', () => {
    const ground = [
      { x: 0, y: 5 },
      { x: 10, y: 5 },
    ]
    const slip = [
      { x: 0, y: 10 },
      { x: 10, y: 10 },
    ]
    const r = buildSlices(ground, slip)
    expect(r.ok).toBe(false)
  })

  it('uses a negative alpha when the slip rises to the right', () => {
    const ground = [
      { x: 0, y: 20 },
      { x: 10, y: 20 },
    ]
    const slip = [
      { x: 0, y: 5 },
      { x: 10, y: 10 },
    ]
    const r = buildSlices(ground, slip)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.slices[0].alphaDeg).toBeLessThan(0)
    expect(r.slices[0].alphaDeg).toBeCloseTo((-Math.atan(0.5) * 180) / Math.PI)
  })

  it('includes interior ground vertices in the slice area', () => {
    const ground = [
      { x: 0, y: 10 },
      { x: 5, y: 20 },
      { x: 10, y: 10 },
    ]
    const slip = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]
    const r = buildSlices(ground, slip)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.slices).toHaveLength(1)
    expect(r.slices[0].area).toBeCloseTo(150)
  })

  it('cuts one slice between each pair of slip vertices', () => {
    const ground = [
      { x: 0, y: 20 },
      { x: 20, y: 20 },
    ]
    const slip = [
      { x: 0, y: 10 },
      { x: 10, y: 5 },
      { x: 20, y: 5 },
    ]
    const r = buildSlices(ground, slip)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.slices).toHaveLength(2)
    expect(r.slices[0].b).toBeCloseTo(10)
    expect(r.slices[1].alphaDeg).toBeCloseTo(0)
    expect(r.slices[1].area).toBeCloseTo(150)
  })

  it('rejects a ground line that does not cover the slip', () => {
    const ground = [
      { x: 0, y: 10 },
      { x: 5, y: 10 },
    ]
    const slip = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]
    const r = buildSlices(ground, slip)
    expect(r.ok).toBe(false)
  })

  it('rejects a polyline whose x coordinates are not strictly increasing', () => {
    const ground = [
      { x: 0, y: 10 },
      { x: 10, y: 10 },
    ]
    const slip = [
      { x: 0, y: 0 },
      { x: 6, y: 1 },
      { x: 3, y: 1 },
    ]
    const r = buildSlices(ground, slip)
    expect(r.ok).toBe(false)
  })

  it('rejects a slice with no area', () => {
    const ground = [
      { x: 0, y: 5 },
      { x: 10, y: 5 },
    ]
    const slip = [
      { x: 0, y: 5 },
      { x: 10, y: 5 },
    ]
    const r = buildSlices(ground, slip)
    expect(r.ok).toBe(false)
  })

  it('densifies uniformly up to maxSlices without dropping slip vertices', () => {
    const ground = [
      { x: 0, y: 10 },
      { x: 30, y: 10 },
    ]
    const slip = [
      { x: 0, y: 0 },
      { x: 30, y: 0 },
    ]
    const dense = buildSlices(ground, slip, { maxSlices: 3 })
    expect(dense.ok).toBe(true)
    if (!dense.ok) return
    expect(dense.slices).toHaveLength(3)
    for (const slice of dense.slices) expect(slice.b).toBeCloseTo(10)

    const kinked = [
      { x: 0, y: 0 },
      { x: 10, y: 1 },
      { x: 20, y: 0 },
      { x: 30, y: 1 },
    ]
    const kept = buildSlices(ground, kinked, { maxSlices: 2 })
    expect(kept.ok).toBe(true)
    if (!kept.ok) return
    expect(kept.slices).toHaveLength(3)
  })
})
