import type { Polyline } from '../types/geometry'

/** 在折线中按 x 线性插值。端点精确命中返回该点 y；x 不在任一线段范围内返回 null。 */
export function interpolateY(polyline: Polyline, x: number): number | null {
  if (polyline.length < 2) return null

  for (const point of polyline) {
    if (point.x === x) return point.y
  }

  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i]
    const b = polyline[i + 1]
    const minX = Math.min(a.x, b.x)
    const maxX = Math.max(a.x, b.x)
    if (x < minX || x > maxX || a.x === b.x) continue
    const t = (x - a.x) / (b.x - a.x)
    return a.y + t * (b.y - a.y)
  }

  return null
}

export function bounds(polylines: Polyline[]): {
  minX: number
  maxX: number
  minY: number
  maxY: number
} {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const polyline of polylines) {
    for (const point of polyline) {
      if (point.x < minX) minX = point.x
      if (point.x > maxX) maxX = point.x
      if (point.y < minY) minY = point.y
      if (point.y > maxY) maxY = point.y
    }
  }

  if (!Number.isFinite(minX)) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 }
  }

  return { minX, maxX, minY, maxY }
}
