import { interpolateY } from './polyline'
import type { Point, Polyline } from '../types/geometry'
import type { SliceGeom } from '../types/calc'

const EPS = 1e-8

export function buildSlices(
  ground: Polyline,
  slip: Polyline,
  opts?: { maxSlices?: number },
): { ok: true; slices: SliceGeom[] } | { ok: false; error: string } {
  if (ground.length < 2 || slip.length < 2) {
    return { ok: false, error: '地面和滑面至少各需要 2 个顶点' }
  }
  if (!strictlyIncreasingX(ground)) {
    return { ok: false, error: '地面折线 x 必须严格递增' }
  }
  if (!strictlyIncreasingX(slip)) {
    return { ok: false, error: '滑面折线 x 必须严格递增' }
  }

  const xMin = slip[0].x
  const xMax = slip[slip.length - 1].x
  if (ground[0].x > xMin + EPS || ground[ground.length - 1].x < xMax - EPS) {
    return { ok: false, error: '地面未覆盖滑面的 x 范围' }
  }

  const cuts = densifyCuts(
    slip.map((point) => point.x),
    opts?.maxSlices,
  )

  const checkXs = uniqueSorted([
    ...cuts,
    ...ground.map((point) => point.x).filter((x) => x >= xMin - EPS && x <= xMax + EPS),
  ])
  for (const x of checkXs) {
    const yGround = interpolateY(ground, clampToEnds(x, xMin, xMax))
    const ySlip = interpolateY(slip, clampToEnds(x, xMin, xMax))
    if (yGround == null || ySlip == null) {
      return { ok: false, error: '地面未覆盖滑面的 x 范围' }
    }
    if (yGround + 1e-6 < ySlip) {
      return { ok: false, error: '滑面高于地面' }
    }
  }

  const slices: SliceGeom[] = []
  for (let i = 0; i < cuts.length - 1; i++) {
    const xLeft = cuts[i]
    const xRight = cuts[i + 1]
    const b = xRight - xLeft
    if (b <= EPS) return { ok: false, error: '条块宽度无效' }

    const outline = sliceOutline(ground, slip, xLeft, xRight)
    if (!outline) return { ok: false, error: '地面未覆盖滑面的 x 范围' }
    const area = polygonArea(outline)
    if (area <= EPS) return { ok: false, error: '存在空条块' }

    const ySlipLeft = outline[0].y
    const ySlipRight = outline[1].y
    slices.push({
      index: i + 1,
      xLeft,
      xRight,
      b,
      alphaDeg: (Math.atan2(ySlipLeft - ySlipRight, b) * 180) / Math.PI,
      area,
      midX: (xLeft + xRight) / 2,
    })
  }

  if (slices.length === 0) return { ok: false, error: '没有可计算的条块' }
  return { ok: true, slices }
}

/** 条块截面：滑面从左到右，再沿地面从右回到左。 */
export function sliceOutline(
  ground: Polyline,
  slip: Polyline,
  xLeft: number,
  xRight: number,
): Point[] | null {
  const ySlipLeft = interpolateY(slip, xLeft)
  const ySlipRight = interpolateY(slip, xRight)
  const yGroundLeft = interpolateY(ground, xLeft)
  const yGroundRight = interpolateY(ground, xRight)
  if (
    ySlipLeft == null ||
    ySlipRight == null ||
    yGroundLeft == null ||
    yGroundRight == null
  ) {
    return null
  }

  const interior = ground.filter((point) => point.x > xLeft && point.x < xRight)
  const outline: Point[] = [
    { x: xLeft, y: ySlipLeft },
    { x: xRight, y: ySlipRight },
    { x: xRight, y: yGroundRight },
  ]
  for (let i = interior.length - 1; i >= 0; i--) outline.push(interior[i])
  outline.push({ x: xLeft, y: yGroundLeft })
  return outline
}

function strictlyIncreasingX(polyline: Polyline): boolean {
  for (let i = 1; i < polyline.length; i++) {
    if (!(polyline[i].x > polyline[i - 1].x)) return false
  }
  return true
}

function clampToEnds(x: number, xMin: number, xMax: number): number {
  if (x < xMin) return xMin
  if (x > xMax) return xMax
  return x
}

function uniqueSorted(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b)
  const out: number[] = []
  for (const value of sorted) {
    if (out.length === 0 || Math.abs(value - out[out.length - 1]) > 1e-9) out.push(value)
  }
  return out
}

/**
 * 默认每个滑面顶点区间一条。maxSlices 更大时按区间长度均匀加密；
 * 小于天然条数时仍保留全部滑面顶点，避免抹平折点。
 */
function densifyCuts(xs: number[], maxSlices?: number): number[] {
  const natural = xs.length - 1
  const target =
    maxSlices != null && Number.isFinite(maxSlices) ? Math.floor(maxSlices) : natural
  if (target <= natural) return [...xs]

  const lengths = xs.slice(0, -1).map((x, i) => xs[i + 1] - x)
  const totalLen = lengths.reduce((sum, len) => sum + len, 0)
  const extra = target - natural
  const raw = lengths.map((len) => (totalLen > 0 ? (len / totalLen) * extra : 0))
  const parts = raw.map((value) => Math.floor(value))
  let assigned = parts.reduce((sum, value) => sum + value, 0)
  const remainder = raw
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac || a.index - b.index)
  let cursor = 0
  while (assigned < extra) {
    parts[remainder[cursor % remainder.length].index] += 1
    assigned += 1
    cursor += 1
  }

  const cuts: number[] = []
  for (let i = 0; i < natural; i++) {
    const divisions = 1 + parts[i]
    for (let j = 0; j < divisions; j++) {
      cuts.push(xs[i] + (lengths[i] * j) / divisions)
    }
  }
  cuts.push(xs[xs.length - 1])
  return cuts
}

function polygonArea(points: Point[]): number {
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length]
    sum += points[i].x * next.y - next.x * points[i].y
  }
  return Math.abs(sum) / 2
}
