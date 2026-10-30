import type { LoadOptions, Material } from '../types/calc'
import type { Polyline } from '../types/geometry'

/** 右倾坡：坡顶—坡面—坡脚，x 严格递增。单位 m。 */
export const defaultGround: Polyline = [
  { x: 0, y: 30 },
  { x: 10, y: 30 },
  { x: 40, y: 10 },
  { x: 55, y: 10 },
]

/** 位于地面以下的折线滑面，在坡脚附近滑出。 */
export const defaultSlip: Polyline = [
  { x: 8, y: 22 },
  { x: 20, y: 16 },
  { x: 32, y: 12 },
  { x: 44, y: 9 },
]

/** c：kPa，φ：度，γ：kN/m³ */
export const defaultMaterial: Material = {
  c: 16,
  phiDeg: 22,
  gamma: 19,
}

/** 地震和水压力默认关闭。系数保留非零初值，打开开关后条块力立即可见。 */
export const defaultLoads: LoadOptions = {
  seismicOn: false,
  waterOn: false,
  alphaW: 0.25,
  aDyn: 1,
  waterRatio: 0.2,
}
