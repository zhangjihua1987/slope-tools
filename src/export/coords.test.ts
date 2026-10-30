import { describe, expect, it } from 'vitest'
import { solveA1 } from '../calc/a1'
import { buildSlices } from '../geometry/slices'
import { defaultGround, defaultMaterial, defaultSlip } from '../demo/defaultModel'
import { formatSliceTableCsv, formatVerticesCsv } from './coords'
import type { A1Result } from '../types/calc'

describe('formatVerticesCsv', () => {
  it('writes a header and one row per ground and slip vertex', () => {
    const csv = formatVerticesCsv(defaultGround, defaultSlip)
    const lines = csv.trim().split('\n')
    expect(lines[0]).toBe('kind,index,x,y')
    expect(lines).toHaveLength(1 + defaultGround.length + defaultSlip.length)
    expect(lines.filter((line) => line.startsWith('ground,'))).toHaveLength(defaultGround.length)
    expect(lines.filter((line) => line.startsWith('slip,'))).toHaveLength(defaultSlip.length)
    expect(lines[1]).toBe('ground,1,0,30')
    expect(lines[1 + defaultGround.length]).toBe('slip,1,8,22')
  })
})

describe('formatSliceTableCsv', () => {
  it('writes Fs, a column header, and one row per slice', () => {
    const result: Extract<A1Result, { ok: true }> = {
      ok: true,
      Fs: 1.25,
      iterations: 4,
      slices: [
        {
          index: 1,
          alphaDeg: 30,
          b: 10,
          W: 100,
          Q: 0,
          V: 0,
          Ub: 0,
          R: 80,
          T: 50,
          Psi: 0,
          E: 10,
        },
        {
          index: 2,
          alphaDeg: 10,
          b: 8,
          W: 90,
          Q: 1,
          V: 0.3,
          Ub: 2,
          R: 70,
          T: 40,
          Psi: 0.9,
          E: 0,
        },
      ],
    }
    const lines = formatSliceTableCsv(result).trim().split('\n')
    expect(lines[0]).toBe('Fs,1.25')
    expect(lines[1]).toBe('index,alphaDeg,b,W,Q,V,Ub,R,T,Psi,E')
    expect(lines).toHaveLength(4)
    expect(lines[2].startsWith('1,')).toBe(true)
    expect(lines[3].startsWith('2,')).toBe(true)
  })
})

describe('default model', () => {
  it('is a right-dipping slope that solves with A.1', () => {
    expect(defaultGround).toHaveLength(4)
    expect(defaultSlip).toHaveLength(4)
    for (const line of [defaultGround, defaultSlip]) {
      for (let i = 1; i < line.length; i++) expect(line[i].x).toBeGreaterThan(line[i - 1].x)
    }

    const geom = buildSlices(defaultGround, defaultSlip)
    expect(geom.ok).toBe(true)
    if (!geom.ok) return
    expect(geom.slices.length).toBe(3)

    const solved = solveA1(geom.slices, defaultMaterial)
    expect(solved.ok).toBe(true)
    if (!solved.ok) return
    expect(solved.Fs).toBeCloseTo(1.464405, 5)
    expect(Math.abs(solved.slices[solved.slices.length - 1].E)).toBeLessThan(0.05)
  })
})
