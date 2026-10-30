export type SliceGeom = {
  index: number
  xLeft: number
  xRight: number
  b: number
  alphaDeg: number
  area: number
  midX: number
}

/** c：kPa，phiDeg：度，gamma：kN/m³ */
export type Material = { c: number; phiDeg: number; gamma: number }

export type LoadOptions = {
  seismicOn: boolean
  waterOn: boolean
  /** 水平地震综合影响系数 α_w；仅 seismicOn 时用；省略时按 0 */
  alphaW?: number
  /** 动力分布系数 a_i，省略时按 1 */
  aDyn?: number
  /** 开启水压力时 Ub = waterRatio * W；省略时按 0 */
  waterRatio?: number
}

export type SliceResult = {
  index: number
  alphaDeg: number
  b: number
  W: number
  Q: number
  V: number
  Ub: number
  R: number
  T: number
  Psi: number
  E: number
}

export type A1Result =
  | { ok: true; Fs: number; slices: SliceResult[]; iterations: number }
  | { ok: false; error: string }
