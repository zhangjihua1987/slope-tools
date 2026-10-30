import type { A1Result } from '../types/calc'
import type { Polyline } from '../types/geometry'

export function formatVerticesCsv(ground: Polyline, slip: Polyline): string {
  const lines = ['kind,index,x,y']
  ground.forEach((point, index) => {
    lines.push(`ground,${index + 1},${formatNumber(point.x)},${formatNumber(point.y)}`)
  })
  slip.forEach((point, index) => {
    lines.push(`slip,${index + 1},${formatNumber(point.x)},${formatNumber(point.y)}`)
  })
  return `${lines.join('\n')}\n`
}

export function formatSliceTableCsv(result: Extract<A1Result, { ok: true }>): string {
  const lines = [
    `Fs,${formatNumber(result.Fs)}`,
    'index,alphaDeg,b,W,Q,V,Ub,R,T,Psi,E',
  ]
  for (const slice of result.slices) {
    lines.push(
      [
        slice.index,
        slice.alphaDeg,
        slice.b,
        slice.W,
        slice.Q,
        slice.V,
        slice.Ub,
        slice.R,
        slice.T,
        slice.Psi,
        slice.E,
      ]
        .map((value) => formatNumber(value))
        .join(','),
    )
  }
  return `${lines.join('\n')}\n`
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return ''
  return String(Math.round(value * 1e6) / 1e6)
}
