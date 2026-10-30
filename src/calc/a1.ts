import type { A1Result, LoadOptions, Material, SliceGeom, SliceResult } from '../types/calc'

const DEG = Math.PI / 180
const DEN_EPS = 1e-12

type Prepared = {
  index: number
  alpha: number
  alphaDeg: number
  b: number
  W: number
  Q: number
  V: number
  Ub: number
  R: number
  T: number
  phi: number
}

/**
 * GB/T 38509-2020 附录 A.1 不平衡推力传递法，隐式迭代 Fs。
 * P_i 固定为 0。首条没有传来的剩余推力，Ψ 记 0。
 */
export function solveA1(
  slices: SliceGeom[],
  material: Material,
  loads?: LoadOptions,
  opts?: { fsTol?: number; maxIter?: number; fsInit?: number },
): A1Result {
  if (slices.length === 0) return { ok: false, error: '没有条块' }
  if (
    !Number.isFinite(material.c) ||
    !Number.isFinite(material.phiDeg) ||
    !Number.isFinite(material.gamma) ||
    !(Math.abs(material.phiDeg) < 90)
  ) {
    return { ok: false, error: '材料参数无效' }
  }

  const prepared = prepare(slices, material, loads)
  if (!prepared.ok) return prepared

  const fsTol =
    opts?.fsTol != null && Number.isFinite(opts.fsTol) && opts.fsTol >= 0 ? opts.fsTol : 1e-4
  const maxIter =
    opts?.maxIter != null && Number.isFinite(opts.maxIter) ? Math.max(0, Math.floor(opts.maxIter)) : 50
  let fs = opts?.fsInit ?? 1
  if (!(fs > 0) || !Number.isFinite(fs)) return { ok: false, error: '初值 Fs 无效' }

  for (let iter = 1; iter <= maxIter; iter++) {
    const step = evaluate(prepared.rows, fs)
    if (!step || !(step.fsNext > 0) || !Number.isFinite(step.fsNext)) {
      return { ok: false, error: '稳定系数计算无效（下滑力为零或结果非有限）' }
    }
    if (Math.abs(step.fsNext - fs) < fsTol) {
      const atSolution = evaluate(prepared.rows, step.fsNext) ?? step
      return {
        ok: true,
        Fs: step.fsNext,
        slices: thrust(prepared.rows, step.fsNext, atSolution.psi),
        iterations: iter,
      }
    }
    fs = step.fsNext
  }

  return { ok: false, error: '稳定系数未收敛' }
}

function prepare(
  slices: SliceGeom[],
  material: Material,
  loads?: LoadOptions,
): { ok: true; rows: Prepared[] } | { ok: false; error: string } {
  const seismicOn = loads?.seismicOn ?? false
  const waterOn = loads?.waterOn ?? false
  const alphaW = loads?.alphaW ?? 0
  const aDyn = loads?.aDyn ?? 1
  const waterRatio = loads?.waterRatio ?? 0
  const phi = material.phiDeg * DEG
  const tanPhi = Math.tan(phi)
  const rows: Prepared[] = []

  for (const slice of slices) {
    if (!(slice.b > 0) || !Number.isFinite(slice.area) || !Number.isFinite(slice.alphaDeg)) {
      return { ok: false, error: '条块几何无效' }
    }
    const alpha = slice.alphaDeg * DEG
    const cosA = Math.cos(alpha)
    const sinA = Math.sin(alpha)
    if (!(cosA > 1e-8)) return { ok: false, error: '条块倾角过大，滑面近乎竖直' }

    const W = material.gamma * slice.area
    const Q = seismicOn ? alphaW * aDyn * W : 0
    const V = seismicOn ? Q / 3 : 0
    const Ub = waterOn ? waterRatio * W : 0
    // R = [(W+V) cosα − Ub − Q sinα] tanφ + c b secα
    const R = ((W + V) * cosA - Ub - Q * sinA) * tanPhi + (material.c * slice.b) / cosA
    // T = (W+V) sinα + Q cosα
    const T = (W + V) * sinA + Q * cosA
    if (!Number.isFinite(R) || !Number.isFinite(T) || !Number.isFinite(W)) {
      return { ok: false, error: '条块内力计算无效' }
    }
    rows.push({
      index: slice.index,
      alpha,
      alphaDeg: slice.alphaDeg,
      b: slice.b,
      W,
      Q,
      V,
      Ub,
      R,
      T,
      phi,
    })
  }

  return { ok: true, rows }
}

/** 用试算 Fs 求传递系数，再代入 A.4 得到下一步 Fs。 */
function evaluate(rows: Prepared[], fs: number): { fsNext: number; psi: number[] } | null {
  const n = rows.length
  const psi = new Array<number>(n).fill(0)
  for (let i = 1; i < n; i++) {
    const delta = rows[i - 1].alpha - rows[i].alpha
    // Ψ_i = cos(α_{i-1}−α_i) − sin(α_{i-1}−α_i) tanφ_i / Fs
    psi[i] = Math.cos(delta) - (Math.sin(delta) * Math.tan(rows[i].phi)) / fs
    if (!Number.isFinite(psi[i])) return null
  }

  const prod = new Array<number>(n).fill(1)
  for (let i = n - 2; i >= 0; i--) {
    prod[i] = psi[i + 1] * prod[i + 1]
    if (!Number.isFinite(prod[i])) return null
  }

  let numerator = 0
  let denominator = 0
  for (let i = 0; i < n; i++) {
    numerator += rows[i].R * prod[i]
    denominator += rows[i].T * prod[i]
  }
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || Math.abs(denominator) < DEN_EPS) {
    return null
  }
  return { fsNext: numerator / denominator, psi }
}

/** E_i = T_i − R_i/Fs + Ψ_i E_{i-1}，E_0 = 0。 */
function thrust(rows: Prepared[], fs: number, psi: number[]): SliceResult[] {
  let previous = 0
  return rows.map((row, i) => {
    const transfer = i === 0 ? 0 : psi[i]
    const E = row.T - row.R / fs + transfer * previous
    previous = E
    return {
      index: row.index,
      alphaDeg: row.alphaDeg,
      b: row.b,
      W: row.W,
      Q: row.Q,
      V: row.V,
      Ub: row.Ub,
      R: row.R,
      T: row.T,
      Psi: transfer,
      E,
    }
  })
}
