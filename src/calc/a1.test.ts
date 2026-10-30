import { describe, expect, it } from 'vitest'
import { solveA1 } from './a1'
import type { SliceGeom } from '../types/calc'

const planSlices: SliceGeom[] = [
  { index: 1, xLeft: 0, xRight: 10, b: 10, alphaDeg: 30, area: 100, midX: 5 },
  { index: 2, xLeft: 10, xRight: 20, b: 10, alphaDeg: 10, area: 80, midX: 15 },
]

describe('solveA1', () => {
  it('returns Fs > 0 for stable-looking slice set', () => {
    const r = solveA1(planSlices, { c: 12, phiDeg: 18, gamma: 19 })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.Fs).toBeGreaterThan(0.5)
    expect(r.Fs).toBeLessThan(3)
    expect(r.slices).toHaveLength(2)
    expect(r.slices[0].W).toBeCloseTo(1900)
    expect(r.slices[1].W).toBeCloseTo(1520)
    expect(r.slices.every((slice) => slice.Q === 0 && slice.V === 0 && slice.Ub === 0)).toBe(true)
    expect(r.iterations).toBeGreaterThan(0)
  })

  it('Fs increases when c increases', () => {
    const low = solveA1(planSlices, { c: 5, phiDeg: 15, gamma: 19 })
    const high = solveA1(planSlices, { c: 25, phiDeg: 15, gamma: 19 })
    expect(low.ok && high.ok).toBe(true)
    if (low.ok && high.ok) expect(high.Fs).toBeGreaterThan(low.Fs)
  })

  it('matches the closed form for one slice', () => {
    // α=45°, φ=45°, c=10 kPa, b=10 m, W=100 kN/m
    // R = W cosα tanφ + c b secα = 50√2 + 100√2 = 150√2
    // T = W sinα = 50√2
    // Fs = R/T = 3，且首条 Ψ 无上一条，记 0；E = T - R/Fs = 0
    const r = solveA1(
      [{ index: 1, xLeft: 0, xRight: 10, b: 10, alphaDeg: 45, area: 10, midX: 5 }],
      { c: 10, phiDeg: 45, gamma: 10 },
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.Fs).toBeCloseTo(3, 8)
    expect(r.slices[0].Psi).toBe(0)
    expect(r.slices[0].R).toBeCloseTo(150 * Math.SQRT2, 6)
    expect(r.slices[0].T).toBeCloseTo(50 * Math.SQRT2, 6)
    expect(r.slices[0].E).toBeCloseTo(0, 6)
  })

  it('sums every slice when transfer coefficients are 1', () => {
    // 倾角相同 → Ψ=1。Fs = 1 + 2 c Σb / ΣW
    // W = 100, 300, 200；b = 10, 10, 20；c = 10 → Fs = 1 + 800/600 = 7/3
    const slices: SliceGeom[] = [
      { index: 1, xLeft: 0, xRight: 10, b: 10, alphaDeg: 45, area: 10, midX: 5 },
      { index: 2, xLeft: 10, xRight: 20, b: 10, alphaDeg: 45, area: 30, midX: 15 },
      { index: 3, xLeft: 20, xRight: 40, b: 20, alphaDeg: 45, area: 20, midX: 30 },
    ]
    const r = solveA1(slices, { c: 10, phiDeg: 45, gamma: 10 })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.Fs).toBeCloseTo(7 / 3, 8)
    expect(r.slices[1].Psi).toBeCloseTo(1, 8)
    expect(r.slices[2].Psi).toBeCloseTo(1, 8)
    expect(r.slices[2].E).toBeCloseTo(0, 5)
  })

  it('matches the implicit fixed point when the transfer coefficient depends on Fs', () => {
    // α1=45°, α2=0, φ=45°, c=0, W=100, b=10
    // R1 = T1 = 50√2, R2 = 100, T2 = 0
    // Ψ2 = cos45 − sin45 / Fs
    // 固定点方程化成 Fs^2 − 4 Fs + 1 = 0，大于 1 的根是 2+√3
    const fs = 2 + Math.sqrt(3)
    const psi = Math.SQRT1_2 * (1 - 1 / fs)
    const r1 = 50 * Math.SQRT2
    expect((r1 * psi + 100) / (r1 * psi)).toBeCloseTo(fs, 8)

    const r = solveA1(
      [
        { index: 1, xLeft: 0, xRight: 10, b: 10, alphaDeg: 45, area: 10, midX: 5 },
        { index: 2, xLeft: 10, xRight: 20, b: 10, alphaDeg: 0, area: 10, midX: 15 },
      ],
      { c: 0, phiDeg: 45, gamma: 10 },
      undefined,
      { fsInit: 2, fsTol: 1e-12 },
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.Fs).toBeCloseTo(fs, 8)

    const psi2 = Math.cos(Math.PI / 4) - Math.sin(Math.PI / 4) / r.Fs
    const e1 = r1 - r1 / r.Fs
    const e2 = 0 - 100 / r.Fs + psi2 * e1
    expect(r.slices[0].Psi).toBe(0)
    expect(r.slices[1].Psi).toBeCloseTo(psi2, 8)
    expect(r.slices[0].E).toBeCloseTo(e1, 6)
    expect(r.slices[1].E).toBeCloseTo(e2, 6)
    expect(r.slices[1].E).toBeCloseTo(0, 5)
  })

  it('applies horizontal and vertical seismic forces only when enabled', () => {
    const slices: SliceGeom[] = [
      { index: 1, xLeft: 0, xRight: 10, b: 10, alphaDeg: 0, area: 10, midX: 5 },
    ]
    const material = { c: 10, phiDeg: 0, gamma: 10 }
    const on = solveA1(slices, material, {
      seismicOn: true,
      waterOn: false,
      alphaW: 0.2,
      aDyn: 1,
    })
    expect(on.ok).toBe(true)
    if (!on.ok) return
    // Q = 0.2 W = 20，V = Q/3，α=0、φ=0 → R = c b = 100，T = Q，Fs = 5
    expect(on.slices[0].Q).toBeCloseTo(20)
    expect(on.slices[0].V).toBeCloseTo(20 / 3)
    expect(on.slices[0].T).toBeCloseTo(20)
    expect(on.Fs).toBeCloseTo(5, 8)

    const off = solveA1(slices, material, {
      seismicOn: false,
      waterOn: false,
      alphaW: 0.2,
    })
    expect(off.ok).toBe(false)
  })

  it('reduces resistance when pore pressure is on', () => {
    const slices: SliceGeom[] = [
      { index: 1, xLeft: 0, xRight: 10, b: 10, alphaDeg: 30, area: 10, midX: 5 },
    ]
    const material = { c: 0, phiDeg: 45, gamma: 10 }
    const dry = solveA1(slices, material, { seismicOn: false, waterOn: false, waterRatio: 0.2 })
    const wet = solveA1(slices, material, { seismicOn: false, waterOn: true, waterRatio: 0.2 })
    expect(dry.ok && wet.ok).toBe(true)
    if (!dry.ok || !wet.ok) return
    expect(dry.slices[0].Ub).toBe(0)
    expect(wet.slices[0].Ub).toBeCloseTo(20)
    const expectedWet = (100 * Math.cos(Math.PI / 6) - 20) / (100 * Math.sin(Math.PI / 6))
    expect(wet.Fs).toBeCloseTo(expectedWet, 8)
    expect(wet.Fs).toBeLessThan(dry.Fs)
  })

  it('rejects an empty slice list, a vertical base, and a zero driving force', () => {
    expect(solveA1([], { c: 10, phiDeg: 20, gamma: 18 }).ok).toBe(false)
    expect(
      solveA1(
        [{ index: 1, xLeft: 0, xRight: 1, b: 1, alphaDeg: 90, area: 1, midX: 0.5 }],
        { c: 10, phiDeg: 20, gamma: 18 },
      ).ok,
    ).toBe(false)
    expect(
      solveA1(
        [{ index: 1, xLeft: 0, xRight: 10, b: 10, alphaDeg: 0, area: 10, midX: 5 }],
        { c: 10, phiDeg: 20, gamma: 10 },
      ).ok,
    ).toBe(false)
  })

  it('stops when the iteration budget is exhausted', () => {
    const r = solveA1(
      [
        { index: 1, xLeft: 0, xRight: 10, b: 10, alphaDeg: 45, area: 10, midX: 5 },
        { index: 2, xLeft: 10, xRight: 20, b: 10, alphaDeg: 0, area: 10, midX: 15 },
      ],
      { c: 0, phiDeg: 45, gamma: 10 },
      undefined,
      { maxIter: 1, fsInit: 5, fsTol: 1e-12 },
    )
    expect(r.ok).toBe(false)
  })
})
